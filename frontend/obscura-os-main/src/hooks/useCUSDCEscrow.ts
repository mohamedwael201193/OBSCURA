import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, usePublicClient, useWalletClient, useAccount, useReadContract } from 'wagmi';
import {
  REINEIRA_CUSDC_ADDRESS,
  REINEIRA_CUSDC_ABI,
  REINEIRA_ESCROW_ADDRESS,
  REINEIRA_ESCROW_ABI,
} from '@/config/pay';
import { FHEStepStatus } from '@/lib/constants';
import { useFHEStatus } from './useFHEStatus';
import { initFHEClient, encryptAmount, encryptAddressAndAmount } from '@/lib/fhe';
import { arbitrumSepolia } from 'viem/chains';
import { parseUnits } from 'viem';
import { withRateLimitRetry } from '@/lib/rateLimit';
import { estimateCappedFees } from '@/lib/gas';
import { getJSON, setJSON, migrateGlobalKey } from '@/lib/scopedStorage';

const STORAGE_KEY = 'obscura_cusdc_escrows';

export interface SavedEscrow {
  escrowId: string;
  amount: string;
  recipient: string;
  resolver: string;
  txHash: string;
  createdAt: number;
}

function loadEscrows(addr: `0x${string}` | undefined): SavedEscrow[] {
  return getJSON<SavedEscrow[]>(STORAGE_KEY, addr, []);
}

function saveEscrow(addr: `0x${string}` | undefined, escrow: SavedEscrow) {
  const existing = loadEscrows(addr);
  existing.unshift(escrow);
  setJSON(STORAGE_KEY, addr, existing);
}

export function useCUSDCEscrow() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const fheStatus = useFHEStatus();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [escrows, setEscrows] = useState<SavedEscrow[]>(() => loadEscrows(undefined));
  const [lastEscrowId, setLastEscrowId] = useState<string | null>(null);

  const { writeContractAsync, isPending: isTxPending } = useWriteContract();

  // Ensure the Escrow contract is authorized as cUSDC operator
  const ensureOperator = useCallback(async () => {
    if (!publicClient || !address || !REINEIRA_CUSDC_ADDRESS || !REINEIRA_ESCROW_ADDRESS) return;

    try {
      const isOp = await publicClient.readContract({
        address: REINEIRA_CUSDC_ADDRESS,
        abi: REINEIRA_CUSDC_ABI,
        functionName: 'isOperator',
        args: [address, REINEIRA_ESCROW_ADDRESS],
      });
      if (isOp as boolean) return; // already approved
    } catch { /* proceed with approval */ }

    // Approve for 90 days
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 90 * 86400);
    const fees = await estimateCappedFees(publicClient);

    const hash = await writeContractAsync({
      address: REINEIRA_CUSDC_ADDRESS,
      abi: REINEIRA_CUSDC_ABI,
      functionName: 'setOperator',
      args: [REINEIRA_ESCROW_ADDRESS, expiry],
      account: address,
      chain: arbitrumSepolia,
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      gas: 150_000n,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    // Wait for RPC cooldown after operator tx
    await new Promise((r) => setTimeout(r, 6000));
  }, [publicClient, address, writeContractAsync]);

  // Refresh escrows from localStorage periodically (and on address change with one-time migration)
  useEffect(() => {
    if (address) migrateGlobalKey(STORAGE_KEY, address);
    setEscrows(loadEscrows(address));
    const interval = setInterval(() => setEscrows(loadEscrows(address)), 3000);
    const onStorage = () => setEscrows(loadEscrows(address));
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [address]);

  const create = useCallback(
    async (
      ownerAddress: `0x${string}`,
      amount: bigint,
      resolver: `0x${string}`,
      resolverData: `0x${string}` = '0x'
    ) => {
      if (!publicClient || !walletClient || !REINEIRA_ESCROW_ADDRESS) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);
        await initFHEClient(publicClient, walletClient);

        const encryptedInputs = await encryptAddressAndAmount(
          ownerAddress,
          amount,
          (step) => console.log('[FHE cUSDC Escrow Encrypt]', step)
        );

        // Authorize escrow contract as cUSDC operator (required to lock funds)
        fheStatus.setStep(FHEStepStatus.COMPUTING);
        await ensureOperator();

        // Create escrow — fetch capped fees, call wallet once.
        const createFees = await withRateLimitRetry(() => estimateCappedFees(publicClient));

        const hash = await writeContractAsync({
          address: REINEIRA_ESCROW_ADDRESS,
          abi: REINEIRA_ESCROW_ABI,
          functionName: 'create',
          args: [
            encryptedInputs[0], // encrypted owner address
            encryptedInputs[1], // encrypted amount
            resolver,
            resolverData,
          ],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: createFees.maxFeePerGas,
          maxPriorityFeePerGas: createFees.maxPriorityFeePerGas,
          gas: 1_200_000n,
        });

        // Parse escrow ID from tx receipt logs.
        // IMPORTANT: FHE transactions emit many CoFHE internal events
        // BEFORE the EscrowCreated event. We must filter to logs emitted
        // by the Reineira escrow contract so we don't accidentally pick
        // up a CoFHE topic[1] as the escrow ID.
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        let escrowId = '?';
        for (const log of receipt.logs) {
          if (
            log.address.toLowerCase() === REINEIRA_ESCROW_ADDRESS.toLowerCase() &&
            log.topics.length >= 2 &&
            log.topics[1]
          ) {
            escrowId = BigInt(log.topics[1]).toString();
            break;
          }
        }

        setLastEscrowId(escrowId);
        setTxHash(hash);

        const saved: SavedEscrow = {
          escrowId,
          amount: amount.toString(),
          recipient: ownerAddress,
          resolver,
          txHash: hash,
          createdAt: Date.now(),
        };
        saveEscrow(address, saved);
        setEscrows(loadEscrows(address));

        // ─── AUTO-FUND DISABLED ──────────────────────────────────────────────
        // The deployed Reineira escrow proxy (0xC4333F84…) at impl 0xe606fff6…
        // calls cUSDC.confidentialTransferFrom(address,address,bytes32) with
        // selector 0xeb3155b5 (takes a pre-ingested euint64 handle).
        //
        // The deployed cUSDC at 0x6b6e6479… does NOT expose that selector — it
        // only has the older (address,address,uint256) and (address,address,InEuint64)
        // overloads. As a result `fund()` ALWAYS reverts with `InvalidSigner` /
        // function-not-found at ~50–85k gas. This is an upstream contract version
        // mismatch and cannot be fixed in the frontend.
        //
        // We therefore skip auto-fund: the escrow is created and recorded, but
        // the user is informed via a console warning. Manual fund() in the UI
        // will surface the same explanation if attempted.
        console.warn(
          `[Escrow] Auto-fund SKIPPED for escrow #${escrowId} — the deployed ` +
          `Reineira escrow impl (0xe606fff6...) calls cUSDC selector 0xeb3155b5 ` +
          `(confidentialTransferFrom with bytes32 handle), which the deployed ` +
          `cUSDC token (0x6b6e6479...) does not expose. fund() will always revert ` +
          `until the upstream contracts are upgraded. The escrow has been created ` +
          `on-chain and will appear in My Escrows, but no cUSDC has been locked.`
        );

        fheStatus.setStep(FHEStepStatus.READY);
        return hash;
      } catch (error) {
        fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
        throw error;
      }
    },
    [publicClient, walletClient, writeContractAsync, address, fheStatus, ensureOperator]
  );

  const fund = useCallback(
    async (_escrowId: bigint, _amount: bigint) => {
      // ─── DISABLED ─────────────────────────────────────────────────────────
      // The deployed Reineira escrow impl (0xe606fff6…) calls
      // cUSDC.confidentialTransferFrom(address,address,bytes32) — selector
      // 0xeb3155b5. The deployed cUSDC token (0x6b6e6479…) does NOT expose
      // that selector, only the older (address,address,uint256) and
      // (address,address,InEuint64) overloads. Therefore fund() ALWAYS
      // reverts on-chain with InvalidSigner / function-not-found at ~50–85k
      // gas regardless of operator state, balance, or signature.
      //
      // Until the upstream Reineira contracts are upgraded (either the
      // escrow to use the (addr,addr,InEuint64) overload, or the cUSDC to
      // expose the (addr,addr,bytes32) overload), there is nothing the
      // frontend can do to make fund() succeed.
      //
      // We surface a clear error instead of broadcasting a tx that we know
      // will revert and burn the user's gas.
      const msg =
        'Escrow fund() is temporarily disabled: the deployed Reineira ' +
        'escrow proxy (0xC4333F84…) is incompatible with the deployed ' +
        'cUSDC token (0x6b6e6479…). The escrow expects ' +
        'confidentialTransferFrom(address,address,bytes32) (selector ' +
        '0xeb3155b5) but the cUSDC implementation only exposes the ' +
        '(uint256) and (InEuint64) overloads. Awaiting upstream contract ' +
        'upgrade.';
      console.error('[Escrow.fund]', msg);
      fheStatus.setStep(FHEStepStatus.ERROR, msg);
      throw new Error(msg);
    },
    [fheStatus]
  );

  const redeem = useCallback(
    async (escrowId: bigint) => {
      if (!publicClient || !REINEIRA_ESCROW_ADDRESS) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.COMPUTING);

        // Redeem — fetch capped fees, call wallet once.
        const redeemFees = await withRateLimitRetry(() => estimateCappedFees(publicClient));

        const hash = await writeContractAsync({
          address: REINEIRA_ESCROW_ADDRESS,
          abi: REINEIRA_ESCROW_ABI,
          functionName: 'redeem',
          args: [escrowId],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: redeemFees.maxFeePerGas,
          maxPriorityFeePerGas: redeemFees.maxPriorityFeePerGas,
          gas: 800_000n,
        });

        setTxHash(hash);
        fheStatus.setStep(FHEStepStatus.READY);
        return hash;
      } catch (error) {
        fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
        throw error;
      }
    },
    [publicClient, writeContractAsync, address, fheStatus]
  );

  // Check if an escrow exists on-chain
  const checkExists = useCallback(
    async (escrowId: bigint): Promise<boolean> => {
      if (!publicClient || !REINEIRA_ESCROW_ADDRESS) return false;
      try {
        const result = await publicClient.readContract({
          address: REINEIRA_ESCROW_ADDRESS,
          abi: REINEIRA_ESCROW_ABI,
          functionName: 'exists',
          args: [escrowId],
        });
        return result as boolean;
      } catch {
        return false;
      }
    },
    [publicClient]
  );

  return {
    create,
    fund,
    redeem,
    checkExists,
    txHash,
    isTxPending,
    escrows,
    lastEscrowId,
    ...fheStatus,
  };
}

import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, usePublicClient, useWalletClient, useAccount } from 'wagmi';
import {
  REINEIRA_CUSDC_ADDRESS,
  REINEIRA_CUSDC_ABI,
  REINEIRA_ESCROW_ADDRESS,
  OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
  OBSCURA_CONFIDENTIAL_ESCROW_ABI,
} from '@/config/pay';
import { FHEStepStatus } from '@/lib/constants';
import { useFHEStatus } from './useFHEStatus';
import { initFHEClient, encryptAmount, encryptAddressAndAmount } from '@/lib/fhe';
import { arbitrumSepolia } from 'viem/chains';
import { withRateLimitRetry } from '@/lib/rateLimit';
import { estimateCappedFees } from '@/lib/gas';
import { getJSON, setJSON, migrateGlobalKey } from '@/lib/scopedStorage';

const STORAGE_KEY = 'obscura_cusdc_escrows';

/**
 * useCUSDCEscrow — fully working confidential cUSDC escrow.
 *
 * History:
 *   The deployed Reineira ConfidentialEscrow proxy (0xC4333F84…) calls
 *   cUSDC.confidentialTransferFrom(address,address,bytes32) (selector
 *   0xeb3155b5). The deployed cUSDC token (0x6b6e6479…) does NOT expose
 *   that selector — only the (address,address,uint256) and InEuint64
 *   overloads exist. fund() therefore always reverted (~50–85k gas).
 *
 *   Fix: deploy our own ObscuraConfidentialEscrow that calls cUSDC via
 *   the present uint256-handle overloads (0xca49d7cd inbound, 0xfe3f670d
 *   outbound). End-to-end working.
 *
 *   Address (Arbitrum Sepolia): 0x6E17459f6537E4ccBAC9CDB3f122F5f4d715d8b5
 *
 * The legacy REINEIRA_ESCROW_ADDRESS export is kept so My Escrows can
 * label pre-cutoff escrows as legacy.
 */

export interface SavedEscrow {
  escrowId: string;
  amount: string;
  recipient: string;
  resolver: string;
  txHash: string;
  createdAt: number;
  /** address of the escrow contract this record was created against. */
  contract?: `0x${string}`;
  /** true for escrows created against the broken Reineira proxy. */
  legacy?: boolean;
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

  // Authorize the new ObscuraConfidentialEscrow contract as cUSDC operator.
  const ensureOperator = useCallback(async () => {
    if (
      !publicClient ||
      !address ||
      !REINEIRA_CUSDC_ADDRESS ||
      !OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS
    ) return;

    try {
      const isOp = await publicClient.readContract({
        address: REINEIRA_CUSDC_ADDRESS,
        abi: REINEIRA_CUSDC_ABI,
        functionName: 'isOperator',
        args: [address, OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS],
      });
      if (isOp as boolean) return;
    } catch { /* proceed with approval */ }

    const expiry = BigInt(Math.floor(Date.now() / 1000) + 90 * 86400);
    const fees = await estimateCappedFees(publicClient);

    const hash = await writeContractAsync({
      address: REINEIRA_CUSDC_ADDRESS,
      abi: REINEIRA_CUSDC_ABI,
      functionName: 'setOperator',
      args: [OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS, expiry],
      account: address,
      chain: arbitrumSepolia,
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      gas: 150_000n,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    await new Promise((r) => setTimeout(r, 6000));
  }, [publicClient, address, writeContractAsync]);

  // Refresh escrows from localStorage periodically + on address change.
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

  /**
   * Create + auto-fund an escrow against ObscuraConfidentialEscrow.
   * Three transactions (1 skipped if already authorized):
   *   1. setOperator (cUSDC → escrow contract)
   *   2. create(InEaddress owner, InEuint64 amount, resolver, data)
   *   3. fund(escrowId, InEuint64 amount)
   */
  const create = useCallback(
    async (
      ownerAddress: `0x${string}`,
      amount: bigint,
      resolver: `0x${string}`,
      resolverData: `0x${string}` = '0x'
    ) => {
      if (!publicClient || !walletClient || !OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);
        await initFHEClient(publicClient, walletClient);

        const encryptedInputs = await encryptAddressAndAmount(
          ownerAddress,
          amount,
          (step) => console.log('[FHE Escrow Encrypt]', step)
        );

        // Authorize new escrow contract as cUSDC operator (required for fund).
        fheStatus.setStep(FHEStepStatus.COMPUTING);
        await ensureOperator();

        // ── 1. create ──
        const createFees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
        const hash = await writeContractAsync({
          address: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
          abi: OBSCURA_CONFIDENTIAL_ESCROW_ABI,
          functionName: 'create',
          args: [
            encryptedInputs[0], // encrypted owner address
            encryptedInputs[1], // encrypted target amount
            resolver,
            resolverData,
          ],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: createFees.maxFeePerGas,
          maxPriorityFeePerGas: createFees.maxPriorityFeePerGas,
          gas: 1_200_000n,
        });

        // Parse escrow id from EscrowCreated(uint256 indexed escrowId, …)
        // emitted by THIS contract (filter to avoid CoFHE internal events).
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        let escrowId = '?';
        for (const log of receipt.logs) {
          if (
            log.address.toLowerCase() === OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS.toLowerCase() &&
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
          contract: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
        };
        saveEscrow(address, saved);
        setEscrows(loadEscrows(address));

        // ── 2. auto-fund ──
        // Re-encrypt the amount (a fresh InEuint64 — each encryption is
        // single-use because the CoFHE verifier records consumption).
        try {
          await new Promise((r) => setTimeout(r, 4000));
          const fundEnc = await encryptAmount(amount, (step) =>
            console.log('[FHE Escrow Fund Encrypt]', step)
          );
          const fundFees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
          const fundHash = await writeContractAsync({
            address: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
            abi: OBSCURA_CONFIDENTIAL_ESCROW_ABI,
            functionName: 'fund',
            args: [BigInt(escrowId), fundEnc[0]],
            account: address,
            chain: arbitrumSepolia,
            maxFeePerGas: fundFees.maxFeePerGas,
            maxPriorityFeePerGas: fundFees.maxPriorityFeePerGas,
            gas: 1_500_000n,
          });
          const fundReceipt = await publicClient.waitForTransactionReceipt({ hash: fundHash });
          if (fundReceipt.status !== 'success') {
            console.warn('[Escrow] auto-fund tx reverted:', fundHash);
          } else {
            console.log('[Escrow] auto-funded', escrowId, fundHash);
          }
        } catch (fundErr) {
          // Don't fail the whole flow — escrow is created; user can fund manually.
          console.warn('[Escrow] auto-fund failed (escrow still created):', fundErr);
        }

        fheStatus.setStep(FHEStepStatus.READY);
        return hash;
      } catch (error) {
        fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
        throw error;
      }
    },
    [publicClient, walletClient, writeContractAsync, address, fheStatus, ensureOperator]
  );

  /** Manual fund() — encrypt amount client-side and pull cUSDC from caller. */
  const fund = useCallback(
    async (escrowId: bigint, amount: bigint) => {
      if (!publicClient || !walletClient || !OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }
      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);
        await initFHEClient(publicClient, walletClient);
        const enc = await encryptAmount(amount, (step) =>
          console.log('[FHE Fund Encrypt]', step)
        );

        fheStatus.setStep(FHEStepStatus.COMPUTING);
        await ensureOperator();

        const fees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
        const hash = await writeContractAsync({
          address: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
          abi: OBSCURA_CONFIDENTIAL_ESCROW_ABI,
          functionName: 'fund',
          args: [escrowId, enc[0]],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 1_500_000n,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') {
          throw new Error(`fund() tx reverted on-chain (hash: ${hash})`);
        }
        setTxHash(hash);
        fheStatus.setStep(FHEStepStatus.READY);
        return hash;
      } catch (error) {
        fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
        throw error;
      }
    },
    [publicClient, walletClient, writeContractAsync, address, fheStatus, ensureOperator]
  );

  const redeem = useCallback(
    async (escrowId: bigint) => {
      if (!publicClient || !OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }
      try {
        fheStatus.setStep(FHEStepStatus.COMPUTING);
        const fees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
        const hash = await writeContractAsync({
          address: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
          abi: OBSCURA_CONFIDENTIAL_ESCROW_ABI,
          functionName: 'redeem',
          args: [escrowId],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 1_200_000n,
        });
        await publicClient.waitForTransactionReceipt({ hash });
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

  const cancel = useCallback(
    async (escrowId: bigint) => {
      if (!publicClient || !OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }
      try {
        fheStatus.setStep(FHEStepStatus.COMPUTING);
        const fees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
        const hash = await writeContractAsync({
          address: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
          abi: OBSCURA_CONFIDENTIAL_ESCROW_ABI,
          functionName: 'cancel',
          args: [escrowId],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 600_000n,
        });
        await publicClient.waitForTransactionReceipt({ hash });
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

  /** Check whether an escrow exists on the new contract. */
  const checkExists = useCallback(
    async (escrowId: bigint): Promise<boolean> => {
      if (!publicClient || !OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS) return false;
      try {
        const result = await publicClient.readContract({
          address: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
          abi: OBSCURA_CONFIDENTIAL_ESCROW_ABI,
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

  /** True if a saved escrow record points at the deprecated Reineira proxy. */
  const isLegacyRecord = useCallback(
    (e: SavedEscrow): boolean => {
      if (e.legacy === true) return true;
      if (!e.contract) {
        // Pre-fix records have no `contract` field — assume legacy if the
        // env still has the Reineira address configured.
        return Boolean(REINEIRA_ESCROW_ADDRESS);
      }
      return e.contract.toLowerCase() === (REINEIRA_ESCROW_ADDRESS ?? '').toLowerCase();
    },
    []
  );

  return {
    create,
    fund,
    redeem,
    cancel,
    checkExists,
    isLegacyRecord,
    txHash,
    isTxPending,
    escrows,
    lastEscrowId,
    ...fheStatus,
  };
}

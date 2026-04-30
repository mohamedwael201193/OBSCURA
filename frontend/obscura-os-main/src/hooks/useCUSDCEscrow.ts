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
 *   the present InEuint64 overload (0x7edb0e7d inbound) and uint256
 *   handle outbound (0xfe3f670d). End-to-end working.
 *
 *   Address (Arbitrum Sepolia): 0xF893F3c1603E0E9B01be878a0E7e369fF704CCF1
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
   * Create + fund an escrow against ObscuraConfidentialEscrow.
   *
   * IMPORTANT — three-tx funding model:
   *   CoFHE rejects InEuint64 proofs forwarded through an intermediary
   *   contract (`InvalidSigner(address,address)` selector 0x7ba5ffb5). So
   *   the escrow CANNOT proxy `cUSDC.confidentialTransferFrom`. Instead
   *   we run three sequential transactions, each consuming a fresh
   *   single-use InEuint64:
   *     1. escrow.create(encOwner, encAmountForEscrow, resolver, data)
   *        → returns escrowId
   *     2. cUSDC.confidentialTransfer(escrowAddr, encAmountForCUSDC)
   *        → user transfers cUSDC directly to the escrow contract's
   *          confidential balance (immediate caller = user → CoFHE accepts)
   *     3. escrow.fund(escrowId, encAmountForRecord)
   *        → escrow consumes the proof itself (immediate caller = escrow
   *          → CoFHE accepts) and increments paidAmount homomorphically
   */
  const create = useCallback(
    async (
      ownerAddress: `0x${string}`,
      amount: bigint,
      resolver: `0x${string}`,
      resolverData: `0x${string}` = '0x',
      expiryBlock: bigint = 0n
    ) => {
      if (!publicClient || !walletClient || !OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS || !REINEIRA_CUSDC_ADDRESS) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);
        await initFHEClient(publicClient, walletClient);

        // Encryption #1: (ownerAddress, amount) for escrow.create()
        const encryptedInputs = await encryptAddressAndAmount(
          ownerAddress,
          amount,
          (step) => console.log('[FHE Escrow Encrypt #1 create]', step)
        );

        fheStatus.setStep(FHEStepStatus.COMPUTING);

        // ── 1. escrow.create ──
        const createFees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
        const hash = await withRateLimitRetry(() => writeContractAsync({
          address: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
          abi: OBSCURA_CONFIDENTIAL_ESCROW_ABI,
          functionName: expiryBlock > 0n ? 'createWithExpiry' : 'create',
          args: expiryBlock > 0n
            ? [
                encryptedInputs[0],
                encryptedInputs[1],
                resolver,
                resolverData,
                expiryBlock,
              ]
            : [
                encryptedInputs[0],
                encryptedInputs[1],
                resolver,
                resolverData,
              ],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: createFees.maxFeePerGas,
          maxPriorityFeePerGas: createFees.maxPriorityFeePerGas,
          gas: 1_200_000n,
        }));

        const receipt = await withRateLimitRetry(() => publicClient.waitForTransactionReceipt({ hash }));
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

        // ── 2. cUSDC.confidentialTransfer(escrow, amount) ──
        // Direct user → escrow transfer. CoFHE proof's immediate caller
        // is the user, which matches the proof's recovered signer.
        try {
          // Wait for the create tx's CoFHE state to settle before the
          // next encryption (the proof commit window).
          await new Promise((r) => setTimeout(r, 8000));
          const transferEnc = await encryptAmount(amount, (step) =>
            console.log('[FHE Escrow Encrypt #2 cUSDC transfer]', step)
          );
          const transferFees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
          const transferHash = await withRateLimitRetry(() => writeContractAsync({
            address: REINEIRA_CUSDC_ADDRESS,
            abi: REINEIRA_CUSDC_ABI,
            functionName: 'confidentialTransfer',
            args: [OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS, transferEnc[0]],
            account: address,
            chain: arbitrumSepolia,
            maxFeePerGas: transferFees.maxFeePerGas,
            maxPriorityFeePerGas: transferFees.maxPriorityFeePerGas,
            gas: 600_000n,
          }));
          const transferReceipt = await withRateLimitRetry(() =>
            publicClient.waitForTransactionReceipt({ hash: transferHash })
          );
          if (transferReceipt.status !== 'success') {
            throw new Error(`cUSDC transfer to escrow reverted (hash: ${transferHash})`);
          }
          console.log('[Escrow] cUSDC transferred to escrow', escrowId, transferHash);

          // ── 3. escrow.fund(escrowId, amount) ── (record only)
          await new Promise((r) => setTimeout(r, 8000));
          const fundEnc = await encryptAmount(amount, (step) =>
            console.log('[FHE Escrow Encrypt #3 fund record]', step)
          );
          const fundFees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
          const fundHash = await withRateLimitRetry(() => writeContractAsync({
            address: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
            abi: OBSCURA_CONFIDENTIAL_ESCROW_ABI,
            functionName: 'fund',
            args: [BigInt(escrowId), fundEnc[0]],
            account: address,
            chain: arbitrumSepolia,
            maxFeePerGas: fundFees.maxFeePerGas,
            maxPriorityFeePerGas: fundFees.maxPriorityFeePerGas,
            gas: 800_000n,
          }));
          const fundReceipt = await withRateLimitRetry(() =>
            publicClient.waitForTransactionReceipt({ hash: fundHash })
          );
          if (fundReceipt.status !== 'success') {
            throw new Error(`escrow.fund record tx reverted (hash: ${fundHash})`);
          }
          console.log('[Escrow] paidAmount recorded', escrowId, fundHash);
        } catch (fundErr) {
          const msg = fundErr instanceof Error ? fundErr.message : String(fundErr);
          console.error('[Escrow] funding failed:', fundErr);
          fheStatus.setStep(
            FHEStepStatus.ERROR,
            `Escrow #${escrowId} created but funding FAILED: ${msg}. Use the Fund button in My Escrows to retry, or Cancel to discard.`
          );
          throw new Error(`Escrow #${escrowId} created but funding failed. ${msg}`);
        }

        fheStatus.setStep(FHEStepStatus.READY);
        return hash;
      } catch (error) {
        fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
        throw error;
      }
    },
    [publicClient, walletClient, writeContractAsync, address, fheStatus]
  );

  /**
   * Manual fund() — two transactions:
   *   1. cUSDC.confidentialTransfer(escrow, amount)
   *   2. escrow.fund(escrowId, amount) (record only)
   */
  const fund = useCallback(
    async (escrowId: bigint, amount: bigint) => {
      if (!publicClient || !walletClient || !OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS || !REINEIRA_CUSDC_ADDRESS) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }
      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);
        await initFHEClient(publicClient, walletClient);

        // ── 1. cUSDC transfer ──
        const transferEnc = await encryptAmount(amount, (step) =>
          console.log('[FHE Fund Encrypt #1 cUSDC]', step)
        );
        fheStatus.setStep(FHEStepStatus.COMPUTING);
        const tFees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
        const transferHash = await withRateLimitRetry(() => writeContractAsync({
          address: REINEIRA_CUSDC_ADDRESS,
          abi: REINEIRA_CUSDC_ABI,
          functionName: 'confidentialTransfer',
          args: [OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS, transferEnc[0]],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: tFees.maxFeePerGas,
          maxPriorityFeePerGas: tFees.maxPriorityFeePerGas,
          gas: 600_000n,
        }));
        const transferReceipt = await withRateLimitRetry(() =>
          publicClient.waitForTransactionReceipt({ hash: transferHash })
        );
        if (transferReceipt.status !== 'success') {
          throw new Error(`cUSDC transfer to escrow reverted (hash: ${transferHash})`);
        }

        // ── 2. escrow.fund record ──
        await new Promise((r) => setTimeout(r, 8000));
        const recEnc = await encryptAmount(amount, (step) =>
          console.log('[FHE Fund Encrypt #2 record]', step)
        );
        const fFees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
        const hash = await withRateLimitRetry(() => writeContractAsync({
          address: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
          abi: OBSCURA_CONFIDENTIAL_ESCROW_ABI,
          functionName: 'fund',
          args: [escrowId, recEnc[0]],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fFees.maxFeePerGas,
          maxPriorityFeePerGas: fFees.maxPriorityFeePerGas,
          gas: 800_000n,
        }));
        const receipt = await withRateLimitRetry(() => publicClient.waitForTransactionReceipt({ hash }));
        if (receipt.status !== 'success') {
          throw new Error(`escrow.fund record reverted (hash: ${hash})`);
        }
        setTxHash(hash);
        fheStatus.setStep(FHEStepStatus.READY);
        return hash;
      } catch (error) {
        fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
        throw error;
      }
    },
    [publicClient, walletClient, writeContractAsync, address, fheStatus]
  );

  const redeem = useCallback(
    async (escrowId: bigint) => {
      if (!publicClient || !OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }
      try {
        fheStatus.setStep(FHEStepStatus.COMPUTING);

        // Simulate first to surface a real revert reason. Redeem takes
        // no encrypted inputs — only a uint256 escrowId — so eth_call is
        // safe here (unlike fund/create which take InEuint64).
        try {
          await publicClient.simulateContract({
            address: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
            abi: OBSCURA_CONFIDENTIAL_ESCROW_ABI,
            functionName: 'redeem',
            args: [escrowId],
            account: address,
          });
        } catch (simErr) {
          const msg = (simErr as Error).message || String(simErr);
          // CoFHE FHE.select / asEaddress eth_call sometimes reverts even when
          // the real tx will succeed (TaskManager isn't fully reachable from
          // eth_call). Only abort on Solidity require strings we recognize.
          if (/no escrow|cancelled|condition/i.test(msg)) {
            throw new Error(`Redeem cannot proceed: ${msg.split('\n')[0]}`);
          }
          console.warn('[Redeem] simulate failed (non-blocking, likely CoFHE eth_call quirk):', msg.slice(0, 200));
        }

        const fees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
        const hash = await withRateLimitRetry(() => writeContractAsync({
          address: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
          abi: OBSCURA_CONFIDENTIAL_ESCROW_ABI,
          functionName: 'redeem',
          args: [escrowId],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          // Redeem performs many FHE ops (asEaddress, eq, gte, not, and×2,
          // asEuint64, select×2, asEbool, allowThis×2, allow, allowTransient)
          // plus a cUSDC.confidentialTransfer sub-call. 1.2M was insufficient
          // → 3M gives ample headroom on Arbitrum (gas is cheap).
          gas: 3_000_000n,
        }));
        const receipt = await withRateLimitRetry(() => publicClient.waitForTransactionReceipt({ hash }));
        if (receipt.status !== 'success') {
          throw new Error(
            `Redeem reverted on-chain (tx: ${hash}). ` +
            `Common causes: (1) you are not the encrypted recipient of this escrow, ` +
            `(2) the escrow has not been fully funded yet, (3) it was already redeemed.`
          );
        }
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
          // Cancel does only one cUSDC.confidentialTransfer + one
          // FHE.allowTransient. 1.5M gives headroom over the previous
          // 600k which sometimes ran tight on CoFHE compute.
          gas: 1_500_000n,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') {
          throw new Error(`Cancel reverted on-chain (tx: ${hash})`);
        }
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

  /** Permissionless refund — callable by anyone after expiryBlock. */
  const refund = useCallback(
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
          functionName: 'refund',
          args: [escrowId],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 1_500_000n,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') {
          throw new Error(`Refund reverted on-chain (tx: ${hash}). The escrow may not yet be expired or has already been refunded/cancelled.`);
        }
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

  /** Read on-chain expiry block (0 = no expiry). */
  const getExpiryBlock = useCallback(
    async (escrowId: bigint): Promise<bigint> => {
      if (!publicClient || !OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS) return 0n;
      try {
        const r = await publicClient.readContract({
          address: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
          abi: OBSCURA_CONFIDENTIAL_ESCROW_ABI,
          functionName: 'getExpiryBlock',
          args: [escrowId],
        });
        return r as bigint;
      } catch { return 0n; }
    },
    [publicClient]
  );

  /**
   * createBatch — confidential payroll. Encrypts N (recipient, amount)
   * pairs client-side then submits a single transaction creating N escrows
   * sharing one resolver + expiry. Funding is still per-escrow (CoFHE
   * proofs cannot be batched), so this returns the escrow IDs and the
   * caller is responsible for funding each via fund().
   *
   * Cap: 20 entries per tx (contract enforces).
   */
  const createBatch = useCallback(
    async (
      rows: Array<{ recipient: `0x${string}`; amount: bigint }>,
      resolver: `0x${string}` = '0x0000000000000000000000000000000000000000',
      resolverData: `0x${string}` = '0x',
      expiryBlock: bigint = 0n
    ): Promise<{ ids: string[]; hash: `0x${string}` }> => {
      if (!publicClient || !walletClient || !OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }
      if (rows.length === 0 || rows.length > 20) {
        throw new Error('Batch size must be 1..20');
      }
      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);
        await initFHEClient(publicClient, walletClient);

        // Encrypt all rows. Each call produces [encOwner, encAmount].
        const encOwners: unknown[] = [];
        const encAmounts: unknown[] = [];
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const enc = await encryptAddressAndAmount(r.recipient, r.amount, (s) =>
            console.log(`[Batch encrypt #${i + 1}/${rows.length}]`, s)
          );
          encOwners.push(enc[0]);
          encAmounts.push(enc[1]);
          // Brief pacing between proofs.
          if (i < rows.length - 1) await new Promise((r) => setTimeout(r, 1500));
        }

        fheStatus.setStep(FHEStepStatus.COMPUTING);
        const fees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
        // Gas budget: ~600k per createBatch entry as a safe upper bound
        // (each does ~6 FHE ops + storage write). Floor of 1.2M for n=1.
        const gasBudget = BigInt(Math.max(1_200_000, rows.length * 600_000));

        const hash = await withRateLimitRetry(() => writeContractAsync({
          address: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
          abi: OBSCURA_CONFIDENTIAL_ESCROW_ABI,
          functionName: 'createBatch',
          args: [encOwners, encAmounts, resolver, resolverData, expiryBlock],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: gasBudget,
        }));

        const receipt = await withRateLimitRetry(() =>
          publicClient.waitForTransactionReceipt({ hash })
        );
        // Parse EscrowCreated logs to extract ids in order.
        const ids: string[] = [];
        for (const log of receipt.logs) {
          if (
            log.address.toLowerCase() === OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS.toLowerCase() &&
            log.topics.length >= 2 &&
            log.topics[1]
          ) {
            ids.push(BigInt(log.topics[1]).toString());
          }
        }

        // Persist each row in localStorage so My Escrows shows them.
        for (let i = 0; i < ids.length && i < rows.length; i++) {
          saveEscrow(address, {
            escrowId: ids[i],
            amount: rows[i].amount.toString(),
            recipient: rows[i].recipient,
            resolver,
            txHash: hash,
            createdAt: Date.now(),
            contract: OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS,
          });
        }
        setEscrows(loadEscrows(address));

        setTxHash(hash);
        fheStatus.setStep(FHEStepStatus.READY);
        return { ids, hash };
      } catch (err) {
        fheStatus.setStep(FHEStepStatus.ERROR, (err as Error).message);
        throw err;
      }
    },
    [publicClient, walletClient, writeContractAsync, address, fheStatus]
  );

  return {
    create,
    createBatch,
    fund,
    redeem,
    cancel,
    refund,
    checkExists,
    getExpiryBlock,
    isLegacyRecord,
    txHash,
    isTxPending,
    escrows,
    lastEscrowId,
    ...fheStatus,
  };
}

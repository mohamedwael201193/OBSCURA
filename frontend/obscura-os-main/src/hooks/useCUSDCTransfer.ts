import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { REINEIRA_CUSDC_ADDRESS, REINEIRA_CUSDC_ABI } from '@/config/pay';
import { FHEStepStatus } from '@/lib/constants';
import { useFHEStatus } from './useFHEStatus';
import { initFHEClient, encryptAmount } from '@/lib/fhe';
import { arbitrumSepolia } from 'viem/chains';

/** Retry helper for RPC rate-limit errors — exponential backoff */
async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 5000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = ((e as Error).message || "").toLowerCase();
      const isRateLimit = msg.includes("rate limit") || msg.includes("rate-limit") || msg.includes("429");
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelayMs * (attempt + 1);
        console.warn(`[Transfer RPC rate-limit] retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw new Error("Max retries exceeded");
}

export function useCUSDCTransfer() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const fheStatus = useFHEStatus();
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync, isPending: isTxPending } = useWriteContract();

  const transfer = useCallback(
    async (to: `0x${string}`, amount: bigint) => {
      if (!publicClient || !walletClient || !REINEIRA_CUSDC_ADDRESS) {
        throw new Error('Wallet not connected or cUSDC contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);
        await initFHEClient(publicClient, walletClient);

        const encryptedInputs = await encryptAmount(amount, (step) => {
          console.log('[FHE cUSDC Transfer Encrypt]', step);
        });

        fheStatus.setStep(FHEStepStatus.COMPUTING);

        // Fetch gas with retry, then call wallet exactly once (no retry on writeContractAsync)
        const feeData = await withRateLimitRetry(() => publicClient.estimateFeesPerGas());
        const maxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * 130n) / 100n
          : undefined;

        const hash = await writeContractAsync({
          address: REINEIRA_CUSDC_ADDRESS,
          abi: REINEIRA_CUSDC_ABI,
          functionName: 'confidentialTransfer',
          args: [to, encryptedInputs[0]],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas,
          gas: 500_000n,
        });

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

  const setOperator = useCallback(
    async (operator: `0x${string}`, expiry: number) => {
      if (!REINEIRA_CUSDC_ADDRESS || !address) {
        throw new Error('Wallet not connected or cUSDC contract not configured');
      }

      const feeData = await publicClient!.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * 130n) / 100n
        : undefined;

      const hash = await writeContractAsync({
        address: REINEIRA_CUSDC_ADDRESS,
        abi: REINEIRA_CUSDC_ABI,
        functionName: 'setOperator',
        args: [operator, expiry],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas,
        gas: 150_000n,
      });

      setTxHash(hash);
      return hash;
    },
    [publicClient, writeContractAsync, address]
  );

  return {
    transfer,
    setOperator,
    txHash,
    isTxPending,
    ...fheStatus,
  };
}

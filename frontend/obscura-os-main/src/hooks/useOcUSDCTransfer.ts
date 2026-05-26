import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { type Hex } from 'viem';
import { CONFIDENTIAL_TOKEN_ABI } from '@/config/credit';
import { OBSCURA_PAY_OCUSDC_ADDRESS } from '@/config/payV3';
import { FHEStepStatus } from '@/lib/constants';
import { useFHEStatus } from './useFHEStatus';
import { initFHEClient, encryptAmount } from '@/lib/fhe';
import { arbitrumSepolia } from 'viem/chains';
import { usePaymentMode } from '@/contexts/PaymentModeContext';

export const SMART_FHE_TRANSFER_UNSUPPORTED_MESSAGE =
  'Public Mode cannot send encrypted ocUSDC. Encrypted amounts must be authorized by the wallet that owns them, so switch to Private Mode for this send.';

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

export function useOcUSDCTransfer() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const fheStatus = useFHEStatus();
  const [txHash, setTxHash] = useState<string | null>(null);
  const { writeContractAsync, isPending: isTxPending } = useWriteContract();

  const { mode: paymentMode } = usePaymentMode();

  /**
   * Check whether the smart account is an approved operator on the Pay ocUSDC.
   * Operator approval is required once before the smart account can call
   * confidentialTransferFrom on behalf of the EOA.
   */
  const checkIsOperator = useCallback(
    async (smartAddr: `0x${string}`): Promise<boolean> => {
      if (!publicClient || !address || !OBSCURA_PAY_OCUSDC_ADDRESS) return false;
      try {
        const result = await publicClient.readContract({
          address: OBSCURA_PAY_OCUSDC_ADDRESS,
          abi: CONFIDENTIAL_TOKEN_ABI,
          functionName: 'isOperator',
          args: [address, smartAddr], // isOperator(holder, spender)
        });
        return result as boolean;
      } catch {
        return false;
      }
    },
    [publicClient, address]
  );

  /**
   * Approve the smart account as an operator on Pay ocUSDC.
   * This opens MetaMask ONCE and sets a 1-year expiry.
   * After this, all transfers in smart mode use passkey — no MetaMask.
   */
  const approveSmartOperator = useCallback(
    async (smartAddr: `0x${string}`) => {
      if (!OBSCURA_PAY_OCUSDC_ADDRESS || !address || !publicClient) return;
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 3600);
      const feeData = await publicClient.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * 130n) / 100n
        : undefined;
      const hash = await writeContractAsync({
        address: OBSCURA_PAY_OCUSDC_ADDRESS,
        abi: CONFIDENTIAL_TOKEN_ABI,
        functionName: 'setOperator',
        args: [smartAddr, expiry],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas,
        gas: 150_000n,
      });
      // Wait for confirmation so operator is active before the next sendUserOp
      await publicClient.waitForTransactionReceipt({ hash });
    },
    [publicClient, writeContractAsync, address]
  );

  const transfer = useCallback(
    async (to: `0x${string}`, amount: bigint) => {
      if (!publicClient || !walletClient || !OBSCURA_PAY_OCUSDC_ADDRESS) {
        throw new Error('Wallet not connected or ocUSDC contract not configured');
      }

      const isSmartRequested = paymentMode === 'smart';

      if (isSmartRequested) {
        throw new Error(SMART_FHE_TRANSFER_UNSUPPORTED_MESSAGE);
      }

      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);
        await initFHEClient(publicClient, walletClient);

        const encryptedInputs = await encryptAmount(amount, (step) => {
          if (import.meta.env.DEV) console.log('[FHE ocUSDC Transfer Encrypt]', step);
        });

        fheStatus.setStep(FHEStepStatus.COMPUTING);

        let hash: Hex;

        const feeData = await withRateLimitRetry(() => publicClient.estimateFeesPerGas());
        const maxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * 130n) / 100n
          : undefined;

        hash = await writeContractAsync({
          address: OBSCURA_PAY_OCUSDC_ADDRESS,
          abi: CONFIDENTIAL_TOKEN_ABI,
          functionName: 'confidentialTransfer',
          args: [to, encryptedInputs[0]],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas,
          gas: 500_000n,
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === 'reverted') throw new Error('ocUSDC transfer reverted');

        setTxHash(hash);
        fheStatus.setStep(FHEStepStatus.READY);
        return hash;
      } catch (error) {
        fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
        throw error;
      }
    },
    [
      publicClient, walletClient, writeContractAsync, address, fheStatus,
      paymentMode,
    ]
  );

  const setOperator = useCallback(
    async (operator: `0x${string}`, expiry: number) => {
      if (!OBSCURA_PAY_OCUSDC_ADDRESS || !address) {
        throw new Error('Wallet not connected or ocUSDC contract not configured');
      }

      const feeData = await publicClient!.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * 130n) / 100n
        : undefined;

      const hash = await writeContractAsync({
        address: OBSCURA_PAY_OCUSDC_ADDRESS,
        abi: CONFIDENTIAL_TOKEN_ABI,
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
    checkIsOperator,
    approveSmartOperator,
    txHash,
    isTxPending,
    ...fheStatus,
  };
}

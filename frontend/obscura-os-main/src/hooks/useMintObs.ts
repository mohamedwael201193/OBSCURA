import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { OBSCURA_TOKEN_ABI, OBSCURA_TOKEN_ADDRESS } from '@/config/contracts';
import { FHEStepStatus } from '@/lib/constants';
import { useFHEStatus } from './useFHEStatus';
import { initFHEClient, encryptAmount } from '@/lib/fhe';
import { arbitrumSepolia } from 'viem/chains';

export function useMintObs() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const fheStatus = useFHEStatus();
  const [txHash, setTxHash] = useState<string | null>(null);
  const { writeContractAsync, isPending: isTxPending } = useWriteContract();

  const mintObs = useCallback(
    async (recipient: `0x${string}`, amount: bigint) => {
      if (!publicClient || !walletClient || !OBSCURA_TOKEN_ADDRESS) {
        throw new Error('Wallet not connected or token contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);

        await initFHEClient(publicClient, walletClient);

        const encryptedInputs = await encryptAmount(amount, (step) => {
          console.log('[FHE Mint Encrypt Step]', step);
        });

        fheStatus.setStep(FHEStepStatus.COMPUTING);

        // Fetch fresh fee data and apply a 30% buffer to avoid "max fee < base fee" reverts
        const feeData = await publicClient.estimateFeesPerGas();
        const maxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * 130n) / 100n
          : undefined;

        const hash = await writeContractAsync({
          address: OBSCURA_TOKEN_ADDRESS,
          abi: OBSCURA_TOKEN_ABI,
          functionName: 'mint',
          args: [recipient, encryptedInputs[0]],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas,
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

  return { mintObs, txHash, isTxPending, ...fheStatus };
}

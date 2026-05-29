import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { OBSCURA_VOTE_ABI, OBSCURA_VOTE_ADDRESS } from '@/config/contracts';
import { FHEStepStatus } from '@/lib/constants';
import { useFHEStatus } from './useFHEStatus';
import { initFHEClient, encryptAmount } from '@/lib/fhe';
import { arbitrumSepolia } from 'viem/chains';

export function useEncryptedVote() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const fheStatus = useFHEStatus();
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync, isPending: isTxPending } = useWriteContract();

  const castVote = useCallback(
    async (proposalId: bigint, optionIndex: number) => {
      if (!publicClient || !walletClient || !OBSCURA_VOTE_ADDRESS) {
        throw new Error('Wallet not connected or contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);

        // Initialize FHE client if needed
        await initFHEClient(publicClient, walletClient);

        // Encrypt option index (0-based)
        const encryptedInputs = await encryptAmount(BigInt(optionIndex), (step) => {
          if (import.meta.env.DEV) console.log('[FHE Vote Encrypt Step]', step);
        });

        fheStatus.setStep(FHEStepStatus.COMPUTING);

        // Fetch current base fee and build safe fee params
        const block = await publicClient.getBlock();
        const baseFee = block.baseFeePerGas ?? 20_000_000n;
        const maxFeePerGas = baseFee * 3n;
        const maxPriorityFeePerGas = baseFee;

        // Submit encrypted vote to contract
        fheStatus.setStep(FHEStepStatus.SENDING);
        const hash = await writeContractAsync({
          address: OBSCURA_VOTE_ADDRESS,
          abi: OBSCURA_VOTE_ABI,
          functionName: 'castVote',
          args: [proposalId, encryptedInputs[0]],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas,
          maxPriorityFeePerGas,
          gas: 3_000_000n,
        });

        setTxHash(hash);
        fheStatus.setStep(FHEStepStatus.SETTLING);
        // Resolve once the tx is broadcast so the UI can show success immediately.
        // Receipt confirmation continues in the background (WalletConnect can be slow).
        void publicClient
          .waitForTransactionReceipt({ hash })
          .then((receipt) => {
            if (receipt.status !== 'success') {
              fheStatus.setStep(FHEStepStatus.ERROR, 'Vote transaction reverted');
              return;
            }
            fheStatus.setStep(FHEStepStatus.READY);
          })
          .catch((err: unknown) => {
            fheStatus.setStep(FHEStepStatus.ERROR, (err as Error).message);
          });

        return hash;
      } catch (error) {
        fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
        throw error;
      }
    },
    [publicClient, walletClient, writeContractAsync, address, fheStatus]
  );

  return {
    castVote,
    txHash,
    isTxPending,
    ...fheStatus,
  };
}

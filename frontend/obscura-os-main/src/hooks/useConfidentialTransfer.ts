import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { OBSCURA_TOKEN_ABI, OBSCURA_TOKEN_ADDRESS } from '@/config/contracts';
import { FHEStepStatus } from '@/lib/constants';
import { useFHEStatus } from './useFHEStatus';
import { initFHEClient, encryptAmount } from '@/lib/fhe';
import { estimateCappedFees } from '@/lib/gas';
import { arbitrumSepolia } from 'viem/chains';

export function useConfidentialTransfer() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const fheStatus = useFHEStatus();
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync, isPending: isTxPending } = useWriteContract();

  const transfer = useCallback(
    async (to: `0x${string}`, amount: bigint) => {
      if (!publicClient || !walletClient || !OBSCURA_TOKEN_ADDRESS) {
        throw new Error('Wallet not connected or token contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);
        await initFHEClient(publicClient, walletClient);

        const encryptedInputs = await encryptAmount(amount, (step) => {
          console.log('[FHE Transfer Encrypt]', step);
        });

        fheStatus.setStep(FHEStepStatus.COMPUTING);

        const fees = await estimateCappedFees(publicClient);

        const hash = await writeContractAsync({
          address: OBSCURA_TOKEN_ADDRESS,
          abi: OBSCURA_TOKEN_ABI,
          functionName: 'confidentialTransfer',
          args: [to, encryptedInputs[0]],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
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
    async (operator: `0x${string}`, expiry: bigint) => {
      if (!OBSCURA_TOKEN_ADDRESS || !address) {
        throw new Error('Wallet not connected or token contract not configured');
      }

      const fees = await estimateCappedFees(publicClient!);

      const hash = await writeContractAsync({
        address: OBSCURA_TOKEN_ADDRESS,
        abi: OBSCURA_TOKEN_ABI,
        functionName: 'setOperator',
        args: [operator, expiry],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
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

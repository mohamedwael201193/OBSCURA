import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient, useWalletClient, useAccount, useReadContract } from 'wagmi';
import { OBSCURA_ESCROW_ABI, OBSCURA_ESCROW_ADDRESS } from '@/config/contracts';
import { FHEStepStatus } from '@/lib/constants';
import { useFHEStatus } from './useFHEStatus';
import { initFHEClient, encryptAmount, encryptAddressAndAmount, decryptBalance, getOrCreatePermit } from '@/lib/fhe';
import { arbitrumSepolia } from 'viem/chains';
import { encodeAbiParameters } from 'viem';

export function useConfidentialEscrow() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const fheStatus = useFHEStatus();
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync, isPending: isTxPending } = useWriteContract();

  // Read escrow count
  const { data: escrowCount, refetch: refetchCount } = useReadContract({
    address: OBSCURA_ESCROW_ADDRESS,
    abi: OBSCURA_ESCROW_ABI,
    functionName: 'getEscrowCount',
    query: { enabled: !!OBSCURA_ESCROW_ADDRESS },
  });

  const createEscrow = useCallback(
    async (
      ownerAddress: `0x${string}`,
      amount: bigint,
      resolver: `0x${string}` | null,
      conditionType?: number,
      conditionParam?: bigint
    ) => {
      if (!publicClient || !walletClient || !OBSCURA_ESCROW_ADDRESS) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);
        await initFHEClient(publicClient, walletClient);

        // Encrypt owner address and amount in one batch
        const encryptedInputs = await encryptAddressAndAmount(
          ownerAddress,
          amount,
          (step) => console.log('[FHE Escrow Encrypt]', step)
        );

        fheStatus.setStep(FHEStepStatus.COMPUTING);

        // Build resolver data
        let resolverData: `0x${string}` = '0x';
        if (resolver && conditionType !== undefined && conditionParam !== undefined) {
          // Must use standard ABI encoding (not packed) — Solidity abi.decode expects 32-byte aligned words
          resolverData = encodeAbiParameters(
            [{ type: 'uint8' }, { type: 'uint256' }],
            [conditionType, conditionParam]
          );
        }

        const feeData = await publicClient.estimateFeesPerGas();
        const maxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * 130n) / 100n
          : undefined;

        const hash = await writeContractAsync({
          address: OBSCURA_ESCROW_ADDRESS,
          abi: OBSCURA_ESCROW_ABI,
          functionName: 'createEscrow',
          args: [
            encryptedInputs[0], // encrypted owner address
            encryptedInputs[1], // encrypted amount
            resolver ?? '0x0000000000000000000000000000000000000000',
            resolverData,
          ],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas,
          gas: 1_200_000n,
        });

        setTxHash(hash);
        fheStatus.setStep(FHEStepStatus.READY);
        refetchCount();
        return hash;
      } catch (error) {
        fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
        throw error;
      }
    },
    [publicClient, walletClient, writeContractAsync, address, fheStatus, refetchCount]
  );

  const fundEscrow = useCallback(
    async (escrowId: bigint, amount: bigint) => {
      if (!publicClient || !walletClient || !OBSCURA_ESCROW_ADDRESS) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);
        await initFHEClient(publicClient, walletClient);

        const encryptedInputs = await encryptAmount(amount, (step) => {
          console.log('[FHE Fund Encrypt]', step);
        });

        fheStatus.setStep(FHEStepStatus.COMPUTING);

        const feeData = await publicClient.estimateFeesPerGas();
        const maxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * 130n) / 100n
          : undefined;

        const hash = await writeContractAsync({
          address: OBSCURA_ESCROW_ADDRESS,
          abi: OBSCURA_ESCROW_ABI,
          functionName: 'fundEscrow',
          args: [escrowId, encryptedInputs[0]],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas,
          gas: 600_000n,
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

  const redeemEscrow = useCallback(
    async (escrowId: bigint) => {
      if (!publicClient || !walletClient || !OBSCURA_ESCROW_ADDRESS) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.COMPUTING);

        const feeData = await publicClient.estimateFeesPerGas();
        const maxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * 130n) / 100n
          : undefined;

        const hash = await writeContractAsync({
          address: OBSCURA_ESCROW_ADDRESS,
          abi: OBSCURA_ESCROW_ABI,
          functionName: 'redeemEscrow',
          args: [escrowId],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas,
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
    [publicClient, walletClient, writeContractAsync, address, fheStatus]
  );

  const cancelEscrow = useCallback(
    async (escrowId: bigint) => {
      if (!OBSCURA_ESCROW_ADDRESS || !address) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.COMPUTING);

        const feeData = await publicClient!.estimateFeesPerGas();
        const maxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * 130n) / 100n
          : undefined;

        const hash = await writeContractAsync({
          address: OBSCURA_ESCROW_ADDRESS,
          abi: OBSCURA_ESCROW_ABI,
          functionName: 'cancelEscrow',
          args: [escrowId],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas,
          gas: 200_000n,
        });

        setTxHash(hash);
        fheStatus.setStep(FHEStepStatus.READY);
        refetchCount();
        return hash;
      } catch (error) {
        fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
        throw error;
      }
    },
    [publicClient, writeContractAsync, address, fheStatus, refetchCount]
  );

  return {
    createEscrow,
    fundEscrow,
    redeemEscrow,
    cancelEscrow,
    escrowCount: escrowCount as bigint | undefined,
    txHash,
    isTxPending,
    ...fheStatus,
  };
}

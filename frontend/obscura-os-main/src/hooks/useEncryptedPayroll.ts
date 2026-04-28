import { useState, useCallback } from 'react';
import { useWriteContract, usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { OBSCURA_PAY_ABI, OBSCURA_PAY_ADDRESS } from '@/config/contracts';
import { FHEStepStatus } from '@/lib/constants';
import { useFHEStatus } from './useFHEStatus';
import { initFHEClient, encryptAmount } from '@/lib/fhe';
import { estimateCappedFees } from '@/lib/gas';
import { arbitrumSepolia } from 'viem/chains';

export function useEncryptedPayroll() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const fheStatus = useFHEStatus();
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync, isPending: isTxPending } = useWriteContract();

  const payEmployee = useCallback(
    async (employeeAddress: `0x${string}`, amount: bigint) => {
      if (!publicClient || !walletClient || !OBSCURA_PAY_ADDRESS) {
        throw new Error('Wallet not connected or contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);

        // Initialize FHE client if needed
        await initFHEClient(publicClient, walletClient);

        // Encrypt the salary amount client-side
        const encryptedInputs = await encryptAmount(amount, (step) => {
          console.log('[FHE Encrypt Step]', step);
        });

        fheStatus.setStep(FHEStepStatus.COMPUTING);

        // Fetch capped EIP-1559 fees (shared helper avoids tip > cap reverts).
        const fees = await estimateCappedFees(publicClient);

        // Send encrypted salary to contract
        const hash = await writeContractAsync({
          address: OBSCURA_PAY_ADDRESS,
          abi: OBSCURA_PAY_ABI,
          functionName: 'payEmployee',
          args: [employeeAddress, encryptedInputs[0]],
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

  const batchPay = useCallback(
    async (employees: { address: `0x${string}`; amount: bigint }[]) => {
      if (!publicClient || !walletClient || !OBSCURA_PAY_ADDRESS) {
        throw new Error('Wallet not connected or contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.ENCRYPTING);

        // Initialize FHE client if needed
        await initFHEClient(publicClient, walletClient);

        // Encrypt all salary amounts
        const encryptedSalaries = [];
        for (const emp of employees) {
          const encrypted = await encryptAmount(emp.amount, (step) => {
            console.log('[FHE Batch Encrypt Step]', step);
          });
          encryptedSalaries.push(encrypted[0]);
        }

        fheStatus.setStep(FHEStepStatus.COMPUTING);

        // Fetch capped EIP-1559 fees.
        const batchFees = await estimateCappedFees(publicClient);

        const addresses = employees.map((e) => e.address);
        const hash = await writeContractAsync({
          address: OBSCURA_PAY_ADDRESS,
          abi: OBSCURA_PAY_ABI,
          functionName: 'batchPay',
          args: [addresses, encryptedSalaries],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: batchFees.maxFeePerGas,
          maxPriorityFeePerGas: batchFees.maxPriorityFeePerGas,
          gas: 3_000_000n,
        });

        setTxHash(hash);
        fheStatus.setStep(FHEStepStatus.READY);
        return hash;
      } catch (error) {
        fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
        throw error;
      }
    },
    [publicClient, walletClient, writeContractAsync, fheStatus]
  );

  return {
    payEmployee,
    batchPay,
    txHash,
    isTxPending,
    ...fheStatus,
  };
}

import { useState, useCallback, useEffect } from 'react';
import { useWriteContract, usePublicClient, useWalletClient, useAccount, useReadContract } from 'wagmi';
import {
  REINEIRA_CUSDC_ADDRESS,
  REINEIRA_CUSDC_ABI,
  REINEIRA_ESCROW_ADDRESS,
  REINEIRA_ESCROW_ABI,
} from '@/config/wave2';
import { FHEStepStatus } from '@/lib/constants';
import { useFHEStatus } from './useFHEStatus';
import { initFHEClient, encryptAmount, encryptAddressAndAmount } from '@/lib/fhe';
import { arbitrumSepolia } from 'viem/chains';

const STORAGE_KEY = 'obscura_cusdc_escrows';

export interface SavedEscrow {
  escrowId: string;
  amount: string;
  recipient: string;
  resolver: string;
  txHash: string;
  createdAt: number;
}

function loadEscrows(): SavedEscrow[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveEscrow(escrow: SavedEscrow) {
  const existing = loadEscrows();
  existing.unshift(escrow);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function useCUSDCEscrow() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const fheStatus = useFHEStatus();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [escrows, setEscrows] = useState<SavedEscrow[]>(loadEscrows);
  const [lastEscrowId, setLastEscrowId] = useState<string | null>(null);

  const { writeContractAsync, isPending: isTxPending } = useWriteContract();

  // Refresh escrows from localStorage periodically
  useEffect(() => {
    const interval = setInterval(() => setEscrows(loadEscrows()), 3000);
    const onStorage = () => setEscrows(loadEscrows());
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

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

        fheStatus.setStep(FHEStepStatus.COMPUTING);

        const feeData = await publicClient.estimateFeesPerGas();
        const maxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * 130n) / 100n
          : undefined;

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
          maxFeePerGas,
          gas: 1_200_000n,
        });

        // Parse escrow ID from tx receipt logs
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        let escrowId = '?';
        for (const log of receipt.logs) {
          // EscrowCreated(uint256 escrowId, ...) — topic[1] is the escrowId
          if (log.topics.length >= 2 && log.topics[1]) {
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
        saveEscrow(saved);
        setEscrows(loadEscrows());

        fheStatus.setStep(FHEStepStatus.READY);
        return hash;
      } catch (error) {
        fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
        throw error;
      }
    },
    [publicClient, walletClient, writeContractAsync, address, fheStatus]
  );

  const fund = useCallback(
    async (escrowId: bigint, amount: bigint) => {
      if (!publicClient || !walletClient || !REINEIRA_ESCROW_ADDRESS) {
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
          address: REINEIRA_ESCROW_ADDRESS,
          abi: REINEIRA_ESCROW_ABI,
          functionName: 'fund',
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

  const redeem = useCallback(
    async (escrowId: bigint) => {
      if (!publicClient || !REINEIRA_ESCROW_ADDRESS) {
        throw new Error('Wallet not connected or escrow contract not configured');
      }

      try {
        fheStatus.setStep(FHEStepStatus.COMPUTING);

        const feeData = await publicClient.estimateFeesPerGas();
        const maxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * 130n) / 100n
          : undefined;

        const hash = await writeContractAsync({
          address: REINEIRA_ESCROW_ADDRESS,
          abi: REINEIRA_ESCROW_ABI,
          functionName: 'redeem',
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

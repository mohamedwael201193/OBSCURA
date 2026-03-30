import { useState, useCallback } from 'react';
import { useReadContract, usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { OBSCURA_PAY_ABI, OBSCURA_PAY_ADDRESS } from '@/config/contracts';
import { FHEStepStatus } from '@/lib/constants';
import { useFHEStatus } from './useFHEStatus';
import { initFHEClient, decryptBalance, getOrCreatePermit } from '@/lib/fhe';
import { isCofheError, CofheErrorCode } from '@cofhe/sdk';

export function useDecryptBalance() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const fheStatus = useFHEStatus();
  const [decryptedBalance, setDecryptedBalance] = useState<bigint | null>(null);

  // Read the encrypted balance handle from contract
  // account: address is REQUIRED — getMyBalance() uses msg.sender; without it,
  // the eth_call has no `from` so msg.sender == address(0) and the call reverts.
  const {
    data: ctHash,
    refetch: refetchBalance,
    isLoading: isLoadingHandle,
  } = useReadContract({
    address: OBSCURA_PAY_ADDRESS,
    abi: OBSCURA_PAY_ABI,
    functionName: 'getMyBalance',
    account: address,
    query: { enabled: false }, // Only fetch on demand
  });

  const decrypt = useCallback(async () => {
    if (!publicClient || !walletClient || !OBSCURA_PAY_ADDRESS) {
      throw new Error('Wallet not connected or contract not configured');
    }

    try {
      fheStatus.setStep(FHEStepStatus.ENCRYPTING); // "Signing permit"

      // Initialize FHE client
      await initFHEClient(publicClient, walletClient);

      // Get or create EIP-712 permit
      await getOrCreatePermit();

      fheStatus.setStep(FHEStepStatus.COMPUTING); // "Fetching handle"

      // Fetch the ciphertext handle from contract
      const result = await refetchBalance();
      const handle = result.data;

      if (!handle) {
        throw new Error(
          'No payroll balance found. You need to receive a payment via ObscuraPay first (Employer tab → Pay Employee).'
        );
      }

      // Decrypt the handle
      const plaintext = await decryptBalance(handle, (step) => {
        console.log('[FHE Decrypt Step]', step);
      });

      setDecryptedBalance(plaintext);
      fheStatus.setStep(FHEStepStatus.READY);
      return plaintext;
    } catch (error) {
      let message = (error as Error).message ?? 'Unknown error';
      if (isCofheError(error)) {
        switch (error.code) {
          case CofheErrorCode.PermitNotFound:
          case CofheErrorCode.InvalidPermitData:
          case CofheErrorCode.InvalidPermitDomain:
            message = 'Permit expired or missing — please sign again.';
            break;
          case CofheErrorCode.DecryptFailed:
            message = 'Decryption rejected by the Threshold Network. Try again.';
            break;
          case CofheErrorCode.NotConnected:
            message = 'FHE client not connected — reconnect your wallet.';
            break;
          default:
            message = error.message;
        }
      }
      fheStatus.setStep(FHEStepStatus.ERROR, message);
      throw new Error(message);
    }
  }, [publicClient, walletClient, address, refetchBalance, fheStatus]);

  const reEncrypt = useCallback(() => {
    setDecryptedBalance(null);
    fheStatus.reset();
  }, [fheStatus]);

  return {
    ctHash: ctHash as bigint | undefined,
    decryptedBalance,
    decrypt,
    reEncrypt,
    isLoadingHandle,
    ...fheStatus,
  };
}
export function useDecryptAggregate() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const fheStatus = useFHEStatus();
  const [decryptedTotal, setDecryptedTotal] = useState<bigint | null>(null);

  const { data: aggregateHash, refetch: refetchAggregate } = useReadContract({
    address: OBSCURA_PAY_ADDRESS,
    abi: OBSCURA_PAY_ABI,
    functionName: 'getAggregateTotal',
    query: { enabled: false },
  });

  const decrypt = useCallback(async () => {
    if (!publicClient || !walletClient || !OBSCURA_PAY_ADDRESS) {
      throw new Error('Wallet not connected or contract not configured');
    }

    try {
      fheStatus.setStep(FHEStepStatus.ENCRYPTING);
      await initFHEClient(publicClient, walletClient);
      await getOrCreatePermit();

      fheStatus.setStep(FHEStepStatus.COMPUTING);
      const result = await refetchAggregate();
      const handle = result.data;
      if (!handle) throw new Error('No aggregate total found');

      const plaintext = await decryptBalance(handle, (step) => {
        console.log('[FHE Aggregate Decrypt Step]', step);
      });

      setDecryptedTotal(plaintext);
      fheStatus.setStep(FHEStepStatus.READY);
      return plaintext;
    } catch (error) {
      fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
      throw error;
    }
  }, [publicClient, walletClient, refetchAggregate, fheStatus]);

  const reset = useCallback(() => {
    setDecryptedTotal(null);
    fheStatus.reset();
  }, [fheStatus]);

  return {
    aggregateHash: aggregateHash as bigint | undefined,
    decryptedTotal,
    decrypt,
    reset,
    ...fheStatus,
  };
}

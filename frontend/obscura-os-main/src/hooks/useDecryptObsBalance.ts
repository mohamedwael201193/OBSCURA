import { useState, useCallback } from 'react';
import { useReadContract, usePublicClient, useWalletClient } from 'wagmi';
import { OBSCURA_TOKEN_ABI, OBSCURA_TOKEN_ADDRESS } from '@/config/contracts';
import { FHEStepStatus } from '@/lib/constants';
import { useFHEStatus } from './useFHEStatus';
import { initFHEClient, decryptBalance, getOrCreatePermit } from '@/lib/fhe';

export function useDecryptObsBalance() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const fheStatus = useFHEStatus();
  const [decryptedBalance, setDecryptedBalance] = useState<bigint | null>(null);

  // Read the encrypted balance handle from ObscuraToken
  const {
    data: ctHash,
    refetch: refetchBalance,
  } = useReadContract({
    address: OBSCURA_TOKEN_ADDRESS,
    abi: OBSCURA_TOKEN_ABI,
    functionName: 'balanceOf',
    query: { enabled: false },
  });

  const decrypt = useCallback(async () => {
    if (!publicClient || !walletClient || !OBSCURA_TOKEN_ADDRESS) {
      throw new Error('Wallet not connected or token contract not configured');
    }

    try {
      fheStatus.setStep(FHEStepStatus.ENCRYPTING); // "Signing permit"

      await initFHEClient(publicClient, walletClient);
      await getOrCreatePermit();

      fheStatus.setStep(FHEStepStatus.COMPUTING); // "Fetching handle"

      const result = await refetchBalance();
      const handle = result.data;

      if (!handle) {
        throw new Error('No OBS balance found — you may not have been minted any tokens yet');
      }

      const plaintext = await decryptBalance(handle, (step) => {
        console.log('[FHE OBS Decrypt Step]', step);
      });

      setDecryptedBalance(plaintext);
      fheStatus.setStep(FHEStepStatus.READY);
      return plaintext;
    } catch (error) {
      fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
      throw error;
    }
  }, [publicClient, walletClient, refetchBalance, fheStatus]);

  const reset = useCallback(() => {
    setDecryptedBalance(null);
    fheStatus.reset();
  }, [fheStatus]);

  return {
    ctHash: ctHash as `0x${string}` | undefined,
    decryptedBalance,
    decrypt,
    reset,
    ...fheStatus,
  };
}

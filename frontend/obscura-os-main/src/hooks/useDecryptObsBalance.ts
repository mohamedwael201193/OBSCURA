import { useState, useCallback } from 'react';
import { useReadContract, usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { OBSCURA_TOKEN_ABI, OBSCURA_TOKEN_ADDRESS } from '@/config/contracts';
import { FHEStepStatus } from '@/lib/constants';
import { useFHEStatus } from './useFHEStatus';
import { initFHEClient, decryptBalance, getOrCreatePermit } from '@/lib/fhe';
import { isCofheError, CofheErrorCode } from '@cofhe/sdk';

export function useDecryptObsBalance() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const fheStatus = useFHEStatus();
  const [decryptedBalance, setDecryptedBalance] = useState<bigint | null>(null);

  // Read the encrypted balance handle from ObscuraToken
  // account: address is REQUIRED — balanceOf() uses msg.sender; without it,
  // the eth_call has no `from` so msg.sender == address(0) and the call reverts.
  const {
    data: ctHash,
    refetch: refetchBalance,
  } = useReadContract({
    address: OBSCURA_TOKEN_ADDRESS,
    abi: OBSCURA_TOKEN_ABI,
    functionName: 'balanceOf',
    account: address,
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
        throw new Error(
          'No $OBS balance found. Ask the employer to mint tokens to your address (Employer tab → Mint $OBS).'
        );
      }

      const plaintext = await decryptBalance(handle, (step) => {
        console.log('[FHE OBS Decrypt Step]', step);
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

  const reset = useCallback(() => {
    setDecryptedBalance(null);
    fheStatus.reset();
  }, [fheStatus]);

  return {
    ctHash: ctHash as bigint | undefined,
    decryptedBalance,
    decrypt,
    reset,
    ...fheStatus,
  };
}

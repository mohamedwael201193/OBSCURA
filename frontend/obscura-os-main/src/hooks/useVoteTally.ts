import { useState, useCallback } from 'react';
import { usePublicClient, useWalletClient, useAccount } from 'wagmi';
import { OBSCURA_VOTE_ABI, OBSCURA_VOTE_ADDRESS } from '@/config/contracts';
import { FHEStepStatus } from '@/lib/constants';
import { useFHEStatus } from './useFHEStatus';
import { initFHEClient, getOrCreatePermit } from '@/lib/fhe';
import { getFHEClient } from '@/lib/fhe';
import { FheTypes } from '@cofhe/sdk';

export interface TallyResult {
  optionIndex: number;
  votes: bigint;
}

export function useVoteTally(proposalId: bigint, numOptions: number) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const fheStatus = useFHEStatus();
  const [tallies, setTallies] = useState<TallyResult[] | null>(null);

  const decryptTally = useCallback(async () => {
    if (!publicClient || !walletClient || !OBSCURA_VOTE_ADDRESS) {
      throw new Error('Wallet not connected or contract not configured');
    }
    if (numOptions < 2) {
      throw new Error('Invalid number of options');
    }

    try {
      fheStatus.setStep(FHEStepStatus.ENCRYPTING);

      // Initialize FHE client
      await initFHEClient(publicClient, walletClient);
      await getOrCreatePermit();

      fheStatus.setStep(FHEStepStatus.COMPUTING);

      const client = getFHEClient();
      if (!client) throw new Error('FHE client not initialized');

      // Fetch + decrypt each option's tally handle
      const results: TallyResult[] = [];
      for (let i = 0; i < numOptions; i++) {
        const handle = await publicClient.readContract({
          address: OBSCURA_VOTE_ADDRESS!,
          abi: OBSCURA_VOTE_ABI,
          functionName: 'getTally',
          args: [proposalId, i],
        }) as bigint;

        if (!handle) {
          results.push({ optionIndex: i, votes: 0n });
          continue;
        }

        const plaintext = await client
          .decryptForView(handle, FheTypes.Uint64)
          .execute();

        results.push({ optionIndex: i, votes: BigInt(plaintext) });
      }

      setTallies(results);
      fheStatus.setStep(FHEStepStatus.READY);
      return results;
    } catch (error) {
      fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
      throw error;
    }
  }, [publicClient, walletClient, proposalId, numOptions, fheStatus]);

  return {
    tallies,
    decryptTally,
    ...fheStatus,
  };
}

/** Hook for "Verify My Vote" — self-decrypt own encrypted ballot */
export function useMyVote(proposalId: bigint) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const fheStatus = useFHEStatus();
  const [myVoteIndex, setMyVoteIndex] = useState<number | null>(null);

  const decryptMyVote = useCallback(async () => {
    if (!publicClient || !walletClient || !OBSCURA_VOTE_ADDRESS || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      fheStatus.setStep(FHEStepStatus.ENCRYPTING);

      await initFHEClient(publicClient, walletClient);
      await getOrCreatePermit();

      fheStatus.setStep(FHEStepStatus.COMPUTING);

      const handle = await publicClient.readContract({
        address: OBSCURA_VOTE_ADDRESS!,
        abi: OBSCURA_VOTE_ABI,
        functionName: 'getMyVote',
        args: [proposalId],
        account: address,
      }) as bigint;

      if (!handle) throw new Error('No vote found');

      const client = getFHEClient();
      if (!client) throw new Error('FHE client not initialized');

      const plaintext = await client
        .decryptForView(handle, FheTypes.Uint64)
        .withPermit()
        .execute();

      setMyVoteIndex(Number(BigInt(plaintext)));
      fheStatus.setStep(FHEStepStatus.READY);
      return Number(BigInt(plaintext));
    } catch (error) {
      fheStatus.setStep(FHEStepStatus.ERROR, (error as Error).message);
      throw error;
    }
  }, [publicClient, walletClient, address, proposalId, fheStatus]);

  return {
    myVoteIndex,
    decryptMyVote,
    ...fheStatus,
  };
}

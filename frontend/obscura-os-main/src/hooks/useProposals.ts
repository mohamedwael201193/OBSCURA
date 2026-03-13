import { useReadContract } from 'wagmi';
import { OBSCURA_VOTE_ABI, OBSCURA_VOTE_ADDRESS } from '@/config/contracts';

export const CATEGORY_LABELS = ['General', 'Treasury', 'Protocol', 'Grants', 'Social', 'Technical'] as const;

export interface ProposalData {
  id: bigint;
  title: string;
  description: string;
  numOptions: number;
  deadline: bigint;
  quorum: bigint;
  category: number;
  totalVoters: bigint;
  isFinalized: boolean;
  isCancelled: boolean;
  exists: boolean;
  creator: string;
}

// Safely read a field from viem multi-return data:
// viem v2 may return either a named object {title, deadline,...} or a tuple array [0,1,...]
// depending on whether all outputs are named. Support both.
function field<T>(data: any, name: string, index: number): T {
  return (data[name] !== undefined ? data[name] : data[index]) as T;
}

export function useProposalCount() {
  return useReadContract({
    address: OBSCURA_VOTE_ADDRESS,
    abi: OBSCURA_VOTE_ABI,
    functionName: 'getProposalCount',
    query: {
      enabled: !!OBSCURA_VOTE_ADDRESS,
      refetchInterval: 5_000,
      refetchOnMount: 'always',
    },
  });
}

export function useProposal(proposalId: bigint) {
  const { data, isLoading, refetch } = useReadContract({
    address: OBSCURA_VOTE_ADDRESS,
    abi: OBSCURA_VOTE_ABI,
    functionName: 'getProposal',
    args: [proposalId],
    query: {
      enabled: !!OBSCURA_VOTE_ADDRESS,
      refetchInterval: 10_000,
      refetchOnMount: 'always',
    },
  });

  const proposal: ProposalData | null = data
    ? {
        id: proposalId,
        title: field<string>(data, 'title', 0),
        description: field<string>(data, 'description', 1),
        numOptions: Number(field<number>(data, 'numOptions', 2)),
        deadline: field<bigint>(data, 'deadline', 3),
        quorum: field<bigint>(data, 'quorum', 4),
        category: Number(field<number>(data, 'category', 5)),
        totalVoters: field<bigint>(data, 'totalVoters', 6),
        isFinalized: field<boolean>(data, 'isFinalized', 7),
        isCancelled: field<boolean>(data, 'isCancelled', 8),
        exists: field<boolean>(data, 'exists', 9),
        creator: field<string>(data, 'creator', 10),
      }
    : null;

  return { proposal, isLoading, refetch };
}

export function useProposalOptions(proposalId: bigint) {
  return useReadContract({
    address: OBSCURA_VOTE_ADDRESS,
    abi: OBSCURA_VOTE_ABI,
    functionName: 'getProposalOptions',
    args: [proposalId],
    query: {
      enabled: !!OBSCURA_VOTE_ADDRESS,
      refetchOnMount: 'always',
    },
  });
}

export function useHasVoted(proposalId: bigint, address?: `0x${string}`) {
  return useReadContract({
    address: OBSCURA_VOTE_ADDRESS,
    abi: OBSCURA_VOTE_ABI,
    functionName: 'hasVoted',
    args: address ? [proposalId, address] : undefined,
    query: { enabled: !!OBSCURA_VOTE_ADDRESS && !!address },
  });
}

export function useVoterParticipation(address?: `0x${string}`) {
  return useReadContract({
    address: OBSCURA_VOTE_ADDRESS,
    abi: OBSCURA_VOTE_ABI,
    functionName: 'voterParticipation',
    args: address ? [address] : undefined,
    query: { enabled: !!OBSCURA_VOTE_ADDRESS && !!address },
  });
}

export function useVoteOwner() {
  return useReadContract({
    address: OBSCURA_VOTE_ADDRESS,
    abi: OBSCURA_VOTE_ABI,
    functionName: 'owner',
    query: { enabled: !!OBSCURA_VOTE_ADDRESS },
  });
}

export function useVoteRole(address?: `0x${string}`) {
  return useReadContract({
    address: OBSCURA_VOTE_ADDRESS,
    abi: OBSCURA_VOTE_ABI,
    functionName: 'roles',
    args: address ? [address] : undefined,
    query: { enabled: !!OBSCURA_VOTE_ADDRESS && !!address },
  });
}

/**
 * useGovernor — read + write surface for ObscuraGovernor (OZ Governor wrapper).
 *
 * Privacy model:
 *   • Governor votes here use OZ's plaintext `castVote(proposalId, support)`.
 *   • The actual ballot weighting comes from `voterParticipation(account)` —
 *     a public participation counter, NOT the encrypted ballots themselves.
 *   • Encrypted ballots for individual proposals remain in ObscuraVote V5
 *     and are never decrypted here.
 *
 * No auto-decrypt anywhere — there is nothing encrypted on the Governor.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { keccak256, stringToBytes, type Hex } from "viem";
import {
  OBSCURA_GOVERNOR_ABI,
  OBSCURA_GOVERNOR_ADDRESS,
  PROPOSAL_STATE_LABELS,
  type ProposalStateLabel,
} from "@/abis/ObscuraGovernor";
import { estimateCappedFees } from "@/lib/gas";

// ── Read hooks ────────────────────────────────────────────────────────────

export function useGovernorConfig() {
  const votingDelay = useReadContract({
    address: OBSCURA_GOVERNOR_ADDRESS,
    abi: OBSCURA_GOVERNOR_ABI,
    functionName: "votingDelay",
  });
  const votingPeriod = useReadContract({
    address: OBSCURA_GOVERNOR_ADDRESS,
    abi: OBSCURA_GOVERNOR_ABI,
    functionName: "votingPeriod",
  });
  const threshold = useReadContract({
    address: OBSCURA_GOVERNOR_ADDRESS,
    abi: OBSCURA_GOVERNOR_ABI,
    functionName: "proposalThreshold",
  });
  const quorum = useReadContract({
    address: OBSCURA_GOVERNOR_ADDRESS,
    abi: OBSCURA_GOVERNOR_ABI,
    functionName: "quorumVotes",
  });
  const timelock = useReadContract({
    address: OBSCURA_GOVERNOR_ADDRESS,
    abi: OBSCURA_GOVERNOR_ABI,
    functionName: "timelock",
  });
  const clock = useReadContract({
    address: OBSCURA_GOVERNOR_ADDRESS,
    abi: OBSCURA_GOVERNOR_ABI,
    functionName: "clock",
    query: { refetchInterval: 12_000 },
  });
  return {
    votingDelay: (votingDelay.data as bigint | undefined) ?? null,
    votingPeriod: (votingPeriod.data as bigint | undefined) ?? null,
    proposalThreshold: (threshold.data as bigint | undefined) ?? null,
    quorum: (quorum.data as bigint | undefined) ?? null,
    timelock: (timelock.data as `0x${string}` | undefined) ?? null,
    currentBlock: (clock.data as bigint | undefined) ?? null,
    isLoading:
      votingDelay.isLoading ||
      votingPeriod.isLoading ||
      threshold.isLoading ||
      quorum.isLoading,
  };
}

export interface ProposalRow {
  proposalId: bigint;
  proposer: `0x${string}`;
  description: string;
  voteStart: bigint;
  voteEnd: bigint;
  targets: `0x${string}`[];
  values: bigint[];
  calldatas: `0x${string}`[];
  descriptionHash: `0x${string}`;
}

/**
 * Reads ProposalCreated logs from chain. Cheap on Arb Sepolia (governor
 * has 0 history at launch). Refreshes every 15s.
 */
export function useGovernorProposals() {
  const publicClient = usePublicClient();
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicClient || !OBSCURA_GOVERNOR_ADDRESS) return;
    setIsLoading(true);
    try {
      const logs = await publicClient.getContractEvents({
        address: OBSCURA_GOVERNOR_ADDRESS,
        abi: OBSCURA_GOVERNOR_ABI,
        eventName: "ProposalCreated",
        fromBlock: "earliest",
        toBlock: "latest",
      });
      const rows: ProposalRow[] = logs.map((log: any) => {
        const a = log.args ?? {};
        const description: string = a.description ?? "";
        return {
          proposalId: a.proposalId as bigint,
          proposer: a.proposer as `0x${string}`,
          description,
          voteStart: a.voteStart as bigint,
          voteEnd: a.voteEnd as bigint,
          targets: (a.targets ?? []) as `0x${string}`[],
          values: (a.values ?? []) as bigint[],
          calldatas: (a.calldatas ?? []) as `0x${string}`[],
          descriptionHash: keccak256(stringToBytes(description)),
        };
      });
      // Newest first
      rows.sort((a, b) => (a.voteStart < b.voteStart ? 1 : -1));
      setProposals(rows);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { proposals, isLoading, refresh };
}

export function useProposalState(proposalId?: bigint) {
  const { data, refetch } = useReadContract({
    address: OBSCURA_GOVERNOR_ADDRESS,
    abi: OBSCURA_GOVERNOR_ABI,
    functionName: "state",
    args: proposalId !== undefined ? [proposalId] : undefined,
    query: { enabled: proposalId !== undefined, refetchInterval: 15_000 },
  });
  const stateNum = data === undefined ? undefined : Number(data);
  const label: ProposalStateLabel | undefined =
    stateNum !== undefined ? PROPOSAL_STATE_LABELS[stateNum] : undefined;
  return { state: stateNum, label, refetch };
}

export function useProposalVotes(proposalId?: bigint) {
  const { data, refetch } = useReadContract({
    address: OBSCURA_GOVERNOR_ADDRESS,
    abi: OBSCURA_GOVERNOR_ABI,
    functionName: "proposalVotes",
    args: proposalId !== undefined ? [proposalId] : undefined,
    query: { enabled: proposalId !== undefined, refetchInterval: 15_000 },
  });
  const arr = data as readonly [bigint, bigint, bigint] | undefined;
  return {
    against: arr?.[0] ?? 0n,
    for: arr?.[1] ?? 0n,
    abstain: arr?.[2] ?? 0n,
    refetch,
  };
}

export function useProposalDeadline(proposalId?: bigint) {
  const { data } = useReadContract({
    address: OBSCURA_GOVERNOR_ADDRESS,
    abi: OBSCURA_GOVERNOR_ABI,
    functionName: "proposalDeadline",
    args: proposalId !== undefined ? [proposalId] : undefined,
    query: { enabled: proposalId !== undefined },
  });
  return (data as bigint | undefined) ?? null;
}

export function useHasVotedGovernor(proposalId?: bigint) {
  const { address } = useAccount();
  const { data, refetch } = useReadContract({
    address: OBSCURA_GOVERNOR_ADDRESS,
    abi: OBSCURA_GOVERNOR_ABI,
    functionName: "hasVoted",
    args:
      proposalId !== undefined && address
        ? [proposalId, address]
        : undefined,
    query: { enabled: proposalId !== undefined && !!address },
  });
  return { hasVoted: (data as boolean | undefined) ?? false, refetch };
}

// ── Write hooks ───────────────────────────────────────────────────────────

interface ProposalActions {
  targets: `0x${string}`[];
  values: bigint[];
  calldatas: `0x${string}`[];
  description: string;
}

export function useGovernorPropose() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const propose = useCallback(
    async (actions: ProposalActions) => {
      if (!publicClient || !walletClient || !address) {
        throw new Error("Connect wallet first");
      }
      setIsPending(true);
      setError(null);
      try {
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_GOVERNOR_ADDRESS,
          abi: OBSCURA_GOVERNOR_ABI,
          functionName: "propose",
          args: [
            actions.targets,
            actions.values,
            actions.calldatas,
            actions.description,
          ],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        });
        setTxHash(hash);
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, walletClient, writeContractAsync, address]
  );

  return { propose, isPending, txHash, error };
}

export function useCastGovernorVote() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const castVote = useCallback(
    async (proposalId: bigint, support: 0 | 1 | 2, reason?: string) => {
      if (!publicClient || !address) throw new Error("Connect wallet first");
      setIsPending(true);
      setError(null);
      try {
        const fees = await estimateCappedFees(publicClient);
        const hash = reason
          ? await writeContractAsync({
              address: OBSCURA_GOVERNOR_ADDRESS,
              abi: OBSCURA_GOVERNOR_ABI,
              functionName: "castVoteWithReason",
              args: [proposalId, support, reason],
              account: address,
              chain: arbitrumSepolia,
              maxFeePerGas: fees.maxFeePerGas,
              maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
            })
          : await writeContractAsync({
              address: OBSCURA_GOVERNOR_ADDRESS,
              abi: OBSCURA_GOVERNOR_ABI,
              functionName: "castVote",
              args: [proposalId, support],
              account: address,
              chain: arbitrumSepolia,
              maxFeePerGas: fees.maxFeePerGas,
              maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
            });
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, writeContractAsync, address]
  );

  return { castVote, isPending, error };
}

export function useQueueProposal() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queue = useCallback(
    async (row: ProposalRow) => {
      if (!publicClient || !address) throw new Error("Connect wallet first");
      setIsPending(true);
      setError(null);
      try {
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_GOVERNOR_ADDRESS,
          abi: OBSCURA_GOVERNOR_ABI,
          functionName: "queue",
          args: [row.targets, row.values, row.calldatas, row.descriptionHash],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, writeContractAsync, address]
  );

  return { queue, isPending, error };
}

export function useExecuteProposal() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (row: ProposalRow) => {
      if (!publicClient || !address) throw new Error("Connect wallet first");
      setIsPending(true);
      setError(null);
      try {
        const fees = await estimateCappedFees(publicClient);
        const totalValue = row.values.reduce((acc, v) => acc + v, 0n);
        const hash = await writeContractAsync({
          address: OBSCURA_GOVERNOR_ADDRESS,
          abi: OBSCURA_GOVERNOR_ABI,
          functionName: "execute",
          args: [row.targets, row.values, row.calldatas, row.descriptionHash],
          account: address,
          chain: arbitrumSepolia,
          value: totalValue,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, writeContractAsync, address]
  );

  return { execute, isPending, error };
}

// ── Convenience helpers ───────────────────────────────────────────────────

/** Split "Title\n\nBody" descriptions for nicer cards. */
export function parseProposalDescription(description: string): {
  title: string;
  body: string;
} {
  const trimmed = description.trim();
  const splitIdx = trimmed.indexOf("\n");
  if (splitIdx === -1) return { title: trimmed, body: "" };
  return {
    title: trimmed.slice(0, splitIdx).trim(),
    body: trimmed.slice(splitIdx + 1).trim(),
  };
}

export function useGovernorAddresses() {
  return useMemo(
    () => ({
      governor: OBSCURA_GOVERNOR_ADDRESS,
    }),
    []
  );
}

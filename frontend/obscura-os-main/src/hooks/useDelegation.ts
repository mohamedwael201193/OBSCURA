import { useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import { useAccount } from "wagmi";
import { OBSCURA_VOTE_ADDRESS, OBSCURA_VOTE_ABI } from "@/config/contracts";
import { isAddress, parseAbiItem } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { useState, useEffect } from "react";

// ─── Read hooks ────────────────────────────────────────────────────────────

/** Returns who `address` has delegated to (zero address = no delegation) */
export function useDelegateTo(address?: `0x${string}`) {
  return useReadContract({
    address: OBSCURA_VOTE_ADDRESS,
    abi: OBSCURA_VOTE_ABI,
    functionName: "delegateTo",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8_000 },
  });
}

/** Returns raw delegationWeight from contract (0 = default, treat as 1) */
export function useDelegationWeight(address?: `0x${string}`) {
  return useReadContract({
    address: OBSCURA_VOTE_ADDRESS,
    abi: OBSCURA_VOTE_ABI,
    functionName: "delegationWeight",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8_000 },
  });
}

/** Returns the effective vote weight (1 if not set) */
export function useVoteWeight(address?: `0x${string}`) {
  return useReadContract({
    address: OBSCURA_VOTE_ADDRESS,
    abi: OBSCURA_VOTE_ABI,
    functionName: "getVoteWeight",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8_000 },
  });
}

// ─── Write hook ────────────────────────────────────────────────────────────

export interface UseDelegationWriteReturn {
  // state
  delegateeInput: string;
  setDelegateeInput: (v: string) => void;
  txHash: `0x${string}` | undefined;
  isConfirming: boolean;
  error: string | null;
  // actions
  handleDelegate: () => void;
  handleUndelegate: () => void;
  isPending: boolean;
  isSuccess: boolean;
}

export function useDelegationWrite(): UseDelegationWriteReturn {
  const { address } = useAccount();
  const [delegateeInput, setDelegateeInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleDelegate = async () => {
    setError(null);
    if (!address) { setError("Connect your wallet first"); return; }
    const target = delegateeInput.trim() as `0x${string}`;
    if (!isAddress(target)) { setError("Invalid address"); return; }
    if (target.toLowerCase() === address.toLowerCase()) { setError("Cannot delegate to yourself"); return; }
    try {
      await writeContractAsync({
        address: OBSCURA_VOTE_ADDRESS,
        abi: OBSCURA_VOTE_ABI,
        functionName: "delegate",
        args: [target],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: 200_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Has already delegated")) setError("That address has already delegated to someone else — no chains allowed.");
      else if (msg.includes("Must hold")) setError("You must claim $OBS tokens first.");
      else setError(msg.slice(0, 120));
    }
  };

  const handleUndelegate = async () => {
    setError(null);
    if (!address) { setError("Connect your wallet first"); return; }
    try {
      await writeContractAsync({
        address: OBSCURA_VOTE_ADDRESS,
        abi: OBSCURA_VOTE_ABI,
        functionName: "undelegate",
        args: [],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: 200_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.slice(0, 120));
    }
  };

  return {
    delegateeInput,
    setDelegateeInput,
    txHash,
    isConfirming,
    error,
    handleDelegate,
    handleUndelegate,
    isPending,
    isSuccess,
  };
}

// ─── Delegators hook ────────────────────────────────────────────────────────

const DELEGATE_SET_EVENT = parseAbiItem(
  "event DelegateSet(address indexed delegator, address indexed delegatee)"
);
const DELEGATE_REMOVED_EVENT = parseAbiItem(
  "event DelegateRemoved(address indexed delegator, address indexed formerDelegatee)"
);

/**
 * Returns the set of addresses currently delegating to `address`.
 * Reads DelegateSet(delegatee=address) logs and subtracts DelegateRemoved ones.
 */
export function useDelegators(address?: `0x${string}`) {
  const publicClient = usePublicClient();
  const [delegators, setDelegators] = useState<`0x${string}`[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!publicClient || !address) { setDelegators([]); return; }
    let cancelled = false;
    async function fetch() {
      setIsLoading(true);
      try {
        const [setLogs, removedLogs] = await Promise.all([
          publicClient!.getLogs({
            address: OBSCURA_VOTE_ADDRESS,
            event: DELEGATE_SET_EVENT,
            args: { delegatee: address },
            fromBlock: 0n,
            toBlock: "latest",
          }),
          publicClient!.getLogs({
            address: OBSCURA_VOTE_ADDRESS,
            event: DELEGATE_REMOVED_EVENT,
            args: { formerDelegatee: address },
            fromBlock: 0n,
            toBlock: "latest",
          }),
        ]);
        const removedSet = new Set(
          removedLogs.map((l) => (l.args as { delegator: `0x${string}` }).delegator?.toLowerCase())
        );
        const active = setLogs
          .map((l) => (l.args as { delegator: `0x${string}` }).delegator)
          .filter((d) => d && !removedSet.has(d.toLowerCase())) as `0x${string}`[];
        // Deduplicate (keep last set if someone delegated, removed, re-delegated)
        if (!cancelled) setDelegators([...new Set(active.map((a) => a.toLowerCase() as `0x${string}`))]);
      } catch {
        if (!cancelled) setDelegators([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    fetch();
    const interval = setInterval(fetch, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [publicClient, address]);

  return { delegators, isLoading };
}

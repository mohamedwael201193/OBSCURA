import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { parseEther } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { useState } from "react";
import { OBSCURA_REWARDS_ADDRESS, OBSCURA_REWARDS_ABI } from "@/config/contracts";

// ─── Read Hooks ────────────────────────────────────────────────────────────

export function useRewardPoolBalance() {
  return useReadContract({
    address: OBSCURA_REWARDS_ADDRESS,
    abi: OBSCURA_REWARDS_ABI,
    functionName: "rewardPoolBalance",
    query: { refetchInterval: 12_000 },
  });
}

export function useRewardPerVote() {
  return useReadContract({
    address: OBSCURA_REWARDS_ADDRESS,
    abi: OBSCURA_REWARDS_ABI,
    functionName: "REWARD_PER_VOTE_GWEI",
    query: { staleTime: 60_000 },
  });
}

export function usePendingReward(voterAddress?: `0x${string}`) {
  return useReadContract({
    address: OBSCURA_REWARDS_ADDRESS,
    abi: OBSCURA_REWARDS_ABI,
    functionName: "pendingRewardWei",
    args: voterAddress ? [voterAddress] : undefined,
    account: voterAddress,   // sets msg.sender in eth_call so access check passes
    query: { enabled: !!voterAddress, refetchInterval: 8_000 },
  });
}

export function useRewardAccrued(proposalId: bigint | undefined, address?: `0x${string}`) {
  return useReadContract({
    address: OBSCURA_REWARDS_ADDRESS,
    abi: OBSCURA_REWARDS_ABI,
    functionName: "rewardAccrued",
    args: proposalId !== undefined && address ? [proposalId, address] : undefined,
    query: { enabled: proposalId !== undefined && !!address, refetchInterval: 8_000 },
  });
}

export function useWithdrawalRequested(address?: `0x${string}`) {
  return useReadContract({
    address: OBSCURA_REWARDS_ADDRESS,
    abi: OBSCURA_REWARDS_ABI,
    functionName: "withdrawalRequested",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 6_000 },
  });
}

// ─── Write Hook: Accrue Reward ─────────────────────────────────────────────

export function useAccrueReward() {
  const { address } = useAccount();
  const { writeContractAsync, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [error, setError] = useState<string | null>(null);

  const accrue = async (proposalId: bigint) => {
    setError(null);
    try {
      await writeContractAsync({
        address: OBSCURA_REWARDS_ADDRESS,
        abi: OBSCURA_REWARDS_ABI,
        functionName: "accrueReward",
        args: [proposalId],
        account: address,
        chain: arbitrumSepolia,
        gas: 300_000n,
        maxFeePerGas: 200_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.slice(0, 150));
    }
  };

  return { accrue, isPending, isConfirming, isSuccess, txHash, error };
}

// ─── Write Hook: Request Withdrawal ──────────────────────────────────────

export function useRequestWithdrawal() {
  const { address } = useAccount();
  const { writeContractAsync, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [error, setError] = useState<string | null>(null);

  const request = async () => {
    setError(null);
    try {
      await writeContractAsync({
        address: OBSCURA_REWARDS_ADDRESS,
        abi: OBSCURA_REWARDS_ABI,
        functionName: "requestWithdrawal",
        account: address,
        chain: arbitrumSepolia,
        gas: 200_000n,
        maxFeePerGas: 200_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.slice(0, 150));
    }
  };

  return { request, isPending, isConfirming, isSuccess, txHash, error };
}

// ─── Write Hook: Withdraw ─────────────────────────────────────────────────

export function useWithdrawReward() {
  const { address } = useAccount();
  const { writeContractAsync, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [error, setError] = useState<string | null>(null);

  const withdrawReward = async () => {
    setError(null);
    try {
      await writeContractAsync({
        address: OBSCURA_REWARDS_ADDRESS,
        abi: OBSCURA_REWARDS_ABI,
        functionName: "withdraw",
        account: address,
        chain: arbitrumSepolia,
        gas: 200_000n,
        maxFeePerGas: 200_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.slice(0, 150));
    }
  };

  return { withdrawReward, isPending, isConfirming, isSuccess, txHash, error };
}

// ─── Write Hook: Fund Rewards Pool ────────────────────────────────────────

export function useFundRewards() {
  const { address } = useAccount();
  const { writeContractAsync, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [error, setError] = useState<string | null>(null);

  const fund = async (ethAmount: string) => {
    setError(null);
    try {
      await writeContractAsync({
        address: OBSCURA_REWARDS_ADDRESS,
        abi: OBSCURA_REWARDS_ABI,
        functionName: "fundRewards",
        value: parseEther(ethAmount),
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: 200_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.slice(0, 150));
    }
  };

  return { fund, isPending, isConfirming, isSuccess, txHash, error };
}

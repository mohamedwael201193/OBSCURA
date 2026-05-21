/**
 * useGasPreflight — checks wallet ETH balance before initiating an FHE flow.
 *
 * FHE transactions are 2-step (approve + main call) and expensive (~0.0005-0.002 ETH).
 * Surfacing low-balance warnings BEFORE the user signs an encryption permit avoids
 * MetaMask spam followed by a failed submit.
 *
 * Returns a `check(label?)` async function that throws a typed error when funds
 * are insufficient. Components can wrap into a toast.
 */
import { useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { formatEther } from "viem";

const MIN_ETH_WEI = 1_500_000_000_000_000n; // 0.0015 ETH — covers two-step on Arb Sepolia
const WARN_ETH_WEI = 5_000_000_000_000_000n; // 0.005 ETH — show advisory toast

export class GasPreflightError extends Error {
  constructor(public readonly balanceWei: bigint, public readonly minWei: bigint) {
    super(`Insufficient ETH for gas: have ${formatEther(balanceWei)} ETH, need ≥ ${formatEther(minWei)} ETH on Arbitrum Sepolia.`);
    this.name = "GasPreflightError";
  }
}

export interface GasPreflightResult {
  ok: boolean;
  balanceWei: bigint;
  warn: boolean; // low but above minimum
  minWei: bigint;
}

export function useGasPreflight() {
  const publicClient = usePublicClient();
  const { address } = useAccount();

  const inspect = useCallback(async (): Promise<GasPreflightResult> => {
    if (!publicClient || !address) {
      return { ok: false, balanceWei: 0n, warn: false, minWei: MIN_ETH_WEI };
    }
    const balanceWei = await publicClient.getBalance({ address });
    return {
      ok: balanceWei >= MIN_ETH_WEI,
      balanceWei,
      warn: balanceWei < WARN_ETH_WEI,
      minWei: MIN_ETH_WEI,
    };
  }, [publicClient, address]);

  /** Throws GasPreflightError when below minimum. */
  const check = useCallback(async (): Promise<GasPreflightResult> => {
    const res = await inspect();
    if (!res.ok) throw new GasPreflightError(res.balanceWei, res.minWei);
    return res;
  }, [inspect]);

  return { check, inspect };
}

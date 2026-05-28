import { useMemo } from "react";
import { useReputationSummary, type ReputationSummary } from "@/hooks/useReputationSummary";

const OCUSDC = 1_000_000n;

export const BETA_LIQUIDITY_TARGET = 20n * OCUSDC;
export const BETA_POOL_LABEL = "Obscura Treasury Pool";

const BETA_BORROW_CAPS: Record<ReputationSummary["tier"], bigint> = {
  new: 250_000n,
  active: 2n * OCUSDC,
  steady: 5n * OCUSDC,
  reliable: 8n * OCUSDC,
};

const TIER_LABEL: Record<ReputationSummary["tier"], string> = {
  new: "New",
  active: "Active",
  steady: "Steady",
  reliable: "Trusted",
};

function minBigint(values: bigint[]) {
  return values.reduce((smallest, value) => value < smallest ? value : smallest, values[0] ?? 0n);
}

function poolGuardCap(availableLiquidity: bigint) {
  if (availableLiquidity <= 0n) return 0n;
  if (availableLiquidity < OCUSDC) return availableLiquidity;
  return availableLiquidity / 4n;
}

export function formatBetaOcusdc(value: bigint) {
  const amount = Number(value) / 1e6;
  const maximumFractionDigits = amount > 0 && amount < 1 ? 6 : 2;
  return amount.toLocaleString(undefined, { maximumFractionDigits });
}

export function parseOcusdcInput(value: string) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0n;
  return BigInt(Math.round(parsed * 1e6));
}

export function useBetaBorrowLimit(availableLiquidity: bigint, currentBorrow: bigint = 0n) {
  const { summary, isLoading, error, refresh, lastFetchedAt } = useReputationSummary();

  return useMemo(() => {
    const tier = summary?.tier ?? "new";
    const tierCap = BETA_BORROW_CAPS[tier];
    const liquidityCap = poolGuardCap(availableLiquidity);
    const effectiveCap = minBigint([tierCap, liquidityCap]);
    const remaining = effectiveCap > currentBorrow ? effectiveCap - currentBorrow : 0n;

    return {
      tier,
      tierLabel: TIER_LABEL[tier],
      tierCap,
      liquidityCap,
      effectiveCap,
      remaining,
      score: summary?.totalCappedWeight ?? 0,
      isLoading,
      error,
      refresh,
      lastFetchedAt,
      limitedByLiquidity: liquidityCap < tierCap,
    };
  }, [availableLiquidity, currentBorrow, error, isLoading, lastFetchedAt, refresh, summary]);
}
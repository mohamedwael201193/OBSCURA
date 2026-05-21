/**
 * useHealthEngine — realtime credit health monitoring across ALL markets.
 *
 * Polls every market the user has a position in for public scalars:
 *   - getPlainCollateral
 *   - getPlainBorrow
 *   - maxBorrowable
 *
 * Computes the local Health Factor (HF) per market and an aggregate worst-case
 * HF for the dashboard. Subscribes to block updates via watchBlockNumber so
 * the value refreshes within ~1 block of any state change.
 *
 * PRIVACY: Uses only plaintext shadow reads — no FHE decrypt, no permits,
 * no wallet prompts. Public scalars are intentionally exposed for risk UX.
 *
 * SEVERITY THRESHOLDS:
 *   HF >= 1.5            → safe
 *   1.2 <= HF < 1.5      → caution
 *   1.05 <= HF < 1.2     → warning
 *   HF < 1.05            → critical (liquidation imminent)
 *   no debt              → idle
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import {
  CREDIT_MARKETS,
  CREDIT_MARKET_ABI,
  type CreditMarketMeta,
} from "@/config/credit";

export type HealthSeverity = "idle" | "safe" | "caution" | "warning" | "critical";

export interface MarketHealthSnapshot {
  market: CreditMarketMeta;
  collateral: bigint;
  borrow: bigint;
  maxBorrowable: bigint;
  hf: number | null; // null when no debt
  severity: HealthSeverity;
  utilizationOfMaxBps: number; // borrow / maxBorrowable in bps (0–10000)
}

export interface HealthEngineState {
  loading: boolean;
  perMarket: MarketHealthSnapshot[];
  worstHF: number | null;
  worstMarket: MarketHealthSnapshot | null;
  aggregateSeverity: HealthSeverity;
  hasDebt: boolean;
  totalCollateral: bigint; // sum across markets (cUSDC 6dp normalized)
  totalBorrow: bigint;
  lastUpdatedAt: number;
}

const SEVERITY_RANK: Record<HealthSeverity, number> = {
  idle: 0,
  safe: 1,
  caution: 2,
  warning: 3,
  critical: 4,
};

export function severityFromHF(hf: number | null): HealthSeverity {
  if (hf === null) return "idle";
  if (hf >= 1.5) return "safe";
  if (hf >= 1.2) return "caution";
  if (hf >= 1.05) return "warning";
  return "critical";
}

function computeHF(collateral: bigint, borrow: bigint, lltvBps: number): number | null {
  if (borrow === 0n) return null;
  if (collateral === 0n) return 0;
  // HF = (collateral * lltvBps / 10000) / borrow
  const numerator = Number(collateral) * lltvBps;
  const denom = Number(borrow) * 10000;
  if (denom === 0) return null;
  return numerator / denom;
}

const POLL_FALLBACK_MS = 15_000;

export function useHealthEngine(): HealthEngineState & { refresh: () => Promise<void> } {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [state, setState] = useState<HealthEngineState>({
    loading: false,
    perMarket: [],
    worstHF: null,
    worstMarket: null,
    aggregateSeverity: "idle",
    hasDebt: false,
    totalCollateral: 0n,
    totalBorrow: 0n,
    lastUpdatedAt: 0,
  });

  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (!publicClient || !address) return;
    if (inflight.current) return;
    inflight.current = true;
    setState((s) => ({ ...s, loading: true }));
    try {
      const snapshots = await Promise.all(
        CREDIT_MARKETS.map(async (m): Promise<MarketHealthSnapshot | null> => {
          if (!m.address) return null;
          try {
            const [coll, borrow, maxB] = await Promise.all([
              publicClient.readContract({
                address: m.address,
                abi: CREDIT_MARKET_ABI,
                functionName: "getPlainCollateral",
                args: [address],
              }) as Promise<bigint>,
              publicClient.readContract({
                address: m.address,
                abi: CREDIT_MARKET_ABI,
                functionName: "getPlainBorrow",
                args: [address],
              }) as Promise<bigint>,
              publicClient.readContract({
                address: m.address,
                abi: CREDIT_MARKET_ABI,
                functionName: "maxBorrowable",
                args: [address],
              }) as Promise<bigint>,
            ]);
            const hf = computeHF(coll, borrow, m.lltvBps);
            const utilOfMaxBps = maxB > 0n
              ? Number((borrow * 10000n) / maxB)
              : (borrow > 0n ? 10000 : 0);
            return {
              market: m,
              collateral: coll,
              borrow,
              maxBorrowable: maxB,
              hf,
              severity: severityFromHF(hf),
              utilizationOfMaxBps: utilOfMaxBps,
            };
          } catch {
            return null;
          }
        })
      );

      const perMarket = snapshots.filter((s): s is MarketHealthSnapshot => s !== null);
      const withDebt = perMarket.filter((s) => s.borrow > 0n);
      const hasDebt = withDebt.length > 0;

      // Worst (lowest non-null) HF
      let worst: MarketHealthSnapshot | null = null;
      for (const snap of withDebt) {
        if (snap.hf === null) continue;
        if (worst === null || snap.hf < (worst.hf ?? Infinity)) worst = snap;
      }

      let aggregateSeverity: HealthSeverity = "idle";
      for (const snap of perMarket) {
        if (SEVERITY_RANK[snap.severity] > SEVERITY_RANK[aggregateSeverity]) {
          aggregateSeverity = snap.severity;
        }
      }

      const totalCollateral = perMarket.reduce((acc, s) => acc + s.collateral, 0n);
      const totalBorrow = perMarket.reduce((acc, s) => acc + s.borrow, 0n);

      setState({
        loading: false,
        perMarket,
        worstHF: worst?.hf ?? null,
        worstMarket: worst,
        aggregateSeverity,
        hasDebt,
        totalCollateral,
        totalBorrow,
        lastUpdatedAt: Date.now(),
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    } finally {
      inflight.current = false;
    }
  }, [publicClient, address]);

  // Auto-refresh on mount & wallet change
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Block-watch subscription (preferred over polling)
  useEffect(() => {
    if (!publicClient || !address) return;
    let unwatch: (() => void) | null = null;
    try {
      unwatch = publicClient.watchBlockNumber({
        emitOnBegin: false,
        poll: true,
        pollingInterval: 4_000,
        onBlockNumber: () => {
          void refresh();
        },
      });
    } catch {
      // Fallback to interval polling if watchBlockNumber not available
      const id = setInterval(() => void refresh(), POLL_FALLBACK_MS);
      unwatch = () => clearInterval(id);
    }
    return () => {
      unwatch?.();
    };
  }, [publicClient, address, refresh]);

  return { ...state, refresh };
}

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";

const REPUTATION_URL = (
  (import.meta.env.VITE_NOTIFICATIONS_URL as string | undefined) ??
  (import.meta.env.VITE_RELAY_URL as string | undefined) ??
  "http://localhost:3000"
).replace(/\/$/, "");

export interface ReputationSignalSummary {
  label: string;
  count: number;
  cappedWeight: number;
  latestAt: string | null;
}

export interface ReputationSummary {
  wallet: string;
  sourceApp: "all" | "pay" | "credit" | "vote";
  totalCappedWeight: number;
  tier: "new" | "active" | "steady" | "reliable";
  signals: Record<string, ReputationSignalSummary>;
  sources?: Record<string, number>;
  updatedAt: string | null;
}

interface UseReputationSummaryResult {
  summary: ReputationSummary | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  lastFetchedAt: string | null;
}

export function useReputationSummary(): UseReputationSummaryResult {
  const { address } = useAccount();
  const wallet = address?.toLowerCase() ?? null;
  const [summary, setSummary] = useState<ReputationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setRefreshNonce((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!wallet) {
      setSummary(null);
      setError(null);
      setIsLoading(false);
      setLastFetchedAt(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`${REPUTATION_URL}/reputation/${wallet}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Reputation request failed (${response.status})`);
        return response.json() as Promise<ReputationSummary>;
      })
      .then((next) => {
        setSummary(next);
        setLastFetchedAt(new Date().toISOString());
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [wallet, refreshNonce]);

  useEffect(() => {
    if (!wallet) return;
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, [wallet, refresh]);

  return { summary, isLoading, error, refresh, lastFetchedAt };
}
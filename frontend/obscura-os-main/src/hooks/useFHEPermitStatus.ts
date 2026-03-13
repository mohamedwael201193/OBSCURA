import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { getPermits } from "@/lib/fhe";

/**
 * useFHEPermitStatus — surface the user's CoFHE self-permit health so the UI
 * can warn before the permit silently expires (which causes confusing
 * "decrypt failed → re-sign" prompts mid-flow). Wave 2 lesson #94: every
 * decrypt path should fail loudly with a permit hint, not silently retry.
 *
 * Returns:
 *  - hasPermit:        true when an active self-permit exists for the chain
 *  - expiresAt:        epoch ms of permit expiry (0 if unknown)
 *  - isExpiringSoon:   true when <24h remain
 *  - isExpired:        true when already past expiry
 *  - refresh():        force re-check (call after sign/refresh)
 */
export interface FHEPermitStatus {
  hasPermit: boolean;
  expiresAt: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  refresh: () => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function useFHEPermitStatus(): FHEPermitStatus {
  const { address } = useAccount();
  const [tick, setTick] = useState(0);
  const [hasPermit, setHasPermit] = useState(false);
  const [expiresAt, setExpiresAt] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!address) {
      setHasPermit(false);
      setExpiresAt(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const permits = await getPermits();
        // permits is a record keyed by chainId/account; pick the most recent
        // entry that belongs to this account.
        let bestExpiry = 0;
        const flatten = (val: unknown): unknown[] => {
          if (!val) return [];
          if (Array.isArray(val)) return val;
          if (typeof val === "object") return Object.values(val as Record<string, unknown>);
          return [];
        };
        for (const entry of flatten(permits)) {
          for (const p of flatten(entry)) {
            const obj = p as { issuer?: string; expiration?: number | string; expiresAt?: number };
            if (!obj) continue;
            if (obj.issuer && obj.issuer.toLowerCase() !== address.toLowerCase()) continue;
            const expRaw = (obj.expiration ?? obj.expiresAt) as number | string | undefined;
            if (!expRaw) continue;
            // expiration is typically a unix-seconds bigint/string from the SDK
            const expSec = typeof expRaw === "string" ? Number(expRaw) : expRaw;
            const expMs = expSec > 1e12 ? expSec : expSec * 1000;
            if (expMs > bestExpiry) bestExpiry = expMs;
          }
        }
        if (!cancelled) {
          setHasPermit(bestExpiry > 0);
          setExpiresAt(bestExpiry);
        }
      } catch {
        if (!cancelled) {
          setHasPermit(false);
          setExpiresAt(0);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [address, tick]);

  // Re-render every minute so isExpiringSoon flips without requiring a manual refresh.
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(iv);
  }, []);

  const now = Date.now();
  const isExpired = hasPermit && expiresAt > 0 && expiresAt <= now;
  const isExpiringSoon = hasPermit && !isExpired && expiresAt - now < DAY_MS;

  return { hasPermit, expiresAt, isExpiringSoon, isExpired, refresh };
}

/**
 * useEncryptedHandle — unified reveal-on-demand for any euint64 handle.
 *
 * Single API across vault shares, market shares, borrow, collateral, score,
 * bid amounts. Built-in features:
 *   - Zero-handle short-circuit (0n → 0n, never prompts)
 *   - 60s LRU cache keyed by (handle, account) — survives unmounts
 *   - Single-flight per handle (concurrent callers reuse the same promise)
 *   - Auto-hide timer (configurable, default 30s)
 *   - Never auto-decrypts on mount — explicit `reveal()` only
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { decryptBalance, initFHEClient } from "@/lib/fhe";

interface CacheEntry {
  value: bigint;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<bigint>>();

function cacheKey(handle: bigint, account?: string): string {
  return `${(account ?? "anon").toLowerCase()}:${handle.toString()}`;
}

export interface UseEncryptedHandleOptions {
  /** Auto-hide the revealed value after N ms. Default 30000. Pass 0 to disable. */
  autoHideMs?: number;
  /** Provide a custom cache namespace so two callers don't collide on the same handle. */
  cacheKey?: string;
}

export interface UseEncryptedHandleResult {
  /** Decrypted value, or null while hidden. */
  value: bigint | null;
  /** True while a wallet prompt + decrypt is in flight. */
  revealing: boolean;
  /** True when the value is currently hidden (locked OR auto-hidden). */
  hidden: boolean;
  /** Last error, if any. */
  error: string | null;
  /** Pop the wallet (only if cache miss) + decrypt. */
  reveal: () => Promise<bigint | null>;
  /** Hide the value immediately. */
  hide: () => void;
  /** Force re-decrypt ignoring cache. */
  refresh: () => Promise<bigint | null>;
}

/**
 * @param handle  euint64 ciphertext handle (bytes32 or bigint); pass null when
 *                the source is still loading.
 */
export function useEncryptedHandle(
  handle: bigint | `0x${string}` | null | undefined,
  opts: UseEncryptedHandleOptions = {}
): UseEncryptedHandleResult {
  const { autoHideMs = 30_000, cacheKey: customKey } = opts;
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const [value, setValue] = useState<bigint | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBn = useMemo<bigint | null>(() => {
    if (handle === null || handle === undefined) return null;
    try {
      return typeof handle === "bigint" ? handle : BigInt(handle);
    } catch {
      return null;
    }
  }, [handle]);

  const key = useMemo(
    () => (handleBn === null ? "" : (customKey ?? cacheKey(handleBn, address))),
    [handleBn, address, customKey]
  );

  // Reset on identity change
  useEffect(() => {
    setValue(null);
    setError(null);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, [key]);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (autoHideMs > 0) {
      hideTimer.current = setTimeout(() => setValue(null), autoHideMs);
    }
  }, [autoHideMs]);

  const performDecrypt = useCallback(
    async (force: boolean): Promise<bigint | null> => {
      if (handleBn === null) return null;
      if (!publicClient || !walletClient || !address) return null;

      // Short-circuit on zero handle — no wallet prompt
      if (handleBn === 0n) {
        setValue(0n);
        return 0n;
      }

      // Cache check
      if (!force) {
        const hit = cache.get(key);
        if (hit && hit.expiresAt > Date.now()) {
          setValue(hit.value);
          scheduleHide();
          return hit.value;
        }
      }

      // Single-flight
      const existing = !force && inflight.get(key);
      if (existing) {
        setRevealing(true);
        try {
          const v = await existing;
          setValue(v);
          scheduleHide();
          return v;
        } finally {
          setRevealing(false);
        }
      }

      setRevealing(true);
      setError(null);
      const p = (async () => {
        await initFHEClient(publicClient, walletClient);
        const v = await decryptBalance(handleBn);
        cache.set(key, { value: v, expiresAt: Date.now() + CACHE_TTL_MS });
        return v;
      })();
      inflight.set(key, p);
      try {
        const v = await p;
        setValue(v);
        scheduleHide();
        return v;
      } catch (e: any) {
        setError(e?.shortMessage ?? e?.message ?? "Reveal failed");
        return null;
      } finally {
        inflight.delete(key);
        setRevealing(false);
      }
    },
    [handleBn, publicClient, walletClient, address, key, scheduleHide]
  );

  const reveal   = useCallback(() => performDecrypt(false), [performDecrypt]);
  const refresh  = useCallback(() => performDecrypt(true),  [performDecrypt]);
  const hide     = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setValue(null);
  }, []);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  return { value, revealing, hidden: value === null, error, reveal, hide, refresh };
}

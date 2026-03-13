/**
 * useStealthInbox — wraps `useStealthScan` and layers two on-chain/local
 * affordances on top:
 *
 *   1. **Ignore filter** (ObscuraInboxIndex bloom) — sender-side spam list.
 *      `isIgnored(ephemeralPubKeyHash)` is checked per-match; ignored
 *      matches are filtered out of `items`.
 *   2. **Seen-state** (localStorage `obscura.inbox.seen.v1:<addr>`) — the
 *      `unreadCount` exposed to the UI is just `items.filter(!seen)`.
 *
 *  Returns a stable surface so the Receive zone / nav badge / Claim-All
 *  button can all consume it without re-implementing scan logic.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { keccak256 } from "viem";
import { useStealthScan, type ScannedPayment } from "./useStealthScan";
import { useSweepStealth } from "./useSweepStealth";
import {
  OBSCURA_INBOX_INDEX_ABI,
  OBSCURA_INBOX_INDEX_ADDRESS,
} from "@/config/payV2";
import { estimateCappedFees } from "@/lib/gas";
import { getJSON, setJSON } from "@/lib/scopedStorage";

const SEEN_KEY = "obscura.inbox.seen.v1";
// Poll the chain at a relaxed cadence and pause when the tab is hidden so we
// don't hammer the public RPC (avoids 429 rate-limit walls on Arbitrum Sepolia).
const POLL_MS = 120_000;

interface SeenMap {
  [txHashStealthAddr: string]: number; // unix-ms first-seen
}

export interface InboxItem extends ScannedPayment {
  id: string;
  ephHash: `0x${string}`;
  seen: boolean;
}

export function useStealthInbox() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const scan = useStealthScan();
  const sweep = useSweepStealth();

  const [ignoredMap, setIgnoredMap] = useState<Record<string, boolean>>({});
  const [seenMap, setSeenMap] = useState<SeenMap>({});
  const [isClaimingAll, setIsClaimingAll] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Stable ref so the polling effect never needs `scan` in its dep array.
  // Without this, the scan object (new ref every render) caused an infinite
  // re-render loop that fired hundreds of getLogs calls per second (429 wall).
  const scanFnRef = useRef(scan.scan);
  scanFnRef.current = scan.scan;

  // Load seen-state on address change.
  useEffect(() => {
    if (!address) {
      setSeenMap({});
      return;
    }
    setSeenMap(getJSON<SeenMap>(SEEN_KEY, address) ?? {});
  }, [address]);

  // Periodic re-scan. Pauses while the tab is hidden so background tabs
  // don't burn through the RPC's per-IP rate limit.
  // Uses scanFnRef so `scan` object is NOT in the dep array — having the
  // unstable scan object in deps caused a tight re-render loop firing
  // hundreds of getLogs/getBlockNumber calls per second (429 wall).
  useEffect(() => {
    if (!address) return;
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      void scanFnRef.current();
    };
    tick();
    const id = window.setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [address]); // intentionally omits `scan` — use scanFnRef instead

  // Refresh ignore-filter state when the scan list changes.
  useEffect(() => {
    if (!publicClient || !address || !OBSCURA_INBOX_INDEX_ADDRESS) return;
    let cancelled = false;
    (async () => {
      const next: Record<string, boolean> = {};
      for (const m of scan.matches) {
        const eph = keccak256(m.ephemeralPubKey);
        try {
          const ignored = (await publicClient.readContract({
            address: OBSCURA_INBOX_INDEX_ADDRESS,
            abi: OBSCURA_INBOX_INDEX_ABI,
            functionName: "isIgnored",
            args: [address, eph],
          })) as boolean;
          next[eph] = ignored;
        } catch {
          next[eph] = false;
        }
      }
      if (!cancelled) setIgnoredMap(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [publicClient, address, scan.matches]);

  const items = useMemo<InboxItem[]>(() => {
    return scan.matches
      .map((m) => {
        const ephHash = keccak256(m.ephemeralPubKey);
        const id = `${m.txHash}-${m.stealthAddress}`;
        return {
          ...m,
          id,
          ephHash,
          seen: !!seenMap[id],
        };
      })
      .filter((m) => !ignoredMap[m.ephHash]);
  }, [scan.matches, ignoredMap, seenMap]);

  const unreadCount = items.filter((i) => !i.seen).length;

  const markAsSeen = useCallback(
    (id: string) => {
      if (!address) return;
      const next = { ...seenMap, [id]: Date.now() };
      setSeenMap(next);
      setJSON(SEEN_KEY, address, next);
    },
    [address, seenMap]
  );

  const markAllAsSeen = useCallback(() => {
    if (!address) return;
    const now = Date.now();
    const next: SeenMap = { ...seenMap };
    for (const i of items) if (!next[i.id]) next[i.id] = now;
    setSeenMap(next);
    setJSON(SEEN_KEY, address, next);
  }, [address, items, seenMap]);

  const ignoreSender = useCallback(
    async (ephHash: `0x${string}`) => {
      if (!publicClient || !walletClient || !address || !OBSCURA_INBOX_INDEX_ADDRESS) {
        throw new Error("Wallet or contract not configured");
      }
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: OBSCURA_INBOX_INDEX_ADDRESS,
        abi: OBSCURA_INBOX_INDEX_ABI,
        functionName: "ignoreSender",
        args: [ephHash],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 200_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setIgnoredMap((m) => ({ ...m, [ephHash]: true }));
      return hash;
    },
    [publicClient, walletClient, writeContractAsync, address]
  );

  const ignoreSenders = useCallback(
    async (ephHashes: `0x${string}`[]) => {
      if (!publicClient || !walletClient || !address || !OBSCURA_INBOX_INDEX_ADDRESS) {
        throw new Error("Wallet or contract not configured");
      }
      if (ephHashes.length === 0) return null;
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: OBSCURA_INBOX_INDEX_ADDRESS,
        abi: OBSCURA_INBOX_INDEX_ABI,
        functionName: "ignoreSenders",
        args: [ephHashes],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: BigInt(200_000 + ephHashes.length * 60_000),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      const next = { ...ignoredMap };
      for (const h of ephHashes) next[h] = true;
      setIgnoredMap(next);
      return hash;
    },
    [publicClient, walletClient, writeContractAsync, address, ignoredMap]
  );

  const resetFilter = useCallback(async () => {
    if (!publicClient || !walletClient || !address || !OBSCURA_INBOX_INDEX_ADDRESS) {
      throw new Error("Wallet or contract not configured");
    }
    const fees = await estimateCappedFees(publicClient);
    const hash = await writeContractAsync({
      address: OBSCURA_INBOX_INDEX_ADDRESS,
      abi: OBSCURA_INBOX_INDEX_ABI,
      functionName: "resetFilter",
      args: [],
      account: address,
      chain: arbitrumSepolia,
      maxFeePerGas: fees.maxFeePerGas,
      maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      gas: 250_000n,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    setIgnoredMap({});
    return hash;
  }, [publicClient, walletClient, writeContractAsync, address]);

  /** Claim all unread, non-ignored payments by running sweeps sequentially. */
  const claimAll = useCallback(async () => {
    setIsClaimingAll(true);
    setBulkError(null);
    try {
      for (const item of items) {
        if (item.amount === 0n) continue;
        await sweep.sweep(item);
        markAsSeen(item.id);
      }
    } catch (e) {
      setBulkError((e as Error).message);
      throw e;
    } finally {
      setIsClaimingAll(false);
    }
  }, [items, sweep, markAsSeen]);

  return {
    items,
    unreadCount,
    isScanning: scan.isScanning,
    scanError: scan.error,
    refresh: scan.scan,
    markAsSeen,
    markAllAsSeen,
    ignoreSender,
    ignoreSenders,
    resetFilter,
    claimAll,
    sweepState: sweep.state,
    sweepStepLabel: sweep.stepLabel,
    isClaimingAll,
    bulkError,
  };
}

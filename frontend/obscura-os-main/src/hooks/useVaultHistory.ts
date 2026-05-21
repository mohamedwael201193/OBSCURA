/**
 * useVaultHistory — sample public TVL + utilization every N seconds and
 * persist into IndexedDB for offline-resilient sparklines.
 *
 * Storage layout:
 *   DB:     obscura-credit-history
 *   Store:  vault-samples (keyPath: id, autoIncrement)
 *           Each record: { address, ts, tvl(bigint→string), utilizationBps?(number) }
 *
 * Falls back to in-memory ring buffer when IndexedDB is unavailable.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { CREDIT_VAULT_ABI, CREDIT_MARKET_ABI } from "@/config/credit";

const DB_NAME = "obscura-credit-history";
const STORE = "vault-samples";
const DB_VERSION = 1;
const MAX_AGE_MS = 7 * 24 * 3600 * 1000; // 7 days
const SAMPLE_INTERVAL_MS = 30_000;

export interface Sample {
  address: string;
  ts: number;
  tvl: bigint;
  utilizationBps?: number;
}

interface SampleRecord {
  address: string;
  ts: number;
  tvlStr: string;
  utilizationBps?: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { autoIncrement: true });
          store.createIndex("by-address-ts", ["address", "ts"], { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function appendSample(record: SampleRecord) {
  const db = await openDb();
  if (!db) return;
  try {
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).add(record);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* */ }
}

async function readSamples(address: string, sinceMs: number): Promise<Sample[]> {
  const db = await openDb();
  if (!db) return [];
  try {
    return await new Promise<Sample[]>((res, rej) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const out: Sample[] = [];
      const req = store.openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) { res(out); return; }
        const v = cur.value as SampleRecord;
        if (v.address.toLowerCase() === address.toLowerCase() && v.ts >= sinceMs) {
          out.push({ address: v.address, ts: v.ts, tvl: BigInt(v.tvlStr), utilizationBps: v.utilizationBps });
        }
        cur.continue();
      };
      req.onerror = () => rej(req.error);
    });
  } catch { return []; }
}

async function prune() {
  const db = await openDb();
  if (!db) return;
  const cutoff = Date.now() - MAX_AGE_MS;
  try {
    await new Promise<void>((res) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (!cur) { res(); return; }
        const v = cur.value as SampleRecord;
        if (v.ts < cutoff) cur.delete();
        cur.continue();
      };
      req.onerror = () => res();
    });
  } catch { /* */ }
}

export interface UseVaultHistoryOptions {
  /** Address of a vault OR a market. */
  address?: `0x${string}`;
  /** "vault" reads publicTotalDeposited; "market" reads totalSupplyAssets + utilizationBps. */
  kind: "vault" | "market";
  /** Lookback window in milliseconds. Default 24h. */
  windowMs?: number;
  /** Sampling cadence in ms. Default 30s. */
  intervalMs?: number;
}

export function useVaultHistory(opts: UseVaultHistoryOptions) {
  const { address, kind, windowMs = 24 * 3600 * 1000, intervalMs = SAMPLE_INTERVAL_MS } = opts;
  const publicClient = usePublicClient();
  const [samples, setSamples] = useState<Sample[]>([]);
  const memBuffer = useRef<Sample[]>([]);

  const refresh = useCallback(async () => {
    if (!address) return;
    const cutoff = Date.now() - windowMs;
    const persisted = await readSamples(address, cutoff);
    const merged = [
      ...persisted,
      ...memBuffer.current.filter((s) => s.ts >= cutoff && s.address === address),
    ].sort((a, b) => a.ts - b.ts);
    setSamples(merged);
  }, [address, windowMs]);

  // Initial load
  useEffect(() => { void refresh(); }, [refresh]);

  // Sampler
  useEffect(() => {
    if (!publicClient || !address) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try {
        let tvl: bigint;
        let util: number | undefined;
        if (kind === "vault") {
          tvl = (await publicClient.readContract({
            address, abi: CREDIT_VAULT_ABI, functionName: "publicTotalDeposited",
          })) as bigint;
        } else {
          const [tsa, u] = await Promise.all([
            publicClient.readContract({ address, abi: CREDIT_MARKET_ABI, functionName: "totalSupplyAssets" }) as Promise<bigint>,
            publicClient.readContract({ address, abi: CREDIT_MARKET_ABI, functionName: "utilizationBps" }) as Promise<bigint>,
          ]);
          tvl = tsa;
          util = Number(u);
        }
        const s: Sample = { address, ts: Date.now(), tvl, utilizationBps: util };
        memBuffer.current.push(s);
        // Keep memory buffer bounded
        if (memBuffer.current.length > 5000) memBuffer.current = memBuffer.current.slice(-4000);
        void appendSample({ address: s.address, ts: s.ts, tvlStr: tvl.toString(), utilizationBps: util });
        setSamples((prev) => {
          const cutoff = Date.now() - windowMs;
          return [...prev.filter((x) => x.ts >= cutoff), s];
        });
      } catch { /* RPC blip */ }
    };

    void tick();
    const id = setInterval(tick, intervalMs);
    const pruneId = setInterval(() => void prune(), 60 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
      clearInterval(pruneId);
    };
  }, [publicClient, address, kind, intervalMs, windowMs]);

  return { samples, refresh };
}

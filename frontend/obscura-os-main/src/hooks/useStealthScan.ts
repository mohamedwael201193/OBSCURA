import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { decodeAbiParameters, decodeEventLog } from "viem";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
} from "@/config/pay";
import {
  getCachedUnlockedKeys,
  isStealthKeystoreUnlocked,
  loadStoredKeys,
  lockStealthKeystore,
  scanAnnouncement,
  unlockStoredKeys,
  type MetaAddressKeys,
} from "@/lib/stealth";

export interface ScannedPayment {
  blockNumber: bigint;
  txHash: `0x${string}`;
  stealthAddress: `0x${string}`;
  ephemeralPubKey: `0x${string}`;
  viewTag: `0x${string}`;
  streamId: bigint;
  escrowId: bigint;
  amount: bigint; // 0n if not encoded in metadata (old payments)
}

interface ScanSummary {
  scannedAt: number | null;
  indexedAnnouncements: number;
  rpcAnnouncements: number;
  matched: number;
  source: "none" | "indexed" | "rpc" | "mixed";
}

interface AnnouncementCandidate {
  blockNumber: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  stealthAddress: `0x${string}`;
  ephemeralPubKey: `0x${string}`;
  viewTag: `0x${string}`;
  metadata: `0x${string}`;
  source: "indexed" | "rpc";
}

interface IndexedAnnouncementRow {
  id: number;
  block_number: string;
  tx_hash: string;
  log_index: number;
  args: Record<string, unknown> | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabase = SUPABASE_URL && SUPABASE_ANON
  ? createClient(SUPABASE_URL, SUPABASE_ANON)
  : null;

const INDEXED_ANNOUNCEMENT_LIMIT = 2_000;
const RPC_FALLBACK_LOOKBACK_BLOCKS = 5_000n;
const RPC_CHUNK_BLOCKS = 500n;
const EMPTY_SUMMARY: ScanSummary = {
  scannedAt: null,
  indexedAnnouncements: 0,
  rpcAnnouncements: 0,
  matched: 0,
  source: "none",
};
const SCAN_CACHE_EVENT = "obscura:stealthScanCache";
const scanCache = new Map<string, ScannedPayment[]>();

function isHex(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-fA-F]*$/.test(value);
}

function cacheKey(account: string): string {
  return account.toLowerCase();
}

function publishScanCache(account: string, matches: ScannedPayment[]): void {
  const key = cacheKey(account);
  scanCache.set(key, matches);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SCAN_CACHE_EVENT, { detail: { account: key, matches } }));
  }
}

function readArg(args: Record<string, unknown>, key: string): unknown {
  return args[key] ?? args[key.toLowerCase()];
}

function indexedRowToAnnouncement(row: IndexedAnnouncementRow): AnnouncementCandidate | null {
  const args = row.args ?? {};
  const stealthAddress = readArg(args, "stealthAddress");
  const ephemeralPubKey = readArg(args, "ephemeralPubKey");
  const viewTag = readArg(args, "viewTag");
  const metadata = readArg(args, "metadata");

  if (!isHex(stealthAddress) || !isHex(ephemeralPubKey) || !isHex(viewTag)) return null;
  return {
    blockNumber: BigInt(row.block_number || "0"),
    txHash: isHex(row.tx_hash) ? row.tx_hash : "0x",
    logIndex: row.log_index ?? 0,
    stealthAddress,
    ephemeralPubKey,
    viewTag,
    metadata: isHex(metadata) ? metadata : "0x",
    source: "indexed",
  };
}

async function fetchIndexedAnnouncements(): Promise<AnnouncementCandidate[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("obscura_activity")
    .select("id, block_number, tx_hash, log_index, args")
    .eq("event_name", "ObscuraStealthRegistry.Announcement")
    .order("id", { ascending: false })
    .limit(INDEXED_ANNOUNCEMENT_LIMIT);

  if (error) throw new Error(`Indexed inbox query failed: ${error.message}`);
  return ((data ?? []) as IndexedAnnouncementRow[])
    .map(indexedRowToAnnouncement)
    .filter((value): value is AnnouncementCandidate => value !== null);
}

async function fetchRpcAnnouncements(publicClient: NonNullable<ReturnType<typeof usePublicClient>>): Promise<AnnouncementCandidate[]> {
  if (!OBSCURA_STEALTH_REGISTRY_ADDRESS) return [];
  const head = await publicClient.getBlockNumber();
  const first = head > RPC_FALLBACK_LOOKBACK_BLOCKS ? head - RPC_FALLBACK_LOOKBACK_BLOCKS : 0n;
  const out: AnnouncementCandidate[] = [];

  let fromBlock = first;
  while (fromBlock <= head) {
    const toBlock = fromBlock + RPC_CHUNK_BLOCKS - 1n > head ? head : fromBlock + RPC_CHUNK_BLOCKS - 1n;
    const logs = await publicClient.getLogs({
      address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
      event: {
        type: "event",
        name: "Announcement",
        inputs: [
          { indexed: true, name: "schemeId", type: "uint256" },
          { indexed: true, name: "stealthAddress", type: "address" },
          { indexed: true, name: "caller", type: "address" },
          { indexed: false, name: "ephemeralPubKey", type: "bytes" },
          { indexed: false, name: "viewTag", type: "bytes1" },
          { indexed: false, name: "metadata", type: "bytes" },
        ],
      },
      fromBlock,
      toBlock,
    });

    for (const log of logs) {
      try {
        const decoded = decodeEventLog({
          abi: OBSCURA_STEALTH_REGISTRY_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName !== "Announcement") continue;
        const args = decoded.args as Record<string, unknown>;
        const stealthAddress = args.stealthAddress;
        const ephemeralPubKey = args.ephemeralPubKey;
        const viewTag = args.viewTag;
        const metadata = args.metadata;
        if (!isHex(stealthAddress) || !isHex(ephemeralPubKey) || !isHex(viewTag)) continue;
        out.push({
          blockNumber: log.blockNumber ?? 0n,
          txHash: log.transactionHash ?? "0x",
          logIndex: log.logIndex ?? 0,
          stealthAddress,
          ephemeralPubKey,
          viewTag,
          metadata: isHex(metadata) ? metadata : "0x",
          source: "rpc",
        });
      } catch {
        // Skip malformed logs without failing the whole inbox scan.
      }
    }
    fromBlock = toBlock + 1n;
  }

  return out;
}

function decodeAnnouncementMetadata(metadata: `0x${string}`): Pick<ScannedPayment, "streamId" | "escrowId" | "amount"> {
  let streamId = 0n;
  let escrowId = 0n;
  let amount = 0n;
  if (metadata && metadata.length > 2) {
    try {
      const [sId, eId, amt] = decodeAbiParameters(
        [
          { name: "streamId", type: "uint256" },
          { name: "escrowId", type: "uint256" },
          { name: "amount", type: "uint256" },
        ],
        metadata,
      );
      streamId = sId as bigint;
      escrowId = eId as bigint;
      amount = amt as bigint;
    } catch {
      try {
        const [sId, eId] = decodeAbiParameters(
          [
            { name: "streamId", type: "uint256" },
            { name: "escrowId", type: "uint256" },
          ],
          metadata,
        );
        streamId = sId as bigint;
        escrowId = eId as bigint;
      } catch {
        // metadata may be an older or empty format
      }
    }
  }
  return { streamId, escrowId, amount };
}

function scanCandidates(candidates: AnnouncementCandidate[], keys: MetaAddressKeys): ScannedPayment[] {
  const byLog = new Map<string, AnnouncementCandidate>();
  for (const candidate of candidates) {
    const id = `${candidate.txHash.toLowerCase()}:${candidate.logIndex}`;
    const existing = byLog.get(id);
    if (!existing || existing.source === "rpc") byLog.set(id, candidate);
  }

  const found: ScannedPayment[] = [];
  for (const candidate of byLog.values()) {
    const derived = scanAnnouncement(
      candidate.ephemeralPubKey,
      candidate.viewTag,
      keys.viewingPrivateKey,
      keys.meta.spendingPubKey,
    );
    if (!derived || derived.toLowerCase() !== candidate.stealthAddress.toLowerCase()) continue;
    found.push({
      blockNumber: candidate.blockNumber,
      txHash: candidate.txHash,
      stealthAddress: candidate.stealthAddress,
      ephemeralPubKey: candidate.ephemeralPubKey,
      viewTag: candidate.viewTag,
      ...decodeAnnouncementMetadata(candidate.metadata),
    });
  }

  return found.sort((a, b) => {
    if (a.blockNumber === b.blockNumber) return a.txHash < b.txHash ? 1 : -1;
    return a.blockNumber < b.blockNumber ? 1 : -1;
  });
}

/**
 * useStealthScan — scans public stealth announcements with user-held viewing keys.
 * Unlocking is explicit: scans never call `personal_sign` on mount or polling.
 */
export function useStealthScan() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [matches, setMatches] = useState<ScannedPayment[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ScanSummary>(EMPTY_SUMMARY);

  useEffect(() => {
    if (!address) {
      setMatches([]);
      setIsUnlocked(false);
      setError(null);
      setSummary(EMPTY_SUMMARY);
      return;
    }
    const key = cacheKey(address);
    setMatches(scanCache.get(key) ?? []);
    setIsUnlocked(!!getCachedUnlockedKeys(address));
    setError(null);

    const onCache = (event: Event) => {
      const detail = (event as CustomEvent<{ account: string; matches: ScannedPayment[] }>).detail;
      if (detail?.account === key) setMatches(detail.matches);
    };
    window.addEventListener(SCAN_CACHE_EVENT, onCache);
    return () => window.removeEventListener(SCAN_CACHE_EVENT, onCache);
  }, [address]);

  const scanWithKeys = useCallback(async (keys: MetaAddressKeys) => {
    if (!publicClient || !address || !OBSCURA_STEALTH_REGISTRY_ADDRESS) return;
    setIsScanning(true);
    setError(null);
    try {
      let indexed: AnnouncementCandidate[] = [];
      let rpc: AnnouncementCandidate[] = [];
      let indexedError: Error | null = null;
      let rpcError: Error | null = null;

      try {
        indexed = await fetchIndexedAnnouncements();
      } catch (e) {
        indexedError = e as Error;
      }

      try {
        rpc = await fetchRpcAnnouncements(publicClient);
      } catch (e) {
        rpcError = e as Error;
      }

      if (indexed.length === 0 && rpc.length === 0 && (indexedError || rpcError)) {
        throw indexedError ?? rpcError ?? new Error("No announcement source available");
      }

      const found = scanCandidates([...indexed, ...rpc], keys);
      setMatches(found);
      publishScanCache(address, found);
      setIsUnlocked(true);
      setSummary({
        scannedAt: Date.now(),
        indexedAnnouncements: indexed.length,
        rpcAnnouncements: rpc.length,
        matched: found.length,
        source: indexed.length > 0 && rpc.length > 0 ? "mixed" : indexed.length > 0 ? "indexed" : rpc.length > 0 ? "rpc" : "none",
      });

      if (found.length === 0 && indexedError && rpc.length === 0) {
        setError(indexedError.message);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsScanning(false);
    }
  }, [publicClient, address]);

  const scan = useCallback(async () => {
    if (!address) return;
    let keys = getCachedUnlockedKeys(address) ?? loadStoredKeys(address);
    if (!keys && walletClient && isStealthKeystoreUnlocked(address)) {
      keys = await unlockStoredKeys(address, walletClient);
    }
    if (!keys) {
      setIsUnlocked(false);
      setError("Unlock inbox to scan private announcements");
      return;
    }
    await scanWithKeys(keys);
  }, [address, walletClient, scanWithKeys]);

  const unlock = useCallback(async (): Promise<MetaAddressKeys | null> => {
    if (!address || !walletClient) return null;
    setError(null);
    const keys = await unlockStoredKeys(address, walletClient);
    if (!keys) {
      setIsUnlocked(false);
      setError("No stealth keys found in this browser");
      return null;
    }
    setIsUnlocked(true);
    await scanWithKeys(keys);
    return keys;
  }, [address, walletClient, scanWithKeys]);

  const lock = useCallback(() => {
    if (address) lockStealthKeystore(address);
    setIsUnlocked(false);
    setMatches([]);
    setError(null);
    setSummary(EMPTY_SUMMARY);
    if (address) publishScanCache(address, []);
  }, [address]);

  return { matches, isScanning, isUnlocked, error, summary, scan, unlock, lock };
}

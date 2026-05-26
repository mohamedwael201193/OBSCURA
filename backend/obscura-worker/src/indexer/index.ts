/**
 * indexer/index.ts — Obscura Pay on-chain event indexer
 *
 * Watches events from all active Obscura Pay contracts on Arbitrum Sepolia
 * and persists them to Supabase for the activity feed + Realtime.
 */
import { createPublicClient, http, type Log, type Address } from "viem";
import { arbitrumSepolia } from "viem/chains";
import {
  PAY_EVENTS,
  PAYSTREAM_EVENTS,
  INVOICE_EVENTS,
  ESCROW_EVENTS,
  STEALTH_EVENTS,
  INSURANCE_EVENTS,
} from "./events";
import { insertActivity, getLastIndexedBlock } from "../db";
import { dispatchActivityNotification } from "../notifications";

const RPC_URL  = process.env.RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
const CHAIN_ID = 421614;
const MAX_GET_LOGS_BLOCKS = 10;
const GET_LOGS_CHUNK_BLOCKS = Math.min(
  MAX_GET_LOGS_BLOCKS,
  Math.max(1, Number.parseInt(process.env.INDEXER_GETLOGS_CHUNK_BLOCKS ?? "10", 10) || 10),
);
const GET_LOGS_RETRIES = Math.max(1, Number.parseInt(process.env.INDEXER_GETLOGS_RETRIES ?? "3", 10) || 3);
const GET_LOGS_RETRY_BASE_MS = Math.max(250, Number.parseInt(process.env.INDEXER_GETLOGS_RETRY_BASE_MS ?? "1000", 10) || 1000);
const LIVE_POLL_MS = Math.max(2000, Number.parseInt(process.env.INDEXER_LIVE_POLL_MS ?? "5000", 10) || 5000);
const LIVE_RETRY_MAX_MS = Math.max(5000, Number.parseInt(process.env.INDEXER_LIVE_RETRY_MAX_MS ?? "30000", 10) || 30000);
const STARTUP_RECENT_BLOCKS = Math.max(10, Number.parseInt(process.env.INDEXER_STARTUP_RECENT_BLOCKS ?? "5000", 10) || 5000);
const BACKGROUND_BACKFILL_DELAY_MS = Math.max(0, Number.parseInt(process.env.INDEXER_BACKGROUND_BACKFILL_DELAY_MS ?? "15000", 10) || 15000);
const DISPATCH_RECOVERED_DUPLICATES = (process.env.INDEXER_DISPATCH_RECOVERED_DUPLICATES ?? "true").toLowerCase() !== "false";

type IndexedEvent = {
  readonly type: "event";
  readonly name: string;
  readonly inputs: readonly { readonly name: string; readonly type: string; readonly indexed?: boolean }[];
};

interface ContractConfig {
  contractName: string;
  address: Address;
  events: readonly IndexedEvent[];
  live: boolean;
}

// ─── Contracts ────────────────────────────────────────────────────────────────
const CONTRACTS = {
  ObscuraPay:                     "0x91CdD9a481C732bEB09Ce039da23DC11e83547a4" as Address,
  ObscuraPayStreamV3:             "0xE4328F139F03138D63f7fdF90A8Ef240e04653fA" as Address,
  ObscuraInvoice:                 "0x62a86C8d68fF32ea41Faf349db6EF7EF496620b7" as Address,
  ObscuraConfidentialEscrow:      "0x293810A2081114CcE0c98A709a0c31aE07c01D75" as Address,
  ObscuraInsuranceSubscriptionV2: "0xEA9Fc5800F41d090dFB90f9735F4CF3824d6743D" as Address,
  ObscuraStealthRegistry:         "0xa36e791a611D36e2C817a7DA0f41547D30D4917d" as Address,
  // Legacy (historical indexing only)
  ObscuraPayStreamV2:             "0xb2fF39C496131d4AFd01d189569aF6FEBaC54d2C" as Address,
  ObscuraInsuranceSubscription:   "0x0CCE5DA9E447e7B4A400fC53211dd29C51CA8102" as Address,
} as const;

const INDEXER_CONTRACTS: readonly ContractConfig[] = [
  { contractName: "ObscuraPay",                     address: CONTRACTS.ObscuraPay,                     events: PAY_EVENTS,       live: true  },
  { contractName: "ObscuraPayStreamV3",             address: CONTRACTS.ObscuraPayStreamV3,             events: PAYSTREAM_EVENTS, live: true  },
  { contractName: "ObscuraInvoice",                 address: CONTRACTS.ObscuraInvoice,                 events: INVOICE_EVENTS,   live: true  },
  { contractName: "ObscuraConfidentialEscrow",      address: CONTRACTS.ObscuraConfidentialEscrow,      events: ESCROW_EVENTS,    live: true  },
  { contractName: "ObscuraInsuranceSubscriptionV2", address: CONTRACTS.ObscuraInsuranceSubscriptionV2, events: INSURANCE_EVENTS, live: true  },
  { contractName: "ObscuraStealthRegistry",         address: CONTRACTS.ObscuraStealthRegistry,         events: STEALTH_EVENTS,   live: true  },
  { contractName: "ObscuraPayStreamV2",             address: CONTRACTS.ObscuraPayStreamV2,             events: PAYSTREAM_EVENTS, live: false },
  { contractName: "ObscuraInsuranceSubscription",   address: CONTRACTS.ObscuraInsuranceSubscription,   events: INSURANCE_EVENTS, live: false },
] as const;

interface IndexerHealthSnapshot {
  status: "starting" | "running";
  chainId: number;
  maxChunkSize: number;
  chunkSize: number;
  retries: number;
  livePollMs: number;
  startupRecentBlocks: number;
  watchedContracts: string[];
  startedAt: string;
  lastChunkAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  recoveredDuplicateDispatches: number;
}

const indexerHealth: IndexerHealthSnapshot = {
  status: "starting",
  chainId: CHAIN_ID,
  maxChunkSize: MAX_GET_LOGS_BLOCKS,
  chunkSize: GET_LOGS_CHUNK_BLOCKS,
  retries: GET_LOGS_RETRIES,
  livePollMs: LIVE_POLL_MS,
  startupRecentBlocks: STARTUP_RECENT_BLOCKS,
  watchedContracts: INDEXER_CONTRACTS.filter((contract) => contract.live).map((contract) => contract.contractName),
  startedAt: new Date().toISOString(),
  lastChunkAt: null,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastError: null,
  consecutiveFailures: 0,
  recoveredDuplicateDispatches: 0,
};

export function getIndexerHealth(): IndexerHealthSnapshot {
  return { ...indexerHealth, watchedContracts: [...indexerHealth.watchedContracts] };
}

const client = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(RPC_URL),
});

const recoveredDuplicateDispatches = new Set<string>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelay(attempt: number): number {
  return Math.min(LIVE_RETRY_MAX_MS, GET_LOGS_RETRY_BASE_MS * 2 ** Math.max(0, attempt - 1));
}

function chunkEnd(fromBlock: bigint, toBlock: bigint): bigint {
  const maxEnd = fromBlock + BigInt(GET_LOGS_CHUNK_BLOCKS - 1);
  return maxEnd < toBlock ? maxEnd : toBlock;
}

function maxBlock(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

function errorMessage(error: unknown): string {
  const err = error as { shortMessage?: string; message?: string };
  return err.shortMessage ?? err.message ?? String(error);
}

function activityKey(txHash: string, logIndex: number): string {
  return `${txHash.toLowerCase()}:${logIndex}`;
}

// ─── Log handler ─────────────────────────────────────────────────────────────
function extractWallets(args: Record<string, unknown>): string[] {
  return Object.values(args)
    .filter((v): v is string => typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v))
    .map((a) => a.toLowerCase());
}

async function handleLog(
  contractName: string,
  contractAddress: Address,
  log: Log & { eventName: string; args: Record<string, unknown> },
  phase: "backfill" | "live",
): Promise<void> {
  const args = log.args;
  const wallets = extractWallets(args);
  const primaryWallet = wallets[0] ?? contractAddress.toLowerCase();

  const result = await insertActivity({
    chain_id:         CHAIN_ID,
    block_number:     log.blockNumber ?? 0n,
    tx_hash:          log.transactionHash ?? "0x",
    log_index:        log.logIndex ?? 0,
    contract_address: contractAddress.toLowerCase(),
    event_name:       `${contractName}.${log.eventName}`,
    wallet:           primaryWallet,
    participants:     wallets,
    args: Object.fromEntries(
      Object.entries(args).map(([k, v]) => [
        k,
        typeof v === "bigint" ? v.toString() : v,
      ])
    ),
  });

  const { activity, inserted } = result;
  const key = activityKey(activity.tx_hash, activity.log_index);
  const shouldDispatch = inserted || (
    phase === "live" &&
    DISPATCH_RECOVERED_DUPLICATES &&
    !recoveredDuplicateDispatches.has(key)
  );

  if (!shouldDispatch) return;

  if (!inserted) {
    recoveredDuplicateDispatches.add(key);
    indexerHealth.recoveredDuplicateDispatches = recoveredDuplicateDispatches.size;
    console.log(`[indexer] recovered duplicate activity id=${activity.id} event=${activity.event_name} block=${activity.block_number} tx=${activity.tx_hash.slice(0, 12)}... dispatching catch-up notification`);
  }

  if (inserted) {
    console.log(`[indexer] event indexed ${contractName}.${log.eventName} block=${log.blockNumber} tx=${log.transactionHash?.slice(0, 12)}...`);
  }
  try {
    await dispatchActivityNotification(activity);
  } catch (e) {
    console.error(`[indexer] notification dispatch error event=${contractName}.${log.eventName} tx=${log.transactionHash?.slice(0, 12)}... error=${errorMessage(e)}`);
  }
}

async function getLogsChunk(
  contractName: string,
  address: Address,
  events: readonly IndexedEvent[],
  fromBlock: bigint,
  toBlock: bigint,
  phase: "backfill" | "live",
): Promise<boolean> {
  for (let attempt = 1; attempt <= GET_LOGS_RETRIES; attempt++) {
    indexerHealth.lastChunkAt = new Date().toISOString();
    try {
      console.log(`[indexer] ${phase} chunk ${contractName} from=${fromBlock} to=${toBlock} attempt=${attempt}/${GET_LOGS_RETRIES}`);
      const logs = await client.getLogs({
        address,
        events: events as never,
        fromBlock,
        toBlock,
      });

      let failedLogs = 0;
      for (const log of logs) {
        const indexedLog = log as Log & { eventName: string; args: Record<string, unknown> };
        try {
          await handleLog(contractName, address, indexedLog, phase);
        } catch (e) {
          failedLogs++;
          console.error(`[indexer] handleLog error phase=${phase} contract=${contractName} block=${indexedLog.blockNumber} tx=${indexedLog.transactionHash?.slice(0, 12)}... error=${errorMessage(e)}`);
        }
      }

      if (failedLogs > 0) {
        throw new Error(`${failedLogs}/${logs.length} logs failed to index`);
      }

      console.log(`[indexer] ${phase} chunk complete ${contractName} from=${fromBlock} to=${toBlock} logs=${logs.length}`);
      indexerHealth.lastSuccessAt = new Date().toISOString();
      indexerHealth.lastError = null;
      indexerHealth.consecutiveFailures = 0;
      return true;
    } catch (e) {
      const message = errorMessage(e);
      indexerHealth.lastErrorAt = new Date().toISOString();
      indexerHealth.lastError = message;
      if (attempt >= GET_LOGS_RETRIES) {
        indexerHealth.consecutiveFailures++;
        console.error(`[indexer] ${phase} chunk failed ${contractName} from=${fromBlock} to=${toBlock} attempts=${attempt} error=${message}`);
        return false;
      }

      const delay = retryDelay(attempt);
      console.warn(`[indexer] ${phase} chunk retry ${contractName} from=${fromBlock} to=${toBlock} nextAttempt=${attempt + 1}/${GET_LOGS_RETRIES} backoffMs=${delay} error=${message}`);
      await sleep(delay);
    }
  }

  return false;
}

// ─── Backfill ─────────────────────────────────────────────────────────────────
async function backfill(
  contractName: string,
  address: Address,
  events: readonly IndexedEvent[],
  stopBlock?: bigint,
): Promise<bigint | undefined> {
  const lastIndexedBlock = await getLastIndexedBlock(address.toLowerCase());
  const currentBlock = stopBlock ?? await client.getBlockNumber();

  if (lastIndexedBlock === 0n) {
    console.log(`[indexer] No previous rows for ${contractName}; backfill skipped and live indexing starts at block ${currentBlock + 1n}`);
    return currentBlock + 1n;
  }

  let fromBlock = lastIndexedBlock + 1n;
  if (fromBlock > currentBlock) {
    console.log(`[indexer] ${contractName} already indexed through block ${lastIndexedBlock}; live starts at ${currentBlock + 1n}`);
    return currentBlock + 1n;
  }

  console.log(`[indexer] Backfilling ${contractName} from block ${fromBlock} to ${currentBlock} chunkSize=${GET_LOGS_CHUNK_BLOCKS}`);

  while (fromBlock <= currentBlock) {
    const toBlock = chunkEnd(fromBlock, currentBlock);
    const ok = await getLogsChunk(contractName, address, events, fromBlock, toBlock, "backfill");
    if (!ok) {
      console.warn(`[indexer] Backfill paused for ${contractName}; live poller will retry from block ${fromBlock}`);
      return fromBlock;
    }

    fromBlock = toBlock + 1n;
  }

  return currentBlock + 1n;
}

// ─── Live watchers ────────────────────────────────────────────────────────────
function watchContract(
  contractName: string,
  address: Address,
  events: readonly IndexedEvent[],
  startBlock?: bigint,
): () => void {
  let stopped = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let nextBlock = startBlock;
  let failureCount = 0;

  const schedule = (delayMs: number) => {
    if (stopped) return;
    timer = setTimeout(() => {
      void poll();
    }, delayMs);
  };

  const poll = async () => {
    if (stopped || running) return;
    running = true;

    try {
      const currentBlock = await client.getBlockNumber();
      if (nextBlock === undefined) {
        nextBlock = maxBlock(1n, currentBlock - BigInt(STARTUP_RECENT_BLOCKS) + 1n);
        console.log(`[indexer] ${contractName} recovered startup block; live catch-up starts at ${nextBlock}`);
      }

      if (nextBlock <= currentBlock) {
        while (!stopped && nextBlock <= currentBlock) {
          const fromBlock = nextBlock;
          const toBlock = chunkEnd(fromBlock, currentBlock);
          const ok = await getLogsChunk(contractName, address, events, fromBlock, toBlock, "live");
          if (!ok) {
            failureCount++;
            const delay = Math.min(LIVE_RETRY_MAX_MS, retryDelay(failureCount));
            console.warn(`[indexer] live recovery scheduled ${contractName} from=${fromBlock} retryInMs=${delay} failures=${failureCount}`);
            schedule(delay);
            return;
          }

          nextBlock = toBlock + 1n;
        }

        failureCount = 0;
      }

      schedule(LIVE_POLL_MS);
    } catch (e) {
      failureCount++;
      const delay = Math.min(LIVE_RETRY_MAX_MS, retryDelay(failureCount));
      const message = errorMessage(e);
      indexerHealth.lastErrorAt = new Date().toISOString();
      indexerHealth.lastError = message;
      indexerHealth.consecutiveFailures++;
      console.error(`[indexer] live poll error ${contractName} retryInMs=${delay} failures=${failureCount} error=${message}`);
      schedule(delay);
    } finally {
      running = false;
    }
  };

  console.log(`[indexer] Watching ${contractName} from block ${startBlock ?? "latest"} pollMs=${LIVE_POLL_MS} chunkSize=${GET_LOGS_CHUNK_BLOCKS}`);
  schedule(0);

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

// ─── Entry ────────────────────────────────────────────────────────────────────
export async function startIndexer(): Promise<() => void> {
  console.log(`[indexer] Starting RPC=${RPC_URL} chunkSize=${GET_LOGS_CHUNK_BLOCKS} retries=${GET_LOGS_RETRIES} livePollMs=${LIVE_POLL_MS} startupRecentBlocks=${STARTUP_RECENT_BLOCKS}`);
  indexerHealth.status = "running";

  let startupBlock: bigint | undefined;
  try {
    startupBlock = await client.getBlockNumber();
  } catch (e) {
    console.error(`[indexer] startup block fetch failed; live watchers will start at latest once RPC recovers. error=${errorMessage(e)}`);
  }

  const recentStartBlock = startupBlock === undefined
    ? undefined
    : maxBlock(1n, startupBlock - BigInt(STARTUP_RECENT_BLOCKS) + 1n);

  const liveContracts = INDEXER_CONTRACTS.filter((contract) => contract.live);
  const unwatchers = liveContracts.map((contract) =>
    watchContract(
      contract.contractName,
      contract.address,
      contract.events,
      recentStartBlock,
    )
  );

  console.log(`[indexer] Watching ${unwatchers.length} contracts for live events`);

  void (async () => {
    if (BACKGROUND_BACKFILL_DELAY_MS > 0) {
      console.log(`[indexer] Background backfill delayed ${BACKGROUND_BACKFILL_DELAY_MS}ms so live catch-up can run first`);
      await sleep(BACKGROUND_BACKFILL_DELAY_MS);
    }

    const deepBackfillStopBlock = recentStartBlock === undefined ? undefined : recentStartBlock - 1n;
    for (const contract of INDEXER_CONTRACTS) {
      try {
        const stopBlock = contract.live ? deepBackfillStopBlock : undefined;
        if (stopBlock !== undefined && stopBlock < 1n) {
          console.log(`[indexer] Deep backfill skipped ${contract.contractName}; recent live window covers all startup blocks`);
          continue;
        }
        await backfill(contract.contractName, contract.address, contract.events, stopBlock);
      } catch (e) {
        console.error(`[indexer] background backfill error ${contract.contractName}; worker remains alive. error=${errorMessage(e)}`);
      }
    }
    console.log("[indexer] Background backfill pass complete");
  })();

  return () => unwatchers.forEach((u) => u());
}

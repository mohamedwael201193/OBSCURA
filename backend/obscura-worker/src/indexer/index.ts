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

const RPC_URL  = process.env.RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";
const CHAIN_ID = 421614;

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

const client = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(RPC_URL),
});

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
): Promise<void> {
  const args = log.args;
  const wallets = extractWallets(args);
  const primaryWallet = wallets[0] ?? contractAddress.toLowerCase();

  await insertActivity({
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
  console.log(`[indexer] ${contractName}.${log.eventName} block=${log.blockNumber} tx=${log.transactionHash?.slice(0, 12)}`);
}

// ─── Backfill ─────────────────────────────────────────────────────────────────
async function backfill(
  contractName: string,
  address: Address,
  events: readonly { readonly type: "event"; readonly name: string; readonly inputs: readonly { readonly name: string; readonly type: string; readonly indexed?: boolean }[] }[],
): Promise<void> {
  const fromBlock = await getLastIndexedBlock(address.toLowerCase());
  if (fromBlock === 0n) return;

  const currentBlock = await client.getBlockNumber();
  if (fromBlock >= currentBlock) return;

  console.log(`[indexer] Backfilling ${contractName} from block ${fromBlock} to ${currentBlock}`);

  const logs = await client.getLogs({
    address,
    events: events as never,
    fromBlock,
    toBlock: currentBlock,
  });

  for (const log of logs) {
    await handleLog(contractName, address, log as never);
  }
}

// ─── Live watchers ────────────────────────────────────────────────────────────
function watchContract(
  contractName: string,
  address: Address,
  events: readonly object[],
): () => void {
  return client.watchEvent({
    address,
    events: events as never,
    onLogs: (logs) => {
      for (const log of logs) {
        handleLog(contractName, address, log as never).catch((e) =>
          console.error(`[indexer] handleLog error: ${(e as Error).message}`)
        );
      }
    },
    onError: (e) => console.error(`[indexer] watchEvent error on ${contractName}: ${e.message}`),
  });
}

// ─── Entry ────────────────────────────────────────────────────────────────────
export async function startIndexer(): Promise<() => void> {
  console.log(`[indexer] Starting — RPC: ${RPC_URL}`);

  await backfill("ObscuraPay",                     CONTRACTS.ObscuraPay,                     PAY_EVENTS);
  await backfill("ObscuraPayStreamV3",             CONTRACTS.ObscuraPayStreamV3,             PAYSTREAM_EVENTS);
  await backfill("ObscuraInvoice",                 CONTRACTS.ObscuraInvoice,                 INVOICE_EVENTS);
  await backfill("ObscuraConfidentialEscrow",      CONTRACTS.ObscuraConfidentialEscrow,      ESCROW_EVENTS);
  await backfill("ObscuraInsuranceSubscriptionV2", CONTRACTS.ObscuraInsuranceSubscriptionV2, INSURANCE_EVENTS);
  await backfill("ObscuraStealthRegistry",         CONTRACTS.ObscuraStealthRegistry,         STEALTH_EVENTS);
  await backfill("ObscuraPayStreamV2",             CONTRACTS.ObscuraPayStreamV2,             PAYSTREAM_EVENTS);
  await backfill("ObscuraInsuranceSubscription",   CONTRACTS.ObscuraInsuranceSubscription,   INSURANCE_EVENTS);

  const unwatchers = [
    watchContract("ObscuraPay",                     CONTRACTS.ObscuraPay,                     PAY_EVENTS),
    watchContract("ObscuraPayStreamV3",             CONTRACTS.ObscuraPayStreamV3,             PAYSTREAM_EVENTS),
    watchContract("ObscuraInvoice",                 CONTRACTS.ObscuraInvoice,                 INVOICE_EVENTS),
    watchContract("ObscuraConfidentialEscrow",      CONTRACTS.ObscuraConfidentialEscrow,      ESCROW_EVENTS),
    watchContract("ObscuraInsuranceSubscriptionV2", CONTRACTS.ObscuraInsuranceSubscriptionV2, INSURANCE_EVENTS),
    watchContract("ObscuraStealthRegistry",         CONTRACTS.ObscuraStealthRegistry,         STEALTH_EVENTS),
  ];

  console.log(`[indexer] Watching ${unwatchers.length} contracts for live events`);

  return () => unwatchers.forEach((u) => u());
}

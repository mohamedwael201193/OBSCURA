/**
 * db.ts — shared Supabase client for obscura-worker
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL         = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("[worker] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required");
}

export const db: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ─── Activity record shape ────────────────────────────────────────────────────
export interface ActivityRecord {
  chain_id:         number;
  block_number:     bigint;
  tx_hash:          string;
  log_index:        number;
  contract_address: string;
  event_name:       string;
  wallet:           string;
  participants:     string[];
  args:             Record<string, unknown>;
}

export interface StoredActivityRecord {
  id:               number;
  chain_id:         number;
  block_number:     string;
  tx_hash:          string;
  log_index:        number;
  contract_address: string;
  event_name:       string;
  wallet:           string;
  participants:     string[];
  args:             Record<string, unknown>;
  created_at:       string;
}

export interface InsertActivityResult {
  activity: StoredActivityRecord;
  inserted: boolean;
}

async function getActivityByTxLog(txHash: string, logIndex: number): Promise<StoredActivityRecord | null> {
  const { data, error } = await db
    .from("obscura_activity")
    .select("*")
    .eq("tx_hash", txHash)
    .eq("log_index", logIndex)
    .maybeSingle();

  if (error) throw error;
  return (data as StoredActivityRecord | null) ?? null;
}

/** Upsert an on-chain event (idempotent via tx_hash + log_index unique constraint) */
export async function insertActivity(record: ActivityRecord): Promise<InsertActivityResult> {
  const { data, error } = await db
    .from("obscura_activity")
    .upsert(
      { ...record, block_number: record.block_number.toString() },
      { onConflict: "tx_hash,log_index", ignoreDuplicates: true }
    )
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[db] Failed to insert activity:", error.message);
    throw error;
  }

  if (!data) {
    const existing = await getActivityByTxLog(record.tx_hash, record.log_index);
    if (!existing) {
      throw new Error(`Activity duplicate had no selectable row tx=${record.tx_hash} log=${record.log_index}`);
    }

    console.log(`[db] activity duplicate found id=${existing.id} event=${existing.event_name} tx=${record.tx_hash.slice(0, 12)}... log=${record.log_index}`);
    return { activity: existing, inserted: false };
  }

  const stored = data as StoredActivityRecord;
  console.log(`[db] event indexed id=${stored.id} event=${stored.event_name} wallet=${stored.wallet.slice(0, 6)}...${stored.wallet.slice(-4)} tx=${stored.tx_hash.slice(0, 12)}...`);
  return { activity: stored, inserted: true };
}

/** Get the last indexed block for a given contract address */
export async function getLastIndexedBlock(contractAddress: string): Promise<bigint> {
  const { data, error } = await db
    .from("obscura_activity")
    .select("block_number")
    .eq("contract_address", contractAddress.toLowerCase())
    .order("block_number", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return 0n;
  return BigInt(data.block_number as string);
}

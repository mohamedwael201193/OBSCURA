/**
 * db.ts — Supabase Postgres client for the indexer
 *
 * IMPORTANT: SUPABASE_SERVICE_ROLE_KEY is NEVER exposed as VITE_ — server-side only.
 * The indexer runs as a backend service with service-role access.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL              = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("[indexer] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required");
}

export const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─── Activity record shape ────────────────────────────────────────────────────
export interface ActivityRecord {
  id?: number;
  chain_id: number;
  block_number: bigint;
  tx_hash: string;
  log_index: number;
  contract_address: string;
  event_name: string;
  /** Primary wallet involved (for filtering) */
  wallet: string;
  /** All wallet addresses present in the event */
  participants: string[];
  /** Raw event args as JSON */
  args: Record<string, unknown>;
  created_at?: string;
}

/** Insert a single activity event (idempotent via unique constraint on tx_hash+log_index) */
export async function insertActivity(record: ActivityRecord): Promise<void> {
  const { error } = await db
    .from("obscura_activity")
    .upsert(
      {
        ...record,
        block_number: record.block_number.toString(), // Postgres bigint as string
      },
      { onConflict: "tx_hash,log_index", ignoreDuplicates: true }
    );

  if (error) {
    console.error("[db] Failed to insert activity:", error.message);
    throw error;
  }
}

/** Get the last indexed block number for a given contract */
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

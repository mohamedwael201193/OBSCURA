/**
 * db.ts — shared Supabase client for obscura-api
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL          = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[api] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  process.exit(1);
}

export const db: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

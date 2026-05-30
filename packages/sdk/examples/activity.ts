/** Activity module — requires OBSCURA_SUPABASE_ANON_KEY — run: npx tsx examples/activity.ts [wallet] */
import { ObscuraSDK, DEFAULT_SUPABASE_URL } from "../src/index.js";

const wallet = (process.argv[2] ?? "0xf76e6B0920e9332fF4410f6dD53F01722AbC71a3") as `0x${string}`;

async function main() {
  const sdk = ObscuraSDK.create({
    supabaseUrl: process.env.OBSCURA_SUPABASE_URL ?? DEFAULT_SUPABASE_URL,
    supabaseAnonKey: process.env.OBSCURA_SUPABASE_ANON_KEY,
  });

  if (!sdk.activity.isConfigured()) {
    console.error("Set OBSCURA_SUPABASE_ANON_KEY (Supabase → Settings → API → anon public)");
    process.exit(1);
  }

  const { items, hasMore } = await sdk.activity.listForWallet(wallet, { pageSize: 5 });
  console.log("Activity rows:", items.length, hasMore ? "(more available)" : "");
  items.forEach((r) => console.log(`  ${r.event_name} · block ${r.block_number}`));
}

main().catch(console.error);

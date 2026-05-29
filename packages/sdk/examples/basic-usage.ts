/**
 * Basic @obscura/sdk usage — run with: npm run example:basic
 *
 * Requires optional env:
 *   OBSCURA_SUPABASE_ANON_KEY — for activity feed queries
 */

import { ObscuraSDK, DEFAULT_ADDRESSES } from "../src/index.js";

async function main() {
  const sdk = ObscuraSDK.create({
    supabaseAnonKey: process.env.OBSCURA_SUPABASE_ANON_KEY,
  });

  console.log("Obscura SDK v1 — basic usage\n");
  console.log("Canonical ocUSDC:", sdk.addresses.ocUSDC_Pay);
  console.log("Vote contract:", DEFAULT_ADDRESSES.ObscuraVote);
  console.log("Credit market:", sdk.credit.getMarketAddress());

  // Reputation (live API)
  try {
    const demoWallet = "0xf76e6B0920e9332fF4410f6dD53F01722AbC71a3";
    const reputation = await sdk.reputation.getSummary(demoWallet);
    console.log("\nReputation tier:", reputation.tier, `(${reputation.totalCappedWeight} weight)`);
  } catch (err) {
    console.warn("\nReputation fetch skipped:", (err as Error).message);
  }

  // VAPID key (live API)
  try {
    const vapid = await sdk.notifications.getVapidPublicKey();
    console.log("VAPID key prefix:", vapid.slice(0, 12) + "...");
  } catch (err) {
    console.warn("VAPID fetch skipped:", (err as Error).message);
  }

  // Transaction builder (no FHE — pre-encrypted stub)
  const enc = {
    ctHash: 0n,
    securityZone: 0,
    utype: 5,
    signature: "0x" as `0x${string}`,
  };
  const transferCall = await sdk.pay.buildTransfer(
    "0x0000000000000000000000000000000000000001",
    100n,
    enc,
  );
  const calldata = sdk.encodeCall(transferCall);
  console.log("\nTransfer calldata length:", calldata.length, "chars");

  const delegateCall = sdk.vote.buildDelegate("0x0000000000000000000000000000000000000002");
  console.log("Delegate target:", delegateCall.address);

  // Activity filters (offline)
  const filters = sdk.activity.getEventFilters();
  console.log("\nActivity vote events:", filters.vote.length);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

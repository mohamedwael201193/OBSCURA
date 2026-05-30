/** Reputation module — run: npx tsx examples/reputation.ts [wallet] */
import { ObscuraSDK } from "../src/index.js";

const wallet = (process.argv[2] ?? "0xf76e6B0920e9332fF4410f6dD53F01722AbC71a3") as `0x${string}`;

async function main() {
  const sdk = ObscuraSDK.create();
  const summary = await sdk.reputation.getSummary(wallet);
  console.log("Wallet:", summary.wallet);
  console.log("Tier:", summary.tier);
  console.log("Weight:", summary.totalCappedWeight);
  console.log("Signals:", Object.keys(summary.signals).length);
}

main().catch(console.error);

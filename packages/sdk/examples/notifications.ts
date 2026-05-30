/** Notifications module — run: npx tsx examples/notifications.ts [wallet] */
import { ObscuraSDK } from "../src/index.js";

const wallet = (process.argv[2] ?? "0xf76e6B0920e9332fF4410f6dD53F01722AbC71a3") as `0x${string}`;

async function main() {
  const sdk = ObscuraSDK.create();
  const vapid = await sdk.notifications.getVapidPublicKey();
  console.log("VAPID prefix:", vapid.slice(0, 16) + "...");
  const prefs = await sdk.notifications.getPrefs(wallet);
  console.log("Push enabled:", prefs?.push_enabled ?? "(no prefs saved)");
}

main().catch(console.error);

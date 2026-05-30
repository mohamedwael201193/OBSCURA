/** Credit module — run: npx tsx examples/credit.ts */
import { ObscuraSDK } from "../src/index.js";

async function main() {
  const sdk = ObscuraSDK.create();
  console.log("Market:", sdk.credit.getMarketAddress());

  const enc = {
    ctHash: 1n,
    securityZone: 0,
    utype: 5,
    signature: "0x00" as `0x${string}`,
  };
  const call = await sdk.credit.buildBorrow(500n, enc);
  console.log("Borrow target:", call.address);
  console.log("Calldata:", sdk.encodeCall(call).slice(0, 42) + "...");
}

main().catch(console.error);

/** Pay module — run: npx tsx examples/pay.ts [wallet] */
import { ObscuraSDK } from "../src/index.js";

const wallet = (process.argv[2] ?? "0xf76e6B0920e9332fF4410f6dD53F01722AbC71a3") as `0x${string}`;

async function main() {
  const sdk = ObscuraSDK.create({ rpcUrl: process.env.ARB_SEPOLIA_RPC_URL });

  const ctHash = await sdk.pay.getShieldedBalance(wallet);
  console.log("Shielded balance ctHash:", ctHash.toString());

  const enc = {
    ctHash: 1n,
    securityZone: 0,
    utype: 5,
    signature: "0x00" as `0x${string}`,
  };
  const call = await sdk.pay.buildTransfer(
    "0x0000000000000000000000000000000000000001",
    100n,
    enc,
  );
  console.log("Transfer calldata:", sdk.encodeCall(call).slice(0, 42) + "...");
}

main().catch(console.error);

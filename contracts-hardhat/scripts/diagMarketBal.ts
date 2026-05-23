import { ethers } from "hardhat";

async function main() {
  const market = "0xb084Afb8925BBF6A98717a10219d150Bcf0B5c1f";
  const cusdc = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
  const c = new ethers.Contract(cusdc, [
    "function confidentialBalanceOf(address) view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function isOperator(address,address) view returns (bool)",
  ], ethers.provider);
  console.log("market plain bal:", (await c.balanceOf(market)).toString());
  console.log("market confidential bal handle:", (await c.confidentialBalanceOf(market)).toString());
  console.log("isOperator(market,market):", await c.isOperator(market, market));

  // Compare with a known-working escrow if deployed
  // Read deployments
  const fs = await import("fs");
  try {
    const dep = JSON.parse(fs.readFileSync("deployments/arb-sepolia.json", "utf8"));
    console.log("\nKnown deployments:", Object.keys(dep));
    for (const [k, v] of Object.entries(dep)) {
      if (typeof v === "string" && v.startsWith("0x") && v.length === 42) {
        try {
          const bal = await c.confidentialBalanceOf(v);
          if (bal.toString() !== "0") console.log("  ", k, "=", v, "cBal=", bal.toString());
        } catch {}
      }
    }
  } catch (e: any) { console.log("no deployments file:", e.message); }
}
main().catch((e) => { console.error(e); process.exit(1); });

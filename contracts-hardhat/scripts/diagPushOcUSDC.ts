// Wave 4 v3.14 — Diagnostic mirror of diagPushTest.ts but pointed at the
// in-repo ocUSDC token instead of Reineira cUSDC.
// Purpose: empirically prove that contract-context confidentialTransfer
// outbound calls SUCCEED against ObscuraConfidentialToken — confirming that
// swapping the loan/collateral asset fixes the borrow revert.
//
// Run:
//   npx hardhat run scripts/diagPushOcUSDC.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  const dep: Record<string, string> = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", `${network.name}.json`), "utf8")
  );
  const ocUSDC = dep["v314_ocUSDC"];
  if (!ocUSDC) throw new Error("v314_ocUSDC missing — run deployWave4v314 first");
  console.log("ocUSDC:", ocUSDC);

  const F = await ethers.getContractFactory("TestPushcUSDC");
  const c = await F.deploy(ocUSDC);
  await c.waitForDeployment();
  const harness = await c.getAddress();
  console.log("harness:", harness);

  // ocUSDC.confidentialTransfer with FHE.asEuint64(0) from inside contract.
  // Harness has 0 balance and _debit handles zero gracefully via FHE.asEuint64(0).
  // We expect this to NOT revert (the silent-fail-on-empty-balance pattern is
  // by design in ObscuraConfidentialToken._debit).
  console.log("\n=== ocUSDC.pushOut(deployer, 1) from contract context ===");
  try {
    const tx = await c.pushOut(deployer.address, 1n, { gasLimit: 3_000_000 });
    const rc = await tx.wait();
    console.log(`✅ SUCCESS gas=${rc?.gasUsed} status=${rc?.status} logs=${rc?.logs.length}`);
    for (const l of rc?.logs ?? []) {
      console.log(`  log topic0=${l.topics[0]?.slice(0, 14)}… addr=${l.address}`);
    }
  } catch (e: any) {
    console.log(`❌ REVERT: ${e.shortMessage || e.message}`);
    if (e.receipt) console.log(`  gas=${e.receipt.gasUsed} status=${e.receipt.status}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

// Verify all 12 Wave 4 ObscuraCredit contracts on Arbiscan in one shot.
//
// Run:
//   npx hardhat run scripts/verifyWave4Credit.ts --network arb-sepolia
//
// Reads addresses + constructor-arg metadata from deployments/<network>.json.
// Re-uses the exact constructor args from deployWave4Credit.ts.
//
// Idempotent: skips contracts that are already verified.

import { run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { ethers } from "hardhat";

const REINEIRA_cUSDC = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";

async function safeVerify(address: string, constructorArguments: any[], label: string) {
  try {
    console.log(`\n→ ${label} @ ${address}`);
    await run("verify:verify", { address, constructorArguments });
    console.log(`  ✅ verified`);
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg.includes("Already Verified") || msg.includes("already verified")) {
      console.log(`  ⏩ already verified`);
    } else {
      console.log(`  ⚠️  ${msg.split("\n")[0]}`);
    }
  }
}

async function main() {
  console.log(`Network: ${network.name}`);
  const file = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep = JSON.parse(fs.readFileSync(file, "utf8"));
  const [deployer] = await ethers.getSigners();
  const treasury = dep.ObscuraTreasury;

  // 1. MockChainlinkFeed
  await safeVerify(dep.ObscuraCreditFeedUSDC, [ethers.parseUnits("1", 18)], "MockChainlinkFeed");
  // 2. Oracle
  await safeVerify(dep.ObscuraCreditOracle, [deployer.address], "ObscuraCreditOracle");
  // 3. IRM
  await safeVerify(dep.ObscuraCreditIRM, [deployer.address, 200n, 400n, 6000n, 8000n, 1000n], "ObscuraCreditIRM");
  // 4. Factory
  await safeVerify(dep.ObscuraCreditFactory, [deployer.address], "ObscuraCreditFactory");

  // 5/6. Markets (created via CREATE2 — verify with the same constructor args)
  await safeVerify(dep.ObscuraCreditMarket_77,
    [REINEIRA_cUSDC, REINEIRA_cUSDC, dep.ObscuraCreditOracle, dep.ObscuraCreditIRM, 7700n, 500n, 8500n, dep.ObscuraCreditFactory],
    "ObscuraCreditMarket_77");
  await safeVerify(dep.ObscuraCreditMarket_86,
    [REINEIRA_cUSDC, REINEIRA_cUSDC, dep.ObscuraCreditOracle, dep.ObscuraCreditIRM, 8600n, 750n, 9000n, dep.ObscuraCreditFactory],
    "ObscuraCreditMarket_86");

  // 7/8. Vaults
  await safeVerify(dep.ObscuraCreditVault_Conservative, [REINEIRA_cUSDC, deployer.address, treasury], "ObscuraCreditVault_Conservative");
  await safeVerify(dep.ObscuraCreditVault_Aggressive, [REINEIRA_cUSDC, deployer.address, treasury], "ObscuraCreditVault_Aggressive");

  // 9. Auction
  await safeVerify(dep.ObscuraCreditAuction, [], "ObscuraCreditAuction");

  // 10. Score
  await safeVerify(dep.ObscuraCreditScore,
    [dep.ObscuraPayStreamV2 || ethers.ZeroAddress, dep.ObscuraAddressBook || ethers.ZeroAddress, dep.ObscuraVote || ethers.ZeroAddress],
    "ObscuraCreditScore");

  // 11/12. Hooks
  await safeVerify(dep.ObscuraCreditStreamHook, [REINEIRA_cUSDC], "ObscuraCreditStreamHook");
  await safeVerify(dep.ObscuraCreditInsuranceHook, [REINEIRA_cUSDC], "ObscuraCreditInsuranceHook");

  // 13. Governance Proxy
  await safeVerify(dep.ObscuraCreditGovernanceProxy, [treasury, dep.ObscuraCreditFactory], "ObscuraCreditGovernanceProxy");

  console.log("\n✅ Wave 4 verify pass complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });

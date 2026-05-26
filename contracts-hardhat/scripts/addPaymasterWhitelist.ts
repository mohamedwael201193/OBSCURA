/**
 * addPaymasterWhitelist.ts — Add missing contracts to ObscuraPaymaster whitelist
 *
 * Contracts deployed after the paymaster was configured that were never whitelisted:
 *   • ocUSDC_Pay (Wave 5 PAY wrapper)
 *   • ObscuraPayStreamV3
 *   • ObscuraInsuranceSubscriptionV2
 *   • ObscuraPayrollResolverV3
 *
 * Run:
 *   npx hardhat run scripts/addPaymasterWhitelist.ts --network arb-sepolia
 */

import { ethers } from "hardhat";

const PAYMASTER_ADDRESS = "0x9B1F61A65467F11339A8d0834349Be32EB2CF878";

const PAYMASTER_ABI = [
  "function whitelistedTargets(address) view returns (bool)",
  "function whitelistTarget(address target, bool enabled) external",
  "function governance() view returns (address)",
];

const TO_WHITELIST = [
  { name: "ocUSDC_Pay",                     addr: "0xEd46020Df8abe7BB1E096f27d089F4326D223a53" },
  { name: "ObscuraPayStreamV3",             addr: "0xE4328F139F03138D63f7fdF90A8Ef240e04653fA" },
  { name: "ObscuraInsuranceSubscriptionV2", addr: "0xEA9Fc5800F41d090dFB90f9735F4CF3824d6743D" },
  { name: "ObscuraPayrollResolverV3",       addr: "0xB077c231448EF2252060E4B4dD404078DBD94180" },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const paymaster = new ethers.Contract(PAYMASTER_ADDRESS, PAYMASTER_ABI, deployer);

  const governance = await paymaster.governance();
  console.log(`Governance: ${governance}`);
  if (governance.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Deployer ${deployer.address} is not governance (${governance})`);
  }

  console.log("\nWhitelisting targets...");
  for (const { name, addr } of TO_WHITELIST) {
    const already = await paymaster.whitelistedTargets(addr);
    if (already) {
      console.log(`  [SKIP] ${name} (${addr}) — already whitelisted`);
      continue;
    }
    const tx = await paymaster.whitelistTarget(addr, true);
    await tx.wait();
    console.log(`  [OK]   ${name} (${addr}) — whitelisted ✓`);
  }

  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });

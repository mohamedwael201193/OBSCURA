// Seed v3.14 market with initial lender liquidity.
//
//   npx hardhat run scripts/seedV314.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const dep: Record<string, string> = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", `${network.name}.json`), "utf8")
  );
  const ocUSDC = dep["v314_ocUSDC"];
  const market = dep["v314_ObscuraCreditMarket_77"];
  if (!ocUSDC || !market) throw new Error("v3.14 addresses missing");

  console.log("ocUSDC:", ocUSDC);
  console.log("Market:", market);

  const F = await ethers.getContractFactory("SeedV314Liquidity");
  const c = await F.deploy(ocUSDC, market);
  await c.waitForDeployment();
  const helper = await c.getAddress();
  console.log("Helper:", helper);

  // Seed with 5000 ocUSDC (faucet drip is 10k → keep margin for future seeds).
  const AMT = 5_000_000_000n; // 5000 * 10^6
  console.log(`Seeding market with ${AMT.toString()} ocUSDC...`);
  const tx = await c.seed(AMT, { gasLimit: 4_000_000 });
  const rc = await tx.wait();
  console.log(`seed() status=${rc?.status} gas=${rc?.gasUsed}`);
  if (rc?.status !== 1) throw new Error("seed reverted");
  console.log("\n✅ Market funded. Borrowers can now borrow up to 5000 ocUSDC × utilization cap.");
}

main().catch((e) => { console.error(e); process.exit(1); });

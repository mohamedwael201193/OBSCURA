// Deploy ObscuraConfidentialEscrow — confidential cUSDC escrow that
// replaces the broken Reineira ConfidentialEscrow proxy whose impl calls
// a non-existent cUSDC selector (0xeb3155b5).
//
// Run:
//   npx hardhat run scripts/deployObscuraEscrow.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const REINEIRA_CUSDC = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  console.log("Deploying ObscuraConfidentialEscrow...");
  console.log(`  cUSDC = ${REINEIRA_CUSDC}`);
  const Factory = await ethers.getContractFactory("ObscuraConfidentialEscrow");
  const escrow = await Factory.deploy(REINEIRA_CUSDC);
  await escrow.waitForDeployment();
  const addr = await escrow.getAddress();
  console.log(`  -> ${addr}\n`);

  const dir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${network.name}.json`);
  const existing = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : {};
  const merged = {
    ...existing,
    ObscuraConfidentialEscrow: addr,
  };
  fs.writeFileSync(file, JSON.stringify(merged, null, 2) + "\n");
  console.log(`Wrote ${file}`);

  console.log("\nVerify with:");
  console.log(
    `  npx hardhat verify --network ${network.name} ${addr} ${REINEIRA_CUSDC}`
  );

  console.log("\nFrontend env:");
  console.log(`  VITE_OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS=${addr}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

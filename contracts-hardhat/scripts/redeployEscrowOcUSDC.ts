// Redeploy ObscuraConfidentialEscrow with ocUSDC as the token.
//
// The previously deployed escrow (0x889DD94ddBAc614D4A4346bfE5b32a3151578D9A)
// was deployed with Reineira cUSDC (0x6b6e6479…). Its redeem() function calls
// cUSDC.confidentialTransfer(recipient, handle) using the stored address, so
// it would return Reineira tokens, not ocUSDC.
//
// This script deploys a fresh ObscuraConfidentialEscrow with ocUSDC as its
// immutable _cUSDC constructor argument.
//
// Run:
//   npx hardhat run scripts/redeployEscrowOcUSDC.ts --network arb-sepolia
//
// After deploy:
//   1. Update VITE_OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS in frontend/.env
//   2. Confirm deployments/arb-sepolia.json is updated (done automatically)

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ocUSDC — ObscuraConfidentialToken (6 decimals)
const OC_USDC = "0xEFab856b903C4106769B14798deDE21C6923d7d2"; // v3.15 wrapper

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  console.log("Deploying ObscuraConfidentialEscrow with ocUSDC...");
  console.log(`  _cUSDC = ${OC_USDC}`);

  const Factory = await ethers.getContractFactory("ObscuraConfidentialEscrow");
  const escrow = await Factory.deploy(OC_USDC);
  await escrow.waitForDeployment();
  const addr = await escrow.getAddress();
  console.log(`  -> ${addr}\n`);

  // Update deployments JSON
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
  console.log(`Updated ${file}`);

  console.log("\nVerify with:");
  console.log(
    `  npx hardhat verify --network ${network.name} ${addr} ${OC_USDC}`
  );

  console.log("\n=== ACTION REQUIRED ===");
  console.log(`Update VITE_OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS=${addr}`);
  console.log("in frontend/obscura-os-main/.env (and .env.production if present)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

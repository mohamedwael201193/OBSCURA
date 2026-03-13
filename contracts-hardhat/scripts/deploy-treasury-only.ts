import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const newVoteAddress = "0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730";

  console.log(`Deploying ObscuraTreasury to ${network.name}...`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`voteContract: ${newVoteAddress}`);

  const ObscuraTreasury = await ethers.getContractFactory("ObscuraTreasury");
  const treasury = await ObscuraTreasury.deploy(newVoteAddress);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log(`\nObscuraTreasury deployed to: ${treasuryAddress}`);

  // Update deployments/arb-sepolia.json
  const deploymentsFile = path.join(__dirname, "..", "deployments", "arb-sepolia.json");
  const data = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));
  data.ObscuraTreasury = treasuryAddress;
  fs.writeFileSync(deploymentsFile, JSON.stringify(data, null, 2));
  console.log("Updated deployments/arb-sepolia.json");

  // Update frontend .env
  const envFile = path.join(__dirname, "..", "..", "frontend", "obscura-os-main", ".env");
  if (fs.existsSync(envFile)) {
    let env = fs.readFileSync(envFile, "utf8");
    env = env.replace(/VITE_OBSCURA_TREASURY_ADDRESS=.*/, `VITE_OBSCURA_TREASURY_ADDRESS=${treasuryAddress}`);
    fs.writeFileSync(envFile, env);
    console.log("Updated frontend/.env");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

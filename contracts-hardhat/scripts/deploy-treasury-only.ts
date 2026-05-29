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

  console.log("\nSyncing frontend ABIs from artifacts…");
  const { execSync } = await import("child_process");
  execSync("npx hardhat run scripts/sync-vote-abis.ts", { cwd: path.join(__dirname, ".."), stdio: "inherit" });
}

main().catch((e) => { console.error(e); process.exit(1); });

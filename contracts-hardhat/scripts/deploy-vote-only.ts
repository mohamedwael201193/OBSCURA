import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  const tokenAddress = "0xf4A1219b0aaB83f772B240Ed508e3A37d7F55ED2";

  console.log(`Deploying ObscuraVote (weighted quorum) to ${network.name}...`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log(`Token: ${tokenAddress}`);

  const ObscuraVote = await ethers.getContractFactory("ObscuraVote");
  const vote = await ObscuraVote.deploy(tokenAddress);
  await vote.waitForDeployment();
  const voteAddress = await vote.getAddress();
  console.log(`\nObscuraVote deployed to: ${voteAddress}`);

  // Update deployments/arb-sepolia.json
  const deploymentsFile = path.join(__dirname, "..", "deployments", "arb-sepolia.json");
  const data = JSON.parse(fs.readFileSync(deploymentsFile, "utf8"));
  data.ObscuraVote = voteAddress;
  fs.writeFileSync(deploymentsFile, JSON.stringify(data, null, 2));
  console.log("Updated deployments/arb-sepolia.json");

  // Update frontend .env
  const envFile = path.join(__dirname, "..", "..", "frontend", "obscura-os-main", ".env");
  if (fs.existsSync(envFile)) {
    let env = fs.readFileSync(envFile, "utf8");
    env = env.replace(/VITE_OBSCURA_VOTE_ADDRESS=.*/, `VITE_OBSCURA_VOTE_ADDRESS=${voteAddress}`);
    fs.writeFileSync(envFile, env);
    console.log("Updated frontend/.env");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const tokenAddress = "0xf4A1219b0aaB83f772B240Ed508e3A37d7F55ED2";
  console.log("Using ObscuraToken:", tokenAddress);

  console.log("\nDeploying ObscuraVote V3 (token-gated)...");
  const Factory = await ethers.getContractFactory("ObscuraVote");
  const contract = await Factory.deploy(tokenAddress);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("ObscuraVote deployed to:", address);

  // Update deployments file
  const file = path.join(__dirname, "..", "deployments", "arb-sepolia.json");
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  data.ObscuraVote = address;
  data.timestamp = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log("Saved to deployments/arb-sepolia.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

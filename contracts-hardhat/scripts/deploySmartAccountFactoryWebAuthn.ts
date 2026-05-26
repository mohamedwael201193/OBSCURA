// W5P9.4 Deploy — fixed WebAuthn smart account factory only
//
// The old factory's implementation is immutable, so the AA24 WebAuthn verifier
// fix requires a fresh ObscuraSmartAccountFactory. The existing paymaster stays
// in place.
//
// Run:
//   npx hardhat run scripts/deploySmartAccountFactoryWebAuthn.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  const deployPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep: Record<string, any> = JSON.parse(fs.readFileSync(deployPath, "utf8"));

  console.log("Deploying ObscuraSmartAccountFactory with WebAuthn verifier...");
  const FactoryF = await ethers.getContractFactory("ObscuraSmartAccountFactory");
  const factory = await FactoryF.deploy();
  await factory.waitForDeployment();

  const factoryAddr = await factory.getAddress();
  const implementation = await (factory as any).IMPLEMENTATION();

  console.log(`Factory:       ${factoryAddr}`);
  console.log(`Implementation:${implementation}`);

  dep._archive ??= {};
  if (dep.ObscuraSmartAccountFactory && !dep._archive.ObscuraSmartAccountFactory_rawUserOpHash) {
    dep._archive.ObscuraSmartAccountFactory_rawUserOpHash = dep.ObscuraSmartAccountFactory;
  }
  if (dep.ObscuraSmartAccountImplementation && !dep._archive.ObscuraSmartAccountImplementation_rawUserOpHash) {
    dep._archive.ObscuraSmartAccountImplementation_rawUserOpHash = dep.ObscuraSmartAccountImplementation;
  }

  dep.ObscuraSmartAccountFactory = factoryAddr;
  dep.ObscuraSmartAccountImplementation = implementation;
  dep.wave5PayAA24WebAuthnFactoryDeployedAt = new Date().toISOString();

  fs.writeFileSync(deployPath, JSON.stringify(dep, null, 2));

  console.log(`\nUpdated deployments/${network.name}.json`);
  console.log("\nUpdate frontend env:");
  console.log(`  VITE_SMART_ACCOUNT_FACTORY_ADDRESS=${factoryAddr}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
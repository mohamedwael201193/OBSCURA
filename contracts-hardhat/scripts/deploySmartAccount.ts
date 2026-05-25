// W5P3 Deploy — ObscuraSmartAccountFactory + ObscuraPaymaster
//
// What this deploys:
//   1. ObscuraSmartAccountFactory  — EIP-1167 clone factory for ERC-4337 smart accounts
//   2. ObscuraPaymaster            — 4-layer sponsoring paymaster
//
// Then:
//   • Funds the paymaster with 0.5 ETH (deposited into the EntryPoint)
//   • Whitelists all active Obscura Pay contracts as sponsorable targets
//   • Updates deployments/arb-sepolia.json
//
// Run:
//   npx hardhat run scripts/deploySmartAccount.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Active Obscura Pay contracts that the paymaster will sponsor
const WHITELISTED_TARGETS = [
  { name: "ObscuraPay",                addr: "0x91CdD9a481C732bEB09Ce039da23DC11e83547a4" },
  { name: "ObscuraPayStreamV2",        addr: "0xb2fF39C496131d4AFd01d189569aF6FEBaC54d2C" },
  { name: "ObscuraConfidentialEscrow", addr: "0x293810A2081114CcE0c98A709a0c31aE07c01D75" },
  { name: "ObscuraInvoice",            addr: "0x62a86C8d68fF32ea41Faf349db6EF7EF496620b7" },
  { name: "ObscuraInsuranceSubscription", addr: "0x0CCE5DA9E447e7B4A400fC53211dd29C51CA8102" },
  { name: "v2_M86_Market",             addr: "0xcf98d97934F37Ac9A05bc037437E43cb6788eC8b" },
  { name: "v2_ConservativeVault",      addr: "0xCEBb042ae8FDE217a9FdE5b8a82E23827FdBB898" },
  { name: "v2_BalancedVault",         addr: "0xF508315bD4C5EC4c71C5E431AE972C0dC6B78Bbc" },
  { name: "ObscuraAddressBook",        addr: "0x4095065ee7cc4C9f5210A328EC08e29B4Ac74Eef" },
  { name: "ObscuraStealthRegistry",    addr: "0xa36e791a611D36e2C817a7DA0f41547D30D4917d" },
];

const PAYMASTER_FUND_ETH = "0.5";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  if (ethers.parseEther(PAYMASTER_FUND_ETH) >= bal) {
    throw new Error("Insufficient ETH — need at least 0.5 ETH + gas");
  }

  const deployPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep: Record<string, unknown> = JSON.parse(fs.readFileSync(deployPath, "utf8"));

  // ─── 1. Factory ────────────────────────────────────────────────────────────
  console.log("[1/4] Deploying ObscuraSmartAccountFactory...");
  const FactoryF = await ethers.getContractFactory("ObscuraSmartAccountFactory");
  const factory  = await FactoryF.deploy();
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log(`      ObscuraSmartAccountFactory: ${factoryAddr}`);
  console.log(`      Implementation:             ${await (factory as any).IMPLEMENTATION()}`);

  // ─── 2. Paymaster ──────────────────────────────────────────────────────────
  console.log("[2/4] Deploying ObscuraPaymaster...");
  const PaymasterF = await ethers.getContractFactory("ObscuraPaymaster");
  const paymaster  = await PaymasterF.deploy(deployer.address);
  await paymaster.waitForDeployment();
  const paymasterAddr = await paymaster.getAddress();
  console.log(`      ObscuraPaymaster: ${paymasterAddr}`);

  // ─── 3. Fund paymaster via EntryPoint deposit ─────────────────────────────
  console.log(`[3/4] Funding paymaster with ${PAYMASTER_FUND_ETH} ETH via EntryPoint...`);
  const fundTx = await deployer.sendTransaction({
    to: paymasterAddr,
    value: ethers.parseEther(PAYMASTER_FUND_ETH),
  });
  await fundTx.wait();
  console.log(`      Funded. tx: ${fundTx.hash}`);

  // ─── 4. Whitelist Pay contracts ───────────────────────────────────────────
  console.log("[4/4] Whitelisting Pay contracts...");
  for (const { name, addr } of WHITELISTED_TARGETS) {
    const tx = await (paymaster as any).whitelistTarget(addr, true);
    await tx.wait();
    console.log(`      ✓ ${name} (${addr})`);
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  dep["ObscuraSmartAccountFactory"] = factoryAddr;
  dep["ObscuraPaymaster"]           = paymasterAddr;
  dep["wave5Phase3DeployedAt"]      = new Date().toISOString();

  fs.writeFileSync(deployPath, JSON.stringify(dep, null, 2));
  console.log(`\n✅ deployments/${network.name}.json updated.\n`);
  console.log(`  Factory:   ${factoryAddr}`);
  console.log(`  Paymaster: ${paymasterAddr}`);
  console.log(`\nAdd to .env:`);
  console.log(`  VITE_SMART_ACCOUNT_FACTORY_ADDRESS=${factoryAddr}`);
  console.log(`  VITE_PAYMASTER_ADDRESS=${paymasterAddr}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

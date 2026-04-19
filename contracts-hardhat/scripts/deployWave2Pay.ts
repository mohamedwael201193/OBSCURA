// Deploy Wave 2 Pay v4: ObscuraPayrollResolver, ObscuraStealthRegistry,
// ObscuraPayStream, ObscuraPayrollUnderwriter — and register the underwriter
// policy with ReineiraOS.
//
// Run:
//   npx hardhat run scripts/deployWave2Pay.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ─── ReineiraOS Arbitrum Sepolia (chain 421614) ──────────────────────────────
const REINEIRA = {
  cUSDC: "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f",
  ConfidentialEscrow: "0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa",
  CCTPV2EscrowReceiver: "0x48F2Ad7B9895683b865eaA5dfb852CB144895Eb7",
  CoverageManager: "0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6",
  PoolFactory: "0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD",
  PolicyRegistry: "0xf421363B642315BD3555dE2d9BD566b7f9213c8E",
  OperatorRegistry: "0x1422ccC8B42079D810835631a5DFE1347a602959",
  TaskExecutor: "0x7F24077A3341Af05E39fC232A77c21A03Bbd2262",
  FeeManager: "0x5a11DC96CEfd2fB46759F08aCE49515aa23F0156",
  CCTPHandler: "0xb37A83461B01097e1E440405264dA59EE9a3F273",
  TrustedForwarder: "0x7ceA357B5AC0639F89F9e378a1f03Aa5005C0a25",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  // ─── 1. ObscuraPayrollResolver ────────────────────────────────────────────
  console.log("[1/4] ObscuraPayrollResolver...");
  const ResolverF = await ethers.getContractFactory("ObscuraPayrollResolver");
  const resolver = await ResolverF.deploy(REINEIRA.ConfidentialEscrow);
  await resolver.waitForDeployment();
  const resolverAddr = await resolver.getAddress();
  console.log(`     -> ${resolverAddr}`);

  // ─── 2. ObscuraStealthRegistry ────────────────────────────────────────────
  console.log("[2/4] ObscuraStealthRegistry...");
  const StealthF = await ethers.getContractFactory("ObscuraStealthRegistry");
  const stealth = await StealthF.deploy();
  await stealth.waitForDeployment();
  const stealthAddr = await stealth.getAddress();
  console.log(`     -> ${stealthAddr}`);

  // ─── 3. ObscuraPayStream ──────────────────────────────────────────────────
  console.log("[3/4] ObscuraPayStream...");
  const StreamF = await ethers.getContractFactory("ObscuraPayStream");
  const stream = await StreamF.deploy(
    REINEIRA.ConfidentialEscrow,
    REINEIRA.cUSDC,
    resolverAddr
  );
  await stream.waitForDeployment();
  const streamAddr = await stream.getAddress();
  console.log(`     -> ${streamAddr}`);

  // ─── 4. ObscuraPayrollUnderwriter ─────────────────────────────────────────
  console.log("[4/4] ObscuraPayrollUnderwriter...");
  const UWF = await ethers.getContractFactory("ObscuraPayrollUnderwriter");
  const underwriter = await UWF.deploy(REINEIRA.CoverageManager, streamAddr);
  await underwriter.waitForDeployment();
  const uwAddr = await underwriter.getAddress();
  console.log(`     -> ${uwAddr}`);

  // ─── Persist ──────────────────────────────────────────────────────────────
  const dir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${network.name}.json`);
  const existing = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : {};
  const merged = {
    ...existing,
    ObscuraPayrollResolver: resolverAddr,
    ObscuraStealthRegistry: stealthAddr,
    ObscuraPayStream: streamAddr,
    ObscuraPayrollUnderwriter: uwAddr,
    Reineira: REINEIRA,
    wave2PayDeployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(file, JSON.stringify(merged, null, 2));
  console.log(`\nSaved to deployments/${network.name}.json`);

  console.log("\n--- Add to frontend/obscura-os-main/.env ---");
  console.log(`VITE_OBSCURA_PAYROLL_RESOLVER_ADDRESS=${resolverAddr}`);
  console.log(`VITE_OBSCURA_STEALTH_REGISTRY_ADDRESS=${stealthAddr}`);
  console.log(`VITE_OBSCURA_PAY_STREAM_ADDRESS=${streamAddr}`);
  console.log(`VITE_OBSCURA_PAYROLL_UNDERWRITER_ADDRESS=${uwAddr}`);
  console.log(`VITE_REINEIRA_CUSDC_ADDRESS=${REINEIRA.cUSDC}`);
  console.log(`VITE_REINEIRA_ESCROW_ADDRESS=${REINEIRA.ConfidentialEscrow}`);
  console.log(`VITE_REINEIRA_COVERAGE_MANAGER_ADDRESS=${REINEIRA.CoverageManager}`);
  console.log(`VITE_REINEIRA_POOL_FACTORY_ADDRESS=${REINEIRA.PoolFactory}`);
  console.log(`VITE_REINEIRA_POLICY_REGISTRY_ADDRESS=${REINEIRA.PolicyRegistry}`);
  console.log(`VITE_REINEIRA_CCTP_RECEIVER_ADDRESS=${REINEIRA.CCTPV2EscrowReceiver}`);

  console.log("\nNEXT STEPS (manual):");
  console.log(
    `  1. Register underwriter policy:    PolicyRegistry.registerPolicy(${uwAddr})`
  );
  console.log(
    `  2. Create your insurance pool:     PoolFactory.createPool(${REINEIRA.cUSDC})`
  );
  console.log(`  3. Allow our policy on the pool:   InsurancePool.addPolicy(${uwAddr})`);
  console.log(
    `  4. (Optional) Stake initial cUSDC liquidity into the pool from your treasury.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

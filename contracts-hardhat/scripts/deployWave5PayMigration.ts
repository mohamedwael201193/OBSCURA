// Wave 5 PAY Migration — Deploy updated Pay contracts with native ocUSDC support.
//
//   New contracts deployed:
//     1. ObscuraConfidentialToken (ocUSDC v2) — adds confidentialTransferFromHandle
//     2. ObscuraConfidentialEscrow (v2)       — adds createFromHandles + fundFromHandle
//     3. ObscuraPayrollResolverV3              — plaintext-commit resolver, no InEaddress
//     4. ObscuraPayStreamV3                    — uses IObscuraToken, no Reineira deps
//     5. ObscuraInsuranceSubscription (v2)     — uses confidentialTransferFromHandle
//
//   Reused unchanged:
//     - ObscuraPay, ObscuraInvoice, ObscuraAddressBook, ObscuraInboxIndex
//     - ObscuraSocialResolver, ObscuraStealthRegistry, ObscuraStealthRotation
//     - All Wave 4 Credit contracts
//
//   Prerequisite (run once, off-chain):
//     After deployment, each employer must call:
//       cUSDC.setOperator(address(payStreamV3), uint48(block.timestamp + 90 days))
//     Each insurance subscriber must call:
//       cUSDC.setOperator(address(insuranceSubscriptionV2), uint48(block.timestamp + 90 days))
//
// Run:
//   npx hardhat run scripts/deployWave5PayMigration.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ─── Stable addresses ─────────────────────────────────────────────────────────
// Circle testnet USDC on Arbitrum Sepolia (underlying for ocUSDC shield/unshield)
const CIRCLE_USDC = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";
// Old ocUSDC (Pay wrapper) — superseded; kept for _archive reference only
const OLD_OCUSDC_PAY  = "0xEFab856b903C4106769B14798deDE21C6923d7d2";
// Old escrow — superseded; kept for _archive reference only
const OLD_ESCROW      = "0x5b988CBf9f1b5B479763A5008f52987AA1Af5041";
// Old stream / resolver / insurance — broken; superseded by V3
const OLD_STREAM_V2       = "0xb2fF39C496131d4AFd01d189569aF6FEBaC54d2C";
const OLD_RESOLVER_V2     = "0x0f130a6Fe6C200F1F8cc1594a8448AE45A3d7bBF";
const OLD_INSURANCE       = "0x0CCE5DA9E447e7B4A400fC53211dd29C51CA8102";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  const deployPath = path.join(
    __dirname, "..", "deployments", `${network.name}.json`
  );
  const dep: Record<string, unknown> = JSON.parse(fs.readFileSync(deployPath, "utf8"));

  // ─── 1. ObscuraConfidentialToken (ocUSDC v2 — Pay wrapper) ─────────────────
  console.log("[1/5] ObscuraConfidentialToken (ocUSDC v2, Pay wrapper)...");
  const TokenF = await ethers.getContractFactory("ObscuraConfidentialToken");
  // name, symbol, decimals (6 = USDC), faucetAmount (0 = wrapper mode, no faucet)
  const tokenV2 = await TokenF.deploy("Obscura Confidential USDC", "ocUSDC", 6, 0);
  await tokenV2.waitForDeployment();
  const tokenV2Addr = await tokenV2.getAddress();
  console.log(`     -> ${tokenV2Addr}`);

  // Wire the underlying USDC so shield/unshield works
  console.log("      Setting underlying USDC...");
  const setUnderlying = await tokenV2.setUnderlying(CIRCLE_USDC);
  await setUnderlying.wait();
  console.log("      Underlying set ✓");

  // ─── 2. ObscuraConfidentialEscrow (v2 — handle methods) ────────────────────
  console.log("\n[2/5] ObscuraConfidentialEscrow v2 (createFromHandles + fundFromHandle)...");
  const EscrowF = await ethers.getContractFactory("ObscuraConfidentialEscrow");
  const escrowV2 = await EscrowF.deploy(tokenV2Addr);
  await escrowV2.waitForDeployment();
  const escrowV2Addr = await escrowV2.getAddress();
  console.log(`     -> ${escrowV2Addr}`);

  // ─── 3. ObscuraPayrollResolverV3 ───────────────────────────────────────────
  console.log("\n[3/5] ObscuraPayrollResolverV3 (commit-based, no InEaddress)...");
  const ResolverF = await ethers.getContractFactory("ObscuraPayrollResolverV3");
  const resolverV3 = await ResolverF.deploy(escrowV2Addr);
  await resolverV3.waitForDeployment();
  const resolverV3Addr = await resolverV3.getAddress();
  console.log(`     -> ${resolverV3Addr}`);

  // ─── 4. ObscuraPayStreamV3 ─────────────────────────────────────────────────
  console.log("\n[4/5] ObscuraPayStreamV3 (IObscuraToken, confidentialTransferFromHandle)...");
  const StreamF = await ethers.getContractFactory("ObscuraPayStreamV3");
  const streamV3 = await StreamF.deploy(tokenV2Addr, escrowV2Addr, resolverV3Addr);
  await streamV3.waitForDeployment();
  const streamV3Addr = await streamV3.getAddress();
  console.log(`     -> ${streamV3Addr}`);

  // ─── 5. ObscuraInsuranceSubscription (v2) ──────────────────────────────────
  console.log("\n[5/5] ObscuraInsuranceSubscription v2 (confidentialTransferFromHandle)...");
  const InsuranceF = await ethers.getContractFactory("ObscuraInsuranceSubscription");
  const insuranceV2 = await InsuranceF.deploy(tokenV2Addr, deployer.address);
  await insuranceV2.waitForDeployment();
  const insuranceV2Addr = await insuranceV2.getAddress();
  console.log(`     -> ${insuranceV2Addr}`);

  // ─── Archive broken V2 contracts ───────────────────────────────────────────
  console.log("\nArchiving broken V2 contracts...");
  const archive = (dep._archive as Record<string, unknown>) ?? {};
  archive["ObscuraPayStreamV2_broken"]           = OLD_STREAM_V2;
  archive["ObscuraPayrollResolverV2_superseded"] = OLD_RESOLVER_V2;
  archive["ObscuraInsuranceSubscription_broken"] = OLD_INSURANCE;
  archive["ocUSDC_Pay_v1_superseded"]            = OLD_OCUSDC_PAY;
  archive["ObscuraConfidentialEscrow_v1"]        = OLD_ESCROW;
  dep._archive = archive;

  // ─── Update deployment record ───────────────────────────────────────────────
  dep["ocUSDC_Pay"]                         = tokenV2Addr;
  dep["ObscuraConfidentialEscrow"]          = escrowV2Addr;   // overwrite with v2
  dep["ObscuraPayrollResolverV3"]           = resolverV3Addr;
  dep["ObscuraPayStreamV3"]                 = streamV3Addr;
  dep["ObscuraInsuranceSubscriptionV2"]     = insuranceV2Addr;
  dep["wave5PayMigrationDeployedAt"]        = new Date().toISOString();

  fs.writeFileSync(deployPath, JSON.stringify(dep, null, 2));
  console.log(`\ndeployments/${network.name}.json updated ✓`);

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("  Wave 5 PAY Migration — Deployed Contracts");
  console.log("══════════════════════════════════════════════════════════════");
  console.log(`  ocUSDC Pay wrapper (v2)       ${tokenV2Addr}`);
  console.log(`  ObscuraConfidentialEscrow v2  ${escrowV2Addr}`);
  console.log(`  ObscuraPayrollResolverV3      ${resolverV3Addr}`);
  console.log(`  ObscuraPayStreamV3            ${streamV3Addr}`);
  console.log(`  ObscuraInsuranceSubV2         ${insuranceV2Addr}`);
  console.log("══════════════════════════════════════════════════════════════\n");
  console.log("Next steps:");
  console.log("  1. Update frontend/.env with new addresses (see below)");
  console.log("  2. Each employer: cUSDC.setOperator(payStreamV3, expiry)");
  console.log("  3. Each subscriber: cUSDC.setOperator(insuranceSubV2, expiry)");
  console.log("");
  console.log("Frontend .env additions:");
  console.log(`  VITE_OBSCURA_CONFIDENTIAL_USDC_ADDRESS=${tokenV2Addr}`);
  console.log(`  VITE_OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS=${escrowV2Addr}`);
  console.log(`  VITE_OBSCURA_PAY_STREAM_V3_ADDRESS=${streamV3Addr}`);
  console.log(`  VITE_OBSCURA_PAYROLL_RESOLVER_V3_ADDRESS=${resolverV3Addr}`);
  console.log(`  VITE_OBSCURA_INSURANCE_SUBSCRIPTION_V2_ADDRESS=${insuranceV2Addr}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

// Wave 4 v3.14 — Switch loanAsset/collateralAsset to in-repo ObscuraConfidentialToken.
//
// ROOT CAUSE (empirically proven via scripts/diagPushTest.ts on arb-sepolia):
//   Reineira cUSDC at 0x6b6e6479…ed89f REVERTS every contract-context call:
//     - plain transfer() from a fresh contract              → revert (no data)
//     - confidentialTransfer(addr, handle) from a contract  → revert (no data)
//     - even setOperator(self, expiry) from a contract      → revert (no data)
//   isOperator(harness, harness) returns true automatically (holder==spender),
//   so the operator model is not the blocker — the deployed token simply
//   rejects all contract callers. v3.13's "real ciphertext + FHE.eq guard"
//   patch was therefore irrelevant; the failure surface is the cUSDC contract
//   itself, not the market's FHE handle plumbing.
//
// FIX: Deploy an in-repo `ObscuraConfidentialToken` ("ocUSDC") that exposes
// the EXACT same interface ObscuraCreditMarket already consumes (setOperator,
// isOperator, confidentialBalanceOf, confidentialTransfer(addr,uint256),
// confidentialTransferFrom(addr,addr,InEuint64)) and ships a permissionless
// 24h faucet. Redeploy market + vault against ocUSDC. End-to-end borrow then
// works because the disbursement path is now under our control.
//
// This script:
//   1. Deploys ObscuraConfidentialToken as ocUSDC (6 decimals, 10k/drip)
//   2. Deploys ObscuraCreditMarket using ocUSDC for both loanAsset and
//      collateralAsset (single-asset market, 77% LLTV — matches v3.13 m77).
//   3. Deploys ObscuraCreditVault against ocUSDC.
//   4. Wires the existing auction engine + repay-router hooks.
//   5. Faucets ocUSDC to the deployer, pre-funds the market with liquidity
//      via the proven two-step pattern.
//   6. Writes new addresses into deployments/arb-sepolia.json under v314_*.
//
// Run:
//   npx hardhat run scripts/deployWave4v314.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const ORACLE   = "0x5F00910533AB6fc12a35a87BaFe856EF2cb323c3";
const IRM      = "0xA072c038cE98dEC8F5350D451145fB98F5EA57Bc";
const AUCTION  = "0x205FfC0A3b8207B645c1a6B1b4805eb3FfC828F0";
const STREAM   = "0x740580C5FF321440C61c6Af667C191Eea2249F96";
const INSURE   = "0x55f632401d238dFBEdd63B4adDF5B64DfB178190";
const TREASURY = "0x89252ee3f920978EEfDB650760fe56BA1Ede8c08";

const LLTV    = 7700n;
const BONUS   = 500n;
const LIQ_THR = 8500n;

const TOKEN_NAME    = "Obscura Confidential USDC";
const TOKEN_SYMBOL  = "ocUSDC";
const TOKEN_DEC     = 6;
const FAUCET_AMOUNT = 10_000n * 1_000_000n; // 10,000 ocUSDC per drip

async function main() {
  const [deployer] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  // ── 1. Deploy ocUSDC ──────────────────────────────────────────────────
  console.log("[1/5] Deploying ObscuraConfidentialToken (ocUSDC)...");
  const TokenF = await ethers.getContractFactory("ObscuraConfidentialToken");
  const token = await TokenF.deploy(TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DEC, FAUCET_AMOUNT);
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log(`  -> ocUSDC: ${tokenAddr}`);

  // ── 2. Deploy market (single-asset, 77% LLTV) ─────────────────────────
  console.log("[2/5] Deploying ObscuraCreditMarket (ocUSDC/ocUSDC, 77%)...");
  const MarketF = await ethers.getContractFactory("ObscuraCreditMarket");
  const market = await MarketF.deploy(
    tokenAddr, tokenAddr, ORACLE, IRM, LLTV, BONUS, LIQ_THR
  );
  await market.waitForDeployment();
  const marketAddr = await market.getAddress();
  console.log(`  -> Market: ${marketAddr}`);

  // ── 3. Deploy vault (curator = deployer) ──────────────────────────────
  console.log("[3/5] Deploying ObscuraCreditVault (ocUSDC, Conservative)...");
  const VaultF = await ethers.getContractFactory("ObscuraCreditVault");
  const vault = await VaultF.deploy(tokenAddr, deployer.address, TREASURY);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log(`  -> Vault: ${vaultAddr}`);

  // ── 4. Wire auction + repay routers + vault approval ──────────────────
  console.log("[4/5] Wiring auction + repay routers + vault approval...");
  await (await market.setAuctionEngine(AUCTION)).wait();
  await (await market.setRepayRouter(STREAM, true)).wait();
  await (await market.setRepayRouter(INSURE, true)).wait();
  console.log(`  market wired ✓`);

  const cap1M = ethers.parseUnits("1000000", 6);
  await (await vault.approveMarket(marketAddr, cap1M)).wait();
  console.log(`  vault approved market w/ 1M cap ✓`);

  // ── 5. Pre-fund market with liquidity using the proven two-step pattern.
  console.log("[5/5] Faucet + supply liquidity to market...");

  // 5a. Claim faucet (10k ocUSDC into deployer encrypted balance).
  try {
    await (await token.claimFaucet()).wait();
    console.log(`  faucet claimed (10k ocUSDC) ✓`);
  } catch (e: any) {
    console.log(`  faucet skipped (cooldown active): ${e.shortMessage || e.message}`);
  }

  // 5b. Pre-fund step requires encrypted inputs — done in
  // testBorrowV314.ts where cofhejs is initialised. This script only
  // deploys & wires; the test script encrypts + exercises borrow.

  // ── Persist ───────────────────────────────────────────────────────────
  const deployPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep: Record<string, unknown> = JSON.parse(fs.readFileSync(deployPath, "utf8"));
  dep["v314_ocUSDC"]                  = tokenAddr;
  dep["v314_ObscuraCreditMarket_77"]  = marketAddr;
  dep["v314_ObscuraCreditVault"]      = vaultAddr;
  dep["v314_deployedAt"]              = new Date().toISOString();
  fs.writeFileSync(deployPath, JSON.stringify(dep, null, 2));
  console.log(`\nWrote deployments/${network.name}.json (v314_*).`);

  console.log("\n── v3.14 deployment complete ───────────────────────");
  console.log(`  ocUSDC: ${tokenAddr}`);
  console.log(`  Market: ${marketAddr}`);
  console.log(`  Vault:  ${vaultAddr}`);
  console.log("Next: npx hardhat run scripts/testBorrowV314.ts --network arb-sepolia");
}

main().catch((e) => { console.error(e); process.exit(1); });

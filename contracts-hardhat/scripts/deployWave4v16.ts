// Wave 4 v1.6 — Redeploy 4 credit markets with borrow fix:
//   - Explicit LLTV + liquidity pre-checks (no more FHE.select silent-fail)
//   - _plainBorrow + _plainCollateral shadow mappings for accounting correctness
//   - getPlainCollateral / getPlainBorrow / maxBorrowable view functions
//   - withdrawCollateral uses amtPlain for shadow update
//   - Proper revert messages instead of silently sending zero-value cUSDC
//
//   Unchanged (reuse existing v1.5 addresses):
//   - ObscuraCreditAuction, ObscuraCreditStreamHook, ObscuraCreditInsuranceHook
//   - ObscuraCreditOracle, ObscuraCreditIRM
//   - ObscuraCreditVault_Conservative, ObscuraCreditVault_Aggressive
//   - ObscuraCreditScore, ObscuraCreditGovernanceProxy
//   - Confidential tokens (cUSDC, cOBS, cWETH)
//
// Run:
//   npx hardhat run scripts/deployWave4v16.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ─── Stable addresses ─────────────────────────────────────────────────────────
const CUSDC  = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
const COBS   = "0x68d61fb8dfA7DC94B77F61bD50BB038f3FcADCbD";
const CWETH  = "0xA377AF2b307C2219B66D83963c9c800305aE5518";
const ORACLE = "0x5F00910533AB6fc12a35a87BaFe856EF2cb323c3";
const IRM    = "0xA072c038cE98dEC8F5350D451145fB98F5EA57Bc";

// v1.5 addresses — reused as-is
const AUCTION       = "0x205FfC0A3b8207B645c1a6B1b4805eb3FfC828F0";
const STREAM_HOOK   = "0x740580C5FF321440C61c6Af667C191Eea2249F96";
const INSURANCE_HOOK = "0x55f632401d238dFBEdd63B4adDF5B64DfB178190";
const VAULT_CONS    = "0xd96d57929FBad49803bF1526Ac576Be467eeAcD7";
const VAULT_AGG     = "0x9df302055384735451b53e27FE9056C401A8CC3b";

// Market params (unchanged from v1.5)
const LLTV_77  = 7700n;
const LLTV_86  = 8600n;
const BONUS_500 = 500n;
const BONUS_750 = 750n;
const THRESH_85 = 8500n;
const THRESH_90 = 9000n;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  const deployPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep: Record<string, unknown> = JSON.parse(fs.readFileSync(deployPath, "utf8"));

  // ─── Deploy 4 fixed markets ──────────────────────────────────────────────────
  const MarketF = await ethers.getContractFactory("ObscuraCreditMarket");

  console.log("[1/4] Market 77% cUSDC/cUSDC...");
  const m77 = await MarketF.deploy(CUSDC, CUSDC, ORACLE, IRM, LLTV_77, BONUS_500, THRESH_85);
  await m77.waitForDeployment();
  const m77Addr = await m77.getAddress();
  console.log(`  -> ${m77Addr}`);

  console.log("[2/4] Market 86% cUSDC/cUSDC...");
  const m86 = await MarketF.deploy(CUSDC, CUSDC, ORACLE, IRM, LLTV_86, BONUS_750, THRESH_90);
  await m86.waitForDeployment();
  const m86Addr = await m86.getAddress();
  console.log(`  -> ${m86Addr}`);

  console.log("[3/4] Market cOBS→cUSDC 77%...");
  const mOBS = await MarketF.deploy(CUSDC, COBS, ORACLE, IRM, LLTV_77, BONUS_500, THRESH_85);
  await mOBS.waitForDeployment();
  const mOBSAddr = await mOBS.getAddress();
  console.log(`  -> ${mOBSAddr}`);

  console.log("[4/4] Market cWETH→cUSDC 86%...");
  const mWETH = await MarketF.deploy(CUSDC, CWETH, ORACLE, IRM, LLTV_86, BONUS_750, THRESH_90);
  await mWETH.waitForDeployment();
  const mWETHAddr = await mWETH.getAddress();
  console.log(`  -> ${mWETHAddr}`);

  // ─── Wire up: auction engine + repay routers ──────────────────────────────────
  const markets   = [m77, m86, mOBS, mWETH];
  const mAddrs    = [m77Addr, m86Addr, mOBSAddr, mWETHAddr];
  const mLabels   = ["77%", "86%", "cOBS/77%", "cWETH/86%"];

  console.log("\nWiring auction engine + repay routers...");
  for (let i = 0; i < markets.length; i++) {
    const m = markets[i];
    console.log(`  [${mLabels[i]}] ${mAddrs[i]}`);
    await (await m.setAuctionEngine(AUCTION)).wait();
    console.log(`    auction engine -> ${AUCTION}`);
    await (await m.setRepayRouter(STREAM_HOOK, true)).wait();
    console.log(`    repay router stream hook ok`);
    await (await m.setRepayRouter(INSURANCE_HOOK, true)).wait();
    console.log(`    repay router insurance hook ok`);
  }

  // ─── Approve markets in vaults ───────────────────────────────────────────────
  const VaultABI = ["function approveMarket(address market, uint128 cap) external"];
  const vaultCons = new ethers.Contract(VAULT_CONS, VaultABI, deployer);
  const vaultAgg  = new ethers.Contract(VAULT_AGG,  VaultABI, deployer);

  const cap1M   = ethers.parseUnits("1000000", 6);
  const cap500k = ethers.parseUnits("500000", 6);
  const cap2M   = ethers.parseUnits("2000000", 6);

  console.log("\nApproving in conservative vault...");
  await (await vaultCons.approveMarket(m77Addr,   cap1M)).wait();
  await (await vaultCons.approveMarket(mOBSAddr,  cap500k)).wait();
  await (await vaultCons.approveMarket(mWETHAddr, cap500k)).wait();
  console.log("  done: m77, mOBS, mWETH");

  console.log("Approving in aggressive vault...");
  await (await vaultAgg.approveMarket(m86Addr,   cap2M)).wait();
  await (await vaultAgg.approveMarket(mOBSAddr,  cap1M)).wait();
  await (await vaultAgg.approveMarket(mWETHAddr, cap1M)).wait();
  console.log("  done: m86, mOBS, mWETH");

  // ─── Update deployment JSON ────────────────────────────────────────────────────
  dep["ObscuraCreditMarket_77"]          = m77Addr;
  dep["ObscuraCreditMarket_86"]          = m86Addr;
  dep["ObscuraCreditMarket_cOBS_cUSDC"]  = mOBSAddr;
  dep["ObscuraCreditMarket_cWETH_cUSDC"] = mWETHAddr;
  dep["wave4v16DeployedAt"]              = new Date().toISOString();

  fs.writeFileSync(deployPath, JSON.stringify(dep, null, 2));
  console.log(`\nDeployments updated: ${deployPath}`);

  // ─── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("Wave 4 v1.6 Deployment Summary (borrow fix)");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Market 77% cUSDC:       ${m77Addr}`);
  console.log(`Market 86% cUSDC:       ${m86Addr}`);
  console.log(`Market cOBS/cUSDC 77%:  ${mOBSAddr}`);
  console.log(`Market cWETH/cUSDC 86%: ${mWETHAddr}`);
  console.log("\n── .env updates needed ─────────────────────────────────────────");
  console.log(`VITE_OBSCURA_CREDIT_MARKET_77_ADDRESS=${m77Addr}`);
  console.log(`VITE_OBSCURA_CREDIT_MARKET_86_ADDRESS=${m86Addr}`);
  console.log(`VITE_OBSCURA_CREDIT_MARKET_COBS_CUSDC_ADDRESS=${mOBSAddr}`);
  console.log(`VITE_OBSCURA_CREDIT_MARKET_CWETH_CUSDC_ADDRESS=${mWETHAddr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

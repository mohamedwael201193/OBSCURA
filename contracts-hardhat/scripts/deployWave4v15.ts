// Wave 4 v1.5 — Deploy updated contracts:
//   - ObscuraCreditMarket (all 4) — fixed hook function signatures + cUSDC forwarding
//   - ObscuraCreditAuction v2 — FHE sealed-bid (encrypted running max via FHE.select)
//   - ObscuraCreditStreamHook v2 — two-step cUSDC forwarding (encPull + encPush)
//   - ObscuraCreditInsuranceHook v2 — two-step cUSDC forwarding (encPull + encPush)
//
//   Unchanged (reuse existing addresses):
//   - ObscuraCreditOracle, ObscuraCreditIRM, ObscuraCreditFactory
//   - ObscuraCreditVault_Conservative, ObscuraCreditVault_Aggressive
//   - ObscuraCreditScore, ObscuraCreditGovernanceProxy
//   - Confidential tokens (cUSDC, cOBS, cWETH)
//
// Run:
//   npx hardhat run scripts/deployWave4v15.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ─── Stable addresses (reused from deployment JSON) ──────────────────────────
const CUSDC   = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
const COBS    = "0x68d61fb8dfA7DC94B77F61bD50BB038f3FcADCbD";
const CWETH   = "0xA377AF2b307C2219B66D83963c9c800305aE5518";
const ORACLE  = "0x5F00910533AB6fc12a35a87BaFe856EF2cb323c3";  // ObscuraCreditOracle
const IRM     = "0xA072c038cE98dEC8F5350D451145fB98F5EA57Bc";  // ObscuraCreditIRM
const VAULT_CONS = "0xd96d57929FBad49803bF1526Ac576Be467eeAcD7"; // Vault Conservative (v1.4)
const VAULT_AGG  = "0x9df302055384735451b53e27FE9056C401A8CC3b"; // Vault Aggressive (v1.4)

// Market params matching credit.ts config
const LLTV_77   = 7700n;
const LLTV_86   = 8600n;
const LIQ_BONUS_500  = 500n;
const LIQ_BONUS_750  = 750n;
const LIQ_THRESH_85  = 8500n;
const LIQ_THRESH_90  = 9000n;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  const deployPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep: Record<string, unknown> = JSON.parse(fs.readFileSync(deployPath, "utf8"));

  // ─── 1. Deploy 4 markets directly (bypass factory due to CREATE2 uniqueness) ─
  console.log("[1/8] ObscuraCreditMarket 77% cUSDC/cUSDC...");
  const MarketF = await ethers.getContractFactory("ObscuraCreditMarket");
  const market77 = await MarketF.deploy(CUSDC, CUSDC, ORACLE, IRM, LLTV_77, LIQ_BONUS_500, LIQ_THRESH_85);
  await market77.waitForDeployment();
  const market77Addr = await market77.getAddress();
  console.log(`     -> ${market77Addr}`);

  console.log("[2/8] ObscuraCreditMarket 86% cUSDC/cUSDC...");
  const market86 = await MarketF.deploy(CUSDC, CUSDC, ORACLE, IRM, LLTV_86, LIQ_BONUS_750, LIQ_THRESH_90);
  await market86.waitForDeployment();
  const market86Addr = await market86.getAddress();
  console.log(`     -> ${market86Addr}`);

  console.log("[3/8] ObscuraCreditMarket cOBS→cUSDC 77%...");
  const marketOBS = await MarketF.deploy(CUSDC, COBS, ORACLE, IRM, LLTV_77, LIQ_BONUS_500, LIQ_THRESH_85);
  await marketOBS.waitForDeployment();
  const marketOBSAddr = await marketOBS.getAddress();
  console.log(`     -> ${marketOBSAddr}`);

  console.log("[4/8] ObscuraCreditMarket cWETH→cUSDC 86%...");
  const marketWETH = await MarketF.deploy(CUSDC, CWETH, ORACLE, IRM, LLTV_86, LIQ_BONUS_750, LIQ_THRESH_90);
  await marketWETH.waitForDeployment();
  const marketWETHAddr = await marketWETH.getAddress();
  console.log(`     -> ${marketWETHAddr}`);

  // ─── 2. Deploy ObscuraCreditAuction v2 (FHE sealed bid) ──────────────────────
  console.log("[5/8] ObscuraCreditAuction v2 (FHE sealed bid)...");
  const AuctionF = await ethers.getContractFactory("ObscuraCreditAuction");
  const auction = await AuctionF.deploy();
  await auction.waitForDeployment();
  const auctionAddr = await auction.getAddress();
  console.log(`     -> ${auctionAddr}`);

  // ─── 3. Deploy hooks v2 (two-step cUSDC forwarding) ──────────────────────────
  console.log("[6/8] ObscuraCreditStreamHook v2...");
  const StreamF = await ethers.getContractFactory("ObscuraCreditStreamHook");
  const streamHook = await StreamF.deploy(CUSDC);
  await streamHook.waitForDeployment();
  const streamHookAddr = await streamHook.getAddress();
  console.log(`     -> ${streamHookAddr}`);

  console.log("[7/8] ObscuraCreditInsuranceHook v2...");
  const InsuranceF = await ethers.getContractFactory("ObscuraCreditInsuranceHook");
  const insuranceHook = await InsuranceF.deploy(CUSDC);
  await insuranceHook.waitForDeployment();
  const insuranceHookAddr = await insuranceHook.getAddress();
  console.log(`     -> ${insuranceHookAddr}`);

  // ─── 4. Wire up markets (auction engine + repay routers) ─────────────────────
  console.log("[8/8] Wiring: auction engine + repay routers + vault approvals...");

  const markets = [market77, market86, marketOBS, marketWETH];
  const marketAddrs = [market77Addr, market86Addr, marketOBSAddr, marketWETHAddr];
  const marketLabels = ["77%", "86%", "cOBS/77%", "cWETH/86%"];

  for (let i = 0; i < markets.length; i++) {
    const m = markets[i];
    const addr = marketAddrs[i];
    console.log(`  Market ${marketLabels[i]} (${addr}):`);

    const ae = await m.setAuctionEngine(auctionAddr);
    await ae.wait();
    console.log(`    auction engine set -> ${auctionAddr}`);

    const rr1 = await m.setRepayRouter(streamHookAddr, true);
    await rr1.wait();
    console.log(`    repay router (stream hook) set`);

    const rr2 = await m.setRepayRouter(insuranceHookAddr, true);
    await rr2.wait();
    console.log(`    repay router (insurance hook) set`);
  }

  // ─── 5. Approve markets in existing vaults (curator = deployer) ──────────────
  const VaultABI = [
    "function approveMarket(address market, uint128 cap) external",
  ];
  const vaultCons = new ethers.Contract(VAULT_CONS, VaultABI, deployer);
  const vaultAgg  = new ethers.Contract(VAULT_AGG,  VaultABI, deployer);
  const cap1M  = ethers.parseUnits("1000000", 6);
  const cap500k = ethers.parseUnits("500000", 6);
  const cap2M  = ethers.parseUnits("2000000", 6);

  console.log("\n  Conservative vault — approving new markets...");
  await (await vaultCons.approveMarket(market77Addr, cap1M)).wait();
  await (await vaultCons.approveMarket(marketOBSAddr, cap500k)).wait();
  await (await vaultCons.approveMarket(marketWETHAddr, cap500k)).wait();
  console.log("    approved: market77, marketOBS, marketWETH");

  console.log("  Aggressive vault — approving new markets...");
  await (await vaultAgg.approveMarket(market86Addr, cap2M)).wait();
  await (await vaultAgg.approveMarket(marketOBSAddr, ethers.parseUnits("1000000", 6))).wait();
  await (await vaultAgg.approveMarket(marketWETHAddr, ethers.parseUnits("1000000", 6))).wait();
  console.log("    approved: market86, marketOBS, marketWETH");

  // ─── 6. Update deployment JSON ────────────────────────────────────────────────
  dep["ObscuraCreditMarket_77"]          = market77Addr;
  dep["ObscuraCreditMarket_86"]          = market86Addr;
  dep["ObscuraCreditMarket_cOBS_cUSDC"]  = marketOBSAddr;
  dep["ObscuraCreditMarket_cWETH_cUSDC"] = marketWETHAddr;
  dep["ObscuraCreditAuction"]            = auctionAddr;
  dep["ObscuraCreditStreamHook"]         = streamHookAddr;
  dep["ObscuraCreditInsuranceHook"]      = insuranceHookAddr;
  dep["wave4v15DeployedAt"]              = new Date().toISOString();

  fs.writeFileSync(deployPath, JSON.stringify(dep, null, 2));
  console.log(`\nDeployments updated: ${deployPath}`);

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("Wave 4 v1.5 Deployment Summary");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Market 77% cUSDC:      ${market77Addr}`);
  console.log(`Market 86% cUSDC:      ${market86Addr}`);
  console.log(`Market cOBS/cUSDC 77%: ${marketOBSAddr}`);
  console.log(`Market cWETH/cUSDC 86%: ${marketWETHAddr}`);
  console.log(`Auction v2:            ${auctionAddr}`);
  console.log(`Stream Hook v2:        ${streamHookAddr}`);
  console.log(`Insurance Hook v2:     ${insuranceHookAddr}`);
  console.log("\n── .env updates needed ─────────────────────────────────────────");
  console.log(`VITE_OBSCURA_CREDIT_MARKET_77_ADDRESS=${market77Addr}`);
  console.log(`VITE_OBSCURA_CREDIT_MARKET_86_ADDRESS=${market86Addr}`);
  console.log(`VITE_OBSCURA_CREDIT_MARKET_COBS_CUSDC_ADDRESS=${marketOBSAddr}`);
  console.log(`VITE_OBSCURA_CREDIT_MARKET_CWETH_CUSDC_ADDRESS=${marketWETHAddr}`);
  console.log(`VITE_OBSCURA_CREDIT_AUCTION_ADDRESS=${auctionAddr}`);
  console.log(`VITE_OBSCURA_CREDIT_STREAM_HOOK_ADDRESS=${streamHookAddr}`);
  console.log(`VITE_OBSCURA_CREDIT_INSURANCE_HOOK_ADDRESS=${insuranceHookAddr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

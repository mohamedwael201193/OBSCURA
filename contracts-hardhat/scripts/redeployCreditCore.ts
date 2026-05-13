// Redeploy ObscuraCreditVault and ObscuraCreditMarket with the fixed
// FHE-correct architecture:
//   - Vault: plaintext share accounting, cUSDC InEuint64 transfers
//   - Market: pre-computed FHE constants, plaintext supply shares,
//             encrypted borrow/collateral, TWO InEuint64 for supplyCollateral+repay
//
// Reuses: ObscuraCreditFactory, ObscuraCreditOracle, ObscuraCreditIRM,
//         cUSDC, cOBS, cWETH, feed addresses.
//
// Run:
//   npx hardhat run scripts/redeployCreditCore.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ─── Existing stable addresses ────────────────────────────────────────────────
const CUSDCADDR  = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
const COBSADDR   = "0x68d61fb8dfA7DC94B77F61bD50BB038f3FcADCbD";
const CWETHADDR  = "0xA377AF2b307C2219B66D83963c9c800305aE5518";
const ORACLE     = "0x02E085502311732DB9aD13889CC36A6C2D807189";
const IRM        = "0x29A43Ec8379200286f5A05d8ef24d46e088903a7";
const TREASURY   = "0x89252ee3f920978EEfDB650760fe56BA1Ede8c08";

// LLTV and liquidation params (bps, 10000 = 100%)
const LLTV_77  = 7700n;
const LLTV_86  = 8600n;
const LIQ_BONUS = 500n;   // 5%
const LIQ_THRESH_77 = 8000n;  // 80%
const LIQ_THRESH_86 = 9000n;  // 90%

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  const deployPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep: Record<string, unknown> = JSON.parse(fs.readFileSync(deployPath, "utf8"));

  // ─── 1. Deploy ObscuraCreditVault (Conservative — low LLTV markets) ───────
  console.log("[1/6] ObscuraCreditVault Conservative...");
  const VaultF = await ethers.getContractFactory("ObscuraCreditVault");
  const vaultCons = await VaultF.deploy(CUSDCADDR, deployer.address, deployer.address);
  await vaultCons.waitForDeployment();
  const vaultConsAddr = await vaultCons.getAddress();
  console.log(`     -> ${vaultConsAddr}`);

  // ─── 2. Deploy ObscuraCreditVault (Aggressive — higher LLTV markets) ──────
  console.log("[2/6] ObscuraCreditVault Aggressive...");
  const vaultAgg = await VaultF.deploy(CUSDCADDR, deployer.address, deployer.address);
  await vaultAgg.waitForDeployment();
  const vaultAggAddr = await vaultAgg.getAddress();
  console.log(`     -> ${vaultAggAddr}`);

  // ─── 3. Deploy ObscuraCreditMarket (77% LLTV, cUSDC/cUSDC) ───────────────
  console.log("[3/6] ObscuraCreditMarket 77% (cUSDC/cUSDC)...");
  const MarketF = await ethers.getContractFactory("ObscuraCreditMarket");
  const market77 = await MarketF.deploy(
    CUSDCADDR, CUSDCADDR, ORACLE, IRM,
    LLTV_77, LIQ_BONUS, LIQ_THRESH_77
  );
  await market77.waitForDeployment();
  const market77Addr = await market77.getAddress();
  console.log(`     -> ${market77Addr}`);

  // ─── 4. Deploy ObscuraCreditMarket (86% LLTV, cUSDC/cUSDC) ───────────────
  console.log("[4/6] ObscuraCreditMarket 86% (cUSDC/cUSDC)...");
  const market86 = await MarketF.deploy(
    CUSDCADDR, CUSDCADDR, ORACLE, IRM,
    LLTV_86, LIQ_BONUS, LIQ_THRESH_86
  );
  await market86.waitForDeployment();
  const market86Addr = await market86.getAddress();
  console.log(`     -> ${market86Addr}`);

  // ─── 5. Deploy ObscuraCreditMarket (cOBS/cUSDC, 77%) ─────────────────────
  console.log("[5/6] ObscuraCreditMarket cOBS→cUSDC (77%)...");
  const marketOBS = await MarketF.deploy(
    CUSDCADDR, COBSADDR, ORACLE, IRM,
    LLTV_77, LIQ_BONUS, LIQ_THRESH_77
  );
  await marketOBS.waitForDeployment();
  const marketOBSAddr = await marketOBS.getAddress();
  console.log(`     -> ${marketOBSAddr}`);

  // ─── 6. Deploy ObscuraCreditMarket (cWETH/cUSDC, 77%) ────────────────────
  console.log("[6/6] ObscuraCreditMarket cWETH→cUSDC (77%)...");
  const marketWETH = await MarketF.deploy(
    CUSDCADDR, CWETHADDR, ORACLE, IRM,
    LLTV_77, LIQ_BONUS, LIQ_THRESH_77
  );
  await marketWETH.waitForDeployment();
  const marketWETHAddr = await marketWETH.getAddress();
  console.log(`     -> ${marketWETHAddr}`);

  // ─── Post-deploy: approve markets in each vault ───────────────────────────
  console.log("\nApproving markets in Conservative vault...");
  await (await vaultCons.approveMarket(market77Addr, ethers.parseUnits("1000000", 6))).wait();
  await (await vaultCons.approveMarket(marketOBSAddr, ethers.parseUnits("500000", 6))).wait();
  await (await vaultCons.approveMarket(marketWETHAddr, ethers.parseUnits("500000", 6))).wait();
  console.log("Approving markets in Aggressive vault...");
  await (await vaultAgg.approveMarket(market86Addr, ethers.parseUnits("2000000", 6))).wait();
  await (await vaultAgg.approveMarket(marketOBSAddr, ethers.parseUnits("1000000", 6))).wait();

  // ─── Update deployments JSON ──────────────────────────────────────────────
  dep["ObscuraCreditVault_Conservative"] = vaultConsAddr;
  dep["ObscuraCreditVault_Aggressive"]   = vaultAggAddr;
  dep["ObscuraCreditMarket_77"]          = market77Addr;
  dep["ObscuraCreditMarket_86"]          = market86Addr;
  dep["ObscuraCreditMarket_cOBS_cUSDC"]  = marketOBSAddr;
  dep["ObscuraCreditMarket_cWETH_cUSDC"] = marketWETHAddr;
  dep["creditCoreRedeployedAt"]          = new Date().toISOString();

  fs.writeFileSync(deployPath, JSON.stringify(dep, null, 2));
  console.log(`\nDeployments updated: ${deployPath}`);

  console.log("\n── Summary ────────────────────────────────────────────────");
  console.log(`Vault Conservative:  ${vaultConsAddr}`);
  console.log(`Vault Aggressive:    ${vaultAggAddr}`);
  console.log(`Market 77% cUSDC:    ${market77Addr}`);
  console.log(`Market 86% cUSDC:    ${market86Addr}`);
  console.log(`Market cOBS/cUSDC:   ${marketOBSAddr}`);
  console.log(`Market cWETH/cUSDC:  ${marketWETHAddr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

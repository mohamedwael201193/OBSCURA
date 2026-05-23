// Wave 4 v3.13 — Real-ciphertext outbound + FHE.eq guard
//
// Root cause (CORRECTED — supersedes v3.12 ACL theory):
//   Reineira cUSDC's confidentialTransfer(address,uint256) (selector 0xfe3f670d)
//   REJECTS trivially-encrypted handles produced by FHE.asEuint64(uint64 plaintext).
//   It only accepts handles that derive from a REAL ciphertext (i.e. originally
//   constructed from an InEuint64 / ZKPoK input).
//
// Evidence:
//   - ObscuraConfidentialEscrow.redeem() pushes via the SAME selector and
//     succeeded twice on-chain (escrow.paidAmount = FHE.add of user InEuint64).
//   - Every borrow / withdraw / withdrawToVault since launch reverted with
//     empty data despite v3.12's FHE.allowThis fix (0 outbound events across
//     all 4 v3.12 markets over 9M blocks).
//
// Fix applied in this redeploy:
//   - borrow:              uses encAmt (InEuint64) + FHE.eq(req,expected) guard
//   - withdraw:            now takes (uint64 amtPlain, InEuint64 encAmt)
//   - withdrawToVault:     now takes (uint64 amtPlain, InEuint64 encAmt)
//   - withdrawCollateral:  added FHE.eq guard against amtPlain (no sig change)
//   - vault.reallocateSupply / reallocateWithdraw: also take InEuint64
//
// Security: if user lies (encAmt encodes Y ≠ amtPlain), FHE.select clamps the
// outbound handle to _zero → silent no-op, but plaintext accounting still
// debits amtPlain → user hurts themselves, pool stays safe.
//
// Run:
//   npx hardhat run scripts/deployWave4v313.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const CUSDC  = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
const COBS   = "0x68d61fb8dfA7DC94B77F61bD50BB038f3FcADCbD";
const CWETH  = "0xA377AF2b307C2219B66D83963c9c800305aE5518";
const ORACLE = "0x5F00910533AB6fc12a35a87BaFe856EF2cb323c3";
const IRM    = "0xA072c038cE98dEC8F5350D451145fB98F5EA57Bc";

const AUCTION        = "0x205FfC0A3b8207B645c1a6B1b4805eb3FfC828F0";
const STREAM_HOOK    = "0x740580C5FF321440C61c6Af667C191Eea2249F96";
const INSURANCE_HOOK = "0x55f632401d238dFBEdd63B4adDF5B64DfB178190";
const TREASURY       = "0x89252ee3f920978EEfDB650760fe56BA1Ede8c08";

const LLTV_77   = 7700n; const LLTV_86   = 8600n;
const BONUS_500 = 500n;  const BONUS_750 = 750n;
const THRESH_85 = 8500n; const THRESH_90 = 9000n;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  const deployPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep: Record<string, unknown> = JSON.parse(fs.readFileSync(deployPath, "utf8"));

  // ─── Markets ──────────────────────────────────────────────────────────────
  const MarketF = await ethers.getContractFactory("ObscuraCreditMarket");

  console.log("[1/6] Market 77% cUSDC/cUSDC...");
  const m77 = await MarketF.deploy(CUSDC, CUSDC, ORACLE, IRM, LLTV_77, BONUS_500, THRESH_85);
  await m77.waitForDeployment();
  const m77Addr = await m77.getAddress();
  console.log(`  -> ${m77Addr}`);

  console.log("[2/6] Market 86% cUSDC/cUSDC...");
  const m86 = await MarketF.deploy(CUSDC, CUSDC, ORACLE, IRM, LLTV_86, BONUS_750, THRESH_90);
  await m86.waitForDeployment();
  const m86Addr = await m86.getAddress();
  console.log(`  -> ${m86Addr}`);

  console.log("[3/6] Market cOBS->cUSDC 77%...");
  const mOBS = await MarketF.deploy(CUSDC, COBS, ORACLE, IRM, LLTV_77, BONUS_500, THRESH_85);
  await mOBS.waitForDeployment();
  const mOBSAddr = await mOBS.getAddress();
  console.log(`  -> ${mOBSAddr}`);

  console.log("[4/6] Market cWETH->cUSDC 86%...");
  const mWETH = await MarketF.deploy(CUSDC, CWETH, ORACLE, IRM, LLTV_86, BONUS_750, THRESH_90);
  await mWETH.waitForDeployment();
  const mWETHAddr = await mWETH.getAddress();
  console.log(`  -> ${mWETHAddr}`);

  // ─── Vaults ───────────────────────────────────────────────────────────────
  const VaultF = await ethers.getContractFactory("ObscuraCreditVault");

  console.log("[5/6] Vault Conservative...");
  const vaultCons = await VaultF.deploy(CUSDC, deployer.address, TREASURY);
  await vaultCons.waitForDeployment();
  const vaultConsAddr = await vaultCons.getAddress();
  console.log(`  -> ${vaultConsAddr}`);

  console.log("[6/6] Vault Aggressive...");
  const vaultAgg = await VaultF.deploy(CUSDC, deployer.address, TREASURY);
  await vaultAgg.waitForDeployment();
  const vaultAggAddr = await vaultAgg.getAddress();
  console.log(`  -> ${vaultAggAddr}`);

  // ─── Wire markets ──────────────────────────────────────────────────────────
  const markets   = [m77, m86, mOBS, mWETH];
  const mAddrs    = [m77Addr, m86Addr, mOBSAddr, mWETHAddr];
  const mLabels   = ["77%", "86%", "cOBS/77%", "cWETH/86%"];

  console.log("\nWiring auction + repay routers...");
  for (let i = 0; i < markets.length; i++) {
    console.log(`  [${mLabels[i]}] ${mAddrs[i]}`);
    await (await markets[i].setAuctionEngine(AUCTION)).wait();
    await (await markets[i].setRepayRouter(STREAM_HOOK, true)).wait();
    await (await markets[i].setRepayRouter(INSURANCE_HOOK, true)).wait();
    console.log(`    wired ✓`);
  }

  console.log("\nApproving markets in vaults...");
  const cap1M   = ethers.parseUnits("1000000", 6);
  const cap500k = ethers.parseUnits("500000",  6);
  const cap2M   = ethers.parseUnits("2000000", 6);

  await (await vaultCons.approveMarket(m77Addr,   cap1M)).wait();
  await (await vaultCons.approveMarket(mOBSAddr,  cap500k)).wait();
  await (await vaultCons.approveMarket(mWETHAddr, cap500k)).wait();
  console.log(`  Conservative vault: 3 markets approved ✓`);

  await (await vaultAgg.approveMarket(m86Addr,   cap2M)).wait();
  await (await vaultAgg.approveMarket(mOBSAddr,  cap1M)).wait();
  await (await vaultAgg.approveMarket(mWETHAddr, cap1M)).wait();
  console.log(`  Aggressive vault:   3 markets approved ✓`);

  // ─── Update deployments JSON ─────────────────────────────────────────────
  dep["ObscuraCreditMarket_77"]          = m77Addr;
  dep["ObscuraCreditMarket_86"]          = m86Addr;
  dep["ObscuraCreditMarket_cOBS_cUSDC"]  = mOBSAddr;
  dep["ObscuraCreditMarket_cWETH_cUSDC"] = mWETHAddr;
  dep["ObscuraCreditVault_Conservative"] = vaultConsAddr;
  dep["ObscuraCreditVault_Aggressive"]   = vaultAggAddr;
  dep["wave4v313DeployedAt"]             = new Date().toISOString();
  fs.writeFileSync(deployPath, JSON.stringify(dep, null, 2));
  console.log("\ndeployments/arb-sepolia.json updated ✓");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("Wave 4 v3.13 — Real-ciphertext outbound + FHE.eq guard");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Market 77% cUSDC:         ${m77Addr}`);
  console.log(`Market 86% cUSDC:         ${m86Addr}`);
  console.log(`Market cOBS/cUSDC 77%:    ${mOBSAddr}`);
  console.log(`Market cWETH/cUSDC 86%:   ${mWETHAddr}`);
  console.log(`Vault Conservative:        ${vaultConsAddr}`);
  console.log(`Vault Aggressive:          ${vaultAggAddr}`);
  console.log("\nUpdate frontend .env:");
  console.log(`VITE_OBSCURA_CREDIT_MARKET_77_ADDRESS=${m77Addr}`);
  console.log(`VITE_OBSCURA_CREDIT_MARKET_86_ADDRESS=${m86Addr}`);
  console.log(`VITE_OBSCURA_CREDIT_MARKET_COBS_CUSDC_ADDRESS=${mOBSAddr}`);
  console.log(`VITE_OBSCURA_CREDIT_MARKET_CWETH_CUSDC_ADDRESS=${mWETHAddr}`);
  console.log(`VITE_OBSCURA_CREDIT_VAULT_CONSERVATIVE_ADDRESS=${vaultConsAddr}`);
  console.log(`VITE_OBSCURA_CREDIT_VAULT_AGGRESSIVE_ADDRESS=${vaultAggAddr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

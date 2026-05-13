// Deploy additional confidential tokens (cOBS, cWETH) and create real
// cross-asset markets pairing each with Reineira cUSDC.
//
// Idempotent-ish: re-reading the deployments file means re-running this
// script will deploy NEW token instances and NEW markets. Run it once.
//
// Run:
//   npx hardhat run scripts/deployCreditTokens.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const REINEIRA_cUSDC = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";

// Faucet drip per claim, in token's own units.
//   cOBS uses 8 decimals → 100 cOBS  = 100 * 1e8
//   cWETH uses 8 decimals → 0.1 cWETH = 1e7 (small drip; precious)
const FAUCET_cOBS  = 100n * 10n ** 8n;
const FAUCET_cWETH = 10n ** 7n;

// Mock prices (1e18-scaled USD per whole token of `decimals`).
//   OBS  ≈ $0.10 → 0.10 * 1e18 = 1e17
//   WETH ≈ $3000 → 3000 * 1e18 = 3e21
const PRICE_cOBS_1e18  = 10n ** 17n;
const PRICE_cWETH_1e18 = 3000n * 10n ** 18n;

// Market params — must already be in the factory's approved sets.
//   LLTV 7700 / 8600   (already approved)
//   Bonus 500 / 750    (already approved)
//   Threshold 8500 / 9000 (already approved)
const MARKETS = [
  { tokenKey: "cOBS",  collateral: "cOBS",  loan: "cUSDC", lltv: 7700n, bonus: 500n, threshold: 8500n },
  { tokenKey: "cWETH", collateral: "cWETH", loan: "cUSDC", lltv: 8600n, bonus: 750n, threshold: 9000n },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network : ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  const deployFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const prior = JSON.parse(fs.readFileSync(deployFile, "utf8"));
  const factoryAddr = prior.ObscuraCreditFactory;
  const oracleAddr  = prior.ObscuraCreditOracle;
  const irmAddr     = prior.ObscuraCreditIRM;
  if (!factoryAddr || !oracleAddr || !irmAddr) throw new Error("Wave 4 base contracts missing from deployment file");

  // ─── 1. Deploy cOBS + cWETH (ObscuraConfidentialToken) ────────────────
  const TokenF = await ethers.getContractFactory("ObscuraConfidentialToken");

  console.log("[1/6] Deploying ObscuraConfidentialToken cOBS...");
  const cOBS = await TokenF.deploy("Confidential OBS", "cOBS", 8, FAUCET_cOBS);
  await cOBS.waitForDeployment();
  const cOBSAddr = await cOBS.getAddress();
  console.log(`        -> ${cOBSAddr}`);

  console.log("[2/6] Deploying ObscuraConfidentialToken cWETH...");
  const cWETH = await TokenF.deploy("Confidential WETH", "cWETH", 8, FAUCET_cWETH);
  await cWETH.waitForDeployment();
  const cWETHAddr = await cWETH.getAddress();
  console.log(`        -> ${cWETHAddr}`);

  // ─── 2. Deploy mock price feeds + bind in oracle ──────────────────────
  console.log("[3/6] Deploying MockChainlinkFeed for cOBS @ $0.10...");
  const FeedF = await ethers.getContractFactory("MockChainlinkFeed");
  const feedOBS = await FeedF.deploy(PRICE_cOBS_1e18);
  await feedOBS.waitForDeployment();
  const feedOBSAddr = await feedOBS.getAddress();
  console.log(`        -> ${feedOBSAddr}`);

  console.log("[4/6] Deploying MockChainlinkFeed for cWETH @ $3000...");
  const feedWETH = await FeedF.deploy(PRICE_cWETH_1e18);
  await feedWETH.waitForDeployment();
  const feedWETHAddr = await feedWETH.getAddress();
  console.log(`        -> ${feedWETHAddr}`);

  // setPublicFeed is governor-only. The original deploy did
  // `await oracle.setPublicFeed(REINEIRA_cUSDC, feedUsdcAddr)` while the
  // governor was still the deployer. After Wave 4, factory.governor was
  // moved to the GovernanceProxy, but the ORACLE governor was set in its
  // constructor and never moved — so the deployer still owns the oracle.
  const oracle = await ethers.getContractAt("ObscuraCreditOracle", oracleAddr);
  const oracleGov = await oracle.governor();
  console.log(`        oracle.governor = ${oracleGov} (deployer = ${deployer.address})`);
  if (oracleGov.toLowerCase() === deployer.address.toLowerCase()) {
    console.log("        binding cOBS feed in oracle...");
    await (await oracle.setPublicFeed(cOBSAddr, feedOBSAddr)).wait();
    console.log("        binding cWETH feed in oracle...");
    await (await oracle.setPublicFeed(cWETHAddr, feedWETHAddr)).wait();
  } else {
    console.log("        ! oracle governor is not the deployer — skipping setPublicFeed");
    console.log("          (re-run as oracle.governor or call manually)");
  }

  // ─── 3. Create the new markets via the permissionless factory ─────────
  // factory.createMarket() is permissionless; only the oracle/IRM/LLTV/...
  // values must be in the approved sets, which they already are from Wave 4.
  const factory = await ethers.getContractAt("ObscuraCreditFactory", factoryAddr);
  console.log(`[5/6] Creating cross-asset markets via factory ${factoryAddr}...`);

  const tokens: Record<string, string> = {
    cUSDC: REINEIRA_cUSDC,
    cOBS:  cOBSAddr,
    cWETH: cWETHAddr,
  };

  const newMarketAddrs: Record<string, string> = {};
  for (const m of MARKETS) {
    const collateralAddr = tokens[m.collateral];
    const loanAddr       = tokens[m.loan];
    console.log(`        createMarket(${m.collateral} collat / ${m.loan} loan, LLTV ${m.lltv})`);
    const tx = await factory.createMarket(loanAddr, collateralAddr, oracleAddr, irmAddr, m.lltv, m.bonus, m.threshold);
    const r = await tx.wait();
    const ev = r!.logs.find((l: any) => l.fragment?.name === "MarketCreated") as any;
    const addr = ev.args[0];
    console.log(`            -> ${addr}`);
    newMarketAddrs[m.tokenKey] = addr;
  }

  // ─── 4. Persist + .env upserts ───────────────────────────────────────
  console.log("[6/6] Persisting addresses...");
  const out = {
    ...prior,
    ObscuraConfidentialOBS:  cOBSAddr,
    ObscuraConfidentialWETH: cWETHAddr,
    ObscuraCreditFeedOBS:    feedOBSAddr,
    ObscuraCreditFeedWETH:   feedWETHAddr,
    ObscuraCreditMarket_cOBS_cUSDC:  newMarketAddrs.cOBS,
    ObscuraCreditMarket_cWETH_cUSDC: newMarketAddrs.cWETH,
    creditTokensDeployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(deployFile, JSON.stringify(out, null, 2));
  console.log(`        deployments file updated: ${deployFile}`);

  const envPath = path.join(__dirname, "..", "..", "frontend", "obscura-os-main", ".env");
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath, "utf8");
    const upserts: Record<string, string> = {
      VITE_OBSCURA_CONFIDENTIAL_OBS_ADDRESS: cOBSAddr,
      VITE_OBSCURA_CONFIDENTIAL_WETH_ADDRESS: cWETHAddr,
      VITE_OBSCURA_CONFIDENTIAL_USDC_ADDRESS: REINEIRA_cUSDC,
      VITE_OBSCURA_CREDIT_FEED_OBS_ADDRESS: feedOBSAddr,
      VITE_OBSCURA_CREDIT_FEED_WETH_ADDRESS: feedWETHAddr,
      VITE_OBSCURA_CREDIT_MARKET_COBS_CUSDC_ADDRESS:  newMarketAddrs.cOBS,
      VITE_OBSCURA_CREDIT_MARKET_CWETH_CUSDC_ADDRESS: newMarketAddrs.cWETH,
    };
    for (const [k, v] of Object.entries(upserts)) {
      const re = new RegExp(`^${k}=.*$`, "m");
      env = re.test(env) ? env.replace(re, `${k}=${v}`) : env + `\n${k}=${v}`;
    }
    fs.writeFileSync(envPath, env);
    console.log(`        frontend .env updated: ${envPath}`);
  } else {
    console.log(`(skip) no frontend .env at ${envPath}`);
  }

  console.log("\n✓ Confidential tokens + cross-asset markets deployed.");
  console.log("  cOBS  :", cOBSAddr);
  console.log("  cWETH :", cWETHAddr);
  console.log("  market cOBS  ⇄ cUSDC :", newMarketAddrs.cOBS);
  console.log("  market cWETH ⇄ cUSDC :", newMarketAddrs.cWETH);
  console.log("\nNext: extract ObscuraConfidentialToken ABI to frontend/src/abis/credit/, re-run vite build.");
}

main().catch((e) => { console.error(e); process.exit(1); });

// Deploy Wave 4 Credit: Oracle, IRM, Factory, Markets, Vaults, Auction,
// Score, StreamHook, InsuranceHook, GovernanceProxy.
//
// Run:
//   npx hardhat run scripts/deployWave4Credit.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const REINEIRA_cUSDC = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
// Approved LLTV set (bps) — Morpho-aligned tiers.
const APPROVED_LLTV     = [6250n, 7700n, 8600n, 9150n];
const APPROVED_LIQBONUS = [500n, 750n];           // 5% / 7.5%
const APPROVED_LIQTHRES = [8000n, 8500n, 9000n];  // 80 / 85 / 90 %

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  // Load prior deployment so we can wire to Treasury / Vote / AddressBook.
  const deployFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const prior = fs.existsSync(deployFile) ? JSON.parse(fs.readFileSync(deployFile, "utf8")) : {};
  const treasury = prior.ObscuraTreasury;
  const voteCtr = prior.ObscuraVote;
  const addressBook = prior.ObscuraAddressBook;
  const payStream = prior.ObscuraPayStreamV2;
  if (!treasury) throw new Error("ObscuraTreasury missing from deployment file");

  // ─── 1. MockChainlinkFeed (cUSDC -> $1) ───────────────────────────────────
  console.log("[1/12] MockChainlinkFeed (cUSDC=$1)...");
  const FeedF = await ethers.getContractFactory("MockChainlinkFeed");
  const feedUsdc = await FeedF.deploy(ethers.parseUnits("1", 18));
  await feedUsdc.waitForDeployment();
  const feedUsdcAddr = await feedUsdc.getAddress();
  console.log(`        -> ${feedUsdcAddr}`);

  // ─── 2. ObscuraCreditOracle ───────────────────────────────────────────────
  console.log("[2/12] ObscuraCreditOracle...");
  const OracleF = await ethers.getContractFactory("ObscuraCreditOracle");
  const oracle = await OracleF.deploy(deployer.address);
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log(`        -> ${oracleAddr}`);
  await (await oracle.setPublicFeed(REINEIRA_cUSDC, feedUsdcAddr)).wait();

  // ─── 3. ObscuraCreditIRM (linear-kink) ────────────────────────────────────
  console.log("[3/12] ObscuraCreditIRM...");
  const IrmF = await ethers.getContractFactory("ObscuraCreditIRM");
  const irm = await IrmF.deploy(
    deployer.address,
    200n,    // base 2%
    400n,    // slope1 4%
    6000n,   // slope2 60%
    8000n,   // kink 80%
    1000n    // reserve 10%
  );
  await irm.waitForDeployment();
  const irmAddr = await irm.getAddress();
  console.log(`        -> ${irmAddr}`);

  // ─── 4. ObscuraCreditFactory ──────────────────────────────────────────────
  console.log("[4/12] ObscuraCreditFactory...");
  const FactoryF = await ethers.getContractFactory("ObscuraCreditFactory");
  // Initial governor = deployer; will hand off to GovernanceProxy at end.
  const factory = await FactoryF.deploy(deployer.address);
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log(`        -> ${factoryAddr}`);

  // Seed approval sets.
  console.log("        seeding approval sets...");
  for (const v of APPROVED_LLTV)     await (await factory.setApprovedLLTV(v, true)).wait();
  for (const v of APPROVED_LIQBONUS) await (await factory.setApprovedLiqBonus(v, true)).wait();
  for (const v of APPROVED_LIQTHRES) await (await factory.setApprovedLiqThreshold(v, true)).wait();
  await (await factory.setApprovedIRM(irmAddr, true)).wait();
  await (await factory.setApprovedOracle(oracleAddr, true)).wait();

  // ─── 5. Markets (cUSDC/cUSDC self-collateral demo) ────────────────────────
  // Single-asset market lets us deploy without a second cToken on testnet.
  console.log("[5/12] Market #1 (cUSDC self-collat, 77% LLTV)...");
  const lltvA = 7700n, bonusA = 500n, thresA = 8500n;
  const tx1 = await factory.createMarket(REINEIRA_cUSDC, REINEIRA_cUSDC, oracleAddr, irmAddr, lltvA, bonusA, thresA);
  const r1 = await tx1.wait();
  const mkAEvent = r1!.logs.find((l: any) => l.fragment?.name === "MarketCreated") as any;
  const marketA = mkAEvent.args[0];
  console.log(`        -> ${marketA}`);

  console.log("[6/12] Market #2 (cUSDC self-collat, 86% LLTV)...");
  const lltvB = 8600n, bonusB = 750n, thresB = 9000n;
  const tx2 = await factory.createMarket(REINEIRA_cUSDC, REINEIRA_cUSDC, oracleAddr, irmAddr, lltvB, bonusB, thresB);
  const r2 = await tx2.wait();
  const mkBEvent = r2!.logs.find((l: any) => l.fragment?.name === "MarketCreated") as any;
  const marketB = mkBEvent.args[0];
  console.log(`        -> ${marketB}`);

  // ─── 7. Vaults (curator = deployer; feeRecipient = Treasury) ──────────────
  console.log("[7/12] Vault Conservative...");
  const VaultF = await ethers.getContractFactory("ObscuraCreditVault");
  const vaultC = await VaultF.deploy(REINEIRA_cUSDC, deployer.address, treasury);
  await vaultC.waitForDeployment();
  const vaultCAddr = await vaultC.getAddress();
  console.log(`        -> ${vaultCAddr}`);
  await (await vaultC.approveMarket(marketA, ethers.parseUnits("100000", 6))).wait();

  console.log("[8/12] Vault Aggressive...");
  const vaultA = await VaultF.deploy(REINEIRA_cUSDC, deployer.address, treasury);
  await vaultA.waitForDeployment();
  const vaultAAddr = await vaultA.getAddress();
  console.log(`        -> ${vaultAAddr}`);
  await (await vaultA.approveMarket(marketA, ethers.parseUnits("50000", 6))).wait();
  await (await vaultA.approveMarket(marketB, ethers.parseUnits("50000", 6))).wait();

  // ─── 9. Auction engine + bind ────────────────────────────────────────────
  console.log("[9/12] ObscuraCreditAuction...");
  const AuctionF = await ethers.getContractFactory("ObscuraCreditAuction");
  const auction = await AuctionF.deploy();
  await auction.waitForDeployment();
  const auctionAddr = await auction.getAddress();
  console.log(`        -> ${auctionAddr}`);
  await (await factory.setMarketAuctionEngine(marketA, auctionAddr)).wait();
  await (await factory.setMarketAuctionEngine(marketB, auctionAddr)).wait();

  // ─── 10. Score ───────────────────────────────────────────────────────────
  console.log("[10/12] ObscuraCreditScore...");
  const ScoreF = await ethers.getContractFactory("ObscuraCreditScore");
  const score = await ScoreF.deploy(payStream || ethers.ZeroAddress, addressBook || ethers.ZeroAddress, voteCtr || ethers.ZeroAddress);
  await score.waitForDeployment();
  const scoreAddr = await score.getAddress();
  console.log(`        -> ${scoreAddr}`);

  // ─── 11. Stream + Insurance hooks; register as repay routers ─────────────
  console.log("[11/12] StreamHook + InsuranceHook...");
  const StreamHookF = await ethers.getContractFactory("ObscuraCreditStreamHook");
  const streamHook = await StreamHookF.deploy(REINEIRA_cUSDC);
  await streamHook.waitForDeployment();
  const streamHookAddr = await streamHook.getAddress();
  const InsHookF = await ethers.getContractFactory("ObscuraCreditInsuranceHook");
  const insHook = await InsHookF.deploy(REINEIRA_cUSDC);
  await insHook.waitForDeployment();
  const insHookAddr = await insHook.getAddress();
  console.log(`        StreamHook -> ${streamHookAddr}`);
  console.log(`        InsHook    -> ${insHookAddr}`);
  await (await factory.setMarketRepayRouter(marketA, streamHookAddr, true)).wait();
  await (await factory.setMarketRepayRouter(marketA, insHookAddr, true)).wait();
  await (await factory.setMarketRepayRouter(marketB, streamHookAddr, true)).wait();
  await (await factory.setMarketRepayRouter(marketB, insHookAddr, true)).wait();

  // ─── 12. GovernanceProxy + handover ──────────────────────────────────────
  console.log("[12/12] GovernanceProxy + handover...");
  const ProxyF = await ethers.getContractFactory("ObscuraCreditGovernanceProxy");
  const proxy = await ProxyF.deploy(treasury, factoryAddr);
  await proxy.waitForDeployment();
  const proxyAddr = await proxy.getAddress();
  console.log(`        -> ${proxyAddr}`);
  // Hand factory governance to proxy so all future approvals flow through Treasury.
  await (await factory.setGovernor(proxyAddr)).wait();
  console.log("        factory.governor -> proxy (treasury-controlled)");

  // ─── Persist + summary ───────────────────────────────────────────────────
  const out = {
    ...prior,
    ObscuraCreditFeedUSDC: feedUsdcAddr,
    ObscuraCreditOracle: oracleAddr,
    ObscuraCreditIRM: irmAddr,
    ObscuraCreditFactory: factoryAddr,
    ObscuraCreditMarket_77: marketA,
    ObscuraCreditMarket_86: marketB,
    ObscuraCreditVault_Conservative: vaultCAddr,
    ObscuraCreditVault_Aggressive: vaultAAddr,
    ObscuraCreditAuction: auctionAddr,
    ObscuraCreditScore: scoreAddr,
    ObscuraCreditStreamHook: streamHookAddr,
    ObscuraCreditInsuranceHook: insHookAddr,
    ObscuraCreditGovernanceProxy: proxyAddr,
    wave4CreditDeployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(deployFile, JSON.stringify(out, null, 2));
  console.log(`\nDeployment file updated: ${deployFile}`);

  // Update frontend .env idempotently.
  const envPath = path.join(__dirname, "..", "..", "frontend", "obscura-os-main", ".env");
  if (fs.existsSync(envPath)) {
    let env = fs.readFileSync(envPath, "utf8");
    const upserts: Record<string, string> = {
      VITE_OBSCURA_CREDIT_FACTORY_ADDRESS: factoryAddr,
      VITE_OBSCURA_CREDIT_ORACLE_ADDRESS: oracleAddr,
      VITE_OBSCURA_CREDIT_IRM_ADDRESS: irmAddr,
      VITE_OBSCURA_CREDIT_MARKET_77_ADDRESS: marketA,
      VITE_OBSCURA_CREDIT_MARKET_86_ADDRESS: marketB,
      VITE_OBSCURA_CREDIT_VAULT_CONSERVATIVE_ADDRESS: vaultCAddr,
      VITE_OBSCURA_CREDIT_VAULT_AGGRESSIVE_ADDRESS: vaultAAddr,
      VITE_OBSCURA_CREDIT_AUCTION_ADDRESS: auctionAddr,
      VITE_OBSCURA_CREDIT_SCORE_ADDRESS: scoreAddr,
      VITE_OBSCURA_CREDIT_STREAM_HOOK_ADDRESS: streamHookAddr,
      VITE_OBSCURA_CREDIT_INSURANCE_HOOK_ADDRESS: insHookAddr,
      VITE_OBSCURA_CREDIT_GOVERNANCE_PROXY_ADDRESS: proxyAddr,
    };
    for (const [k, v] of Object.entries(upserts)) {
      const re = new RegExp(`^${k}=.*$`, "m");
      env = re.test(env) ? env.replace(re, `${k}=${v}`) : env + `\n${k}=${v}`;
    }
    fs.writeFileSync(envPath, env);
    console.log(`Frontend .env updated: ${envPath}`);
  } else {
    console.log(`(skip) no frontend .env at ${envPath}`);
  }

  console.log("\n✓ Wave 4 Credit deployment complete.");
}

main().catch((e) => { console.error(e); process.exit(1); });

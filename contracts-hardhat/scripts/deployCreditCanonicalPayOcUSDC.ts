// Wave 5 Credit P0 - Canonical Pay-backed ocUSDC market deployment.
//
// Deploys one ObscuraCreditMarket using the active Pay ocUSDC wrapper as both
// loan and collateral asset. No new token family is created.
//
// Run:
//   npx hardhat run scripts/deployCreditCanonicalPayOcUSDC.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const LLTV_BPS = 8600n;
const LIQ_BONUS_BPS = 500n;
const LIQ_THRESHOLD_BPS = 9000n;

function requireAddress(dep: Record<string, unknown>, key: string): string {
  const value = dep[key];
  if (typeof value !== "string" || !ethers.isAddress(value)) {
    throw new Error(`Missing deployment address: ${key}`);
  }
  return value;
}

function optionalAddress(dep: Record<string, unknown>, key: string): string | undefined {
  const value = dep[key];
  return typeof value === "string" && ethers.isAddress(value) ? value : undefined;
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network : ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  const deployPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep: Record<string, unknown> = JSON.parse(fs.readFileSync(deployPath, "utf8"));

  const ocusdcPay = requireAddress(dep, "ocUSDC_Pay");
  const oracleAddr = requireAddress(dep, "ObscuraCreditOracle");
  const irmAddr = requireAddress(dep, "ObscuraCreditIRM");
  const auctionAddr = requireAddress(dep, "ObscuraCreditAuction");
  const archive = (dep._archive as Record<string, unknown> | undefined) ?? {};
  const router = optionalAddress(dep, "v316_ObscuraCreditRouter")
    ?? optionalAddress(archive, "v316_ObscuraCreditRouter");
  const scoreAddr = requireAddress(dep, "ObscuraCreditScoreV2");
  const usdcAdapter = requireAddress(dep, "ChainlinkPriceAdapter_USDCUSD");

  if (!router) throw new Error("Missing v316_ObscuraCreditRouter");

  console.log("Anchors:");
  console.log(`  Pay ocUSDC : ${ocusdcPay}`);
  console.log(`  Oracle     : ${oracleAddr}`);
  console.log(`  IRM        : ${irmAddr}`);
  console.log(`  Auction    : ${auctionAddr}`);
  console.log(`  Router     : ${router}`);
  console.log(`  Score V2   : ${scoreAddr}`);
  console.log(`  USDC feed  : ${usdcAdapter}\n`);

  const existing = dep["CreditCanonicalPayOcUSDCMarket"] ?? dep["v5_CanonicalPayOcUSDCMarket"];
  let marketAddr: string;
  let market: any;

  if (typeof existing === "string" && ethers.isAddress(existing)) {
    marketAddr = existing;
    market = await ethers.getContractAt("ObscuraCreditMarket", marketAddr);
    console.log(`[1/5] Reusing existing canonical market: ${marketAddr}`);
  } else {
    console.log("[1/5] Deploying canonical Pay ocUSDC market...");
    const MarketF = await ethers.getContractFactory("ObscuraCreditMarket");
    market = await MarketF.deploy(
      ocusdcPay,
      ocusdcPay,
      oracleAddr,
      irmAddr,
      LLTV_BPS,
      LIQ_BONUS_BPS,
      LIQ_THRESHOLD_BPS,
    );
    await market.waitForDeployment();
    marketAddr = await market.getAddress();
    console.log(`      -> ${marketAddr}`);
  }

  console.log("[2/5] Verifying immutable assets...");
  const [loanAsset, collateralAsset, lltv, liqBonus, liqThreshold] = await Promise.all([
    market.loanAsset(),
    market.collateralAsset(),
    market.lltvBps(),
    market.liqBonusBps(),
    market.liqThresholdBps(),
  ]);
  if (loanAsset.toLowerCase() !== ocusdcPay.toLowerCase()) throw new Error("loanAsset mismatch");
  if (collateralAsset.toLowerCase() !== ocusdcPay.toLowerCase()) throw new Error("collateralAsset mismatch");
  if (lltv !== LLTV_BPS || liqBonus !== LIQ_BONUS_BPS || liqThreshold !== LIQ_THRESHOLD_BPS) {
    throw new Error("risk params mismatch");
  }
  console.log("      assets + risk params ok");

  console.log("[3/5] Wiring market controls...");
  const currentAuction = await market.auctionEngine();
  if (currentAuction.toLowerCase() !== auctionAddr.toLowerCase()) {
    await (await market.setAuctionEngine(auctionAddr)).wait();
    console.log("      auction engine set");
  } else {
    console.log("      auction engine already set");
  }

  const routerOk = await market.isOnBehalfRouter(router);
  if (!routerOk) {
    await (await market.setOnBehalfRouter(router, true)).wait();
    console.log("      router approved");
  } else {
    console.log("      router already approved");
  }

  const currentScore = await market.scoreOracle();
  if (currentScore.toLowerCase() !== scoreAddr.toLowerCase()) {
    await (await market.setScoreOracle(scoreAddr)).wait();
    console.log("      score oracle set");
  } else {
    console.log("      score oracle already set");
  }

  console.log("[4/5] Wiring oracle + score permissions when signer owns them...");
  const oracle = await ethers.getContractAt("ObscuraCreditOracle", oracleAddr);
  const oracleGov = await oracle.governor();
  if (oracleGov.toLowerCase() === deployer.address.toLowerCase()) {
    const currentFeed = await oracle.publicFeed(ocusdcPay);
    if (currentFeed.toLowerCase() !== usdcAdapter.toLowerCase()) {
      await (await oracle.setPublicFeed(ocusdcPay, usdcAdapter)).wait();
      console.log("      oracle feed set for Pay ocUSDC");
    } else {
      console.log("      oracle feed already set for Pay ocUSDC");
    }
  } else {
    console.log(`      oracle governor is ${oracleGov}; feed wiring skipped`);
  }

  const score = await ethers.getContractAt("ObscuraCreditScoreV2", scoreAddr);
  const scoreOwner = await score.owner();
  if (scoreOwner.toLowerCase() === deployer.address.toLowerCase()) {
    const authorized = await score.isAuthorizedMarket(marketAddr);
    if (!authorized) {
      await (await score.setAuthorizedMarket(marketAddr, true)).wait();
      console.log("      score authorized canonical market");
    } else {
      console.log("      score already authorized canonical market");
    }
  } else {
    console.log(`      score owner is ${scoreOwner}; market authorization skipped`);
  }

  console.log("[5/5] Persisting deployment record...");
  dep["CreditCanonicalPayOcUSDCMarket"] = marketAddr;
  dep["v5_CanonicalPayOcUSDCMarket"] = marketAddr;
  dep["wave5CreditCanonicalAssetMigrationAt"] = new Date().toISOString();
  dep["wave5CreditCanonicalAsset"] = {
    loanAsset: ocusdcPay,
    collateralAsset: ocusdcPay,
    lltvBps: LLTV_BPS.toString(),
    liqBonusBps: LIQ_BONUS_BPS.toString(),
    liqThresholdBps: LIQ_THRESHOLD_BPS.toString(),
  };
  fs.writeFileSync(deployPath, JSON.stringify(dep, null, 2));

  console.log("\nCanonical Credit market ready");
  console.log(`  Market: ${marketAddr}`);
  console.log(`  Asset : ${ocusdcPay}`);
  console.log("\nFrontend env:");
  console.log(`VITE_OBSCURA_CREDIT_MARKET_CANONICAL_ADDRESS=${marketAddr}`);
  console.log(`VITE_OBSCURA_CREDIT_CANONICAL_OCUSDC_ADDRESS=${ocusdcPay}`);
  console.log("\nWorker env:");
  console.log(`CREDIT_INDEXER_MARKETS=${marketAddr}`);
  console.log(`KEEPER_MARKETS=${marketAddr}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
// Wave 4 v3.19 — Redeploy ocWETH + ocOBS with current ObscuraConfidentialToken code.
//
// WHY: The original ocWETH / ocOBS (deployed 2026-05-13 via deployCreditTokens.ts)
// used an older ObscuraConfidentialToken that lacked the
// `confidentialTransfer(address, InEuint64)` overload.  The v3.14 ocUSDC was
// deployed from the current code which has all three overloads.  Calling the
// InEuint64 variant on the old addresses causes "execution reverted" — the
// function selector simply didn't exist.  Additionally the old tokens used
// 8 decimals while the frontend always formats with 6.
//
// WHAT THIS DOES:
//   1. Deploys ocWETH2 + ocOBS2 with current ObscuraConfidentialToken (6 dp each)
//   2. Binds oracle price feeds for both new addresses (reusing existing feeds)
//   3. Deploys new M-70-WETH2 market  (ocWETH2/ocUSDC, 70 % LLTV)
//   4. Deploys new M-50-OBS2  market  (ocOBS2 /ocUSDC, 50 % LLTV)
//   5. Wires Router (v3.16) to both new markets
//   6. Saves all addresses to arb-sepolia.json
//
// Run:
//   npx hardhat run scripts/deployWave4v319.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network : ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance : ${ethers.formatEther(bal)} ETH\n`);

  const deployPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep: Record<string, any> = JSON.parse(fs.readFileSync(deployPath, "utf8"));

  // ── Existing anchors ────────────────────────────────────────────────────
  const OCUSDC   = dep["v314_ocUSDC"]            as string;
  const ORACLE   = dep["ObscuraCreditOracle"]     as string;
  const IRM      = dep["ObscuraCreditIRM"]        as string;
  const ROUTER   = dep["v316_ObscuraCreditRouter"] as string;
  const FEED_OBS  = dep["ObscuraCreditFeedOBS"]   as string;
  const FEED_WETH = dep["ObscuraCreditFeedWETH"]  as string;

  for (const [k, v] of Object.entries({ OCUSDC, ORACLE, IRM, ROUTER, FEED_OBS, FEED_WETH })) {
    if (!v) throw new Error(`Missing ${k} in ${network.name}.json`);
  }

  console.log("Anchors:");
  console.log(`  ocUSDC  : ${OCUSDC}`);
  console.log(`  Oracle  : ${ORACLE}`);
  console.log(`  IRM     : ${IRM}`);
  console.log(`  Router  : ${ROUTER}`);
  console.log(`  FeedOBS : ${FEED_OBS}`);
  console.log(`  FeedWETH: ${FEED_WETH}\n`);

  // ── 1. Deploy new ocWETH2 (6 decimals, 2 tokens / 24 h faucet) ─────────
  console.log("[1/5] Deploying ocWETH2 (ObscuraConfidentialToken, 6 dp)...");
  const TokenF = await ethers.getContractFactory("ObscuraConfidentialToken");
  // faucet = 2 * 10^6 = 2,000,000 (2 ocWETH in 6-dp)
  const FAUCET_WETH = 2n * 10n ** 6n;
  const ocWETH2 = await TokenF.deploy("Obscura Wrapped ETHER", "ocWETH", 6, FAUCET_WETH);
  await ocWETH2.waitForDeployment();
  const ocWETH2Addr = await ocWETH2.getAddress();
  console.log(`       ocWETH2 → ${ocWETH2Addr}`);

  // ── 2. Deploy new ocOBS2 (6 decimals, 2 tokens / 24 h faucet) ──────────
  console.log("[2/5] Deploying ocOBS2 (ObscuraConfidentialToken, 6 dp)...");
  // faucet = 2 * 10^6 = 2,000,000 (2 ocOBS in 6-dp)
  const FAUCET_OBS = 2n * 10n ** 6n;
  const ocOBS2 = await TokenF.deploy("Obscura OBS Token", "ocOBS", 6, FAUCET_OBS);
  await ocOBS2.waitForDeployment();
  const ocOBS2Addr = await ocOBS2.getAddress();
  console.log(`       ocOBS2  → ${ocOBS2Addr}`);

  // ── 3. Bind oracle price feeds for new token addresses ──────────────────
  console.log("[3/5] Binding oracle price feeds...");
  const oracle = await ethers.getContractAt("ObscuraCreditOracle", ORACLE);
  const oracleGov = await oracle.governor();
  console.log(`       oracle.governor = ${oracleGov}`);

  if (oracleGov.toLowerCase() === deployer.address.toLowerCase()) {
    const tx1 = await oracle.setPublicFeed(ocWETH2Addr, FEED_WETH);
    await tx1.wait();
    console.log(`       setPublicFeed(ocWETH2, FeedWETH) ✓`);

    const tx2 = await oracle.setPublicFeed(ocOBS2Addr, FEED_OBS);
    await tx2.wait();
    console.log(`       setPublicFeed(ocOBS2, FeedOBS) ✓`);
  } else {
    console.warn("       ! oracle.governor is NOT deployer — skipping setPublicFeed");
    console.warn("         Call oracle.setPublicFeed manually before using new markets.");
  }

  // ── 4. Deploy new markets ────────────────────────────────────────────────
  console.log("[4/5] Deploying new markets...");
  const MarketF = await ethers.getContractFactory("ObscuraCreditMarket");

  // M-70-WETH2: ocWETH2/ocUSDC, 70 % LLTV, 8 % liq bonus, 85 % threshold
  const m70weth2 = await MarketF.deploy(
    OCUSDC,       // loanAsset
    ocWETH2Addr,  // collateralAsset  ← new ocWETH2
    ORACLE,
    IRM,
    7000n,        // lltvBps  70 %
    800n,         // liqBonusBps  8 %
    8500n         // liqThresholdBps  85 %
  );
  await m70weth2.waitForDeployment();
  const m70weth2Addr = await m70weth2.getAddress();
  console.log(`       M-70-WETH2 → ${m70weth2Addr}`);

  // M-50-OBS2: ocOBS2/ocUSDC, 50 % LLTV, 12 % liq bonus, 80 % threshold
  const m50obs2 = await MarketF.deploy(
    OCUSDC,      // loanAsset
    ocOBS2Addr,  // collateralAsset  ← new ocOBS2
    ORACLE,
    IRM,
    5000n,       // lltvBps  50 %
    1200n,       // liqBonusBps  12 %
    8000n        // liqThresholdBps  80 %
  );
  await m50obs2.waitForDeployment();
  const m50obs2Addr = await m50obs2.getAddress();
  console.log(`       M-50-OBS2  → ${m50obs2Addr}`);

  // ── 5. Wire Router to new markets ───────────────────────────────────────
  console.log("[5/5] Wiring Router to new markets...");
  const tx3 = await (m70weth2 as any).setOnBehalfRouter(ROUTER, true);
  await tx3.wait();
  console.log(`       M-70-WETH2.setOnBehalfRouter(Router) ✓`);

  const tx4 = await (m50obs2 as any).setOnBehalfRouter(ROUTER, true);
  await tx4.wait();
  console.log(`       M-50-OBS2.setOnBehalfRouter(Router)  ✓`);

  // ── Persist ──────────────────────────────────────────────────────────────
  dep["v319_ocWETH"]      = ocWETH2Addr;
  dep["v319_ocOBS"]       = ocOBS2Addr;
  dep["v319_M70WETH"]     = m70weth2Addr;
  dep["v319_M50OBS"]      = m50obs2Addr;
  dep["v319_deployedAt"]  = new Date().toISOString();
  fs.writeFileSync(deployPath, JSON.stringify(dep, null, 2));
  console.log("\ndeployments/arb-sepolia.json updated ✓");

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("Wave 4 v3.19 — new ocWETH + ocOBS + markets deployed");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`ocWETH2   (6 dp, faucet 2/24h): ${ocWETH2Addr}`);
  console.log(`ocOBS2    (6 dp, faucet 2/24h): ${ocOBS2Addr}`);
  console.log(`M-70-WETH2 (ocWETH2/ocUSDC):    ${m70weth2Addr}`);
  console.log(`M-50-OBS2  (ocOBS2/ocUSDC):     ${m50obs2Addr}`);
  console.log("");
  console.log("Next: update .env and src/config/credit.ts with the addresses above,");
  console.log("then rebuild the frontend.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

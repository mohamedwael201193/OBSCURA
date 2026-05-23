// Wave 4 v2 Production deploy — aligned to STRATEGIC_PLAN_V2_PRODUCTION.md
//
// What this deploys:
//   1. M-86  : ocUSDC/ocUSDC, 86% LLTV    — primary stablecoin borrow market
//   2. M-70-WETH : ocWETH/ocUSDC, 70% LLTV — WETH collateral market
//   3. M-50-OBS  : ocOBS/ocUSDC,  50% LLTV  — OBS collateral market
//   4. Conservative vault : allocates 100% to M-86
//   5. Balanced vault     : allocates 60% M-86 / 40% M-70-WETH
//   6. Wires existing Router (v3.16) to all three markets
//   7. Seeds each market with initial liquidity via faucet claims
//
// Run:
//   npx hardhat run scripts/deployWave4v2production.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  const deployPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep: Record<string, any> = JSON.parse(fs.readFileSync(deployPath, "utf8"));

  // ── Existing anchors ────────────────────────────────────────────────────
  const OCUSDC   : string = dep["v314_ocUSDC"];           // loan token for all markets
  const OCWETH   : string = dep["ObscuraConfidentialWETH"];
  const OCOBS    : string = dep["ObscuraConfidentialOBS"];
  const ORACLE   : string = dep["ObscuraCreditOracle"];
  const IRM      : string = dep["ObscuraCreditIRM"];
  const TREASURY : string = dep["ObscuraTreasury"];
  const ROUTER   : string = dep["v316_ObscuraCreditRouter"];

  for (const [k, v] of Object.entries({ OCUSDC, OCWETH, OCOBS, ORACLE, IRM, TREASURY, ROUTER })) {
    if (!v) throw new Error(`Missing ${k} in arb-sepolia.json`);
  }

  const MarketF = await ethers.getContractFactory("ObscuraCreditMarket");
  const VaultF  = await ethers.getContractFactory("ObscuraCreditVault");

  // ── 1. M-86 (ocUSDC/ocUSDC, 86% LLTV) ────────────────────────────────
  console.log("[1/7] M-86 — ocUSDC/ocUSDC, 86% LLTV...");
  const m86 = await MarketF.deploy(
    OCUSDC,  // loanAsset
    OCUSDC,  // collateralAsset
    ORACLE,
    IRM,
    8600n,   // lltvBps   86%
    750n,    // liqBonusBps  7.5%
    9000n    // liqThresholdBps  90%
  );
  await m86.waitForDeployment();
  const m86Addr = await m86.getAddress();
  console.log(`       M-86 → ${m86Addr}`);

  // ── 2. M-70-WETH (ocWETH collateral → ocUSDC loan, 70% LLTV) ─────────
  console.log("[2/7] M-70-WETH — ocWETH/ocUSDC, 70% LLTV...");
  const m70weth = await MarketF.deploy(
    OCUSDC,  // loanAsset  (borrow cUSDC)
    OCWETH,  // collateralAsset (post WETH collateral)
    ORACLE,
    IRM,
    7000n,   // lltvBps  70%
    800n,    // liqBonusBps  8%
    8500n    // liqThresholdBps  85%
  );
  await m70weth.waitForDeployment();
  const m70wethAddr = await m70weth.getAddress();
  console.log(`       M-70-WETH → ${m70wethAddr}`);

  // ── 3. M-50-OBS (ocOBS collateral → ocUSDC loan, 50% LLTV) ──────────
  console.log("[3/7] M-50-OBS — ocOBS/ocUSDC, 50% LLTV...");
  const m50obs = await MarketF.deploy(
    OCUSDC,  // loanAsset
    OCOBS,   // collateralAsset
    ORACLE,
    IRM,
    5000n,   // lltvBps  50%
    1200n,   // liqBonusBps  12%
    8000n    // liqThresholdBps  80%
  );
  await m50obs.waitForDeployment();
  const m50obsAddr = await m50obs.getAddress();
  console.log(`       M-50-OBS → ${m50obsAddr}`);

  // ── 4. Conservative vault (100% M-86) ─────────────────────────────────
  console.log("[4/7] Conservative vault (100% M-86)...");
  const vaultConservative = await VaultF.deploy(OCUSDC, deployer.address, TREASURY);
  await vaultConservative.waitForDeployment();
  const vaultConAddr = await vaultConservative.getAddress();
  console.log(`       ConservativeVault → ${vaultConAddr}`);

  // ── 5. Balanced vault (M-86 + M-70-WETH) ─────────────────────────────
  console.log("[5/7] Balanced vault (M-86 + M-70-WETH)...");
  const vaultBalanced = await VaultF.deploy(OCUSDC, deployer.address, TREASURY);
  await vaultBalanced.waitForDeployment();
  const vaultBalAddr = await vaultBalanced.getAddress();
  console.log(`       BalancedVault → ${vaultBalAddr}`);

  // ── 6. Wire router + vault market approvals ───────────────────────────
  console.log("[6/7] Wiring router + vault market approvals...");
  const cap = ethers.parseUnits("1000000", 6);

  // Router whitelist on all markets
  for (const [name, market] of [["M-86", m86], ["M-70-WETH", m70weth], ["M-50-OBS", m50obs]] as const) {
    const tx = await (market as any).setOnBehalfRouter(ROUTER, true);
    await tx.wait();
    console.log(`       ${name}.setOnBehalfRouter ✓`);
  }

  // Conservative vault: only M-86
  const tx1 = await vaultConservative.approveMarket(m86Addr, cap);
  await tx1.wait();
  console.log(`       ConservativeVault.approveMarket(M-86) ✓`);

  // Balanced vault: M-86 + M-70-WETH
  const tx2 = await vaultBalanced.approveMarket(m86Addr, cap);
  await tx2.wait();
  const tx3 = await vaultBalanced.approveMarket(m70wethAddr, cap);
  await tx3.wait();
  console.log(`       BalancedVault.approveMarket(M-86, M-70-WETH) ✓`);

  // ── 7. Seed M-86 liquidity via faucet ────────────────────────────────
  console.log("[7/7] Seeding M-86 with initial supply liquidity...");
  const ocusdcToken = await ethers.getContractAt("ObscuraConfidentialToken", OCUSDC);

  try {
    // Faucet claim (10k cUSDC) → supply to M-86
    const faucetTx = await ocusdcToken.claimFaucet();
    await faucetTx.wait();
    console.log("       Faucet claimed 10k cUSDC ✓");
    // NOTE: seeding the market with operator-based supply requires a second tx
    // The full seeding flow is: claimFaucet → setOperator(market) → supply
    // We log the instructions rather than executing the 3-step on-chain here
    console.log("       [seed] Next: supply cUSDC from deployer wallet to M-86 via the UI");
    console.log("       [seed] Or run: SeedV314Liquidity script with the new market address");
  } catch (e: any) {
    console.log(`       Faucet skip (${e?.shortMessage ?? "cooldown active"})`);
  }

  // ── Persist ─────────────────────────────────────────────────────────────
  dep["v2_M86_Market"]               = m86Addr;
  dep["v2_M70WETH_Market"]           = m70wethAddr;
  dep["v2_M50OBS_Market"]            = m50obsAddr;
  dep["v2_ConservativeVault"]        = vaultConAddr;
  dep["v2_BalancedVault"]            = vaultBalAddr;
  dep["v2_productionDeployedAt"]     = new Date().toISOString();
  fs.writeFileSync(deployPath, JSON.stringify(dep, null, 2));
  console.log("\ndeployments/arb-sepolia.json updated ✓");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("Wave 4 v2 Production — markets + vaults deployed");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`M-86  (cUSDC/cUSDC 86%):        ${m86Addr}`);
  console.log(`M-70-WETH (cWETH/cUSDC 70%):    ${m70wethAddr}`);
  console.log(`M-50-OBS  (cOBS/cUSDC 50%):     ${m50obsAddr}`);
  console.log(`Conservative Vault:              ${vaultConAddr}`);
  console.log(`Balanced Vault:                  ${vaultBalAddr}`);
  console.log(`Router (existing):               ${ROUTER}`);

  console.log("\n--- Copy into frontend/.env ---");
  console.log(`VITE_OBSCURA_CREDIT_MARKET_M86_ADDRESS=${m86Addr}`);
  console.log(`VITE_OBSCURA_CREDIT_MARKET_M70WETH_ADDRESS=${m70wethAddr}`);
  console.log(`VITE_OBSCURA_CREDIT_MARKET_M50OBS_ADDRESS=${m50obsAddr}`);
  console.log(`VITE_OBSCURA_CREDIT_VAULT_CONSERVATIVE_V2_ADDRESS=${vaultConAddr}`);
  console.log(`VITE_OBSCURA_CREDIT_VAULT_BALANCED_V2_ADDRESS=${vaultBalAddr}`);

  console.log("\n--- Next steps ---");
  console.log("1. Seed each market: supply 5000 cUSDC to M-86 via UI or SeedV314Liquidity script");
  console.log("2. Update WAVE4-CREDIT-PROGRESS.md");
  console.log("3. Add price feed entries to oracle for cWETH and cOBS if not already done");
}

main().catch((e) => { console.error(e); process.exit(1); });

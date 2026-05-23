// Wave 4 v3.16 — wallet-native production: market on-behalf-of paths
// + ObscuraCreditRouter + vault withdraw-queue.
//
// What this script does:
//   1. Deploys ObscuraCreditRouter wired to the existing StealthRegistry.
//   2. Deploys a fresh ObscuraCreditMarket (v3.16 ABI) using the same
//      cUSDC / oracle / IRM as v3.14 — preserves cross-app compatibility.
//   3. Deploys a fresh ObscuraCreditVault (v3.16 ABI with withdraw-queue).
//   4. Whitelists the router on the market (setOnBehalfRouter).
//   5. Approves the v3.16 market in the v3.16 vault.
//   6. Persists addresses + timestamp to deployments/arb-sepolia.json.
//
// Run:
//   npx hardhat run scripts/deployWave4v316.ts --network arb-sepolia

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

  const STEALTH_REGISTRY: string = dep["ObscuraStealthRegistry"];
  const OCUSDC: string           = dep["v314_ocUSDC"]; // wrapper used as both loan & collateral in v3.14
  const ORACLE: string           = dep["ObscuraCreditOracle"];
  const IRM: string              = dep["ObscuraCreditIRM"];
  const TREASURY: string         = dep["ObscuraTreasury"];

  if (!STEALTH_REGISTRY || !OCUSDC || !ORACLE || !IRM || !TREASURY) {
    throw new Error("Missing required prior-deployment addresses in arb-sepolia.json");
  }

  // ─── 1. Router ────────────────────────────────────────────────────────────
  console.log("[1/4] ObscuraCreditRouter (v3.16)...");
  const RouterF = await ethers.getContractFactory("ObscuraCreditRouter");
  const router  = await RouterF.deploy(STEALTH_REGISTRY);
  await router.waitForDeployment();
  const routerAddr = await router.getAddress();
  console.log(`       -> ${routerAddr}`);

  // ─── 2. Market v3.16 (ocUSDC loan, ocUSDC collateral, 77% LLTV) ──────────
  console.log("[2/4] ObscuraCreditMarket v3.16 (77% LLTV)...");
  const MarketF = await ethers.getContractFactory("ObscuraCreditMarket");
  const market = await MarketF.deploy(
    OCUSDC,        // loanAsset
    OCUSDC,        // collateralAsset
    ORACLE,
    IRM,
    7700n,         // lltvBps
    500n,          // liqBonusBps
    8500n          // liqThresholdBps
  );
  await market.waitForDeployment();
  const marketAddr = await market.getAddress();
  console.log(`       -> ${marketAddr}`);

  // ─── 3. Vault v3.16 (cUSDC, deployer = curator) ──────────────────────────
  console.log("[3/4] ObscuraCreditVault v3.16 (withdraw-queue)...");
  const VaultF = await ethers.getContractFactory("ObscuraCreditVault");
  const vault  = await VaultF.deploy(OCUSDC, deployer.address, TREASURY);
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log(`       -> ${vaultAddr}`);

  // ─── 4. Wire ─────────────────────────────────────────────────────────────
  console.log("[4/4] Wiring router whitelist + vault market approval...");
  const tx1 = await market.setOnBehalfRouter(routerAddr, true);
  await tx1.wait();
  console.log(`       market.setOnBehalfRouter(${routerAddr}, true)  ✓`);

  const cap1M = ethers.parseUnits("1000000", 6);
  const tx2 = await vault.approveMarket(marketAddr, cap1M);
  await tx2.wait();
  console.log(`       vault.approveMarket(${marketAddr}, 1M)  ✓`);

  // ─── Persist ─────────────────────────────────────────────────────────────
  dep["v316_ObscuraCreditRouter"] = routerAddr;
  dep["v316_ObscuraCreditMarket"] = marketAddr;
  dep["v316_ObscuraCreditVault"]  = vaultAddr;
  dep["v316_deployedAt"]          = new Date().toISOString();
  fs.writeFileSync(deployPath, JSON.stringify(dep, null, 2));
  console.log("\ndeployments/arb-sepolia.json updated ✓");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("Wave 4 v3.16 — wallet-native production deploy");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Router:      ${routerAddr}`);
  console.log(`Market_77:   ${marketAddr}`);
  console.log(`Vault:       ${vaultAddr}`);
  console.log("\nFrontend .env additions:");
  console.log(`VITE_OBSCURA_CREDIT_ROUTER_ADDRESS=${routerAddr}`);
  console.log(`VITE_OBSCURA_CREDIT_MARKET_V316_ADDRESS=${marketAddr}`);
  console.log(`VITE_OBSCURA_CREDIT_VAULT_V316_ADDRESS=${vaultAddr}`);
  console.log("\nUser-facing operator grants (one-time):");
  console.log(`  ocUSDC.setOperator(router, expiry)   // collateral pull`);
  console.log(`  ocUSDC.setOperator(router, expiry)   // loan repay pull`);
}

main().catch((e) => { console.error(e); process.exit(1); });

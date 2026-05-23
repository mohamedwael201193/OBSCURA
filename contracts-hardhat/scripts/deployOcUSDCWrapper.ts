/**
 * deployOcUSDCWrapper.ts
 *
 * Deploys a NEW ObscuraConfidentialToken (v3.15) configured as a
 * WRAPPER for Circle USDC on Arbitrum Sepolia.
 *
 * Why: The existing ocUSDC at 0xf963fD86... is a pre-v3.15 faucet-only
 * contract that lacks setUnderlying() / guardian() — it cannot be switched
 * to wrapper mode.  We deploy a fresh v3.15 token and call setUnderlying()
 * immediately so that shield() / unshield() work from the first block.
 *
 * Run:
 *   npx hardhat run scripts/deployOcUSDCWrapper.ts --network arb-sepolia
 *
 * After the script prints the new address, update:
 *   frontend/.env  →  VITE_OBSCURA_CONFIDENTIAL_USDC_ADDRESS=<new address>
 */

import { ethers, network } from "hardhat";
import * as fs   from "fs";
import * as path from "path";

// Circle USDC on Arbitrum Sepolia (official)
const USDC_ARB_SEPOLIA = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d";

// Token params — same display values as the old faucet token
const TOKEN_NAME    = "Obscura Confidential USDC";
const TOKEN_SYMBOL  = "ocUSDC";
const TOKEN_DEC     = 6;
// Keep a small faucet drip (1 000 USDC) so testnet users who don't have
// Circle faucet funds can still explore the credit market via claimFaucet().
const FAUCET_AMOUNT = 1_000n * 1_000_000n; // 1 000 USDC (base units)

async function main() {
  const [deployer] = await ethers.getSigners();
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Network : ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance : ${ethers.formatEther(bal)} ETH\n`);

  // ── 1. Deploy ────────────────────────────────────────────────────────
  console.log("[1/3] Deploying ObscuraConfidentialToken v3.15 (ocUSDC-wrapper)...");
  const TokenF = await ethers.getContractFactory("ObscuraConfidentialToken");
  const token  = await TokenF.deploy(TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DEC, FAUCET_AMOUNT);
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log(`  -> ocUSDC (wrapper): ${tokenAddr}`);

  // ── 2. Set underlying → switch to wrapper mode ───────────────────────
  console.log(`[2/3] Calling setUnderlying(${USDC_ARB_SEPOLIA})...`);
  const tx = await token.setUnderlying(USDC_ARB_SEPOLIA);
  console.log(`  tx: ${tx.hash}`);
  await tx.wait();
  console.log("  confirmed ✓");

  // Verify
  const ul = await token.underlying();
  if (ul.toLowerCase() !== USDC_ARB_SEPOLIA.toLowerCase()) {
    console.error("❌ underlying did not set correctly — aborting!");
    process.exit(1);
  }
  console.log("  underlying verified ✓\n");

  // ── 3. Persist address ───────────────────────────────────────────────
  console.log("[3/3] Writing address to deployments/arb-sepolia.json...");
  const depPath = path.join(__dirname, "..", "deployments", "arb-sepolia.json");
  const dep     = JSON.parse(fs.readFileSync(depPath, "utf8"));
  dep["ObscuraConfidentialUSDCWrapper"] = tokenAddr;
  fs.writeFileSync(depPath, JSON.stringify(dep, null, 2));
  console.log("  saved ✓\n");

  // ── Summary ──────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════════");
  console.log("✅ ocUSDC WRAPPER deployed & configured");
  console.log(`   Address   : ${tokenAddr}`);
  console.log(`   Underlying: ${ul}  (Circle USDC)`);
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("NEXT STEPS:");
  console.log("1) Update frontend/.env:");
  console.log(`   VITE_OBSCURA_CONFIDENTIAL_USDC_ADDRESS=${tokenAddr}`);
  console.log("2) Rebuild the frontend:");
  console.log("   cd frontend/obscura-os-main && npm run build");
  console.log("3) To Shield: approve USDC to the new address, then call shield(amount).");
  console.log("4) The old faucet token (0xf963fD86...) still works for claimFaucet()");
  console.log("   but cannot shield/unshield — keep it as VITE_LEGACY_FAUCET_USDC if needed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

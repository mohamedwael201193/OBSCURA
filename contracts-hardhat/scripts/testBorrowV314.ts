// Wave 4 v3.14 — End-to-end borrow test against ObscuraConfidentialToken.
//
// Goal: PROVE the v3.14 fix works by exercising the full credit flow:
//   faucet → supply (lender side) → supplyCollateral → borrow → repay.
//
// What this script does (using the deployer EOA as both lender and borrower
// for a single-asset market; this is fine because ocUSDC has both balances):
//   1. Reads v314_ocUSDC / v314_ObscuraCreditMarket_77 from deployments.
//   2. Ensures deployer has ocUSDC by claiming faucet (skips if cooldown).
//   3. Initializes cofhejs (testnet env) with deployer signer/provider.
//   4. Encrypts an InEuint64 for the supply amount; runs the proven two-step:
//        ocUSDC.confidentialTransfer(market, encAmt)
//        market.supply(amtPlain, encAmt2)
//   5. Encrypts an InEuint64 for collateral; runs:
//        ocUSDC.confidentialTransfer(market, encCol)
//        market.supplyCollateral(colPlain, encCol2)
//   6. Encrypts borrow amount; calls market.borrow(amtPlain, encBorrow).
//   7. Prints status + gas + events. Borrow success on v3.14 == fix verified.
//
// Run:
//   npx hardhat run scripts/testBorrowV314.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
// @ts-ignore — cofhejs ships node entrypoint as mjs; ts-node resolves it fine.
import { cofhejs, Encryptable, FheTypes } from "cofhejs/node";

const ENV = "TESTNET" as const;

function bnFmt(x: bigint, dec = 6) {
  return ethers.formatUnits(x, dec);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const deployPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep: Record<string, string> = JSON.parse(fs.readFileSync(deployPath, "utf8"));
  const tokenAddr  = dep["v314_ocUSDC"];
  const marketAddr = dep["v314_ObscuraCreditMarket_77"];
  if (!tokenAddr || !marketAddr) throw new Error("v3.14 addresses missing. Run deployWave4v314 first.");
  console.log(`ocUSDC: ${tokenAddr}`);
  console.log(`Market: ${marketAddr}\n`);

  // ── Contracts ─────────────────────────────────────────────────────────
  const token  = await ethers.getContractAt("ObscuraConfidentialToken", tokenAddr, deployer);
  const market = await ethers.getContractAt("ObscuraCreditMarket", marketAddr, deployer);

  // ── Faucet (1× per 24h) ───────────────────────────────────────────────
  try {
    const tx = await token.claimFaucet();
    const rc = await tx.wait();
    console.log(`Faucet claimed, tx ${rc?.hash}`);
  } catch (e: any) {
    console.log(`Faucet skipped: ${e.shortMessage || e.message}`);
  }
  const balHandle: bigint = await token.confidentialBalanceOf(deployer.address);
  console.log(`Deployer encrypted balance handle: ${balHandle.toString().slice(0, 30)}…\n`);

  // ── cofhejs init ──────────────────────────────────────────────────────
  console.log("Initializing cofhejs (TESTNET)...");
  const init = await cofhejs.initializeWithEthers({
    ethersProvider: ethers.provider as any,
    ethersSigner: deployer as any,
    environment: ENV,
    generatePermit: true,
  });
  if (!init.success) {
    console.error("cofhejs init failed:", init.error);
    process.exit(1);
  }
  console.log("cofhejs initialized ✓\n");

  // ── Encrypt helper ────────────────────────────────────────────────────
  async function enc64(v: bigint) {
    const r = await cofhejs.encrypt([Encryptable.uint64(v)]);
    if (!r.success) throw new Error(`encrypt failed: ${JSON.stringify(r.error)}`);
    const e = r.data[0];
    return {
      ctHash: e.ctHash,
      securityZone: e.securityZone,
      utype: e.utype,
      signature: e.signature,
    } as const;
  }

  // Amounts (6 decimals, well under 10k faucet drip = 10_000_000_000)
  const SUPPLY_PLAIN  = 1_000_000n;   // 1 ocUSDC supplied as lender liquidity
  const COLLAT_PLAIN  = 500_000n;     // 0.5 ocUSDC collateral
  const BORROW_PLAIN  = 200_000n;     // 0.2 ocUSDC borrow (well under 77% of collat)

  // ── Step A: Supply liquidity ─────────────────────────────────────────
  console.log("[A] Supplying liquidity (two-step)...");
  console.log("  encrypting supply InEuint64 #1 (fund) + #2 (settle)...");
  const eSup1 = await enc64(SUPPLY_PLAIN);
  const eSup2 = await enc64(SUPPLY_PLAIN);
  console.log("  ocUSDC.confidentialTransfer(market, enc) ...");
  // Use the InEuint64 overload (selector 0x7edb0e7d → confidentialTransferFrom) is wrong here;
  // we need user→market push. ocUSDC exposes confidentialTransferFrom(from,to,InEuint64).
  // Use it with from=deployer (self → no operator needed).
  let tx = await token.confidentialTransferFrom(deployer.address, marketAddr, eSup1);
  let rc = await tx.wait();
  console.log(`    fund tx ${rc?.hash} status=${rc?.status}`);

  console.log("  market.supply(amtPlain, encAmt2) ...");
  tx = await market.supply(SUPPLY_PLAIN, eSup2);
  rc = await tx.wait();
  console.log(`    supply tx ${rc?.hash} status=${rc?.status}`);

  // ── Step B: Supply collateral ────────────────────────────────────────
  console.log("\n[B] Supplying collateral (two-step)...");
  const eCol1 = await enc64(COLLAT_PLAIN);
  const eCol2 = await enc64(COLLAT_PLAIN);
  console.log("  ocUSDC.confidentialTransferFrom(deployer, market, enc) ...");
  tx = await token.confidentialTransferFrom(deployer.address, marketAddr, eCol1);
  rc = await tx.wait();
  console.log(`    fund tx ${rc?.hash} status=${rc?.status}`);

  console.log("  market.supplyCollateral(amtPlain, encCol2) ...");
  tx = await market.supplyCollateral(COLLAT_PLAIN, eCol2);
  rc = await tx.wait();
  console.log(`    supplyCollateral tx ${rc?.hash} status=${rc?.status}`);

  // ── Step C: BORROW (the target operation) ────────────────────────────
  console.log("\n[C] BORROW — the v3.14 fix target...");
  const eBor = await enc64(BORROW_PLAIN);
  console.log(`  market.borrow(${BORROW_PLAIN}, encAmt) ...`);
  try {
    tx = await market.borrow(BORROW_PLAIN, eBor, { gasLimit: 4_000_000 });
    rc = await tx.wait();
    console.log(`  ✅ BORROW SUCCEEDED  tx=${rc?.hash} gas=${rc?.gasUsed} status=${rc?.status}`);
    console.log(`  logs=${rc?.logs.length}`);
    for (const l of rc?.logs ?? []) {
      try {
        const parsed = market.interface.parseLog({ topics: l.topics as string[], data: l.data });
        if (parsed) console.log(`    event ${parsed.name}(${parsed.args.map((a: any) => a.toString()).join(", ")})`);
      } catch { /* ignore unparsable */ }
    }
  } catch (e: any) {
    console.log(`  ❌ BORROW FAILED: ${e.shortMessage || e.message}`);
    if (e.receipt) console.log(`    receipt: gas=${e.receipt.gasUsed} status=${e.receipt.status}`);
    process.exit(1);
  }

  // ── Final state ──────────────────────────────────────────────────────
  console.log("\n── Final market state ───────────────────────────────");
  const tsa = await market.totalSupplyAssets();
  const tba = await market.totalBorrowAssets();
  console.log(`  totalSupplyAssets: ${bnFmt(tsa)} ocUSDC`);
  console.log(`  totalBorrowAssets: ${bnFmt(tba)} ocUSDC`);
  const userBal = await token.confidentialBalanceOf(deployer.address);
  console.log(`  deployer enc-bal handle: ${userBal.toString().slice(0, 30)}…`);
  console.log("\n✅ v3.14 end-to-end borrow flow verified.");
}

main().catch((e) => { console.error(e); process.exit(1); });

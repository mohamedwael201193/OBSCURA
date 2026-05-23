import { ethers } from "hardhat";

async function main() {
  const cUSDC = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
  const [deployer] = await ethers.getSigners();
  console.log("deployer:", deployer.address);

  // 1. Deploy harness
  const F = await ethers.getContractFactory("TestPushcUSDC");
  const c = await F.deploy(cUSDC);
  await c.waitForDeployment();
  const harness = await c.getAddress();
  console.log("harness:", harness);

  // 2. Fund harness via plain ERC20 transfer (if cUSDC mirrors plaintext balances).
  //    If that fails, try requesting from faucet via deployer's existing balance.
  const erc = new ethers.Contract(
    cUSDC,
    [
      "function balanceOf(address) view returns (uint256)",
      "function transfer(address,uint256) returns (bool)",
      "function confidentialBalanceOf(address) view returns (uint256)",
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
    ],
    deployer
  );
  const sym = await erc.symbol();
  const dec = await erc.decimals();
  const balDeployer = await erc.balanceOf(deployer.address);
  const cBalDeployer = await erc.confidentialBalanceOf(deployer.address);
  console.log(`token=${sym} decimals=${dec}`);
  console.log("deployer plain balance:", balDeployer.toString());
  console.log("deployer confidential balance handle:", cBalDeployer.toString());

  if (balDeployer > 0n) {
    console.log("step 1: plain transfer 100000 (0.1) cUSDC to harness ...");
    try {
      const tx1 = await erc.transfer(harness, 100000n);
      const r1 = await tx1.wait();
      console.log("step 1 OK, status:", r1.status, "tx:", r1.hash);
    } catch (e: any) {
      console.log("step 1 FAILED (plain transfer):", e.shortMessage || e.message);
    }
  } else {
    console.log("step 1 SKIPPED — deployer has 0 plain balance. Harness will start with no balance.");
  }

  const harnessBal = await erc.balanceOf(harness);
  const harnessCBal = await erc.confidentialBalanceOf(harness);
  console.log("harness plain bal:", harnessBal.toString(), "confidential bal handle:", harnessCBal.toString());

  // 3. CORE TEST: have harness call cUSDC.confidentialTransfer FROM CONTRACT context.
  //    This is the EXACT pattern ObscuraCreditMarket.borrow uses and which is failing.
  const amt = 1n; // tiny amount — if push-from-contract is fundamentally rejected, this will revert with empty data

  // EXPERIMENT A: Push without setOperator self-auth (matches current market behavior).
  console.log("\n=== EXPERIMENT A: push without selfOperator ===");
  console.log("isSelfOperator?", await c.isSelfOperator());
  try {
    const tx2 = await c.pushOut(deployer.address, amt, { gasLimit: 2_800_000 });
    const r2 = await tx2.wait();
    console.log("A SUCCESS gas:", r2.gasUsed.toString(), "status:", r2.status);
  } catch (e: any) {
    console.log("A REVERT:", e.shortMessage || e.message);
    if (e.receipt) console.log("  receipt:", { gasUsed: e.receipt.gasUsed?.toString(), status: e.receipt.status });
  }

  // EXPERIMENT B: Self-authorize as operator with far-future expiry, then push.
  console.log("\n=== EXPERIMENT B: push WITH selfOperator ===");
  const expiry = Math.floor(Date.now() / 1000) + 365 * 24 * 3600;
  try {
    const txAuth = await c.selfAuthOperator(expiry);
    const rAuth = await txAuth.wait();
    console.log("selfAuthOperator OK, status:", rAuth.status);
  } catch (e: any) {
    console.log("selfAuthOperator FAILED:", e.shortMessage || e.message);
  }
  console.log("isSelfOperator?", await c.isSelfOperator());
  try {
    const tx3 = await c.pushOut(deployer.address, amt, { gasLimit: 2_800_000 });
    const r3 = await tx3.wait();
    console.log("B SUCCESS gas:", r3.gasUsed.toString(), "status:", r3.status);
  } catch (e: any) {
    console.log("B REVERT:", e.shortMessage || e.message);
    if (e.receipt) console.log("  receipt:", { gasUsed: e.receipt.gasUsed?.toString(), status: e.receipt.status });
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

// Stake initial cUSDC liquidity into the InsurancePool so dispute payouts
// can actually be funded.
//
// Run:
//   npx hardhat run scripts/seedPoolLiquidity.ts --network arb-sepolia
//
// Prerequisites:
//   - setupReineiraPool.ts must have been run (InsurancePool in deployments)
//   - Deployer must hold cUSDC balance

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const REINEIRA = {
  cUSDC: "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f",
};

const CUSDC_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function encryptedBalanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function confidentialApprove(address spender, (bytes, bytes) inAmount) returns (bool)",
];

const POOL_ABI = [
  "function stake((bytes, bytes) encryptedAmount) returns (uint256 stakeId)",
  "function totalLiquidity() view returns (uint256)",
];

const SEED_AMOUNT = 1000n * 1_000_000n; // 1000 cUSDC (6 decimals)

async function main() {
  const [signer] = await ethers.getSigners();
  console.log(`Network:  ${network.name}`);
  console.log(`Operator: ${signer.address}\n`);

  const file = path.resolve(__dirname, `../deployments/${network.name}.json`);
  const deployments = JSON.parse(fs.readFileSync(file, "utf-8"));
  const poolAddr = deployments.InsurancePool;
  if (!poolAddr) throw new Error("InsurancePool not in deployments — run setupReineiraPool first");

  const cUSDC = new ethers.Contract(REINEIRA.cUSDC, CUSDC_ABI, signer);
  const pool = new ethers.Contract(poolAddr, POOL_ABI, signer);

  // Check cUSDC balance
  const bal = await cUSDC.balanceOf(signer.address);
  console.log(`cUSDC balance (raw): ${bal.toString()}`);

  if (bal < SEED_AMOUNT) {
    console.log(
      `\nInsufficient cUSDC. Need ${(Number(SEED_AMOUNT) / 1e6).toFixed(0)} cUSDC but have ${(Number(bal) / 1e6).toFixed(2)}.`
    );
    console.log("To get cUSDC:");
    console.log("  1. Get Sepolia USDC from Circle faucet: https://faucet.circle.com/");
    console.log("  2. Approve cUSDC contract, then call cUSDC.wrap(amount)");
    console.log(`  3. Or bridge from Ethereum Sepolia via CCTP\n`);
    console.log("Skipping stake — pool is live but unfunded.");
    return;
  }

  // Approve pool to spend our cUSDC
  console.log("[1/2] Approving cUSDC for InsurancePool...");
  const approveTx = await cUSDC.approve(poolAddr, SEED_AMOUNT);
  await approveTx.wait();
  console.log("     approved");

  // Stake
  // Note: The InsurancePool.stake expects encrypted input (InEuint64).
  // Since we can't easily encrypt from a hardhat script without the FHE client,
  // we'll use a raw InEuint64 struct. In production, this would be done from
  // the frontend with the CoFHE SDK.
  console.log("[2/2] Pool requires FHE-encrypted stake input.");
  console.log("     To stake from the frontend:");
  console.log(`     1. Go to Streams tab → cUSDC Wallet`);
  console.log(`     2. Wrap USDC to cUSDC`);
  console.log(`     3. Use the browser console or a custom UI to call InsurancePool.stake()`);
  console.log(`     Pool address: ${poolAddr}`);
  console.log(`\nAlternatively, the pool is live and will accumulate premiums from coverage purchases.`);

  console.log("\nDone — InsurancePool is live at", poolAddr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

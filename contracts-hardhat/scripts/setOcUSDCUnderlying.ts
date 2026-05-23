/**
 * setOcUSDCUnderlying.ts
 *
 * One-time guardian call: switch ocUSDC from faucet mode → wrapper mode.
 *
 * Run ONCE as the guardian (deployer) account:
 *   npx hardhat run scripts/setOcUSDCUnderlying.ts --network arb-sepolia
 */

import { ethers, network } from "hardhat";

// ── Addresses ─────────────────────────────────────────────────────────────
const OCUSDC_ADDRESS   = "0xf963fD86348813786ed57b8b2778A365C6226E43";
const USDC_ARB_SEPOLIA = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"; // Circle USDC

const SET_UNDERLYING_SIG = "setUnderlying(address)";
const UNDERLYING_SIG     = "underlying()";

async function safeCall(publicClient: any, to: string, data: string): Promise<string | null> {
  try {
    return await publicClient.call({ to, data });
  } catch {
    return null;
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network : ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance : ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  const iface = new ethers.Interface([
    "function underlying() external view returns (address)",
    "function underlyingLocked() external view returns (bool)",
    "function guardian() external view returns (address)",
    "function setUnderlying(address u) external",
  ]);

  // Try reading underlying() via raw provider (eth_call)
  let currentUnderlying: string | null = null;
  try {
    const raw = await deployer.provider!.call({
      to: OCUSDC_ADDRESS,
      data: iface.encodeFunctionData("underlying"),
    });
    if (raw && raw !== "0x") {
      const decoded = iface.decodeFunctionResult("underlying", raw);
      currentUnderlying = decoded[0] as string;
    }
  } catch (e: any) {
    console.log(`  underlying() call failed: ${e.message}`);
  }

  console.log(`ocUSDC contract  : ${OCUSDC_ADDRESS}`);
  console.log(`underlying (now) : ${currentUnderlying ?? "UNREADABLE (may be faucet-mode v3.14)"}`);

  if (currentUnderlying && currentUnderlying.toLowerCase() === USDC_ARB_SEPOLIA.toLowerCase()) {
    console.log("\n✅ underlying already set to Circle USDC — no tx needed!");
    console.log("   Shield / Unshield should work. If transactions still fail,");
    console.log("   verify the deployer approved USDC → ocUSDC before shielding.");
    return;
  }

  // Attempt setUnderlying — if contract is pre-guardian it will revert with a
  // useful message; if the signer is not guardian it will revert NotAuthorized.
  console.log(`\nAttempting setUnderlying(${USDC_ARB_SEPOLIA})...`);
  try {
    const tx = await deployer.sendTransaction({
      to: OCUSDC_ADDRESS,
      data: iface.encodeFunctionData("setUnderlying", [USDC_ARB_SEPOLIA]),
    });
    console.log(`  tx hash: ${tx.hash}`);
    console.log("  waiting for confirmation...");
    const receipt = await tx.wait();
    if (receipt!.status === 1) {
      console.log("\n✅ setUnderlying confirmed! ocUSDC is now in WRAPPER MODE.");
      console.log("   Shield / Unshield now work with Circle USDC.");
    } else {
      console.log("\n❌ Transaction mined but status=0 (reverted)");
    }
  } catch (e: any) {
    const msg: string = e.message ?? String(e);
    if (msg.includes("AlreadyLocked")) {
      console.log("⚠️  underlyingLocked=true — cannot change. Already in wrapper mode.");
    } else if (msg.includes("NotAuthorized")) {
      console.log("❌ Not the guardian. Re-run with the deployer private key.");
    } else if (msg.includes("FaucetModeOnly") || msg.includes("WrapperOnly")) {
      console.log("⚠️  Contract is already in the expected mode.");
    } else if (msg.includes("setUnderlying") || msg.includes("execution reverted")) {
      // The function selector doesn't exist — pre-guardian version deployed.
      // Need to deploy a new ocUSDC with wrapper mode support.
      console.log("\n❌ setUnderlying() not found on deployed contract.");
      console.log("   The deployed ocUSDC is a pre-v3.15 faucet-only token.");
      console.log("   SOLUTION: Run  npx hardhat run scripts/deployOcUSDCWrapper.ts --network arb-sepolia");
      console.log("   Then update VITE_OBSCURA_CONFIDENTIAL_USDC_ADDRESS in frontend/.env");
    } else {
      console.error("❌ Unexpected error:", msg);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

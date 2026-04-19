// Operator one-time setup: register the ObscuraPayrollUnderwriter policy in
// the Reineira PolicyRegistry, create our own InsurancePool via PoolFactory,
// and whitelist the policy on the new pool.
//
// Run AFTER deployWave2Pay.ts:
//   npx hardhat run scripts/setupReineiraPool.ts --network arb-sepolia
//
// Outputs the InsurancePool address and writes it to deployments/arb-sepolia.json
// under "InsurancePool". Add the same value to frontend/.env as
// VITE_REINEIRA_INSURANCE_POOL_ADDRESS=0x…

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const REINEIRA = {
  cUSDC: "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f",
  PoolFactory: "0x03bAc36d45fA6f5aD8661b95D73452b3BedcaBFD",
  PolicyRegistry: "0xf421363B642315BD3555dE2d9BD566b7f9213c8E",
};

const POLICY_REGISTRY_ABI = [
  "function registerPolicy(address policy) external returns (uint256 policyId)",
  "function isPolicy(address policy) external view returns (bool)",
];
const POOL_FACTORY_ABI = [
  "function createPool(address cUSDC) external returns (uint256 poolId, address pool)",
  "function isPool(address pool) external view returns (bool)",
  "event PoolCreated(uint256 indexed poolId, address indexed pool, address indexed underwriter, address cUSDC)",
];
const POOL_ABI = [
  "function addPolicy(address policy) external",
  "function isPolicy(address policy) external view returns (bool)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log(`Network: ${network.name}`);
  console.log(`Operator: ${signer.address}\n`);

  // Load deployments
  const file = path.resolve(
    __dirname,
    `../deployments/${network.name}.json`
  );
  if (!fs.existsSync(file)) {
    throw new Error(`Run deployWave2Pay.ts first — missing ${file}`);
  }
  const deployments = JSON.parse(fs.readFileSync(file, "utf-8"));
  const uw: string = deployments.ObscuraPayrollUnderwriter;
  if (!uw) throw new Error("ObscuraPayrollUnderwriter missing in deployments");
  console.log(`Policy:  ${uw}`);

  const policyReg = new ethers.Contract(
    REINEIRA.PolicyRegistry,
    POLICY_REGISTRY_ABI,
    signer
  );
  const poolFactory = new ethers.Contract(
    REINEIRA.PoolFactory,
    POOL_FACTORY_ABI,
    signer
  );

  // ─── 1. Register the underwriter policy (idempotent) ─────────────────────
  console.log("[1/3] PolicyRegistry.registerPolicy(uw)...");
  if (await policyReg.isPolicy(uw)) {
    console.log("     already registered, skipping");
  } else {
    const tx = await policyReg.registerPolicy(uw);
    const r = await tx.wait();
    console.log(`     ok (tx ${r?.hash})`);
  }

  // ─── 2. Create our InsurancePool (cUSDC-backed) ──────────────────────────
  let poolAddr: string | undefined = deployments.InsurancePool;
  if (poolAddr && (await poolFactory.isPool(poolAddr))) {
    console.log(`[2/3] InsurancePool already exists -> ${poolAddr}`);
  } else {
    console.log("[2/3] PoolFactory.createPool(cUSDC)...");
    const tx = await poolFactory.createPool(REINEIRA.cUSDC);
    const r = await tx.wait();
    console.log(`     tx ${r?.hash}  (${r?.logs?.length ?? 0} logs)`);

    // Try parsing PoolCreated from factory interface
    let ev: any = null;
    for (const log of r?.logs ?? []) {
      try {
        const parsed = poolFactory.interface.parseLog(log);
        if (parsed && parsed.name === "PoolCreated") {
          ev = parsed;
          break;
        }
      } catch {
        /* not our event */
      }
    }

    if (ev) {
      poolAddr = ev.args.pool as string;
    } else {
      // Fallback: the factory likely emits an Upgraded or similar event
      // from the proxy; look for any address-typed topic that is a new contract
      console.log("     PoolCreated not matched — scanning raw logs for new pool address...");
      for (const log of r?.logs ?? []) {
        console.log(`       log from ${log.address}  topics=${log.topics?.length}`);
        // The proxy deploy typically emits from the new pool address
        // Check if any log.address is a valid pool
        if (log.address.toLowerCase() !== REINEIRA.PoolFactory.toLowerCase() &&
            log.address.toLowerCase() !== REINEIRA.cUSDC.toLowerCase()) {
          const maybePool = log.address;
          try {
            const isPool = await poolFactory.isPool(maybePool);
            if (isPool) {
              poolAddr = maybePool;
              console.log(`     found pool via log.address: ${poolAddr}`);
              break;
            }
          } catch { /* not a pool */ }
        }
      }

      if (!poolAddr) {
        // Last resort: check indexed topics for address-like values
        for (const log of r?.logs ?? []) {
          for (const topic of (log.topics ?? []).slice(1)) {
            const addr = "0x" + topic.slice(26);
            if (addr.toLowerCase() !== signer.address.toLowerCase() &&
                addr.toLowerCase() !== REINEIRA.cUSDC.toLowerCase() &&
                addr.toLowerCase() !== REINEIRA.PoolFactory.toLowerCase()) {
              try {
                const isPool = await poolFactory.isPool(addr);
                if (isPool) {
                  poolAddr = ethers.getAddress(addr);
                  console.log(`     found pool via topic: ${poolAddr}`);
                  break;
                }
              } catch { /* skip */ }
            }
          }
          if (poolAddr) break;
        }
      }

      if (!poolAddr) {
        throw new Error("Could not find pool address in tx logs — check tx on explorer: " + r?.hash);
      }
    }
    console.log(`     ok -> ${poolAddr}`);
  }

  // ─── 3. Whitelist policy on the pool ─────────────────────────────────────
  const pool = new ethers.Contract(poolAddr!, POOL_ABI, signer);
  console.log("[3/3] InsurancePool.addPolicy(uw)...");
  if (await pool.isPolicy(uw)) {
    console.log("     already whitelisted, skipping");
  } else {
    const tx = await pool.addPolicy(uw);
    const r = await tx.wait();
    console.log(`     ok (tx ${r?.hash})`);
  }

  // ─── Persist ─────────────────────────────────────────────────────────────
  deployments.InsurancePool = poolAddr;
  fs.writeFileSync(file, JSON.stringify(deployments, null, 2));
  console.log(`\nSaved InsurancePool to ${file}`);
  console.log("\nAdd to frontend/.env:");
  console.log(`  VITE_REINEIRA_INSURANCE_POOL_ADDRESS=${poolAddr}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

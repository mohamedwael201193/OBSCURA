/**
 * Wave 5 Phase 4 + Phase 5 — deploy governance stack
 *
 *  - TimelockController (2-day delay)
 *  - ObscuraGovernor   (wraps ObscuraVote V5 voterParticipation as power)
 *  - ObscuraTreasuryStreamer (controlled by the Timelock)
 *
 * Run:
 *   npx hardhat run scripts/deployWave5Phase4And5.ts --network arb-sepolia
 */
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const DEPLOYMENTS = path.join(__dirname, "..", "deployments", "arb-sepolia.json");

async function main() {
    const [signer] = await ethers.getSigners();
    console.log("deployer:", signer.address);

    const deployed = JSON.parse(fs.readFileSync(DEPLOYMENTS, "utf8"));
    const voteAddr = deployed.ObscuraVoteV5 || deployed.ObscuraVote || "0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730";
    const payStreamAddr = deployed.ObscuraPayStreamV2 || "0xb2fF39C496131d4AFd01d189569aF6FEBaC54d2C";
    console.log("vote source     :", voteAddr);
    console.log("paystream v2    :", payStreamAddr);

    // 1) Timelock — deployer is initially the only proposer/executor for boot,
    //    Governor is added as proposer in step 3, deployer renounces admin.
    const TL_DELAY = 2 * 24 * 3600;
    const Timelock = await ethers.getContractFactory("TimelockController");
    const timelock = await Timelock.deploy(
        TL_DELAY,
        [signer.address],          // proposers (will add Governor next)
        [ethers.ZeroAddress],      // executors (open execution)
        signer.address             // admin (temporary)
    );
    await timelock.waitForDeployment();
    const timelockAddr = await timelock.getAddress();
    console.log("Timelock        :", timelockAddr);

    // 2) Governor
    const Governor = await ethers.getContractFactory("ObscuraGovernor");
    const governor = await Governor.deploy(
        voteAddr,
        timelockAddr,
        1,        // votingDelay blocks (~0.25s on Arb)
        50_400,   // votingPeriod blocks (~3 days)
        1,        // proposalThreshold — must have at least 1 voterParticipation
        3         // quorumVotes — start tiny for bootstrapping
    );
    await governor.waitForDeployment();
    const governorAddr = await governor.getAddress();
    console.log("Governor        :", governorAddr);

    // 3) Wire Governor into Timelock and renounce admin
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();
    const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
    let tx;
    tx = await timelock.grantRole(PROPOSER_ROLE, governorAddr);   await tx.wait();
    tx = await timelock.grantRole(CANCELLER_ROLE, governorAddr);  await tx.wait();
    tx = await timelock.revokeRole(PROPOSER_ROLE, signer.address); await tx.wait();
    tx = await timelock.renounceRole(ADMIN_ROLE, signer.address);  await tx.wait();
    console.log("timelock roles wired & admin renounced");

    // 4) Treasury streamer
    const Streamer = await ethers.getContractFactory("ObscuraTreasuryStreamer");
    const streamer = await Streamer.deploy(payStreamAddr, timelockAddr);
    await streamer.waitForDeployment();
    const streamerAddr = await streamer.getAddress();
    console.log("TreasuryStreamer:", streamerAddr);

    // 5) Persist
    deployed.ObscuraTimelock          = timelockAddr;
    deployed.ObscuraGovernor          = governorAddr;
    deployed.ObscuraTreasuryStreamer  = streamerAddr;
    deployed.wave5Phase4And5DeployedAt = new Date().toISOString();
    fs.writeFileSync(DEPLOYMENTS, JSON.stringify(deployed, null, 2));
    console.log("written to", DEPLOYMENTS);

    console.log("\nNEXT STEPS:");
    console.log("  1. Frontend: set VITE_OBSCURA_GOVERNOR, VITE_OBSCURA_TIMELOCK, VITE_OBSCURA_TREASURY_STREAMER");
    console.log("  2. (Optional) List on Tally at https://www.tally.xyz/add-a-dao");
    console.log("  3. Streamer is callable ONLY via Governor proposal → timelock execute");
}

main().catch((e) => { console.error(e); process.exit(1); });

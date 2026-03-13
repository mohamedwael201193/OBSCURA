import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as fs from "fs";
import * as path from "path";

function saveDeployment(network: string, contracts: Record<string, string>) {
  const dir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${network}.json`);

  let data: Record<string, string> = {};
  if (fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  Object.assign(data, contracts);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

task("deploy-obscura", "Deploy all Obscura contracts (v3 + Wave 2)").setAction(
  async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();

    console.log(`\nDeploying to ${network.name}...`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(
      `Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`
    );

    // 1. Deploy ObscuraToken (no constructor args)
    console.log("\n[1/5] Deploying ObscuraToken...");
    const ObscuraToken = await ethers.getContractFactory("ObscuraToken");
    const obscuraToken = await ObscuraToken.deploy();
    await obscuraToken.waitForDeployment();
    const tokenAddress = await obscuraToken.getAddress();
    console.log(`ObscuraToken deployed to: ${tokenAddress}`);

    // 2. Deploy ObscuraPay (no constructor args)
    console.log("\n[2/5] Deploying ObscuraPay...");
    const ObscuraPay = await ethers.getContractFactory("ObscuraPay");
    const obscuraPay = await ObscuraPay.deploy();
    await obscuraPay.waitForDeployment();
    const payAddress = await obscuraPay.getAddress();
    console.log(`ObscuraPay deployed to: ${payAddress}`);

    // 3. Deploy ObscuraEscrow (requires tokenAddress)
    console.log("\n[3/5] Deploying ObscuraEscrow...");
    const ObscuraEscrow = await ethers.getContractFactory("ObscuraEscrow");
    const obscuraEscrow = await ObscuraEscrow.deploy(tokenAddress);
    await obscuraEscrow.waitForDeployment();
    const escrowAddress = await obscuraEscrow.getAddress();
    console.log(`ObscuraEscrow deployed to: ${escrowAddress}`);

    // 4. Deploy ObscuraConditionResolver (requires escrowAddress)
    console.log("\n[4/5] Deploying ObscuraConditionResolver...");
    const ObscuraConditionResolver = await ethers.getContractFactory("ObscuraConditionResolver");
    const resolver = await ObscuraConditionResolver.deploy(escrowAddress);
    await resolver.waitForDeployment();
    const resolverAddress = await resolver.getAddress();
    console.log(`ObscuraConditionResolver deployed to: ${resolverAddress}`);

    // 5. Deploy ObscuraVote (requires tokenAddress) — Wave 2
    console.log("\n[5/5] Deploying ObscuraVote...");
    const ObscuraVote = await ethers.getContractFactory("ObscuraVote");
    const obscuraVote = await ObscuraVote.deploy(tokenAddress);
    await obscuraVote.waitForDeployment();
    const voteAddress = await obscuraVote.getAddress();
    console.log(`ObscuraVote deployed to: ${voteAddress}`);

    // Save deployment addresses
    saveDeployment(network.name, {
      ObscuraToken: tokenAddress,
      ObscuraPay: payAddress,
      ObscuraEscrow: escrowAddress,
      ObscuraConditionResolver: resolverAddress,
      ObscuraVote: voteAddress,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
    });
    console.log(`\nSaved to deployments/${network.name}.json`);

    // Print frontend env vars
    console.log("\n--- Copy to frontend/obscura-os-main/.env ---");
    console.log(`VITE_OBSCURA_PAY_ADDRESS=${payAddress}`);
    console.log(`VITE_OBSCURA_TOKEN_ADDRESS=${tokenAddress}`);
    console.log(`VITE_OBSCURA_ESCROW_ADDRESS=${escrowAddress}`);
    console.log(`VITE_OBSCURA_CONDITION_RESOLVER_ADDRESS=${resolverAddress}`);
    console.log(`VITE_OBSCURA_VOTE_ADDRESS=${voteAddress}`);
    console.log(`VITE_CHAIN_ID=421614`);

    return { payAddress, tokenAddress, escrowAddress, resolverAddress, voteAddress };
  }
);

// ─── Deploy Vote Only ───────────────────────────────────────────────────────
// Use this task when Wave 1 contracts are already deployed and you only need
// to deploy ObscuraVote (Wave 2). Reads existing token address from deployments.
task("deploy-vote", "Deploy only ObscuraVote using existing ObscuraToken address").setAction(
  async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();

    // Load existing deployment to get token address
    const deploymentFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
    if (!fs.existsSync(deploymentFile)) {
      throw new Error(`No deployment file found for ${network.name}. Run deploy-obscura first.`);
    }
    const existing = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const tokenAddress = existing.ObscuraToken;
    if (!tokenAddress) {
      throw new Error("ObscuraToken address not found in deployment file.");
    }

    console.log(`\nDeploying ObscuraVote to ${network.name}...`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Using existing ObscuraToken: ${tokenAddress}`);
    console.log(
      `Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`
    );

    const ObscuraVote = await ethers.getContractFactory("ObscuraVote");
    const obscuraVote = await ObscuraVote.deploy(tokenAddress);
    await obscuraVote.waitForDeployment();
    const voteAddress = await obscuraVote.getAddress();
    console.log(`ObscuraVote deployed to: ${voteAddress}`);

    // Save only the vote address — preserves existing Wave 1 addresses
    saveDeployment(network.name, { ObscuraVote: voteAddress });
    console.log(`\nSaved to deployments/${network.name}.json`);

    // Auto-update frontend .env
    const frontendEnvPath = path.join(__dirname, "..", "..", "frontend", "obscura-os-main", ".env");
    if (fs.existsSync(frontendEnvPath)) {
      let envContent = fs.readFileSync(frontendEnvPath, "utf8");
      if (envContent.includes("VITE_OBSCURA_VOTE_ADDRESS=")) {
        envContent = envContent.replace(
          /VITE_OBSCURA_VOTE_ADDRESS=.*/,
          `VITE_OBSCURA_VOTE_ADDRESS=${voteAddress}`
        );
      } else {
        envContent += `\nVITE_OBSCURA_VOTE_ADDRESS=${voteAddress}`;
      }
      fs.writeFileSync(frontendEnvPath, envContent);
      console.log(`\nAuto-updated frontend .env: VITE_OBSCURA_VOTE_ADDRESS=${voteAddress}`);
    } else {
      console.log("\n--- Add to frontend/obscura-os-main/.env ---");
      console.log(`VITE_OBSCURA_VOTE_ADDRESS=${voteAddress}`);
    }

    return { voteAddress };
  }
);

// ─── Deploy Wave 3: Treasury + Rewards ─────────────────────────────────────
// Deploys ObscuraTreasury and ObscuraRewards using the existing ObscuraVote address.
task("deploy-gov", "Deploy ObscuraTreasury and ObscuraRewards (Wave 3 governance)").setAction(
  async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();

    const deploymentFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
    if (!fs.existsSync(deploymentFile)) {
      throw new Error(`No deployment file for ${network.name}. Run deploy-obscura first.`);
    }
    const existing = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const voteAddress = existing.ObscuraVote;
    if (!voteAddress) throw new Error("ObscuraVote address not found in deployment file.");

    console.log(`\nDeploying Wave 3 governance contracts to ${network.name}...`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Using ObscuraVote: ${voteAddress}`);
    console.log(
      `Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`
    );

    // Deploy ObscuraTreasury
    console.log("\n[1/2] Deploying ObscuraTreasury...");
    const ObscuraTreasury = await ethers.getContractFactory("ObscuraTreasury");
    const treasury = await ObscuraTreasury.deploy(voteAddress);
    await treasury.waitForDeployment();
    const treasuryAddress = await treasury.getAddress();
    console.log(`ObscuraTreasury deployed to: ${treasuryAddress}`);

    // Deploy ObscuraRewards
    console.log("\n[2/2] Deploying ObscuraRewards...");
    const ObscuraRewards = await ethers.getContractFactory("ObscuraRewards");
    const rewards = await ObscuraRewards.deploy(voteAddress);
    await rewards.waitForDeployment();
    const rewardsAddress = await rewards.getAddress();
    console.log(`ObscuraRewards deployed to: ${rewardsAddress}`);

    // Save to deployment file
    saveDeployment(network.name, {
      ObscuraTreasury: treasuryAddress,
      ObscuraRewards: rewardsAddress,
    });
    console.log(`\nSaved to deployments/${network.name}.json`);

    // Auto-update frontend .env
    const frontendEnvPath = path.join(__dirname, "..", "..", "frontend", "obscura-os-main", ".env");
    if (fs.existsSync(frontendEnvPath)) {
      let envContent = fs.readFileSync(frontendEnvPath, "utf8");

      const upsert = (content: string, key: string, value: string) =>
        content.includes(`${key}=`)
          ? content.replace(new RegExp(`${key}=.*`), `${key}=${value}`)
          : content + `\n${key}=${value}`;

      envContent = upsert(envContent, "VITE_OBSCURA_TREASURY_ADDRESS", treasuryAddress);
      envContent = upsert(envContent, "VITE_OBSCURA_REWARDS_ADDRESS", rewardsAddress);

      fs.writeFileSync(frontendEnvPath, envContent);
      console.log(`\nAuto-updated frontend .env:`);
      console.log(`  VITE_OBSCURA_TREASURY_ADDRESS=${treasuryAddress}`);
      console.log(`  VITE_OBSCURA_REWARDS_ADDRESS=${rewardsAddress}`);
    }

    return { treasuryAddress, rewardsAddress };
  }
);

// ─── Deploy Wave 4: Election ────────────────────────────────────────────────
task("deploy-election", "Deploy ObscuraElection (Wave 4 — FHE candidate elections)").setAction(
  async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();

    const deploymentFile = path.join(__dirname, "..", "deployments", `${network.name}.json`);
    if (!fs.existsSync(deploymentFile)) {
      throw new Error(`No deployment file for ${network.name}. Run deploy-obscura first.`);
    }
    const existing = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const tokenAddress = existing.ObscuraToken;
    if (!tokenAddress) throw new Error("ObscuraToken address not found in deployment file.");

    console.log(`\nDeploying ObscuraElection to ${network.name}...`);
    console.log(`Deployer:           ${deployer.address}`);
    console.log(`Using ObscuraToken: ${tokenAddress}`);
    console.log(
      `Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`
    );

    const ObscuraElection = await ethers.getContractFactory("ObscuraElection");
    const election = await ObscuraElection.deploy(tokenAddress);
    await election.waitForDeployment();
    const electionAddress = await election.getAddress();
    console.log(`ObscuraElection deployed to: ${electionAddress}`);

    saveDeployment(network.name, { ObscuraElection: electionAddress });
    console.log(`\nSaved to deployments/${network.name}.json`);

    // Auto-update frontend .env
    const frontendEnvPath = path.join(__dirname, "..", "..", "frontend", "obscura-os-main", ".env");
    if (fs.existsSync(frontendEnvPath)) {
      let envContent = fs.readFileSync(frontendEnvPath, "utf8");
      if (envContent.includes("VITE_OBSCURA_ELECTION_ADDRESS=")) {
        envContent = envContent.replace(
          /VITE_OBSCURA_ELECTION_ADDRESS=.*/,
          `VITE_OBSCURA_ELECTION_ADDRESS=${electionAddress}`
        );
      } else {
        envContent += `\nVITE_OBSCURA_ELECTION_ADDRESS=${electionAddress}`;
      }
      fs.writeFileSync(frontendEnvPath, envContent);
      console.log(`\nAuto-updated frontend .env: VITE_OBSCURA_ELECTION_ADDRESS=${electionAddress}`);
    } else {
      console.log("\n--- Add to frontend/obscura-os-main/.env ---");
      console.log(`VITE_OBSCURA_ELECTION_ADDRESS=${electionAddress}`);
    }

    return { electionAddress };
  }
);

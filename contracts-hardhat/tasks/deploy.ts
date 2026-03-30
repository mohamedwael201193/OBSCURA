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

task("deploy-obscura", "Deploy all Obscura contracts (v3)").setAction(
  async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();

    console.log(`\nDeploying to ${network.name}...`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(
      `Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`
    );

    // 1. Deploy ObscuraToken (no constructor args)
    console.log("\n[1/4] Deploying ObscuraToken...");
    const ObscuraToken = await ethers.getContractFactory("ObscuraToken");
    const obscuraToken = await ObscuraToken.deploy();
    await obscuraToken.waitForDeployment();
    const tokenAddress = await obscuraToken.getAddress();
    console.log(`ObscuraToken deployed to: ${tokenAddress}`);

    // 2. Deploy ObscuraPay (no constructor args)
    console.log("\n[2/4] Deploying ObscuraPay...");
    const ObscuraPay = await ethers.getContractFactory("ObscuraPay");
    const obscuraPay = await ObscuraPay.deploy();
    await obscuraPay.waitForDeployment();
    const payAddress = await obscuraPay.getAddress();
    console.log(`ObscuraPay deployed to: ${payAddress}`);

    // 3. Deploy ObscuraEscrow (requires tokenAddress)
    console.log("\n[3/4] Deploying ObscuraEscrow...");
    const ObscuraEscrow = await ethers.getContractFactory("ObscuraEscrow");
    const obscuraEscrow = await ObscuraEscrow.deploy(tokenAddress);
    await obscuraEscrow.waitForDeployment();
    const escrowAddress = await obscuraEscrow.getAddress();
    console.log(`ObscuraEscrow deployed to: ${escrowAddress}`);

    // 4. Deploy ObscuraConditionResolver (requires escrowAddress)
    console.log("\n[4/4] Deploying ObscuraConditionResolver...");
    const ObscuraConditionResolver = await ethers.getContractFactory("ObscuraConditionResolver");
    const resolver = await ObscuraConditionResolver.deploy(escrowAddress);
    await resolver.waitForDeployment();
    const resolverAddress = await resolver.getAddress();
    console.log(`ObscuraConditionResolver deployed to: ${resolverAddress}`);

    // Save deployment addresses
    saveDeployment(network.name, {
      ObscuraToken: tokenAddress,
      ObscuraPay: payAddress,
      ObscuraEscrow: escrowAddress,
      ObscuraConditionResolver: resolverAddress,
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
    console.log(`VITE_CHAIN_ID=421614`);

    return { payAddress, tokenAddress, escrowAddress, resolverAddress };
  }
);

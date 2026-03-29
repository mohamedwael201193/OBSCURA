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

task("deploy-obscura", "Deploy ObscuraPay and ObscuraToken contracts").setAction(
  async (_, hre: HardhatRuntimeEnvironment) => {
    const { ethers, network } = hre;
    const [deployer] = await ethers.getSigners();

    console.log(`\nDeploying to ${network.name}...`);
    console.log(`Deployer: ${deployer.address}`);
    console.log(
      `Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`
    );

    // Deploy ObscuraPay
    console.log("\nDeploying ObscuraPay...");
    const ObscuraPay = await ethers.getContractFactory("ObscuraPay");
    const obscuraPay = await ObscuraPay.deploy();
    await obscuraPay.waitForDeployment();
    const payAddress = await obscuraPay.getAddress();
    console.log(`ObscuraPay deployed to: ${payAddress}`);

    // Deploy ObscuraToken
    console.log("\nDeploying ObscuraToken...");
    const ObscuraToken = await ethers.getContractFactory("ObscuraToken");
    const obscuraToken = await ObscuraToken.deploy();
    await obscuraToken.waitForDeployment();
    const tokenAddress = await obscuraToken.getAddress();
    console.log(`ObscuraToken deployed to: ${tokenAddress}`);

    // Save deployment addresses
    saveDeployment(network.name, {
      ObscuraPay: payAddress,
      ObscuraToken: tokenAddress,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
    });
    console.log(`\nSaved to deployments/${network.name}.json`);

    // Print frontend env vars
    console.log("\n--- Copy to frontend/obscura-os-main/.env ---");
    console.log(`VITE_OBSCURA_PAY_ADDRESS=${payAddress}`);
    console.log(`VITE_OBSCURA_TOKEN_ADDRESS=${tokenAddress}`);
    console.log(`VITE_CHAIN_ID=421614`);

    return { payAddress, tokenAddress };
  }
);

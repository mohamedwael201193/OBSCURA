// Deploy ObscuraPaymaster with executeBatch target validation for Public Mode.
//
// Run:
//   npx hardhat run scripts/deployPublicPaymasterV2.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const WHITELISTED_TARGETS = [
  { name: "Public USDC",               addr: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" },
  { name: "ObscuraPay ocUSDC",         addr: "0xEd46020Df8abe7BB1E096f27d089F4326D223a53" },
  { name: "ObscuraPayStreamV3",        addr: "0xE4328F139F03138D63f7fdF90A8Ef240e04653fA" },
  { name: "ObscuraConfidentialEscrow", addr: "0x293810A2081114CcE0c98A709a0c31aE07c01D75" },
  { name: "ObscuraInvoice",            addr: "0x62a86C8d68fF32ea41Faf349db6EF7EF496620b7" },
  { name: "ObscuraInsuranceSubscription", addr: "0xEA9Fc5800F41d090dFB90f9735F4CF3824d6743D" },
  { name: "ObscuraPayrollResolverV3",  addr: "0xB077c231448EF2252060E4B4dD404078DBD94180" },
  { name: "ObscuraAddressBook",        addr: "0x4095065ee7cc4C9f5210A328EC08e29B4Ac74Eef" },
  { name: "ObscuraStealthRegistry",    addr: "0xa36e791a611D36e2C817a7DA0f41547D30D4917d" },
  { name: "ObscuraInboxIndex",         addr: "0xDF195fcfa6806F07740A5e3Bf664eE765eC98131" },
];

const PAYMASTER_FUND_ETH = process.env.PAYMASTER_FUND_ETH ?? "0.15";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);

  const deployPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  const dep: Record<string, unknown> = fs.existsSync(deployPath)
    ? JSON.parse(fs.readFileSync(deployPath, "utf8"))
    : {};

  console.log("[1/3] Deploying ObscuraPaymaster v2...");
  const PaymasterF = await ethers.getContractFactory("ObscuraPaymaster");
  const paymaster = await PaymasterF.deploy(deployer.address);
  await paymaster.waitForDeployment();
  const paymasterAddr = await paymaster.getAddress();
  console.log(`      ObscuraPaymaster: ${paymasterAddr}`);

  console.log(`[2/3] Funding paymaster with ${PAYMASTER_FUND_ETH} ETH via EntryPoint...`);
  const fundTx = await deployer.sendTransaction({
    to: paymasterAddr,
    value: ethers.parseEther(PAYMASTER_FUND_ETH),
  });
  await fundTx.wait();
  console.log(`      Funded. tx: ${fundTx.hash}`);

  console.log("[3/3] Whitelisting Public Mode and active Pay targets...");
  for (const { name, addr } of WHITELISTED_TARGETS) {
    const tx = await (paymaster as any).whitelistTarget(addr, true);
    await tx.wait();
    console.log(`      ok ${name} (${addr})`);
  }

  dep["ObscuraPaymaster"] = paymasterAddr;
  dep["wave5PublicPaymasterV2DeployedAt"] = new Date().toISOString();

  fs.writeFileSync(deployPath, JSON.stringify(dep, null, 2));
  console.log(`\ndeployments/${network.name}.json updated.`);
  console.log(`VITE_PAYMASTER_ADDRESS=${paymasterAddr}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
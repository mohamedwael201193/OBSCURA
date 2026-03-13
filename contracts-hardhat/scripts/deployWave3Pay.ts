// Deploy Wave 3 Pay: PayStreamV2, PayrollResolverV2, AddressBook, InboxIndex,
// InsuranceSubscription, SocialResolver, StealthRotation.
//
// Run:
//   npx hardhat run scripts/deployWave3Pay.ts --network arb-sepolia
//
// Reads the previously deployed Wave 2 addresses from deployments/<network>.json
// (does NOT redeploy them). Only the seven new V3 contracts are deployed here.

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ─── ReineiraOS Arbitrum Sepolia (chain 421614) ──────────────────────────────
const REINEIRA = {
  cUSDC: "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f",
  ConfidentialEscrow: "0xC4333F84F5034D8691CB95f068def2e3B6DC60Fa",
  CoverageManager: "0x766e9508BD41BCE0e788F16Da86B3615386Ff6f6",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  // ─── 1. ObscuraPayrollResolverV2 ──────────────────────────────────────────
  console.log("[1/7] ObscuraPayrollResolverV2...");
  const ResolverV2F = await ethers.getContractFactory("ObscuraPayrollResolverV2");
  const resolverV2 = await ResolverV2F.deploy(REINEIRA.ConfidentialEscrow);
  await resolverV2.waitForDeployment();
  const resolverV2Addr = await resolverV2.getAddress();
  console.log(`     -> ${resolverV2Addr}`);

  // ─── 2. ObscuraPayStreamV2 ────────────────────────────────────────────────
  console.log("[2/7] ObscuraPayStreamV2...");
  const StreamV2F = await ethers.getContractFactory("ObscuraPayStreamV2");
  const streamV2 = await StreamV2F.deploy(
    REINEIRA.ConfidentialEscrow,
    REINEIRA.cUSDC,
    resolverV2Addr
  );
  await streamV2.waitForDeployment();
  const streamV2Addr = await streamV2.getAddress();
  console.log(`     -> ${streamV2Addr}`);

  // ─── 3. ObscuraAddressBook ────────────────────────────────────────────────
  console.log("[3/7] ObscuraAddressBook...");
  const BookF = await ethers.getContractFactory("ObscuraAddressBook");
  const book = await BookF.deploy();
  await book.waitForDeployment();
  const bookAddr = await book.getAddress();
  console.log(`     -> ${bookAddr}`);

  // ─── 4. ObscuraInboxIndex ─────────────────────────────────────────────────
  console.log("[4/7] ObscuraInboxIndex...");
  const InboxF = await ethers.getContractFactory("ObscuraInboxIndex");
  const inbox = await InboxF.deploy();
  await inbox.waitForDeployment();
  const inboxAddr = await inbox.getAddress();
  console.log(`     -> ${inboxAddr}`);

  // ─── 5. ObscuraInsuranceSubscription ──────────────────────────────────────
  console.log("[5/7] ObscuraInsuranceSubscription...");
  const SubF = await ethers.getContractFactory("ObscuraInsuranceSubscription");
  // initialConsumer = CoverageManager (it consumes premium per cycle).
  const sub = await SubF.deploy(REINEIRA.cUSDC, REINEIRA.CoverageManager);
  await sub.waitForDeployment();
  const subAddr = await sub.getAddress();
  console.log(`     -> ${subAddr}`);

  // ─── 6. ObscuraSocialResolver ─────────────────────────────────────────────
  // ensVerifier = deployer for now; rotate later via a multi-sig if desired.
  console.log("[6/7] ObscuraSocialResolver...");
  const SocialF = await ethers.getContractFactory("ObscuraSocialResolver");
  const social = await SocialF.deploy(deployer.address);
  await social.waitForDeployment();
  const socialAddr = await social.getAddress();
  console.log(`     -> ${socialAddr}`);

  // ─── 7. ObscuraStealthRotation ────────────────────────────────────────────
  console.log("[7/7] ObscuraStealthRotation...");
  const RotF = await ethers.getContractFactory("ObscuraStealthRotation");
  const rot = await RotF.deploy();
  await rot.waitForDeployment();
  const rotAddr = await rot.getAddress();
  console.log(`     -> ${rotAddr}`);

  // ─── Persist ──────────────────────────────────────────────────────────────
  const dir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${network.name}.json`);
  const existing = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : {};
  const merged = {
    ...existing,
    ObscuraPayrollResolverV2: resolverV2Addr,
    ObscuraPayStreamV2: streamV2Addr,
    ObscuraAddressBook: bookAddr,
    ObscuraInboxIndex: inboxAddr,
    ObscuraInsuranceSubscription: subAddr,
    ObscuraSocialResolver: socialAddr,
    ObscuraStealthRotation: rotAddr,
    SocialResolverEnsVerifier: deployer.address,
    InsuranceSubscriptionConsumer: REINEIRA.CoverageManager,
    wave3PayDeployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(file, JSON.stringify(merged, null, 2));
  console.log(`\nSaved to deployments/${network.name}.json`);

  console.log("\n--- Add to frontend/obscura-os-main/.env ---");
  console.log(`VITE_OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS=${resolverV2Addr}`);
  console.log(`VITE_OBSCURA_PAY_STREAM_V2_ADDRESS=${streamV2Addr}`);
  console.log(`VITE_OBSCURA_ADDRESS_BOOK_ADDRESS=${bookAddr}`);
  console.log(`VITE_OBSCURA_INBOX_INDEX_ADDRESS=${inboxAddr}`);
  console.log(`VITE_OBSCURA_INSURANCE_SUBSCRIPTION_ADDRESS=${subAddr}`);
  console.log(`VITE_OBSCURA_SOCIAL_RESOLVER_ADDRESS=${socialAddr}`);
  console.log(`VITE_OBSCURA_STEALTH_ROTATION_ADDRESS=${rotAddr}`);

  console.log("\nVERIFY ON ARBISCAN:");
  console.log(
    `  npx hardhat verify --network ${network.name} ${resolverV2Addr} ${REINEIRA.ConfidentialEscrow}`
  );
  console.log(
    `  npx hardhat verify --network ${network.name} ${streamV2Addr} ${REINEIRA.ConfidentialEscrow} ${REINEIRA.cUSDC} ${resolverV2Addr}`
  );
  console.log(`  npx hardhat verify --network ${network.name} ${bookAddr}`);
  console.log(`  npx hardhat verify --network ${network.name} ${inboxAddr}`);
  console.log(
    `  npx hardhat verify --network ${network.name} ${subAddr} ${REINEIRA.cUSDC} ${REINEIRA.CoverageManager}`
  );
  console.log(
    `  npx hardhat verify --network ${network.name} ${socialAddr} ${deployer.address}`
  );
  console.log(`  npx hardhat verify --network ${network.name} ${rotAddr}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

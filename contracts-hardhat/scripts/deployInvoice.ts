// Deploy ObscuraInvoice (Phase B1: confidential invoices).
// Run: npx hardhat run scripts/deployInvoice.ts --network arb-sepolia
import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const REINEIRA_CUSDC = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance:  ${ethers.formatEther(bal)} ETH\n`);

  console.log("Deploying ObscuraInvoice...");
  const F = await ethers.getContractFactory("ObscuraInvoice");
  const inv = await F.deploy(REINEIRA_CUSDC);
  await inv.waitForDeployment();
  const addr = await inv.getAddress();
  console.log(`  -> ObscuraInvoice: ${addr}`);

  // Persist into deployments/<network>.json under key ObscuraInvoice.
  const deploymentsDir = path.resolve(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });
  const file = path.join(deploymentsDir, `${network.name}.json`);
  let existing: Record<string, string> = {};
  if (fs.existsSync(file)) {
    try { existing = JSON.parse(fs.readFileSync(file, "utf8")); } catch { /* ignore */ }
  }
  existing.ObscuraInvoice = addr;
  fs.writeFileSync(file, JSON.stringify(existing, null, 2));
  console.log(`\nWrote ${file}`);
  console.log(`\nNext step — add to frontend .env:`);
  console.log(`  VITE_OBSCURA_INVOICE_ADDRESS=${addr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

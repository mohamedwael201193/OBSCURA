import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const market = "0xb084Afb8925BBF6A98717a10219d150Bcf0B5c1f";
  const provider = ethers.provider;

  // Get deployed bytecode
  const deployedCode = await provider.getCode(market);
  console.log("deployed code size:", (deployedCode.length - 2) / 2);

  // Get compiled artifact deployedBytecode
  const art = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "artifacts/contracts/credit/ObscuraCreditMarket.sol/ObscuraCreditMarket.json"),
    "utf8"
  ));
  const expectedCode = art.deployedBytecode as string;
  console.log("artifact code size:", (expectedCode.length - 2) / 2);

  // Compare (strip metadata hash at end — last ~53 bytes)
  const strip = (h: string) => h.slice(0, h.length - 106);
  const a = strip(deployedCode).toLowerCase();
  const b = strip(expectedCode).toLowerCase();
  console.log("match (stripped metadata):", a === b);
  if (a !== b) {
    // find first diff offset
    let i = 0;
    while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
    console.log("first diff at hex char offset:", i, "of", Math.min(a.length, b.length));
    console.log("deployed:", a.slice(Math.max(0, i - 20), i + 40));
    console.log("artifact:", b.slice(Math.max(0, i - 20), i + 40));
  }

  // Block when deployed
  // Use ContractCreator service? simpler: check the address's first tx via etherscan — skip

  // Check if borrow signature includes the FHE.allowThis(handle) line by comparing source
  const src = fs.readFileSync(
    path.join(__dirname, "..", "contracts/credit/ObscuraCreditMarket.sol"), "utf8"
  );
  console.log("borrow has FHE.allowThis(disburse):", src.includes("FHE.allowThis(disburse)"));
}

main().catch((e) => { console.error(e); process.exit(1); });

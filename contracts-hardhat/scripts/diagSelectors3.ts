import { ethers } from "hardhat";

async function main() {
  const cusdc = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
  const code = await ethers.provider.getCode(cusdc);
  // try a wide variety of operator setters & isAllowed variants
  const sels = [
    "setOperator(address,uint48)",
    "setOperator(address,uint96)",
    "setOperator(address,uint256)",
    "authorizeOperator(address)",
    "revokeOperator(address)",
    "operatorApprovals(address,address)",
    "operators(address,address)",
    "_operators(address,address)",
    "allowedOperators(address,address)",
    "addOperator(address)",
    "removeOperator(address)",
    "isAllowed(uint256,address)",
    "isHandleAllowed(uint256,address)",
    // possible mint/seed
    "mint(uint256)",
    "mintTo(address,uint256)",
    "selfMint(uint256)",
    "publicMint(uint256)",
    "mintConfidential(address,uint256)",
    "depositPlaintext(uint256)",
    "depositTo(address,uint256)",
    // Common faucet
    "drip()",
    "request(uint256)",
    "requestTokens()",
    "getTokens(uint256)",
  ];
  for (const sig of sels) {
    const s = ethers.id(sig).slice(0, 10);
    console.log(code.includes(s.slice(2)) ? "✅" : "❌", s, sig);
  }

  // Brute-force: scan code for PUSH4 opcodes followed by EQ to find ALL function selectors
  const bytes = code.startsWith("0x") ? code.slice(2) : code;
  const selectorsFound = new Set<string>();
  for (let i = 0; i < bytes.length - 14; i += 2) {
    if (bytes.slice(i, i + 2) === "63") { // PUSH4
      const sel = "0x" + bytes.slice(i + 2, i + 10);
      // next op should be EQ (14) and then PUSH2/JUMPI typically (61... 57)
      const next = bytes.slice(i + 10, i + 12);
      if (next === "14") selectorsFound.add(sel);
    }
  }
  console.log("\nALL function selectors in deployed cUSDC bytecode:");
  for (const s of selectorsFound) console.log(" ", s);
}
main().catch((e) => { console.error(e); process.exit(1); });

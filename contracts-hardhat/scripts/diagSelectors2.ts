import { ethers } from "hardhat";

async function main() {
  const cusdc = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
  const code = await ethers.provider.getCode(cusdc);
  const sels = [
    "deposit(uint256)", "wrap(uint256)", "mint(address,uint256)", "shield(uint256)",
    "faucet()", "faucet(uint256)", "claim()", "claim(uint256)",
    "unshield(uint256)", "unwrap(uint256)", "burn(uint256)", "withdraw(uint256)",
    "setOperator(address,bool)", "setApprovalForAll(address,bool)",
    "approve(address,uint256)", "allowance(address,address)",
    "totalSupply()", "totalConfidentialSupply()",
    "confidentialDeposit(uint256)", "confidentialMint(address,uint256)",
    "convert(uint256)", "wrapPlaintext(uint256)",
  ];
  for (const sig of sels) {
    const s = ethers.id(sig).slice(0, 10);
    console.log(code.includes(s.slice(2)) ? "✅" : "❌", s, sig);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

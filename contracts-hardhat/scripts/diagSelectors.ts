import { ethers } from "hardhat";

async function main() {
  const cusdc = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
  const provider = ethers.provider;
  const code = await provider.getCode(cusdc);
  console.log("cUSDC code size:", (code.length - 2) / 2);

  // Candidate selectors we might find / not find:
  const sels = {
    "confidentialTransfer(address,uint256)": "0xfe3f670d",
    "confidentialTransfer(address,(uint256,uint8,uint8,bytes))": null,
    "confidentialTransferFrom(address,address,uint256)": null,
    "confidentialTransferFrom(address,address,(uint256,uint8,uint8,bytes))": null,
    "confidentialBalanceOf(address)": null,
    "allowOperator(address,uint256)": null,
    "isOperator(address,address)": null,
    "operatorOf(address,address)": null,
    "transfer(address,uint256)": null,
    "balanceOf(address)": null,
    "decimals()": null,
    "approveOperator(address,uint256)": null,
    "setOperator(address,uint256)": null,
    "_balances(address)": null,
    "name()": null,
    "symbol()": null,
  };

  const { id } = ethers;
  for (const sig of Object.keys(sels)) {
    const s = id(sig).slice(0, 10);
    const present = code.includes(s.slice(2));
    console.log(present ? "✅" : "❌", s, sig);
  }

  // Also try named-param variants for InEuint64
  const more = [
    "confidentialTransfer(address,InEuint64)",
  ];
  // Solidity computes selector from canonical type list; structs flatten to their member types.
  // The deployed cUSDC's InEuint64 layout is unknown — try standard ones:
  for (const sig of [
    "confidentialTransfer(address,(uint256,uint8,uint8,bytes))",       // current cofhe
    "confidentialTransfer(address,(uint256,int32,uint8,bytes))",       // old cofhe
    "confidentialTransferFrom(address,address,(uint256,uint8,uint8,bytes))",
    "confidentialTransferFrom(address,address,(uint256,int32,uint8,bytes))",
  ]) {
    const s = id(sig).slice(0, 10);
    console.log((code.includes(s.slice(2)) ? "✅" : "❌"), s, sig);
  }

  // Just try calling confidentialBalanceOf(market) and confidentialTransfer with a static call
  // to see what happens
  const market = "0xb084Afb8925BBF6A98717a10219d150Bcf0B5c1f";
  const iface = new ethers.Interface([
    "function confidentialBalanceOf(address) view returns (uint256)",
    "function confidentialTransfer(address,uint256) returns (bool)",
  ]);
  try {
    const data = iface.encodeFunctionData("confidentialBalanceOf", [market]);
    const ret = await provider.call({ to: cusdc, data });
    console.log("confidentialBalanceOf(market):", ret);
  } catch (e: any) { console.log("confBalOf err:", e.message?.slice(0, 200)); }
}
main().catch((e) => { console.error(e); process.exit(1); });

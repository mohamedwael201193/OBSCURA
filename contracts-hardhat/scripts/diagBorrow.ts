import { ethers } from "hardhat";

async function main() {
  const market = "0xb084Afb8925BBF6A98717a10219d150Bcf0B5c1f";
  const user = "0xD208aC8327e6479967693Af2F2216e1612D0171A";
  const cUSDC = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
  const provider = ethers.provider;
  const abi = [
    "function maxBorrowable(address) view returns (uint128)",
    "function totalSupplyAssets() view returns (uint128)",
    "function totalBorrowAssets() view returns (uint128)",
    "function lltvBps() view returns (uint64)",
    "function loanAsset() view returns (address)",
    "function collateralAsset() view returns (address)",
    "function lastAccrualTs() view returns (uint128)",
  ];
  const m = new ethers.Contract(market, abi, provider);
  console.log("market", market);
  console.log("  lltvBps          ", await m.lltvBps());
  console.log("  loanAsset        ", await m.loanAsset());
  console.log("  collateralAsset  ", await m.collateralAsset());
  console.log("  totalSupplyAssets", (await m.totalSupplyAssets()).toString());
  console.log("  totalBorrowAssets", (await m.totalBorrowAssets()).toString());
  console.log("  maxBorrowable    ", (await m.maxBorrowable(user)).toString());
  console.log("  lastAccrualTs    ", (await m.lastAccrualTs()).toString());

  // bytecode size
  const code = await provider.getCode(market);
  console.log("  codeSize         ", (code.length - 2) / 2);

  // cUSDC balance of market (encrypted handle)
  const tokAbi = [
    "function confidentialBalanceOf(address) view returns (uint256)",
    "function isOperator(address,address) view returns (bool)",
  ];
  const t = new ethers.Contract(cUSDC, tokAbi, provider);
  console.log("cUSDC handles:");
  console.log("  market balance handle", (await t.confidentialBalanceOf(market)).toString());
  console.log("  user   balance handle", (await t.confidentialBalanceOf(user)).toString());

  // Try to simulate the borrow call with a fake InEuint64 to see revert reason.
  // We use eth_call with the real failing tx's calldata.
  const failingTx = "0x8d71f590dcab0bb02d10012a9f3bceaff1ef1e8b9b92fa7288763bb58cec9792";
  const tx = await provider.getTransaction(failingTx);
  if (!tx) {
    console.log("could not fetch failing tx");
    return;
  }
  console.log("\nFailing tx:");
  console.log("  to     ", tx.to);
  console.log("  from   ", tx.from);
  console.log("  selector", tx.data.slice(0, 10));
  console.log("  dataLen ", (tx.data.length - 2) / 2);

  // Replay at block-1 to see revert reason
  try {
    const res = await provider.call({
      to: tx.to!,
      from: tx.from!,
      data: tx.data,
      value: tx.value,
      gasLimit: tx.gasLimit,
    }, tx.blockNumber! - 1);
    console.log("call OK (unexpected):", res);
  } catch (e: any) {
    console.log("\nReplay revert:", e.shortMessage || e.message);
    if (e.data) console.log("  data:", e.data);
    if (e.info) console.log("  info:", JSON.stringify(e.info).slice(0, 500));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

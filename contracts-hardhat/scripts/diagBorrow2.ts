import { ethers } from "hardhat";

async function main() {
  const failingTx = "0x8d71f590dcab0bb02d10012a9f3bceaff1ef1e8b9b92fa7288763bb58cec9792";
  const tx = await ethers.provider.getTransaction(failingTx);
  if (!tx) throw new Error("no tx");
  console.log("calldata:", tx.data);
  console.log("selector:", tx.data.slice(0, 10));

  // borrow(uint64,InEuint64) where InEuint64 = (uint256 ctHash, int32 securityZone, uint8 utype, bytes signature)
  const iface = new ethers.Interface([
    "function borrow(uint64 amtPlain, (uint256 ctHash, int32 securityZone, uint8 utype, bytes signature) encAmt)"
  ]);
  console.log("expected selector:", iface.getFunction("borrow")!.selector);
  try {
    const decoded = iface.decodeFunctionData("borrow", tx.data);
    console.log("amtPlain:", decoded[0].toString());
    console.log("encAmt:", decoded[1]);
  } catch (e: any) {
    console.log("decode failed:", e.message);
  }

  // Inspect receipt
  const r = await ethers.provider.getTransactionReceipt(failingTx);
  console.log("gasUsed:", r?.gasUsed.toString());
  console.log("status:", r?.status);
  console.log("logs:", r?.logs.length);

  // Try calling at the EXACT failing block (not block-1) to reproduce on the same state
  try {
    await ethers.provider.call({
      to: tx.to!,
      from: tx.from!,
      data: tx.data,
      value: tx.value,
      gasLimit: tx.gasLimit,
    }, tx.blockNumber!);
    console.log("call OK at failingBlock");
  } catch (e: any) {
    console.log("at failingBlock revert:", e.shortMessage || e.message, "data:", e.data);
  }
  // and block-1
  try {
    await ethers.provider.call({
      to: tx.to!,
      from: tx.from!,
      data: tx.data,
      value: tx.value,
      gasLimit: tx.gasLimit,
    }, tx.blockNumber! - 1);
    console.log("call OK at failingBlock-1");
  } catch (e: any) {
    console.log("at failingBlock-1 revert:", e.shortMessage || e.message, "data:", e.data);
  }
  // and latest
  try {
    await ethers.provider.call({
      to: tx.to!,
      from: tx.from!,
      data: tx.data,
      value: tx.value,
      gasLimit: tx.gasLimit,
    }, "latest");
    console.log("call OK at latest");
  } catch (e: any) {
    console.log("at latest revert:", e.shortMessage || e.message, "data:", e.data);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

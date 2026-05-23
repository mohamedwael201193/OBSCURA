import { ethers } from "hardhat";

async function main() {
  const txHash = "0x8d71f590dcab0bb02d10012a9f3bceaff1ef1e8b9b92fa7288763bb58cec9792";
  const provider = ethers.provider;
  try {
    const trace: any = await provider.send("debug_traceTransaction", [
      txHash,
      { tracer: "callTracer", tracerConfig: { withLog: true } }
    ]);
    console.log(JSON.stringify(trace, null, 2));
  } catch (e: any) {
    console.log("debug_traceTransaction failed:", e.message?.slice(0, 200));
    try {
      const trace2: any = await provider.send("trace_transaction", [txHash]);
      console.log("trace_transaction worked:", JSON.stringify(trace2).slice(0, 2000));
    } catch (e2: any) {
      console.log("trace_transaction failed:", e2.message?.slice(0, 200));
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

import { ethers } from "hardhat";

async function main() {
  const cusdc = "0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f";
  // Transfer event on cUSDC — standard ERC20 Transfer(address indexed from, address indexed to, uint256 value)
  const TRANSFER = ethers.id("Transfer(address,address,uint256)");
  const ConfidentialTransfer = ethers.id("ConfidentialTransfer(address,address,uint256)");
  const latest = await ethers.provider.getBlockNumber();
  console.log("latest block:", latest);
  // arb-sepolia block time ~0.25s, so 200k blocks ~14h. scan in chunks.
  const fromBlock = latest - 50000;
  const logs = await ethers.provider.getLogs({
    address: cusdc,
    fromBlock,
    toBlock: latest,
  });
  console.log("logs found in last 50k blocks:", logs.length);
  // Tally by topic0
  const counts: Record<string, number> = {};
  for (const l of logs) counts[l.topics[0]] = (counts[l.topics[0]] || 0) + 1;
  for (const [t, n] of Object.entries(counts)) console.log(" ", t, "=", n);
  console.log("known TRANSFER topic:", TRANSFER);
  console.log("known ConfTransfer topic:", ConfidentialTransfer);
  // Show last 5 logs
  console.log("\nLast 5:");
  for (const l of logs.slice(-5)) {
    console.log(" block:", l.blockNumber, "tx:", l.transactionHash, "topic0:", l.topics[0]);
  }
  // From those last logs, find the senders (eoa or contract?) of the tx
  for (const l of logs.slice(-10)) {
    const tx = await ethers.provider.getTransaction(l.transactionHash);
    if (!tx) continue;
    const toCode = tx.to ? await ethers.provider.getCode(tx.to) : "0x";
    const isToContract = toCode !== "0x";
    console.log(" tx", l.transactionHash, "from", tx.from, "to", tx.to, "toIsContract", isToContract, "topic0", l.topics[0].slice(0, 10));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

/** Vote module — run: npx tsx examples/vote.ts */
import { ObscuraSDK, DEFAULT_ADDRESSES } from "../src/index.js";

async function main() {
  const sdk = ObscuraSDK.create({ rpcUrl: process.env.ARB_SEPOLIA_RPC_URL });
  const count = await sdk.vote.getProposalCount();
  console.log("Vote contract:", DEFAULT_ADDRESSES.ObscuraVote);
  console.log("Proposal count (nextProposalId):", count.toString());

  if (count > 0n) {
    const proposal = await sdk.vote.getProposal(count - 1n);
    console.log("Latest proposal title:", proposal.title);
  }

  const delegateCall = sdk.vote.buildDelegate("0x0000000000000000000000000000000000000002");
  console.log("Delegate calldata:", sdk.encodeCall(delegateCall).slice(0, 42) + "...");
}

main().catch(console.error);

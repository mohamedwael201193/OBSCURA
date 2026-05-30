/**
 * On-chain verification: ObscuraVote uses nextProposalId (not proposalCount).
 * Run: npx tsx examples/verify-vote-getter.ts
 */
import { ObscuraSDK, DEFAULT_ADDRESSES } from "../src/index.js";

async function main() {
  const sdk = ObscuraSDK.create();
  const count = await sdk.vote.getProposalCount();
  console.log("ObscuraVote:", DEFAULT_ADDRESSES.ObscuraVote);
  console.log("getProposalCount() via nextProposalId:", count.toString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

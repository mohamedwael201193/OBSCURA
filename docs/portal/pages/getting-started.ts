import type { DocPage } from "../types";

export const ecosystemPage: DocPage = {
  slug: "ecosystem",
  title: "Ecosystem overview",
  description: "Three products, one encrypted asset, shared reputation and activity infrastructure.",
  category: "Getting started",
  keywords: ["pay", "credit", "vote", "fhe", "harmony"],
  blocks: [
    {
      type: "visual",
      variant: "product-overview",
    },
    {
      type: "visual",
      variant: "shared-state",
    },
    {
      type: "heading",
      level: 2,
      text: "Cross-product value flows",
      id: "cross-product",
    },
    {
      type: "list",
      items: [
        "Pay → Credit: Shield ocUSDC in Pay, supply collateral and borrow on the canonical market.",
        "All products → Reputation: Worker derives 28 capped signal types into tier buckets.",
        "Vote → Credit: voterParticipation feeds ObscuraCreditScoreV2 for LLTV boosts.",
        "Governor → Pay/Credit: Timelock executes treasury streams and factory parameter updates.",
      ],
    },
    {
      type: "visual",
      variant: "reputation-flow",
    },
    {
      type: "heading",
      level: 2,
      text: "Ecosystem scale",
      id: "ecosystem-scale",
    },
    {
      type: "visual",
      variant: "scale-grid",
    },
    {
      type: "heading",
      level: 2,
      text: "Shared infrastructure",
      id: "shared-infrastructure",
    },
    {
      type: "table",
      headers: ["Layer", "Service", "Role"],
      rows: [
        ["Chain", "Arbitrum Sepolia + Fhenix CoFHE", "Encrypted state on EVM"],
        ["Asset", "ocUSDC_Pay", "Canonical confidential USDC (6 dec)"],
        ["API", "obscura-api-n62v.onrender.com", "Reputation, notifications, UserOp relay"],
        ["Worker", "obscura-worker-0ppj.onrender.com", "Indexer, reputation derive, push"],
        ["Data", "Supabase", "Activity, reputation, notification prefs"],
        ["SDK", "@obscura-fhe/sdk", "Six modules · framework-agnostic"],
      ],
    },
  ],
};

export const quickStartPage: DocPage = {
  slug: "quick-start",
  title: "Quick start",
  description: "Install the SDK and read your first on-chain and off-chain Obscura data in under five minutes.",
  category: "Getting started",
  keywords: ["install", "npm", "viem", "sdk"],
  blocks: [
    {
      type: "visual",
      variant: "onboarding-path",
    },
    {
      type: "heading",
      level: 2,
      text: "Install",
      id: "install",
    },
    {
      type: "code",
      language: "bash",
      code: "npm install @obscura-fhe/sdk viem",
    },
    {
      type: "heading",
      level: 2,
      text: "Initialize",
      id: "client",
    },
    {
      type: "code",
      language: "typescript",
      title: "Minimal client",
      code: `import { ObscuraSDK } from "@obscura-fhe/sdk";

export const sdk = ObscuraSDK.create({
  supabaseAnonKey: process.env.OBSCURA_SUPABASE_ANON_KEY,
});

// Defaults: chain 421614 · production API · deployment registry`,
    },
    {
      type: "heading",
      level: 2,
      text: "Read reputation & activity",
      id: "read",
    },
    {
      type: "code",
      language: "typescript",
      title: "Off-chain reads (no wallet required)",
      code: `const wallet = "0xYourWallet" as const;

const rep = await sdk.reputation.getSummary(wallet);
console.log(rep.tier, rep.totalCappedWeight);

const { items } = await sdk.activity.listForWallet(wallet, {
  filter: "credit",
  page: 0,
});`,
    },
    {
      type: "heading",
      level: 2,
      text: "On-chain reads & tx builders",
      id: "onchain",
    },
    {
      type: "code",
      language: "typescript",
      title: "ContractCall pattern",
      code: `const ctHash = await sdk.pay.getShieldedBalance(wallet);
const call = sdk.vote.buildDelegate("0xDelegatee...");
const calldata = sdk.encodeCall(call);
// Sign with viem walletClient → sdk.sendCall(call, account)`,
    },
    {
      type: "callout",
      variant: "warning",
      title: "Encrypted writes require FHE",
      text: "Pass a FheProvider wrapping @cofhe/sdk, or supply pre-encrypted InEuint64 to buildShield / buildTransfer / buildCastVote.",
    },
  ],
};

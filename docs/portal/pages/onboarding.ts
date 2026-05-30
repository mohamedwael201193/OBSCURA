import type { DocPage } from "../types";

export const firstAppPage: DocPage = {
  slug: "first-app",
  title: "Build your first app",
  description: "Reputation dashboard, activity timeline, and a governance delegate transaction.",
  category: "Getting started",
  blocks: [
    {
      type: "paragraph",
      text: "A minimal Node or browser app: display reputation tier, list recent activity, and prepare a Vote delegate ContractCall.",
    },
    {
      type: "code",
      language: "bash",
      code: `mkdir obscura-demo && cd obscura-demo
npm init -y
npm install @obscura-fhe/sdk viem dotenv`,
    },
    {
      type: "code",
      language: "typescript",
      title: "Reputation + activity",
      code: `import { ObscuraSDK } from "@obscura-fhe/sdk";
import "dotenv/config";

const sdk = ObscuraSDK.create({
  supabaseAnonKey: process.env.OBSCURA_SUPABASE_ANON_KEY,
});
const wallet = process.argv[2] as \`0x\${string}\`;

const summary = await sdk.reputation.getSummary(wallet);
const { items } = await sdk.activity.listForWallet(wallet, { pageSize: 10 });

console.log(summary.tier, summary.totalCappedWeight);
items.forEach((r) => console.log(r.event_name, r.tx_hash.slice(0, 10)));`,
    },
    {
      type: "code",
      language: "typescript",
      title: "Delegate transaction builder",
      code: `const call = sdk.vote.buildDelegate("0xDelegatee...");
console.log(sdk.encodeCall(call));`,
    },
  ],
};

export const sdkOnboardingPage: DocPage = {
  slug: "sdk-onboarding",
  title: "SDK onboarding",
  description: "Configure ObscuraSDK, wire viem clients, and inject FHE for encrypted writes.",
  category: "Getting started",
  blocks: [
    {
      type: "visual",
      variant: "sdk-modules",
    },
    {
      type: "heading",
      level: 2,
      text: "Full configuration",
      id: "config",
    },
    {
      type: "code",
      language: "typescript",
      title: "ObscuraSDK.create()",
      code: `import { ObscuraSDK } from "@obscura-fhe/sdk";
import { createPublicClient, createWalletClient, http } from "viem";
import { arbitrumSepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(),
});

const sdk = ObscuraSDK.create({
  publicClient,
  walletClient,              // optional — enables sendCall()
  supabaseAnonKey: process.env.OBSCURA_SUPABASE_ANON_KEY,
  fhe: cofheAdapter,           // optional — enables encryptUint64
});`,
    },
    {
      type: "heading",
      level: 2,
      text: "FHE adapter",
      id: "fhe",
    },
    {
      type: "code",
      language: "typescript",
      title: "FheProvider interface",
      code: `import type { FheProvider } from "@obscura-fhe/sdk";

export const cofheAdapter: FheProvider = {
  async encryptUint64(value, { contractAddress }) {
    // Wrap @cofhe/sdk — user must trigger encrypt (never on mount)
    return { ctHash, securityZone, utype, signature };
  },
};`,
    },
    {
      type: "heading",
      level: 2,
      text: "Common patterns",
      id: "patterns",
    },
    {
      type: "steps",
      items: [
        { title: "Read-only dashboard", description: "reputation + activity — no wallet or FHE required", href: "/docs/first-app" },
        { title: "Tx builder + external signer", description: "encodeCall() → pass calldata to any wallet", href: "/docs/quick-start" },
        { title: "Full write flow", description: "FheProvider + walletClient + sendCall()", href: "/docs/sdk" },
        { title: "Pre-encrypted inputs", description: "Pass InEuint64 directly to skip adapter at build time", href: "/docs/sdk" },
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: "MCP-ready",
      text: "Each sdk.* method is a flat, typed API surface designed to map 1:1 to future automation tools.",
    },
  ],
};

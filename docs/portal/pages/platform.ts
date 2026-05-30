import type { DocPage } from "../types";

export const architecturePage: DocPage = {
  slug: "architecture",
  title: "Architecture",
  description: "Five-tier system design from client SDK to CoFHE coprocessor and Supabase persistence.",
  category: "Platform",
  blocks: [
    {
      type: "visual",
      variant: "system-tiers",
    },
    {
      type: "visual",
      variant: "data-flow",
    },
    {
      type: "heading",
      level: 2,
      text: "Layer responsibilities",
      id: "layers",
    },
    {
      type: "table",
      headers: ["Layer", "Responsibility", "Failure mode"],
      rows: [
        ["Client", "UX, encryption, wallet signing, reveal-on-demand", "Masked values; no auto-decrypt"],
        ["EVM + CoFHE", "Encrypted state, ACL, public aggregates", "ACL errors if FHE.allowThis omitted"],
        ["Index", "Decode, sanitize, activity, reputation, push", "Worker down → empty activity feed"],
        ["API", "Prefs, subscriptions, reputation, UserOp relay", "Render cold start ~30s"],
        ["Persistence", "Activity, reputation, push state", "RLS permissive on testnet"],
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Product stack",
      id: "product-stack",
    },
    {
      type: "paragraph",
      text: "Private Payments (Pay) → Private Credit → Private Reputation → Private Governance (Vote). Each layer consumes signals from the prior without leaking individual amounts.",
    },
    {
      type: "heading",
      level: 2,
      text: "Production endpoints",
      id: "endpoints",
    },
    {
      type: "code",
      language: "text",
      title: "Deployment registry",
      code: `Frontend   https://obscuraos.online
API        https://obscura-api-n62v.onrender.com
Worker     https://obscura-worker-0ppj.onrender.com
Supabase   https://quoovjkjwgtdqwdofubh.supabase.co
Chain      Arbitrum Sepolia · chainId 421614`,
    },
  ],
};

export const privacyPage: DocPage = {
  slug: "privacy",
  title: "Privacy model",
  description: "What stays encrypted, what is public by design, and when users choose to reveal.",
  category: "Platform",
  blocks: [
    {
      type: "paragraph",
      text: "Obscura stores financial amounts as euint64 ciphertext handles on-chain. Plaintext appears only at explicit user reveal, intentional public aggregates, or unavoidable bridge metadata.",
    },
    {
      type: "visual",
      variant: "privacy-zones",
    },
    {
      type: "visual",
      variant: "cofhe-lifecycle",
    },
    {
      type: "heading",
      level: 2,
      text: "Product-specific guarantees",
      id: "guarantees",
    },
    {
      type: "table",
      headers: ["Product", "Encrypted", "Public by design"],
      rows: [
        ["Pay", "Transfer amounts, invoice/escrow/stream values", "Addresses, announce events, shield/unshield amounts"],
        ["Credit", "Supply/borrow/collateral shares, auction bids", "TVL, utilization, tier bucket"],
        ["Vote", "Ballot option, pre-finalize tallies", "Metadata, participation, delegation, post-finalize aggregates"],
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Indexer sanitization",
      id: "indexer",
    },
    {
      type: "list",
      items: [
        "Governor VoteCast — support, weight, reason stripped from Supabase args",
        "Treasury/Rewards events — amount fields removed before insert",
        "Credit market events — amount-free by contract design",
      ],
    },
    {
      type: "callout",
      variant: "warning",
      title: "Core Vote invariant",
      text: "Observers learn participation and aggregates; never individual choices unless the voter opts in to self-decrypt.",
    },
    {
      type: "heading",
      level: 2,
      text: "Frontend enforcement",
      id: "frontend-rules",
    },
    {
      type: "list",
      items: [
        "No decryptForView in useEffect — user-triggered only",
        "Masked UI (***) until explicit Reveal click",
        "Contact labels and receipts in localStorage only",
      ],
    },
  ],
};

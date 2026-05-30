import type { DocPage } from "../types";

export const reputationPage: DocPage = {
  slug: "reputation",
  title: "Reputation",
  description: "Cross-product reputation pipeline from indexed events to tiered API summaries.",
  category: "Shared services",
  blocks: [
    {
      type: "paragraph",
      text: "Reputation derives capped signal weights from Pay, Credit, and Vote indexed events. The worker writes obscura_reputation_events; the API aggregates into tier buckets for UI panels and Credit Score V2 inputs.",
    },
    {
      type: "visual",
      variant: "reputation-flow",
    },
    {
      type: "heading",
      level: 2,
      text: "Tier thresholds",
      id: "tiers",
    },
    {
      type: "table",
      headers: ["Tier", "Capped weight"],
      rows: [
        ["new", "< 3"],
        ["active", "3 – 11"],
        ["steady", "12 – 23"],
        ["reliable", "≥ 24"],
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "API response",
      id: "api",
    },
    {
      type: "code",
      language: "json",
      code: `GET https://obscura-api-n62v.onrender.com/reputation/0xWallet

{
  "wallet": "0x...",
  "sourceApp": "all",
  "totalCappedWeight": 47,
  "tier": "steady",
  "signals": { "credit_repaid": { "count": 2, "cappedWeight": 24 } },
  "sources": { "credit": 44, "pay": 3, "vote": 0 }
}`,
    },
    {
      type: "heading",
      level: 2,
      text: "SDK usage",
      id: "sdk",
    },
    {
      type: "code",
      language: "typescript",
      code: `const summary = await sdk.reputation.getSummary(wallet);
// summary.tier: "new" | "active" | "steady" | "reliable"`,
    },
    {
      type: "heading",
      level: 2,
      text: "Signal coverage",
      id: "signals",
    },
    {
      type: "paragraph",
      text: "28 signal types across products: 7 Pay (payments, streams, escrows, invoices), 11 Credit (supply, borrow, repay, liquidation, vault, score), 10 Vote (participation, delegation, treasury, rewards, governor). Deduplication key: (wallet, source_app, signal_type, event_ref).",
    },
  ],
};

export const activityPage: DocPage = {
  slug: "activity",
  title: "Activity",
  description: "Indexed on-chain activity via Supabase Realtime — no REST /activity endpoint.",
  category: "Shared services",
  blocks: [
    {
      type: "paragraph",
      text: "The obscura-worker indexes 51 event types from 19 live contract instances into obscura_activity. The frontend and SDK read directly from Supabase with wallet-scoped filters.",
    },
    {
      type: "heading",
      level: 2,
      text: "Row schema",
      id: "schema",
    },
    {
      type: "table",
      headers: ["Field", "Meaning"],
      rows: [
        ["chain_id", "421614"],
        ["block_number, tx_hash, log_index", "Idempotency key"],
        ["event_name", "Namespaced e.g. ObscuraVote.VoteCast"],
        ["wallet", "Primary extracted wallet"],
        ["participants", "All addresses from event args"],
        ["args", "JSON — sanitized; amounts stripped where required"],
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Event filters",
      id: "filters",
    },
    {
      type: "table",
      headers: ["Filter", "Use case"],
      rows: [
        ["sent / received", "Pay transfers"],
        ["stream", "PayStreamV3 lifecycle"],
        ["invoice / escrow", "Pay commerce flows"],
        ["credit", "Market, vault, auction, score events"],
        ["vote", "Vote, Governor, Treasury, Rewards"],
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "SDK usage",
      id: "sdk",
    },
    {
      type: "code",
      language: "typescript",
      code: `const { items, hasMore } = await sdk.activity.listForWallet(wallet, {
  filter: "vote",
  page: 0,
  pageSize: 20,
});

const filters = sdk.activity.getEventFilters();`,
    },
    {
      type: "callout",
      variant: "info",
      title: "Frontend hook",
      text: "useActivityFeed mirrors SDK filters with Supabase Realtime primary and 30-second polling fallback. Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    },
  ],
};

export const notificationsPage: DocPage = {
  slug: "notifications",
  title: "Notifications",
  description: "Web Push pipeline with amount-free payloads and opt-in UX.",
  category: "Shared services",
  blocks: [
    {
      type: "paragraph",
      text: "Notifications dispatch on obscura_activity INSERT via worker and API Realtime listeners. Payloads are generic and amount-free — no decrypted values in push body.",
    },
    {
      type: "diagram",
      title: "Dispatch pipeline",
      mermaid: `flowchart LR
  ACT[activity INSERT] --> WK[Worker dispatch]
  WK --> PREFS[notification_prefs]
  WK --> SUBS[push_subscriptions]
  PREFS --> PUSH[web-push]
  PUSH --> SW[/sw.js]
  SW --> BROWSER[Browser notification]`,
    },
    {
      type: "heading",
      level: 2,
      text: "API routes",
      id: "routes",
    },
    {
      type: "table",
      headers: ["Method", "Path", "Purpose"],
      rows: [
        ["GET", "/vapid-public-key", "Web Push public key"],
        ["POST", "/subscribe", "Save push subscription"],
        ["DELETE", "/subscribe", "Remove subscription"],
        ["POST", "/prefs", "Save notification preferences"],
        ["GET", "/prefs/:wallet", "Read preferences"],
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "SDK usage",
      id: "sdk",
    },
    {
      type: "code",
      language: "typescript",
      code: `const vapid = await sdk.notifications.getVapidPublicKey();
const prefs = await sdk.notifications.getPrefs(wallet);
await sdk.notifications.savePrefs({ wallet, push_enabled: true, email_enabled: false, events: ["*"] });
await sdk.notifications.subscribe(wallet, pushSubscription);`,
    },
    {
      type: "heading",
      level: 2,
      text: "UX rules",
      id: "ux",
    },
    {
      type: "list",
      items: [
        "Opt-in only — user triggers permission from Settings",
        "Service worker /sw.js handles click navigation to /pay, /credit, or /vote",
        "Stale subscriptions removed on Web Push 404/410",
        "Credit health alerts (useCreditAlerts) are local browser notifications, not server push",
      ],
    },
  ],
};

export const sdkReferencePage: DocPage = {
  slug: "sdk",
  title: "SDK reference",
  description: "Complete @obscura-fhe/sdk module API, types, and constants.",
  category: "Reference",
  blocks: [
    {
      type: "callout",
      variant: "info",
      title: "Requirements by module",
      text: "activity → supabaseAnonKey (+ optional supabaseUrl). On-chain reads → rpcUrl or publicClient (chain 421614). Encrypted writes → fhe or pre-encrypted InEuint64. sendCall → walletClient.",
    },
    {
      type: "code",
      language: "bash",
      title: "Install",
      code: "npm install @obscura-fhe/sdk viem",
    },
    {
      type: "visual",
      variant: "sdk-modules",
    },
    {
      type: "heading",
      level: 2,
      text: "ObscuraSDK",
      id: "obscura-sdk",
    },
    {
      type: "code",
      language: "typescript",
      code: `ObscuraSDK.create(config?: ObscuraSDKConfig): ObscuraSDK

// Instance properties
sdk.chainId, sdk.addresses, sdk.publicClient, sdk.fhe
sdk.pay, sdk.credit, sdk.vote, sdk.reputation, sdk.activity, sdk.notifications

// Helpers
sdk.encodeCall(call: ContractCall): Hex
sdk.sendCall(call, account): Promise<Hex>  // requires walletClient`,
    },
    {
      type: "heading",
      level: 2,
      text: "PayModule",
      id: "pay-module",
    },
    {
      type: "table",
      headers: ["Method", "Returns", "Notes"],
      rows: [
        ["getShieldedBalance(account)", "Promise<bigint>", "ctHash handle"],
        ["buildShield(amount, enc?)", "Promise<ContractCall>", "FHE or pre-encrypted"],
        ["buildUnshield(to, amount, enc?)", "Promise<ContractCall>", ""],
        ["buildTransfer(to, amount, enc?)", "Promise<ContractCall>", ""],
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "CreditModule",
      id: "credit-module",
    },
    {
      type: "table",
      headers: ["Method", "Returns"],
      rows: [
        ["getMarketAddress(override?)", "Address"],
        ["buildSupplyCollateral(amount, enc?, market?)", "Promise<ContractCall>"],
        ["buildBorrow(amount, enc?, market?)", "Promise<ContractCall>"],
        ["buildRepay(amount, enc?, market?)", "Promise<ContractCall>"],
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "VoteModule",
      id: "vote-module",
    },
    {
      type: "table",
      headers: ["Method", "Returns"],
      rows: [
        ["getProposalCount()", "Promise<bigint>", "Reads ObscuraVote.nextProposalId()"],
        ["getProposal(id)", "Promise<ProposalState>"],
        ["buildCastVote(proposalId, optionIndex, enc?)", "Promise<ContractCall>"],
        ["buildDelegate(delegatee)", "ContractCall"],
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "ReputationModule",
      id: "reputation-module",
    },
    {
      type: "code",
      language: "typescript",
      code: "getSummary(wallet: Address): Promise<ReputationSummary>",
    },
    {
      type: "heading",
      level: 2,
      text: "ActivityModule",
      id: "activity-module",
    },
    {
      type: "code",
      language: "typescript",
      code: `listForWallet(wallet, options?: ActivityListOptions): Promise<ActivityListResult>
getEventFilters(): ActivityEventFilterMap
isConfigured(): boolean  // true when supabaseUrl + supabaseAnonKey set`,
    },
    {
      type: "heading",
      level: 2,
      text: "NotificationsModule",
      id: "notifications-module",
    },
    {
      type: "list",
      items: [
        "getVapidPublicKey(): Promise<string>",
        "getPrefs(wallet): Promise<NotificationPrefs | null>",
        "savePrefs(prefs): Promise<void>",
        "subscribe(wallet, subscription): Promise<void>",
        "unsubscribe(wallet): Promise<void>",
      ],
    },
    {
      type: "heading",
      level: 2,
      text: "Exported types & constants",
      id: "exports",
    },
    {
      type: "list",
      items: [
        "Types: ContractCall, InEuint64, FheProvider, ReputationSummary, ActivityItem, NotificationPrefs, ProposalState",
        "Constants: DEFAULT_ADDRESSES, DEFAULT_SUPABASE_URL, ARBITRUM_SEPOLIA_CHAIN_ID, ACTIVITY_EVENT_FILTERS, DEFAULT_API_URL, DEFAULT_RPC_URL",
        "Errors: FheRequiredError, HttpError",
        "ABIs: OC_USDC_PAY_ABI, CREDIT_MARKET_ABI, OBSCURA_VOTE_ABI",
      ],
    },
  ],
};

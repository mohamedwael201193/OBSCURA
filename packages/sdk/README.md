# @obscura-fhe/sdk

Official TypeScript SDK for **Obscura Pay**, **Credit**, and **Vote** on Arbitrum Sepolia.

Privacy-first DeFi with FHE (Fully Homomorphic Encryption). Framework-agnostic — works in Node.js, browsers, Vite, Next.js, and automation scripts.

## Install

```bash
npm install @obscura-fhe/sdk viem
```

`viem` is a **peer dependency** (v2+). You must install it alongside the SDK.

## Requirements at a glance

| Module | Wallet | RPC / chain | Supabase | FHE provider |
|--------|--------|-------------|----------|--------------|
| `reputation` | No | No | No | No |
| `notifications` | No | No | No | No |
| `activity` | No | No | **Yes** (URL + anon key) | No |
| `pay` / `credit` / `vote` reads | No | **Yes** (default RPC) | No | No |
| Encrypted writes (`buildShield`, etc.) | Optional* | Yes | No | **Yes** (or pre-encrypted input) |
| `sendCall()` | **Yes** (`walletClient`) | Yes | No | If write needs FHE |

\*Use `encodeCall()` and sign externally if you do not inject `walletClient`.

**Network:** Arbitrum Sepolia (`chainId` **421614**) by default.

## Quick start

```typescript
import { ObscuraSDK } from "@obscura-fhe/sdk";

const sdk = ObscuraSDK.create({
  // Required for activity feed only:
  supabaseAnonKey: process.env.OBSCURA_SUPABASE_ANON_KEY,
  // supabaseUrl defaults to Obscura production project
});

// Reputation — no wallet, no Supabase
const summary = await sdk.reputation.getSummary("0xYourWallet...");
console.log(summary.tier, summary.totalCappedWeight);

// Activity — requires supabaseAnonKey
if (sdk.activity.isConfigured()) {
  const { items } = await sdk.activity.listForWallet("0xYourWallet...", { filter: "credit" });
  console.log(items.length);
}

// On-chain read — uses default Arbitrum Sepolia RPC
const proposalCount = await sdk.vote.getProposalCount(); // reads nextProposalId()
const balanceCt = await sdk.pay.getShieldedBalance("0xYourWallet...");
```

## viem integration (recommended)

Pass an explicit RPC URL and viem clients when you need custom transport, account abstraction, or `sendCall()`:

```typescript
import { ObscuraSDK } from "@obscura-fhe/sdk";
import { createPublicClient, createWalletClient, http, custom } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const rpcUrl = process.env.ARB_SEPOLIA_RPC_URL ?? "https://sepolia-rollup.arbitrum.io/rpc";

const publicClient = createPublicClient({
  chain: arbitrumSepolia,
  transport: http(rpcUrl),
});

// Browser wallet (MetaMask, etc.)
const walletClient = createWalletClient({
  chain: arbitrumSepolia,
  transport: custom(window.ethereum),
});

// Or Node with private key
// const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
// const walletClient = createWalletClient({ account, chain: arbitrumSepolia, transport: http(rpcUrl) });

const sdk = ObscuraSDK.create({
  chainId: 421614,
  rpcUrl,
  publicClient,
  walletClient,
  supabaseUrl: process.env.OBSCURA_SUPABASE_URL,
  supabaseAnonKey: process.env.OBSCURA_SUPABASE_ANON_KEY,
});

// Shorthand — SDK creates publicClient from rpcUrl when publicClient omitted:
const sdkMinimal = ObscuraSDK.create({ rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc" });
```

## Activity module — Supabase setup

The activity feed reads indexed on-chain events from Supabase (`obscura_activity`). **Both** credentials are required:

```typescript
import { ObscuraSDK, DEFAULT_SUPABASE_URL } from "@obscura-fhe/sdk";

const sdk = ObscuraSDK.create({
  supabaseUrl: process.env.OBSCURA_SUPABASE_URL ?? DEFAULT_SUPABASE_URL,
  supabaseAnonKey: process.env.OBSCURA_SUPABASE_ANON_KEY!, // required
});

if (!sdk.activity.isConfigured()) {
  throw new Error("Set OBSCURA_SUPABASE_ANON_KEY for activity queries");
}

const { items, hasMore } = await sdk.activity.listForWallet(wallet, {
  filter: "vote", // all | pay | credit | vote | stream | ...
  page: 0,
  pageSize: 20,
});
```

**Environment variables:**

```bash
OBSCURA_SUPABASE_URL=https://quoovjkjwgtdqwdofubh.supabase.co   # optional — this is the default
OBSCURA_SUPABASE_ANON_KEY=eyJ...                                 # required for activity
```

Get the anon key from Supabase → Project Settings → API → `anon` `public` key.

## TypeScript setup

The SDK ships ESM + CJS with `.d.ts` types. Recommended `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "verbatimModuleSyntax": true
  }
}
```

### `verbatimModuleSyntax`

With `verbatimModuleSyntax: true`, TypeScript requires **type-only imports** for types:

```typescript
// Correct
import { ObscuraSDK } from "@obscura-fhe/sdk";
import type { FheProvider, ReputationSummary, ContractCall } from "@obscura-fhe/sdk";

// Wrong — TS1363 error under verbatimModuleSyntax
import { FheProvider, ReputationSummary } from "@obscura-fhe/sdk";
```

If you cannot use type-only imports, set `"verbatimModuleSyntax": false` or use `"isolatedModules": true` without verbatim (Vite/Next default).

## Module examples

See [`examples/`](./examples/) for runnable scripts:

| File | Module |
|------|--------|
| `examples/reputation.ts` | Reputation summary |
| `examples/activity.ts` | Activity feed (Supabase) |
| `examples/notifications.ts` | VAPID + prefs |
| `examples/pay.ts` | Shielded balance + transfer builder |
| `examples/credit.ts` | Market address + borrow builder |
| `examples/vote.ts` | Proposal count + delegate |
| `examples/basic-usage.ts` | Combined smoke test |

Run: `npm run example:basic` or `npx tsx examples/reputation.ts`

## Configuration reference

```typescript
ObscuraSDK.create({
  chainId: 421614,                    // default: Arbitrum Sepolia
  rpcUrl: "https://...",              // default: Arbitrum Sepolia public RPC
  apiUrl: "https://...",              // default: obscura-api production
  supabaseUrl: "https://...",         // default: Obscura Supabase project
  supabaseAnonKey: "...",             // required for activity module
  addresses: { ocUSDC_Pay: "0x..." }, // override deployment registry
  publicClient,                       // inject viem PublicClient
  walletClient,                       // optional — for sdk.sendCall()
  fhe: myFheAdapter,                   // optional — for encrypted writes
});
```

## FHE (encrypted writes)

Encrypted contract inputs require a host-supplied `FheProvider` (typically wrapping `@fhenixprotocol/cofhe-sdk`):

```typescript
import type { FheProvider } from "@obscura-fhe/sdk";

const fhe: FheProvider = {
  async encryptUint64(value, { contractAddress }) {
    // wrap CoFHE encrypt — user-triggered only
    return { ctHash, securityZone, utype, signature };
  },
};

const sdk = ObscuraSDK.create({ fhe });
await sdk.pay.buildShield(1000n); // encrypts via adapter

// Or pass pre-encrypted input directly:
await sdk.pay.buildShield(1000n, preEncryptedInEuint64);
```

## Sending transactions

```typescript
const call = sdk.vote.buildDelegate("0xDelegatee...");
const hash = await sdk.sendCall(call, account); // requires walletClient
```

## Modules

| Module | Methods | Backend |
|--------|---------|---------|
| `pay` | `getShieldedBalance`, `buildShield`, `buildUnshield`, `buildTransfer` | On-chain (ocUSDC_Pay) |
| `credit` | `getMarketAddress`, `buildSupplyCollateral`, `buildBorrow`, `buildRepay` | On-chain (credit market) |
| `vote` | `getProposalCount`, `getProposal`, `buildCastVote`, `buildDelegate` | On-chain (ObscuraVote) |
| `reputation` | `getSummary` | obscura-api REST |
| `activity` | `listForWallet`, `getEventFilters`, `isConfigured` | Supabase |
| `notifications` | `getVapidPublicKey`, `getPrefs`, `savePrefs`, `subscribe`, `unsubscribe` | obscura-api REST |

## Defaults (Arbitrum Sepolia)

| Setting | Value |
|---------|-------|
| Chain ID | `421614` |
| RPC | `https://sepolia-rollup.arbitrum.io/rpc` |
| Supabase URL | `https://quoovjkjwgtdqwdofubh.supabase.co` |
| ocUSDC_Pay | `0xEd46020Df8abe7BB1E096f27d089F4326D223a53` |
| Vote | `0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730` |
| Credit market | `0x1Ec113297c7F9516A6604aa3b18C180559a6f551` |
| API | `https://obscura-api-n62v.onrender.com` |

## Exports

Core: `ObscuraSDK`, `ObscuraSDKConfig`, `ContractCall`, `InEuint64`, `FheProvider`, `FheRequiredError`

Types: `ReputationSummary`, `ActivityItem`, `NotificationPrefs`, `ProposalState`, …

Constants: `DEFAULT_ADDRESSES`, `DEFAULT_SUPABASE_URL`, `ARBITRUM_SEPOLIA_CHAIN_ID`, `ACTIVITY_EVENT_FILTERS`

Utilities: `encodeCall`, `normalizeWallet`, `toContractInEuint64`, `HttpError`

## License

MIT — see [LICENSE](./LICENSE).

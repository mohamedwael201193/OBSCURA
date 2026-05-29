# @obscura/sdk

Official TypeScript SDK for **Obscura Pay**, **Credit**, and **Vote** on Arbitrum Sepolia.

Privacy-first DeFi with FHE (Fully Homomorphic Encryption). Framework-agnostic — works in Node.js, browsers, and automation scripts.

## Install

```bash
npm install @obscura/sdk viem
```

`viem` is a peer dependency (v2+).

## Quick start

```typescript
import { ObscuraSDK } from "@obscura/sdk";

const sdk = ObscuraSDK.create({
  supabaseAnonKey: process.env.OBSCURA_SUPABASE_ANON_KEY, // required for activity feed
});

// Reputation (off-chain, obscura-api)
const summary = await sdk.reputation.getSummary("0xYourWallet...");
console.log(summary.tier, summary.totalCappedWeight);

// Activity feed (Supabase)
const { items, hasMore } = await sdk.activity.listForWallet("0xYourWallet...", {
  filter: "credit",
  page: 0,
});

// Notifications
const vapidKey = await sdk.notifications.getVapidPublicKey();
const prefs = await sdk.notifications.getPrefs("0xYourWallet...");

// On-chain reads
const balanceCtHash = await sdk.pay.getShieldedBalance("0xYourWallet...");
const proposalCount = await sdk.vote.getProposalCount();

// Transaction builders (return ContractCall — sign with your wallet)
const call = await sdk.pay.buildTransfer(to, amount, encryptedAmount);
const calldata = sdk.encodeCall(call);
```

## Modules

| Module | Methods | Backend |
|--------|---------|---------|
| `pay` | `getShieldedBalance`, `buildShield`, `buildUnshield`, `buildTransfer` | On-chain (ocUSDC_Pay) |
| `credit` | `getMarketAddress`, `buildSupplyCollateral`, `buildBorrow`, `buildRepay` | On-chain (credit market) |
| `vote` | `getProposalCount`, `getProposal`, `buildCastVote`, `buildDelegate` | On-chain (ObscuraVote) |
| `reputation` | `getSummary` | obscura-api REST |
| `activity` | `listForWallet`, `getEventFilters` | Supabase |
| `notifications` | `getVapidPublicKey`, `getPrefs`, `savePrefs`, `subscribe`, `unsubscribe` | obscura-api REST |

## Configuration

```typescript
ObscuraSDK.create({
  chainId: 421614,                    // default: Arbitrum Sepolia
  rpcUrl: "https://...",              // default: Arbitrum Sepolia RPC
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

Encrypted contract inputs require a host-supplied `FheProvider` (typically wrapping `@cofhe/sdk`):

```typescript
import type { FheProvider } from "@obscura/sdk";

const fhe: FheProvider = {
  async encryptUint64(value, { contractAddress }) {
    // wrap @cofhe/sdk encrypt here
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

## Defaults (Arbitrum Sepolia)

| Setting | Value |
|---------|-------|
| Chain ID | `421614` |
| ocUSDC_Pay | `0xEd46020Df8abe7BB1E096f27d089F4326D223a53` |
| Vote | `0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730` |
| Credit market | `0x1Ec113297c7F9516A6604aa3b18C180559a6f551` |
| API | `https://obscura-api-n62v.onrender.com` |

## Exports

Core: `ObscuraSDK`, `ObscuraSDKConfig`, `ContractCall`, `InEuint64`, `FheProvider`, `FheRequiredError`

Types: `ReputationSummary`, `ActivityItem`, `NotificationPrefs`, `ProposalState`, …

Constants: `DEFAULT_ADDRESSES`, `ARBITRUM_SEPOLIA_CHAIN_ID`, `ACTIVITY_EVENT_FILTERS`

Utilities: `encodeCall`, `normalizeWallet`, `toContractInEuint64`, `HttpError`

## License

MIT — see [LICENSE](./LICENSE).

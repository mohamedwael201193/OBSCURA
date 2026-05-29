# @obscura/sdk v1 — Architecture Plan

> Canonical reference: `OBSCURA_PROTOCOL_ARCHITECTURE_v1.md` (v1.1)

## Purpose

`@obscura/sdk` is the official TypeScript SDK for Obscura Pay, Credit, and Vote.
It exposes typed, framework-agnostic APIs for integrators, automation scripts, and future MCP tools.

**In scope:** chain reads, transaction builders, REST/Supabase off-chain services.  
**Out of scope:** React hooks, UI components, MCP server, documentation site.

---

## Design Principles

| Principle | Implementation |
|-----------|----------------|
| Minimal setup | `ObscuraSDK.create()` with Arbitrum Sepolia defaults |
| Strong typing | Shared types mirror frontend hooks + API responses |
| Framework-agnostic | No React/wagmi; viem as peer dependency |
| FHE injectable | `FheProvider` interface; encrypt/decrypt supplied by host app |
| MCP-ready | Flat module surface (`sdk.pay`, `sdk.reputation`, …) maps 1:1 to future tools |
| Privacy-first | No auto-decrypt; encrypted ctHash reads only unless user calls decrypt via provider |

---

## Package Layout

```
packages/sdk/
├── src/
│   ├── index.ts              # Public exports
│   ├── client.ts             # ObscuraSDK facade
│   ├── types/                # Shared domain types
│   ├── config/               # Defaults, addresses, event filters
│   ├── core/                 # HttpClient, chain helpers, utils
│   ├── fhe/                  # InEuint64 types + FheProvider interface
│   ├── abis/                 # Minimal ABI fragments for encode/decode
│   └── modules/
│       ├── pay.ts
│       ├── credit.ts
│       ├── vote.ts
│       ├── reputation.ts
│       ├── activity.ts
│       └── notifications.ts
├── tests/
├── examples/
├── SDK_ARCHITECTURE.md
└── PUBLISH_CHECKLIST.md
```

---

## Core Client

```typescript
interface ObscuraSDKConfig {
  chainId?: number;                    // default 421614
  rpcUrl?: string;
  apiUrl?: string;                     // obscura-api base
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  addresses?: Partial<ObscuraAddresses>; // override deployment registry
  publicClient?: PublicClient;         // inject viem client
  walletClient?: WalletClient;         // optional for sendTransaction helpers
  fhe?: FheProvider;                   // optional CoFHE adapter
}

const sdk = ObscuraSDK.create({ /* overrides */ });
```

Modules are lazy-initialized properties on `ObscuraSDK`:

- `sdk.pay` — ocUSDC shield/unshield/transfer, balance reads, tx builders
- `sdk.credit` — market/vault reads, supply/borrow/repay tx builders
- `sdk.vote` — proposal reads, castVote/delegate tx builders (requires FHE for votes)
- `sdk.reputation` — GET `/reputation/:wallet`
- `sdk.activity` — Supabase `obscura_activity` queries with event filters
- `sdk.notifications` — prefs, subscribe, VAPID key

---

## Module Boundaries

### Pay (`PayModule`)

**On-chain:** `ocUSDC_Pay`, `ObscuraPayStreamV3`, `ObscuraConfidentialEscrow`, `ObscuraInvoice`

| Method | Type |
|--------|------|
| `getShieldedBalance(account)` | read (ctHash) |
| `buildShield(amount, fhe)` | write builder |
| `buildUnshield(amount, fhe)` | write builder |
| `buildTransfer(to, amount, fhe)` | write builder |
| `getStreamCount(account)` | read |

FHE amounts use `FheProvider.encryptUint64(amount, contractAddress)`.

### Credit (`CreditModule`)

**On-chain:** canonical market `CreditCanonicalPayOcUSDCMarket`, factory, vaults, score V2

| Method | Type |
|--------|------|
| `getMarketState(marketAddress?)` | read |
| `getPosition(account, marketAddress?)` | read (encrypted fields as ctHash) |
| `buildSupplyCollateral(amount, fhe, market?)` | write builder |
| `buildBorrow(amount, fhe, market?)` | write builder |
| `buildRepay(amount, fhe, market?)` | write builder |

### Vote (`VoteModule`)

**On-chain:** `ObscuraVote`, `ObscuraTreasury`, `ObscuraRewards`

| Method | Type |
|--------|------|
| `getProposal(id)` | read |
| `getProposalCount()` | read |
| `buildCastVote(proposalId, optionIndex, fhe)` | write builder |
| `buildDelegate(delegatee)` | write builder |

### Reputation (`ReputationModule`)

**Off-chain:** `GET {apiUrl}/reputation/:wallet`

Returns `ReputationSummary` (tier, signals, capped weights) — same shape as frontend hook.

### Activity (`ActivityModule`)

**Off-chain:** Supabase `obscura_activity` (direct read, no REST route)

| Method | Type |
|--------|------|
| `listForWallet(wallet, options)` | paginated query |
| `subscribe(wallet, callback)` | realtime channel (optional) |

Event filters mirror `useActivityFeed` (`sent`, `credit`, `vote`, etc.).

### Notifications (`NotificationsModule`)

**Off-chain:** obscura-api notification routes

| Method | Type |
|--------|------|
| `getVapidPublicKey()` | GET |
| `getPrefs(wallet)` | GET |
| `savePrefs(prefs)` | POST |
| `subscribe(wallet, subscription)` | POST |
| `unsubscribe(wallet)` | DELETE |

---

## FHE Adapter

```typescript
interface FheProvider {
  encryptUint64(value: bigint, contractAddress: Address): Promise<InEuint64>;
  decryptCtHash?(ctHash: bigint, contractAddress: Address): Promise<bigint>;
}
```

SDK does **not** bundle `@cofhe/sdk`. Host apps (browser dApp, future MCP with wallet) inject an adapter.
Transaction builders accept pre-encrypted `InEuint64` or call `fhe.encryptUint64` when provider is configured.

---

## Transaction Builder Pattern

Write methods return `ContractCall` — serializable for any signer:

```typescript
interface ContractCall {
  address: Address;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  chainId: number;
}
```

Helpers:
- `sdk.encodeCall(call)` → calldata hex
- `sdk.sendCall(call)` → requires `walletClient` on config

---

## Default Service Endpoints

| Service | Default |
|---------|---------|
| Chain | Arbitrum Sepolia (421614) |
| API | `https://obscura-api-n62v.onrender.com` |
| Supabase | `https://quoovjkjwgtdqwdofubh.supabase.co` |
| Canonical asset | `ocUSDC_Pay` `0xEd46020Df8abe7BB1E096f27d089F4326D223a53` |

Addresses loaded from embedded `arb-sepolia.json` snapshot (synced from `contracts-hardhat/deployments/`).

---

## Testing Strategy

- **Unit:** utils, event filters, address normalization, tx encoding (viem `encodeFunctionData`)
- **Module mocks:** `fetch` for API modules; Supabase client mock for activity
- **Integration (optional):** skipped in CI unless `OBSCURA_INTEGRATION=1`

Run: `npm run test`, `npm run typecheck`, `npm run build`

---

## Versioning & MCP Compatibility

- v1.0.0: initial module surface stable for MCP tool mapping
- Breaking changes logged in `sdk_memory.md`
- Each module method designed as a single MCP tool candidate (flat args, typed return)

---

## Implementation Order

1. Core + config + types
2. Reputation (API-only, simplest)
3. Notifications (API-only)
4. Activity (Supabase)
5. Pay (chain reads + builders)
6. Credit (chain reads + builders)
7. Vote (chain reads + builders)
8. Examples + publish checklist

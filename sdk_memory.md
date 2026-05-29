# Obscura SDK Memory Log

> Living log for `@obscura/sdk` v1 development.

## Status: v1.0.0 READY

| Gate | Status |
|------|--------|
| Architecture plan | ✅ `packages/sdk/SDK_ARCHITECTURE.md` |
| Package scaffold | ✅ `packages/sdk/` |
| Build | ✅ `npm run build` — ESM + CJS + DTS |
| Typecheck | ✅ `npm run typecheck` |
| Tests | ✅ 14/14 passed |
| Examples | ✅ `npm run example:basic` — live API verified |

---

## Architecture Decisions

### AD-001: Framework-agnostic core
- **Decision:** No React/wagmi dependencies. viem as peer dependency.
- **Rationale:** SDK must run in Node scripts, browsers, and future MCP servers.

### AD-002: Injectable FHE provider
- **Decision:** `FheProvider` interface; `@cofhe/sdk` not bundled.
- **Rationale:** FHE requires wallet/browser context; host app supplies encrypt/decrypt.

### AD-003: Transaction builder pattern
- **Decision:** Write methods return `ContractCall` objects, not signed txs.
- **Rationale:** Signers vary (EOA, AA, hardware); SDK stays signer-agnostic.

### AD-004: Embedded deployment registry
- **Decision:** Ship defaults in `src/config/defaults.ts`; overridable via config.
- **Rationale:** Zero-config for Arbitrum Sepolia; sync from `arb-sepolia.json` on redeploy.

### AD-005: Activity via Supabase direct
- **Decision:** Activity module uses `@supabase/supabase-js`, not REST.
- **Rationale:** Matches frontend; no `/activity` API route exists.

### AD-006: API base URL unified
- **Decision:** Reputation + notifications share `apiUrl` (obscura-api).
- **Rationale:** Matches production (`https://obscura-api-n62v.onrender.com`).

### AD-007: Supabase anon key not embedded
- **Decision:** Consumer must pass `supabaseAnonKey`; no secret in package defaults.
- **Rationale:** Security; key is env-specific though public/RLS-scoped.

---

## Public API Surface

```typescript
import { ObscuraSDK } from '@obscura/sdk';

const sdk = ObscuraSDK.create({
  supabaseAnonKey: process.env.OBSCURA_SUPABASE_ANON_KEY,
  fhe: optionalFheProvider,
  walletClient: optionalWalletClient,
});

sdk.pay | sdk.credit | sdk.vote | sdk.reputation | sdk.activity | sdk.notifications
sdk.encodeCall(call)
sdk.sendCall(call, account)  // requires walletClient
```

---

## Module APIs (v1.0.0)

### Reputation
- `getSummary(wallet)` → `ReputationSummary`

### Notifications
- `getVapidPublicKey()` → `string`
- `getPrefs(wallet)` → `NotificationPrefs | null`
- `savePrefs(prefs)` → `void`
- `subscribe(wallet, subscription)` → `void`
- `unsubscribe(wallet)` → `void`

### Activity
- `listForWallet(wallet, options?)` → `ActivityListResult`
- `getEventFilters()` → `ActivityEventFilterMap`

### Pay
- `getShieldedBalance(account)` → `bigint` (ctHash)
- `buildShield(amount, encrypted?)` → `ContractCall`
- `buildUnshield(to, amount, encrypted?)` → `ContractCall`
- `buildTransfer(to, amount, encrypted?)` → `ContractCall`

### Credit
- `getMarketAddress(override?)` → `Address`
- `buildSupplyCollateral(amount, encrypted?, market?)` → `ContractCall`
- `buildBorrow(amount, encrypted?, market?)` → `ContractCall`
- `buildRepay(amount, encrypted?, market?)` → `ContractCall`

### Vote
- `getProposalCount()` → `bigint`
- `getProposal(id)` → `ProposalState`
- `buildCastVote(proposalId, optionIndex, encrypted?)` → `ContractCall`
- `buildDelegate(delegatee)` → `ContractCall`

---

## Breaking Changes

_None (initial v1.0.0 release)._

---

## Test Results

| Run | Date | Build | Typecheck | Tests | Example | Notes |
|-----|------|-------|-----------|-------|---------|-------|
| 1 | 2026-05-29 | ✅ | ✅ | 14/14 ✅ | ✅ | Live reputation + VAPID OK |

### Test coverage
- Utils (wallet normalize, InEuint64 serialize)
- Activity event filters (pay/credit/vote namespaces)
- ObscuraSDK factory + module wiring
- Pay/Credit/Vote tx encoding via viem
- FheRequiredError when no provider
- Reputation HTTP mock
- Notifications 404 → null
- Activity supabase-not-configured guard

---

## Example Output (2026-05-29)

```
Reputation tier: reliable (24 weight)
VAPID key prefix: BIgVcwUhCL93...
Transfer calldata length: 458 chars
Activity vote events: 10
```

---

## Fixes Applied

1. **PowerShell CI:** use `;` not `&&` for command chains on Windows.
2. **Notifications 404:** use `HttpError.status === 404` for missing prefs.
3. **Supabase key:** removed placeholder JWT from defaults — required via config.

---

## Remaining Work (post-v1)

- [ ] npm publish to registry
- [ ] Optional: `@obscura/sdk/fhe-cofhe` adapter package wrapping `@cofhe/sdk`
- [ ] Optional: integration tests with `OBSCURA_INTEGRATION=1`
- [ ] Optional: activity realtime `subscribe()` helper
- [ ] Sync addresses script from `contracts-hardhat/deployments/arb-sepolia.json`
- [ ] MCP layer (explicitly deferred)

---

## References

- Architecture bible: `OBSCURA_PROTOCOL_ARCHITECTURE_v1.md`
- SDK architecture: `packages/sdk/SDK_ARCHITECTURE.md`
- Publish checklist: `packages/sdk/PUBLISH_CHECKLIST.md`

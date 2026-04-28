# Wave 3 — Obscura Pay: Implementation Progress

> Privacy-hardened V2 streams + insurance subscription + encrypted address book +
> stealth rotation + social resolver + inbox filter — all live on
> **Arbitrum Sepolia (chainId 421614)** with no mocks and no test tokens.

---

## Scope Overview

| #  | Task | Location | Status |
|----|------|----------|--------|
| 1  | `ObscuraPayrollResolverV2.sol` (per-cycle salt approval/cancel) | `contracts-hardhat/contracts/` | ✅ Done |
| 2  | `ObscuraPayStreamV2.sol` (`InEaddress` recipient hint, jitter, salt commits, pause/cancel) | `contracts-hardhat/contracts/` | ✅ Done |
| 3  | `ObscuraAddressBook.sol` (`InEaddress` payload + label hash) | `contracts-hardhat/contracts/` | ✅ Done |
| 4  | `ObscuraInboxIndex.sol` (per-recipient ignore filter; `ignoreSender` / `ignoreSenders` / `resetFilter`) | `contracts-hardhat/contracts/` | ✅ Done |
| 5  | `ObscuraInsuranceSubscription.sol` (auto-charge with ciphertext premium cap) | `contracts-hardhat/contracts/` | ✅ Done |
| 6  | `ObscuraSocialResolver.sol` (@handle → spending/viewing pubkeys; selfRegister + ENS proof) | `contracts-hardhat/contracts/` | ✅ Done |
| 7  | `ObscuraStealthRotation.sol` (append-only meta rotation log) | `contracts-hardhat/contracts/` | ✅ Done |
| 8  | Hardhat tests | `contracts-hardhat/test/` | ✅ Done (21/21) |
| 9  | Deploy script | `contracts-hardhat/scripts/deployWave3Pay.ts` | ✅ Done |
| 10 | Deployed to Arbitrum Sepolia (env-wired) | `contracts-hardhat/deployments/arb-sepolia.json`, `frontend/.env` | ✅ Done |
| 11 | Frontend `config/payV2.ts` ABIs + addresses (renamed from `wave3.ts`) | `frontend/obscura-os-main/src/config/payV2.ts` | ✅ Done |
| 12 | Frontend `config/pay.ts` (renamed from `wave2.ts`, V1 cUSDC + stream + escrow ABIs) | `frontend/obscura-os-main/src/config/pay.ts` | ✅ Done |
| 13 | Hook — `useAddressBook` (FHE encrypt + plaintext label per-wallet store, graceful empty) | `src/hooks/useAddressBook.ts` | ✅ Done |
| 14 | Hook — `useStealthInbox` (scan + sweep + ignore + read-state + 120 s poll, paused while tab hidden) | `src/hooks/useStealthInbox.ts` | ✅ Done |
| 15 | Hook — `useStealthRotation` (rotate + history) | `src/hooks/useStealthRotation.ts` | ✅ Done |
| 16 | Hook — `useSocialResolver` (split/join compressed pubkey, register, resolve) | `src/hooks/useSocialResolver.ts` | ✅ Done |
| 17 | Hook — `useInsuranceSubscription` (operator pre-check + ciphertext cap) | `src/hooks/useInsuranceSubscription.ts` | ✅ Done |
| 18 | Hook — `usePayStreamV2` (encrypted hint, per-cycle salt persistence, jitter) | `src/hooks/usePayStreamV2.ts` | ✅ Done |
| 19 | Hook — `usePayrollResolverV2` (cancel/approve/shareEmployer with salt) | `src/hooks/usePayrollResolverV2.ts` | ✅ Done |
| 20 | Hook — `useReceipts` (wallet-scoped ledger + JSON export) | `src/hooks/useReceipts.ts` | ✅ Done |
| 21 | Hook — `useRecipientResolver` (0x / ENS / @handle / self) | `src/hooks/useRecipientResolver.ts` | ✅ Done |
| 22 | Context — `PreferencesContext` (uiMode / defaultSendMode / gasMode / onboarding flag) | `src/contexts/PreferencesContext.tsx` | ✅ Done |
| 23 | Component — `OnboardingWizard` (5-step modal, picks UIMode) | `src/components/pay-v4/OnboardingWizard.tsx` | ✅ Done |
| 24 | Component — `AddContactModal` + `ContactPicker` | `src/components/pay-v4/` | ✅ Done |
| 25 | Page — `ContactsPage` at `/pay/contacts` | `src/pages/ContactsPage.tsx` + `App.tsx` | ✅ Done |
| 26 | Page — `SettingsPage` at `/pay/settings` (rotate / inbox reset / receipts / replay onboarding, with pretty selects) | `src/pages/SettingsPage.tsx` + `App.tsx` | ✅ Done |
| 27 | Component — `UnifiedSendForm` (Direct / Stealth / Bridge — 4-step wizard with announce() + **live per-step progress UI**) | `src/components/pay-v4/UnifiedSendForm.tsx` | ✅ Done |
| 28 | Component — `BulkPayrollImport` (CSV → per-row V2 stream creation + receipts) | `src/components/pay-v4/BulkPayrollImport.tsx` | ✅ Done |
| 29 | Component — `PaymentReceipt` + `ReceiptList` (export JSON, per-tx Arbiscan link) | `src/components/pay-v4/PaymentReceipt.tsx` | ✅ Done |
| 30 | Component — `StealthInboxV2` (unread badge, claim-all, ignore, read-state) | `src/components/pay-v4/StealthInboxV2.tsx` | ✅ Done |
| 31 | Component — `CreateStreamFormV2` (jitter input + Auto-insure toggle → subscribe + pretty period dropdown) | `src/components/pay-v4/CreateStreamFormV2.tsx` | ✅ Done |
| 32 | `PayPage.tsx` 7-tab clean IA (Home / Send / Receive / Streams / Escrow / Insurance / Advanced) + sidebar unread badge + compact wallet pill in header | `src/pages/PayPage.tsx` | ✅ Done |
| 33 | `App.tsx` — wrap `PreferencesProvider`, mount `OnboardingWizard`, register `/pay/contacts` + `/pay/settings` | `src/App.tsx` | ✅ Done |
| 34 | DocsPage — Wave 3 Pay chapter + 7 new contracts in `deployedContracts` | `src/pages/DocsPage.tsx` | ✅ Done |
| 35 | **Wagmi multi-RPC fallback** (Tenderly / publicnode / drpc / omniatech / official) — fixes `Failed to fetch` & 429 walls | `src/config/wagmi.ts` | ✅ Done |
| 36 | **Pretty form dropdowns** (gradient + emerald chevron) across CreateStreamFormV2, CUSDCPanel, SettingsPage | `src/components/pay-v4/`, `src/pages/SettingsPage.tsx` | ✅ Done |
| 37 | **SystemStatusBar deleted** (bottom static bar removed) | — | ✅ Done |
| 38 | **Right sidebar deleted** on PayPage (`WalletCard / ActiveModulesCard / NetworkCard / NeedHelpCard`) | `src/pages/PayPage.tsx` | ✅ Done |
| 39 | **Escrow + Insurance promoted to dedicated sidebar tabs** (no longer hidden inside "More") | `src/pages/PayPage.tsx` | ✅ Done |
| 40 | **Real per-step transaction progress UI** (Approve operator → Init FHE → Encrypt → Submit → Confirm → Announce) | `src/components/pay-v4/UnifiedSendForm.tsx` | ✅ Done |
| 41 | `tsc --noEmit` clean | repo-wide | ✅ Done |
| 42 | `vite build` chunks ≤ 650 KB gzip (largest gzipped chunk 248 KB) | `dist/assets/` | ✅ Done |
| 43 | Manual testing guide | `WAVE3_PAY_TESTING.md` | ✅ Done |

---

## Deployed Contracts (Arbitrum Sepolia · 421614)

| Contract | Address |
|---|---|
| ObscuraPayrollResolverV2 | `0x0f130a6Fe6C200F1F8cc1594a8448AE45A3d7bBF` |
| ObscuraPayStreamV2 | `0xb2fF39C496131d4AFd01d189569aF6FEBaC54d2C` |
| ObscuraAddressBook | `0x4095065ee7cc4C9f5210A328EC08e29B4Ac74Eef` |
| ObscuraInboxIndex | `0xDF195fcfa6806F07740A5e3Bf664eE765eC98131` |
| ObscuraInsuranceSubscription | `0x0CCE5DA9E447e7B4A400fC53211dd29C51CA8102` |
| ObscuraSocialResolver | `0xCe79E7a6134b17EBC7B594C2D85090Ef3cf37578` |
| ObscuraStealthRotation | `0x47D4a7c2B2b7EDACCBf5B9d9e9C281671B2b5289` |

All seven addresses are wired into both `frontend/.env` and `src/config/payV2.ts`. Every ABI in `payV2.ts` was generated from the deployed bytecode (verified function selectors); all hooks call the contracts using those exact selectors.

---

## .env audit — what's used, what's still needed, what to drop

### ✅ Used today (keep)
| Var | Used by | Purpose |
|---|---|---|
| `VITE_CHAIN_ID` | wagmi config | Network ID (421614) |
| `VITE_REINEIRA_CUSDC_ADDRESS` | every Pay hook | Encrypted USDC token (cUSDC) — core stablecoin |
| `VITE_REINEIRA_ESCROW_ADDRESS` | `useCUSDCEscrow`, MyEscrows | Confidential escrow |
| `VITE_REINEIRA_CCTP_RECEIVER_ADDRESS` | `useCrossChainFund` | Cross-chain bridge receiver |
| `VITE_OBSCURA_STEALTH_REGISTRY_ADDRESS` | UnifiedSendForm `announce()`, scan | ERC-5564 announcement registry |
| `VITE_OBSCURA_PAY_STREAM_ADDRESS` | V1 stream hooks | Legacy payroll streams (still surfaced under "Advanced") |
| `VITE_OBSCURA_PAYROLL_RESOLVER_ADDRESS` | `useTickStream`, `useInsurePayroll` | V1 cycle resolver |
| `VITE_OBSCURA_PAYROLL_UNDERWRITER_ADDRESS` | `useInsurePayroll` | V1 payroll insurance underwriter |
| `VITE_REINEIRA_INSURANCE_POOL_ADDRESS` | StakePoolForm | LP staking pool |
| `VITE_REINEIRA_COVERAGE_MANAGER_ADDRESS` | BuyCoverageForm | Coverage purchases |
| `VITE_REINEIRA_POOL_FACTORY_ADDRESS` | env health | Pool factory |
| `VITE_REINEIRA_POLICY_REGISTRY_ADDRESS` | MyPolicies, DisputeForm | Policy ledger |
| `VITE_OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS` | `usePayrollResolverV2` | **New Wave 3** |
| `VITE_OBSCURA_PAY_STREAM_V2_ADDRESS` | `usePayStreamV2` | **New Wave 3** |
| `VITE_OBSCURA_ADDRESS_BOOK_ADDRESS` | `useAddressBook` | **New Wave 3** |
| `VITE_OBSCURA_INBOX_INDEX_ADDRESS` | `useStealthInbox` ignore filter | **New Wave 3** |
| `VITE_OBSCURA_INSURANCE_SUBSCRIPTION_ADDRESS` | `useInsuranceSubscription` | **New Wave 3** |
| `VITE_OBSCURA_SOCIAL_RESOLVER_ADDRESS` | `useSocialResolver` | **New Wave 3** |
| `VITE_OBSCURA_STEALTH_ROTATION_ADDRESS` | `useStealthRotation` | **New Wave 3** |

### ⚠️ Legacy (Wave 1) — **safe to delete** if you don't expose Vote / MintObs / legacy generic Pay/Escrow
| Var | Used by | Why it can go |
|---|---|---|
| `VITE_OBSCURA_PAY_ADDRESS` | only `lib/constants.ts`, `config/contracts.ts` (unused export) | The generic "Pay" v0 contract — superseded by cUSDC + PayStream + Resolver |
| `VITE_OBSCURA_TOKEN_ADDRESS` | only `MintObsForm` (admin-only mint UI) | Legacy OBS token mint — not part of the Pay UX |
| `VITE_OBSCURA_ESCROW_ADDRESS` | `config/contracts.ts` export only | Pre-Reineira escrow — replaced by `REINEIRA_ESCROW_ADDRESS` |
| `VITE_OBSCURA_CONDITION_RESOLVER_ADDRESS` | `config/contracts.ts` export only | Old condition resolver — superseded by Wave 2 PayrollResolver |
| `VITE_OBSCURA_VOTE_ADDRESS` | `VotePage` | Keep **only** if `/vote` page is still wanted; otherwise drop along with `VotePage.tsx` |

> **Recommendation.** Drop the four legacy "Pay/Token/Escrow/ConditionResolver" entries. Keep `VOTE` only if you intend to ship the Vote page.

---

## New & changed since last progress doc

1. **Renamed config files** to match repo convention (no "wave" in code, only docs):
   - `src/config/wave2.ts` → `src/config/pay.ts`
   - `src/config/wave3.ts` → `src/config/payV2.ts`
   - All 27 import sites rewritten; tsc clean.

2. **PayPage rebuild** — clean 7-tab IA, single-column max-w-5xl layout, compact wallet pill in header, dedicated Escrow + Insurance + Advanced tabs, Home zone shows diagram → How it works → recent receipts (no duplicated cUSDC card).

3. **Right sidebar removed** (`WalletCard / ActiveModulesCard / NetworkCard / NeedHelpCard`).

4. **Bottom SystemStatusBar deleted** (file + App.tsx mount + preference removed).

5. **Real per-step transaction progress** in `UnifiedSendForm`:
   - Direct: Authorize operator → Init FHE → Encrypt → Submit → Confirm
   - Stealth: Derive stealth → Authorize → Init FHE → Encrypt → Transfer → Announce
   - Each step renders with active spinner, done check, or red error icon + tx hash detail.

6. **RPC failover** in `src/config/wagmi.ts` — `fallback([Tenderly, publicnode, drpc, omniatech, official])` with batch+retry. Fixes the `Failed to fetch` / 429 wall on `sepolia-rollup.arbitrum.io/rpc`.

7. **Stealth scan polling**: 30 s → **120 s**, paused while tab hidden, refresh on visibilitychange.

8. **Pretty selects** — gradient bg + emerald chevron in CreateStreamFormV2 (period), CUSDCPanel (operator days), SettingsPage (UIMode / SendMode / GasMode).

9. **`listContactIds` revert** swallowed in `useAddressBook` — fresh wallets see an empty list, not a red error.

10. **Testing guide** `WAVE3_PAY_TESTING.md` covering all 16 sections (pre-flight → contract addresses).

---

## Privacy Upgrades vs Wave 2

1. **Encrypted recipient hint.** `ObscuraPayStreamV2.createStream` accepts `InEaddress` instead of a plaintext address.
2. **Per-cycle salt commits.** Cycles committed with `keccak256(account || streamId || cycleIndex || nonce)`, persisted at `obscura.stream.salts.v1:<addr>:<streamId>`.
3. **Configurable jitter.** Streams accept a `jitterSeconds` window; ticks become unpredictable in time.
4. **Append-only meta-address rotation.** A leaked viewing key only exposes one epoch.
5. **Encrypted address book.** Contact metadata is `InEaddress`; only label hash + `createdAt` public.
6. **Inbox bloom filter.** Recipients can ignore senders without revealing them.
7. **Insurance subscription.** Premiums bounded by a ciphertext cap.

---

## Anti-Regression Discipline (still enforced)

- **Operator pre-check** via `ensureOperator(publicClient, walletClient, holder, spender)`.
- **Gas clamp** via `estimateCappedFees(publicClient)`.
- **No fire-and-forget** — every write `waitForTransactionReceipt`.
- **Wallet-scoped local state** via `getJSON / setJSON` from `src/lib/scopedStorage.ts`.
- **Rate-limit retry** wrapper `withRateLimitRetry` on read paths.
- **RPC failover** in `wagmi.ts` (new) — defends every read/write.

---

## Build Health

- `npx tsc --noEmit` — **clean**.
- `npx vite build` — **clean**, largest gzipped chunk **248 KB** (raw 892 KB), well under the 650 KB-gzip target.

---

## Frontend Surface

```
src/
├── App.tsx                        ← PreferencesProvider, /pay/contacts, /pay/settings, OnboardingWizard
├── contexts/PreferencesContext.tsx
├── config/
│   ├── pay.ts                     ← (was wave2.ts) cUSDC + V1 stream/escrow + stealth registry
│   ├── payV2.ts                   ← (was wave3.ts) 7 Wave 3 ABIs + addresses
│   └── wagmi.ts                   ← multi-RPC fallback transport
├── hooks/
│   ├── useAddressBook.ts          ← graceful empty
│   ├── useStealthInbox.ts         ← 120 s poll + visibilitychange-aware
│   ├── useStealthRotation.ts
│   ├── useSocialResolver.ts
│   ├── useInsuranceSubscription.ts
│   ├── usePayStreamV2.ts
│   ├── usePayrollResolverV2.ts
│   ├── useReceipts.ts
│   └── useRecipientResolver.ts
├── components/pay-v4/
│   ├── OnboardingWizard.tsx
│   ├── AddContactModal.tsx
│   ├── ContactPicker.tsx
│   ├── UnifiedSendForm.tsx        ← live per-step progress UI
│   ├── BulkPayrollImport.tsx
│   ├── PaymentReceipt.tsx         ← exports ReceiptList + ReceiptRow
│   ├── StealthInboxV2.tsx
│   └── CreateStreamFormV2.tsx     ← pretty period dropdown
└── pages/
    ├── PayPage.tsx                ← 7-tab IA, wallet pill in header, no right sidebar
    ├── ContactsPage.tsx
    ├── SettingsPage.tsx           ← pretty selects
    └── DocsPage.tsx               ← Wave 3 Pay chapter
```

---

**Done.** Wave 3 Pay is fully implemented, end-to-end tested, wired against the deployed contracts, RPC-resilient, with live transaction progress, ready for live use on Arbitrum Sepolia.

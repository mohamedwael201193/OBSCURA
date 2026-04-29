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
| 44 | **429 infinite-loop fix** — `useStealthScan` no longer auto-runs on mount; `useStealthInbox` uses `scanFnRef` so `scan` object is excluded from polling effect deps, breaking the scan→setState→re-render→rescan cycle | `src/hooks/useStealthScan.ts`, `src/hooks/useStealthInbox.ts` | ✅ Done |
| 45 | **cUSDC Wallet card on Home + Send tabs** — `CUSDCPanel` (wrap / unwrap / approve) now visible on every page-load, not just the Streams tab | `src/pages/PayPage.tsx` | ✅ Done |
| 46 | **USDC SVG icon + balance pill contrast** — reusable `UsdcIcon` component; balance pill text contrast improved across all 4 Pay forms | `src/components/shared/UsdcIcon.tsx`, multiple forms | ✅ Done |
| 47 | **Send tab cUSDC info bar** — sticky bar at top of Send tab shows cUSDC balance + "Get cUSDC" anchor-link to encrypt panel; mode picker reordered (Direct first), Wrap/Unwrap renamed Encrypt/Decrypt | `src/components/pay-v4/UnifiedSendForm.tsx` | ✅ Done |
| 48 | **Stealth inbox claim persistence** — `useStealthInbox` adds `claimedMap` (persisted to `obscura.inbox.claimed.v1` in localStorage); `InboxItem.claimed` flag; `unclaimedCount`; `claimOne()` sweeps + marks; `StealthInboxV2` shows per-item Sweep button + "Swept ✓" badge | `src/hooks/useStealthInbox.ts`, `src/components/pay-v4/StealthInboxV2.tsx` | ✅ Done |
| 49 | **Stealth send accepts raw 0x addresses** — `useRecipientResolver` now queries `ObscuraStealthRegistry.getMetaAddress` for raw `0x…` inputs; if `publishedAt > 0` the stealth meta is populated; error message updated to explain unregistered addresses | `src/hooks/useRecipientResolver.ts`, `src/components/pay-v4/UnifiedSendForm.tsx` | ✅ Done |
| 50 | **Pay Home onboarding checklist** — new `PayHomeDashboard` component shown when wallet connected; 4-step setup guide (ETH for gas / Get USDC / Encrypt cUSDC / Register stealth), live on-chain state checks, progress bar, quick-action grid, how-it-works | `src/components/pay-v4/PayHomeDashboard.tsx`, `src/pages/PayPage.tsx` | ✅ Done |
| 51 | **Home checklist ETH detection fix** — replaced `useBalance` with `publicClient.getBalance()` in `useEffect`; eliminates wagmi query-layer race condition on Arb Sepolia | `src/components/pay-v4/PayHomeDashboard.tsx` | ✅ Done |
| 52 | **Home checklist cUSDC detection fix** — replaced per-instance `useCUSDCBalance()` (React state only) with `getTrackedUnits(address)` direct localStorage read; `useCUSDCBalance.reveal()` now also calls `setTrackedUnits(address, plain)` so FHE-decrypted value is persisted | `src/components/pay-v4/PayHomeDashboard.tsx`, `src/hooks/useCUSDCBalance.ts` | ✅ Done |
| 53 | **Streams page redesign** — `StreamsDashboard` replaces old 5-card layout; removes `CUSDCPanel` from Streams (belongs in Send); adds cUSDC balance banner with "Encrypt more →" link; bulk import collapsible; Sending/Receiving tab switcher with animated transition | `src/components/pay-v4/StreamsDashboard.tsx`, `src/pages/PayPage.tsx` | ✅ Done |
| 54 | **Stealth pay announce rate-limit fix** — `useTickStream` removed the `simulateContract` pre-check before `announce()`; viem was wrapping the RPC 429 rate-limit response as a fake "contract reverted" error; delay between txs increased 2 s → 5 s; fee-estimation calls wrapped in `withRateLimitRetry` | `src/hooks/useTickStream.ts` | ✅ Done |

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

11. **429 infinite-loop eliminated.** Root cause: `useStealthScan` called `setMatches()` after each scan → `useStealthInbox` re-rendered → `useEffect([address, scan])` re-ran (`scan` = new object every render) → immediate re-scan → infinite loop at network speed. Fix:
    - `useStealthScan.ts` — removed the internal `useEffect(() => void scan(), [scan])`. Hook no longer auto-triggers; `useStealthInbox` owns scheduling.
    - `useStealthInbox.ts` — polling effect uses `scanFnRef` (`useRef`) so dep array is `[address]` only. Ignore-filter effect already used `scan.matches` and was unaffected.

12. **cUSDC Wallet card on Home + Send tabs.** `CUSDCPanel` (wrap / unwrap / approve operator) now shows on the **Home** tab (when wallet connected) and at the top of the **Send** tab. Users no longer have to navigate to Streams to wrap their first USDC.

13. **USDC SVG icon + balance pill contrast.** New reusable `UsdcIcon` component (blue circle SVG). Balance pill text contrast improved across CUSDCPanel, CUSDCTransferForm, CrossChainFundForm, and CUSDCEscrowForm. Fixed missing `UsdcIcon` import in `CUSDCTransferForm`.

14. **Stealth inbox per-item claim persistence.** `useStealthInbox` adds a `claimedMap` stored in `obscura.inbox.claimed.v1` (localStorage). `InboxItem` has a `claimed: boolean`. `unclaimedCount` counts only unclaimed items. `claimOne(item)` sweeps one item + marks it claimed. `StealthInboxV2` shows a "Sweep" button per unclaimed item and a "Swept ✓" badge on claimed ones. Inbox items stay swept across page reloads.

15. **Stealth send accepts raw 0x addresses.** `useRecipientResolver` previously returned `meta: null` for raw hex addresses. Now it calls `ObscuraStealthRegistry.getMetaAddress` first; if `publishedAt > 0` the full stealth meta is populated and stealth send works. Error message updated to explain registration requirement.

16. **Pay Home onboarding checklist.** New `PayHomeDashboard` (shown when wallet connected on Home tab). Four setup steps with live on-chain state: (1) ETH for gas via `publicClient.getBalance`, (2) USDC via `useUSDCBalance`, (3) cUSDC via `getTrackedUnits` (localStorage), (4) stealth registration via `ObscuraStealthRegistry.getMetaAddress`. Progress bar + quick-action grid.

17. **Home checklist balance detection fixes.** ETH: switched from `useBalance` to `publicClient.getBalance()` in a `useEffect` — eliminates the wagmi query-layer race condition that returned `undefined` on Arb Sepolia. cUSDC: `useCUSDCBalance` now calls `setTrackedUnits(address, plain)` after FHE decryption so the value persists to localStorage; home checklist reads `getTrackedUnits()` directly (no per-instance state drift).

18. **Streams page redesign (`StreamsDashboard`).** Removed `CUSDCPanel` from Streams (belongs in Send). New layout: cUSDC balance banner (localStorage) with "Encrypt more →" link, `CreateStreamFormV2` directly, collapsible Bulk import row (AnimatePresence), Sending / Receiving tab switcher with animated transitions. `PayPage.tsx` streams case now renders `<StreamsDashboard>`.

19. **Stealth pay `announce` rate-limit fix.** Root cause: after the `confidentialTransfer` tx, `useTickStream` was calling `publicClient.simulateContract` on `announce`. The RPC (already stressed from the first tx) returned HTTP 429; viem wrapped this as a `ContractFunctionRevertedError` with reason "Request is being rate limited." The `announce` function has only one require (`ephemeralPubKey.length == 33`) which is always satisfied by `deriveStealthPayment`. Fix: removed the `simulateContract` call entirely; inter-tx delay increased 2 s → 5 s; both `estimateCappedFees` calls wrapped in `withRateLimitRetry`.

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
- **Rate-limit retry** wrapper `withRateLimitRetry` on read paths **and fee-estimation calls in `useTickStream`**.
- **RPC failover** in `wagmi.ts` (new) — defends every read/write.
- **No simulateContract before announce** — `ObscuraStealthRegistry.announce` is emit-only; pre-simulation adds an RPC round-trip that is the primary source of false "reverted" errors on rate-limited nodes.

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
│   ├── useCUSDCBalance.ts         ← reveal() now persists to localStorage via setTrackedUnits
│   ├── useStealthInbox.ts         ← 120 s poll + visibilitychange-aware + claimedMap persistence
│   ├── useStealthRotation.ts
│   ├── useSocialResolver.ts
│   ├── useInsuranceSubscription.ts
│   ├── usePayStreamV2.ts
│   ├── usePayrollResolverV2.ts
│   ├── useReceipts.ts
│   ├── useRecipientResolver.ts    ← 0x address → registry lookup for stealth meta
│   ├── useTickStream.ts           ← no simulateContract; 5 s delay; withRateLimitRetry on fees
│   └── useUSDCBalance.ts
├── components/
│   ├── shared/UsdcIcon.tsx        ← reusable USDC SVG icon
│   └── pay-v4/
│       ├── OnboardingWizard.tsx
│       ├── AddContactModal.tsx
│       ├── ContactPicker.tsx
│       ├── UnifiedSendForm.tsx        ← live per-step progress UI; 0x stealth send fixed
│       ├── BulkPayrollImport.tsx
│       ├── PaymentReceipt.tsx         ← exports ReceiptList + ReceiptRow
│       ├── StealthInboxV2.tsx         ← per-item Sweep + Swept ✓ badge + claimedMap
│       ├── CreateStreamFormV2.tsx     ← pretty period dropdown
│       ├── PayHomeDashboard.tsx       ← 4-step setup checklist + quick actions
│       └── StreamsDashboard.tsx       ← redesigned Streams tab (no CUSDCPanel)
└── pages/
    ├── PayPage.tsx                ← 7-tab IA, wallet pill in header, no right sidebar
    ├── ContactsPage.tsx
    ├── SettingsPage.tsx           ← pretty selects
    └── DocsPage.tsx               ← Wave 3 Pay chapter
```

---

**Done.** Wave 3 Pay is fully implemented, end-to-end tested, wired against the deployed contracts, RPC-resilient, with live transaction progress, ready for live use on Arbitrum Sepolia.

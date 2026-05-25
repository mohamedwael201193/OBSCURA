# Obscura Pay — Master Execution Plan

> **Version**: v3 (2026-05-25) — visual redesign direction locked. Harmony design system
> canonicalized. IA, UX, and phase tasks updated accordingly.
> **Status**: Production on Arbitrum Sepolia (421614). Mainnet gated on Fhenix CoFHE GA.
> **Scope**: This is the canonical execution plan for taking Obscura Pay from "feature-complete
> testnet protocol" to "best-in-class privacy-native payments product". Read alongside
> [docs/pay_wave5.md](docs/pay_wave5.md) (architecture reference) and [summary5.md](summary5.md)
> (execution memory).
> **Discipline**: This plan is opinionated. It explicitly rejects feature spam. Every phase
> below is justified against current user friction, current technical reality, and a real
> production roadmap. Items the team is tempted to add that do NOT make this list are
> intentional `no`s.
>
> **Design direction**: The cyberpunk / dark / gradient-heavy aesthetic is **deprecated**.
> The canonical design system is **Harmony** — minimal premium, soft ivory/off-white
> backgrounds, deep-green privacy accents, editorial serif + mono typography, institutional
> fintech spacing. See §26 for the complete design system spec. All new components MUST
> follow §26. All components that do not must be updated in W5P1.
>
> **Anti-spam guardrail**: Adjacent privacy-pay apps in the same category have already
> over-built (16+ sidebar entries: P2P exchange, group expenses, creator support, AI agents,
> inheritance, etc.). We deliberately keep our IA to **6 verbs** (Overview / Send / Receive /
> Streams / Receivables / Reputation) — see §24. Every "new feature" below must collapse
> into one of those verbs, or it doesn't ship.

---

## Table of Contents

1. [Current-State Audit](#1-current-state-audit)
2. [Strengths Already Achieved](#2-strengths-already-achieved)
3. [Weaknesses / Missing Pieces](#3-weaknesses--missing-pieces)
4. [UX Problems](#4-ux-problems)
5. [Architecture Improvements](#5-architecture-improvements)
6. [Privacy Improvements](#6-privacy-improvements)
7. [Pay ↔ Credit ↔ Vote Integrations](#7-pay--credit--vote-integrations)
8. [Competitive Advantage Opportunities](#8-competitive-advantage-opportunities)
9. [New Feature Proposals](#9-new-feature-proposals-curated-not-feature-spam)
10. [Technical Feasibility Notes](#10-technical-feasibility-notes)
11. [Smart Contract Tasks](#11-smart-contract-tasks)
12. [Frontend Tasks](#12-frontend-tasks)
13. [Backend / Indexer / Keeper Tasks](#13-backend--indexer--keeper-tasks)
14. [Security Tasks](#14-security-tasks)
15. [Testing Tasks](#15-testing-tasks)
16. [Deployment Tasks](#16-deployment-tasks)
17. [Migration Tasks](#17-migration-tasks)
18. [Analytics / Telemetry Tasks](#18-analytics--telemetry-tasks)
19. [Mobile UX Tasks](#19-mobile-ux-tasks)
20. [Risk Analysis](#20-risk-analysis)
21. [Scaling Considerations](#21-scaling-considerations)
22. [Recommended Priorities](#22-recommended-priorities)
23. [Execution Phases](#23-execution-phases-w5p1--w5p10)
24. [Information Architecture (canonical sidebar)](#24-information-architecture-canonical-sidebar)
25. [Reliability & SLOs](#25-reliability--slos)
26. [Design System — Harmony](#26-design-system--harmony)

---

## 1. Current-State Audit

### 1.1 What is live and working

| Surface | Status | Notes |
|---|---|---|
| ocUSDC Pay wrapper v2 (real Circle USDC backing) | ✅ live | `0xEd46020Df8abe7BB1E096f27d089F4326D223a53` |
| ocUSDC Credit faucet v3.14 (separate token) | ✅ live | `0xf963fD86348813786ed57b8b2778A365C6226E43` |
| ocWETH v3.19, ocOBS v3.19 | ✅ live | credit collateral assets |
| `ObscuraPay` — P2P + stealth transfers | ✅ live | handle-based, FHE-encrypted |
| `ObscuraInvoice` — encrypted invoices | ✅ live | invoice payment routes to stealth address |
| `ObscuraPayStreamV3` — continuous streams | ✅ live | rate-per-second, handle architecture |
| `ObscuraInsuranceSubscriptionV2` — recurring debits | ✅ live | uses `confidentialTransferFromHandle` |
| `ObscuraConfidentialEscrow V2` — 2-party escrow | ✅ live | claim-link + post-claim panel |
| `ObscuraStealthRegistry` + `ObscuraStealthRotation` | ✅ live | meta-address registry, key rotation |
| `ObscuraAddressBook` + `ObscuraInboxIndex` | ✅ live | encrypted contacts, per-recipient inbox |
| `ObscuraPayrollResolverV3` | ✅ live | batch payroll (operator-commit model) |
| `ObscuraSocialResolver` | ✅ live | external verifier hooks |
| `ObscuraRewards` | ✅ live | cross-product accrual |
| Vote V5 + `ObscuraGovernor` + `ObscuraTimelock` | ✅ live | OZ Governor wrapping `voterParticipation` |
| `ObscuraTreasuryStreamer` | ✅ live | DAO-controlled grant streams |
| Credit market M-86 + M-70-WETH + M-50-OBS | ✅ live | LLTV boost via `IEncryptedScore` |
| `ChainlinkPriceAdapter` ETH/USD + USDC/USD | ✅ live | 1e10 rescaler over 8-decimal Chainlink feeds |
| `ObscuraCreditScoreV2` | ✅ live | Pay streams + Vote participation + AddressBook contacts |
| `packages/credit-keeper/` liquidation bot | ✅ live, DRY_RUN | scan works end-to-end |
| Frontend `/pay`, `/credit`, `/vote` | ✅ live | wagmi v2, shadcn/ui, full FHE flow indicator |

### 1.1.1 Frontend surfaces already shipped (often forgotten during planning)

The `/pay` page is a single route with **9 sidebar tabs**: `home / send / receive / streams /
escrow / insurance / advanced / contacts / settings`. Many "new features" requested in past
sessions are actually already implemented at the component level — they just need to be
**surfaced, unified, or polished**, not rebuilt.

| Already shipped (frontend) | File | Action item |
|---|---|---|
| Subscription create UI | [SubscriptionForm.tsx](frontend/obscura-os-main/src/components/pay-v4/SubscriptionForm.tsx) | Surface in unified Receivables tab (W5P2) |
| Subscription/policy list | [MyPolicies.tsx](frontend/obscura-os-main/src/components/pay-v4/MyPolicies.tsx) | Surface in unified Receivables tab (W5P2) |
| Coverage purchase UI | [BuyCoverageForm.tsx](frontend/obscura-os-main/src/components/pay-v4/BuyCoverageForm.tsx) | Surface in Receivables tab (W5P2) |
| Auditor disclosure grant panel | [AuditorGrantPanel.tsx](frontend/obscura-os-main/src/components/pay-v4/AuditorGrantPanel.tsx) | Wire to `ObscuraDisclosure` contract (W5P6) |
| Batch escrow form | [BatchEscrowForm.tsx](frontend/obscura-os-main/src/components/pay-v4/BatchEscrowForm.tsx) | Promote to first-class split-pay surface (W5P6) |
| Stealth inbox v2 | [StealthInboxV2.tsx](frontend/obscura-os-main/src/components/pay-v4/StealthInboxV2.tsx) | Make discoverable from Home dashboard (W5P1) |
| CCTP cross-chain USDC bridge | [CrossChainFundForm.tsx](frontend/obscura-os-main/src/components/pay-v4/CrossChainFundForm.tsx), [useCrossChainFund.ts](frontend/obscura-os-main/src/hooks/useCrossChainFund.ts) | Promote to Top-up flow (W5P1) |
| Unified send form | [UnifiedSendForm.tsx](frontend/obscura-os-main/src/components/pay-v4/UnifiedSendForm.tsx) | Already canonical send surface |
| Pay home dashboard | [PayHomeDashboard.tsx](frontend/obscura-os-main/src/components/pay-v4/PayHomeDashboard.tsx) | Rebuild per §24 spec (W5P1) |
| Receipt list | [PaymentReceipt.tsx](frontend/obscura-os-main/src/components/pay-v4/PaymentReceipt.tsx), [useReceipts.ts](frontend/obscura-os-main/src/hooks/useReceipts.ts) | Becomes Activity feed source until indexer ships (W5P4) |
| Gas preflight | [useGasPreflight.ts](frontend/obscura-os-main/src/hooks/useGasPreflight.ts) | Already canonical |
| FHE permit status | [useFHEPermitStatus.ts](frontend/obscura-os-main/src/hooks/useFHEPermitStatus.ts) | Powers permit-session UX (W5P1) |
| Tx progress | [useTxProgress.ts](frontend/obscura-os-main/src/hooks/useTxProgress.ts) | Already canonical |
| Stealth scan / sweep | [useStealthScan.ts](frontend/obscura-os-main/src/hooks/useStealthScan.ts), [useSweepStealth.ts](frontend/obscura-os-main/src/hooks/useSweepStealth.ts) | Wire "sweep all" button to Home dashboard (W5P1) |
| FHE pre-warm | [usePreWarmFHE.ts](frontend/obscura-os-main/src/hooks/usePreWarmFHE.ts) | Already canonical |
| Bulk payroll import | [BulkPayrollImport.tsx](frontend/obscura-os-main/src/components/pay-v4/BulkPayrollImport.tsx) | CSV in. Already canonical |

**Implication**: W5P1 + W5P2 are *less* greenfield than originally scoped. Most of the work
is dashboard rebuild, unified IA, copy, and discoverability — not new components.

### 1.2 Architectural facts that constrain every future change

1. **CoFHE forwarding restriction**. A proof bound to user U cannot be forwarded by contract A
   to contract B. We solved this with `confidentialTransferFromHandle` on the token (handle +
   transient ACL). Every new cross-contract encrypted-flow MUST use this pattern; nothing else
   works.
2. **Two ocUSDC tokens**. Pay wrapper (`underlying = Circle USDC`) and Credit faucet (no
   underlying) cannot be unified without a full M-86 market redeploy. Frontend env split is
   permanent until M-86 v2.
3. **No `setOracle` on credit markets**. Oracle is `immutable` in `ObscuraCreditMarket`
   constructor. Any oracle change requires a market redeploy + state migration. The Chainlink
   adapter solves the current decimals bug without redeploy.
4. **No auto-decrypt**. NEVER call `decryptForView` / `getOrCreateSelfPermit` in `useEffect`.
   This rule is enforced because it caused real MetaMask popup spam in prior waves.
5. **`FHE.allowThis` discipline**. Every encrypted state write must be followed by an
   `FHE.allowThis(handle)` call or the contract loses the right to read its own data.
6. **No if/else on ebool**. Always use `FHE.select(cond, a, b)`. A revert leaks one bit.
7. **Mainnet blocked**. Fhenix CoFHE has no mainnet GA as of May 2026. All testnet-only.

### 1.3 What is deprecated (must NOT be re-introduced)

| Item | Reason it's dead |
|---|---|
| `ObscuraPayStreamV2` (proof-forwarding) | Cannot move funds — InvalidSigner revert |
| `ObscuraInsuranceSubscription` v1 | Same root cause |
| Reineira-immutable Escrow v1 (`0x...broken`) | Hardcoded wrong token → redeems returned 0 |
| `cUSDC` token (pre-Wave-5) | Replaced by ocUSDC. All hooks migrated |
| `ObscuraCreditScore` v1 | Wrong adapter interfaces → silent try/catch → score 0 for all |
| `ObscuraCreditOracle` 1e12 scaler | Returned 0 for 8-decimal Chainlink feeds. Fixed via adapter |
| KURA, CovertMRV, any "MRV" naming | Banned per `.github/copilot-instructions.md` |

---

## 2. Strengths Already Achieved

These are the moats. They MUST be preserved across every phase below.

1. **Handle-based cross-contract FHE pattern** is solved. `confidentialTransferFromHandle` is
   the canonical primitive. Streams V3, Insurance V2, and any future intermediary all flow
   through it. This is the single hardest piece of FHE engineering in the repo.
2. **Two-token split is documented and enforced**. Operators.ts + env vars correctly route
   Pay vs Credit. No more cross-contamination bugs.
3. **Privacy-first UI defaults**. `***` placeholders, explicit reveal buttons, no auto-decrypt.
   `useFHEStatus` step machine (`IDLE → ENCRYPTING → COMPUTING → SENDING → SETTLING → READY`)
   is wired across all hooks.
4. **`FHE.allowThis` discipline** is consistent across all 13 active Pay contracts. Verified
   in prior audit phases.
5. **Public chain data is auto-loaded** (TVL, rates, utilization, config addresses). User
   never has to sign a tx just to see public info. Encrypted balances are user-triggered only.
6. **Cross-product integration**. `IEncryptedScore` already wires Pay streams + Vote
   participation + AddressBook contacts into credit LLTV boost. This is the protocol's
   thesis — *"borrow against the receipts you never showed"* — actually working.
7. **Stealth payment plumbing** (`ObscuraStealthRegistry` + per-recipient `ObscuraInboxIndex`)
   is shipped and exercised by invoice flow.
8. **Governance is real** — Governor + Timelock + Treasury Streamer + Score V2 form a closed
   DAO loop, not a placeholder.
9. **Mainnet honesty**. The project openly states testnet-only and names the gate (CoFHE
   mainnet GA + audit). No mainnet-pretending; this is a feature, not a bug.

---

## 3. Weaknesses / Missing Pieces

Items the protocol genuinely lacks. Ordered by user-impact severity.

| # | Gap | Severity | Notes |
|---|---|---|---|
| 1 | No account abstraction / passkey wallet | 🔴 high | Onboarding requires MetaMask. New users bounce. |
| 2 | No gas paymaster / sponsored gas | 🔴 high | Privacy + FHE-heavy txs cost real ETH. Friction kills retention. |
| 3 | No off-chain indexer for activity feed | 🟠 med | Frontend reads events per-page-load. Slow, no notifications, no search. |
| 4 | No notification system (email, push, in-app) | 🟠 med | User has no way to know they received a payment, an invoice was paid, an escrow expired. |
| 5 | No public claim-link surface | 🟠 med | Receiver-side flows require wallet + chain + correct page. Should be a URL anyone can open. |
| 6 | No mobile-first PWA | 🟠 med | Currently desktop-optimized. Real payments are mobile. |
| 7 | No transaction history dashboard | 🟠 med | "What did I pay this week?" is not answerable in-product. |
| 8 | No batched UserOp (single popup) | 🟠 med | shield+transfer = 2 popups. shield+pay-invoice = 3. Should be 1. |
| 9 | No CSV/PDF export | 🟡 low | Businesses need this for accounting. |
| 10 | No multi-recipient gift / split-pay primitives | 🟡 low | Currently only single-recipient transfers and stream-based payroll. |
| 11 | No verifiable balance proofs ("I have ≥ $X") | 🟡 low | Credit-score-style attestations not exposed to user. |
| 12 | Single-chain only | 🟡 low | Arbitrum Sepolia only. Once CoFHE adds chains, we should add chains too. |
| 13 | No in-product help / onboarding tour | 🟡 low | User lands and is shown 7 tabs with no guidance. |
| 14 | No support / docs portal in-product | 🟡 low | Docs live in repo, not in app. |
| 15 | Operator approval is per-token-per-spender | 🟠 med | User sees `setOperator` popup before every encrypted action. Should be infrequent and batched. |

---

## 4. UX Problems

Concrete observed friction:

1. **Wallet-trigger fatigue**. A first-time invoice payment requires:
   `connect → switch network → faucet → setOperator → shield → setOperator (escrow) → pay`.
   That's 5–7 popups. Industry-leading products do 1.
2. **Stealth inbox is confusing**. Invoice payments land in the stealth address; user must
   navigate `Receive → Stealth Inbox → Claim`. The path is correct but not discoverable.
   Phase 20 (in `summary5.md`) added text guidance but the click path is still 3 steps deep.
3. **Encrypted balance reveal is wallet-signed**. Each reveal costs a MetaMask popup. There's
   no "stay revealed for N minutes" / permit session.
4. **No transaction states**. After a `shield`, the user sees a toast and... that's it. No
   "your $50 is now confidential, here's your new encrypted balance" follow-through.
5. **Step indicator runs but doesn't always explain WHY**. `ENCRYPTING → COMPUTING → SENDING`
   means nothing to a first-time user. Tooltips on each state are missing.
6. **Two-token split surfaces as a bug to users**. Users see their ocUSDC balance on Pay,
   click Credit, and see zero. The split is invisible from UI. Needs a clear "Pay wallet" vs
   "Credit wallet" mental model with a one-click bridge UI.
7. **Stream creation has no preview**. User picks rate-per-second and gets a number with no
   "this is $X/day, $Y/month, will exhaust your balance in Z days" math.
8. **Insurance / subscription model is invisible**. Recurring debits are powerful but the user
   has no dashboard showing "next debit: $5 to Provider X on June 1".
9. **No empty states**. First-time user lands on dashboard with 7 zero values and no idea
   what to do next.
10. **Faucet UX is hidden**. Test USDC faucet should be the first thing a new wallet sees.
11. **Network-mismatch errors are technical**. "Wrong chain (1) — expected 421614" should be
    "You're on Ethereum. Switch to Arbitrum Sepolia [Switch button]".
12. **Long-lived addresses leak link-graph**. We have stealth primitives but the dashboard
    still surfaces the user's primary EOA in every flow.
13. **No persistent "Getting Started" checklist**. New wallets land on a 9-tab interface with
    no on-rails first-time experience. Best-in-class privacy-pay apps surface a 3-step
    checklist (`Get test USDC → Shield → Send first payment`) front-and-center until the user
    has shipped their first encrypted tx, then auto-collapse it.
14. **No service-degradation banner**. When the Fhenix CoFHE coprocessor is slow / the
    threshold network is queued / RPC fails over, the user sees mysterious timeouts. We need
    a sticky banner: *"Encryption service is slow. Connected wallets can still send. Decrypt
    actions may need a retry."* — modelled on adjacent apps.
15. **No freshness indicator on lists**. Activity, streams, subscriptions all read "live" but
    the user has no idea when. Need a `Synced · Checked HH:MM:SS · [Refresh]` strip at the
    top of every async list (cheap, instantly raises trust).
16. **Empty states are dead ends**. "No streams yet" with no CTA leaves the user stuck. Every
    empty state needs **two** CTAs: the obvious one ("Create stream") AND a discovery one
    ("Or send a one-time payment first →").
17. **No global search**. As surface area grows (invoices, streams, escrows, subscriptions),
    "find invoice #43" or "jump to the stream for 0xabcd…" requires a header-bar `⌘K` search.
18. **No Quick Actions strip**. Send / Receive / Shield / Sweep should be a one-click strip on
    Home — not buried inside the tabs.
19. **Reveal latency is unexplained**. Decrypt takes ~2–10s depending on threshold network
    load. We tell the user nothing. The Encryption Status sidebar card should publish a live
    *"Decryption: ~2s async"* expectation + show queue depth when degraded.
20. **Wallet-deploy is hidden ceremony**. When a smart-account user takes their first action,
    the CREATE2 deploy happens silently inside the UserOp. We should label it explicitly:
    *"Your first transaction will deploy your wallet (one-time, gas sponsored)."*
21. **Design inconsistency across tabs**. The Overview and Send tabs use the new Harmony
    system (ivory backgrounds, deep green, editorial type). Several other tabs (Settings,
    Insurance, Streams) still render dark backgrounds (`bg-[#0a0d12]`), hardcoded neon
    colors, and old card patterns. This creates a jarring schizophrenic UI when the user
    navigates between tabs.
22. **Legacy `PrettySelect` with hardcoded dark background**. `PayPage.tsx` inline
    `SettingsPanel` uses `bg-[#0a0d12]` inside `<option>` elements — renders incorrectly on
    the new light background and is not a Harmony component.
23. **`GooeyNav` and `SectionDiagram` not audit-cleared**. These `elite/` components may
    carry old gradient/neon patterns. They need audit before appearing in the live product.
24. **Credit page color inconsistency**. `EncryptedTile` supports the `accent` prop
    (violet/emerald/amber) correctly, but the Credit page may still carry dark background
    wrappers that don't match the Harmony ivory background.
25. **No cognitive on-ramp for non-crypto users**. Words like "shield", "operator approval",
    "FHE", "stealth meta-address" appear with no plain-language explanation. The first-time
    experience should translate every crypto term to a human one: "Shield USDC" → "Make your
    USDC private", "Operator approval" → "Allow this feature to move your funds", "Stealth
    address" → "A one-time address others use to send you privately".
26. **Privacy explanation is too technical**. The transaction lifecycle panel (`Compose →
    Relay → Compute → Settle`) is accurate but reads like a whitepaper. The copy should lead
    with the user benefit, not the mechanism: *"Your amount never leaves your device
    unencrypted."* not *"Submitted to CoFHE TaskManager"*.
27. **No visual hierarchy on the Overview dashboard**. All sections (balance, quick-send,
    lifecycle, activity) have equal visual weight. The user's eye doesn't know where to go.
    The balance hero must dominate (60% viewport above the fold), then a single action prompt,
    then secondary info.
28. **Quick-send card on Overview uses inverted (dark) treatment**. The black quick-send card
    inside the Harmony ivory layout creates the strongest visual element on the page — but it's
    a secondary widget, not the primary action. The color hierarchy is backwards: the primary
    CTA (Send button) should be the most visually dominant, not a panel preview.

---

## 5. Architecture Improvements

### 5.1 Smart account / paymaster layer (NEW — single biggest win)

Introduce an ERC-4337 `ObscuraSmartAccount` + `ObscuraPaymaster`:

- **Smart account**: P-256 passkey signer + EOA fallback. One account per user, deterministic
  CREATE2 deploy on first action.
- **Paymaster**: sponsors gas for whitelisted call targets (Pay, Invoice, Stream, Escrow,
  Insurance, Stealth) up to N transactions/day. Stake withdrawable by governance.
- **Batched UserOps**: `shield + pay + emit` in one bundle. Cuts 3 popups → 1.
- **FHE integration**: passkey ops must wait for `isDeployed` before the CoFHE permit binds
  to the smart account address. Pattern is well-documented in adjacent projects.

### 5.2 Unified write hook

Frontend currently has separate hooks for EOA vs smart account. Build `useUnifiedWrite()`
that picks the right path. One UI, two execution backends. Avoids forking every page.

### 5.3 Operator approval cache

`setOperator` is per-token-per-spender with expiry. Wrap in a `useEnsureOperator()` hook that
checks current expiry, refreshes only if < 24h remaining, and batches new approvals into the
next UserOp. Result: most user flows skip the operator popup entirely.

### 5.4 Off-chain indexer

Stand up a Node/TypeScript indexer (similar shape to `packages/credit-keeper/`) that listens
to all Pay events and writes to Postgres/Supabase. Indexer is the **source of activity-feed
truth**; the chain remains the source of state-of-record truth. This pattern is canonical in
adjacent projects (Blank: Supabase for cache/notifications only; chain is the source of truth).

### 5.5 Public claim-link surface

Wrap every receivable primitive in a URL:

- `/i/<invoiceId>` — invoice (already partial; formalize)
- `/r/<recipient>?amt=N` — payment request
- `/escrow/<chainId>/<escrowId>` — escrow detail
- `/claim/<linkId>#<secret>` — magic claim link (bearer/email/address-bound)
- `/v/<proofId>` — balance proof
- `/sub/<subId>` — subscription accept

Each URL is openable on mobile, public, and only the amount is encrypted.

### 5.6 Domain-separated hashes everywhere

For every new bearer primitive, use `keccak256(OBSCURA_<feature>_v1, mode, secret, ...)` so
secrets cannot be replayed across features.

### 5.7 Storage-layout CI gate

Add a `pnpm storage:check` step in CI that snapshots EVERY UUPS proxy's storage layout and
fails the build on slot drift. Required before any upgrade is ever shipped.

### 5.8 SDK package

Extract `@obscura/sdk` from frontend. Exposes typed contract clients, FHE helpers,
permit cache, operator cache, indexer client. Used by frontend AND keeper bots AND future
mobile apps.

### 5.9 Dual passkey-AA path (WebAuthn + passphrase-encrypted P-256)

Smart-account onboarding (W5P3) must support **two enroll modes** in parallel — both target
the same `ObscuraSmartAccount`, so the user can pick by trust model:

- **WebAuthn / device passkey** (default): biometric / OS-vault backed. Best UX on iOS &
  Android. Recoverable via iCloud Keychain / Google Password Manager when the user opts in.
- **Passphrase-encrypted P-256** (paranoid mode): user types a 12+ char passphrase, browser
  derives an AES-GCM key (Argon2 / PBKDF2), encrypts a freshly generated P-256 private key,
  stores ciphertext in IndexedDB. Passphrase never leaves the device. Lose the passphrase →
  lose the wallet (loud warning + suggested backup flow).

Both sign UserOps via the same on-chain RIP-7212 P-256 verifier. The choice is **per-user,
not per-feature**, and persisted in `PreferencesContext`. Default to WebAuthn but always
expose the passphrase path one click away — privacy users will demand it.

### 5.10 Lazy-deploy + first-tx batched deploy (UX-critical)

Never pre-deploy the smart account. The first user action MUST be `deployAccount + grantOperator
+ shield + transfer` bundled into a single sponsored UserOp. Label it explicitly in the UI:

> *"Your first transaction will deploy your wallet. Gas is sponsored. ~30s."*

This is non-negotiable: a pre-deploy step adds ceremony + paymaster cost for users who never
return after step 1.

### 5.11 Cross-subdomain shared-storage hub (claim links + verify pages)

Claim-link (`/claim/...`), proof-verify (`/v/...`), and main-app (`/pay`) likely live on
different subdomains for security isolation. To share session state (current passkey wallet,
permit cache) across them without leaking cookies, use a **postMessage-based iframe storage
hub** on a 4th subdomain (`hub.obscura.xyz` or similar):

- Each surface embeds an invisible iframe pointing at the hub
- `get`/`set` operations go via postMessage with strict origin checks
- The hub's storage is partitioned per parent origin (browser-enforced) but the hub's own
  domain provides a stable shared scope for opt-in cross-subdomain data

This is the same pattern adjacent apps use. Do not invent a new one.

### 5.12 Roles & permissions module (multi-user accounts)

For business accounts (the Subscription Hub provider side, the Auditor disclosure flow, the
DAO Treasury Streamer), surface a **"Roles assigned to you"** widget in the header. Roles are
stored in a lightweight `ObscuraRoles` contract or off-chain index (W5P4 indexer scope):

- `viewer` — read-only access to encrypted balance of a shared account
- `payer` — can initiate transfers up to a cap
- `auditor` — receives aggregate-only disclosure
- `admin` — full control

Keeps the surface lean for personal users (they never see it) but enables business adoption.

---

## 6. Privacy Improvements

Privacy is the wedge. The current product is excellent but can go further.

1. **Permit sessions**. Today: each balance reveal = 1 wallet popup. Fix: ask once, mint a
   permit valid for N minutes, cache in IndexedDB encrypted with WebCrypto. Standard pattern.
2. **Stealth-by-default for receivable surfaces**. Invoice already routes to stealth. Extend
   to payment requests, subscription accepts, and escrow claims. Sender always sees a stealth
   address, never the recipient's main address.
3. **Encrypted notes on payments**. Pay can carry a `bytes32` encrypted memo handle. Decrypted
   only by recipient. Adds "what is this for" without leaking the field.
4. **Encrypted balance proofs**. New `ObscuraProofRegistry` contract. User generates `prove
   balance ≥ $X`, gets a `/v/<proofId>` URL. Anyone (no wallet) can verify via on-chain
   threshold signature. Useful for landlord/employer/lender checks.
5. **Selective disclosure for auditors**. New `ObscuraDisclosure` contract: user grants an
   auditor a permit over `sum(transfers in period P)`. Auditor sees aggregate only, never line
   items. Mirrors the CipherRoll aggregate-only model.
6. **Decrypt-on-claim pattern for receivable amounts**. Recipient decrypts locally; on-chain
   `FHE.publishDecryptResult` only triggers when settlement requires plaintext (e.g.
   unshield). Minimize on-chain decrypts.
7. **Memo-less explorer view**. Continue showing `0.0001 pUSDC` placeholder on Arbiscan. No
   regression here, but document it loudly in `/help`.
8. **Operator scope tightening**. Today `setOperator` is unrestricted-amount. Add an opt-in
   max-encrypted-amount cap per operator per token. Belts-and-braces against contract bugs.
9. **Replace `require` with `FHE.select` everywhere it leaks**. Audit: every credit/escrow
   path should use `FHE.select` for the success-vs-zero branch on encrypted comparisons.
10. **Threshold-permit gating on bots**. Keeper bot today reads plaintext shadows by design.
    Document the privacy boundary loudly so users understand what is and isn't private.
11. **Privacy-preview toggle (trust feature, NOT actual disable)**. Settings → *"Show me what
    would be public without FHE"* — a read-only diff view that shows the same activity with
    amounts *visible*, side-by-side with the encrypted view. Builds trust by making privacy
    tangible. The toggle never sends data; it only re-renders local state with masking off.
12. **Stealth-by-default for Receivables**. Every receivable surface (invoice link, claim
    link, payment request, subscription accept) should default to routing to a fresh stealth
    address, with an opt-out for users who want their main address public.
13. **Operator-deauth one-click**. Settings → *"Active operators"* shows every contract that
    can spend on your behalf with revoke buttons. Today buried in advanced.
14. **Encrypted reveal expiry indicator**. When a user reveals their balance for the 5-min
    session (per 6.1), show a countdown timer (`Hidden again in 4:23`) — never let the user
    forget privacy is paused.

---

## 7. Pay ↔ Credit ↔ Vote Integrations

The thesis: Pay generates encrypted reputation, Credit consumes it, Vote governs it.

### 7.1 Already shipped

- `ObscuraCreditScoreV2.streamsByEmployer(user)` → Pay stream count feeds credit score.
- `ObscuraCreditScoreV2.listContactIds(user)` → AddressBook contact count feeds score.
- `ObscuraCreditScoreV2.voterParticipation(user)` → Vote participation feeds score.
- Credit market consumes score via `IEncryptedScore.userTier()` + `scoreOf()` + transient ACL.
- Governor wraps `voterParticipation` as governance weight.
- Treasury Streamer is timelock-only; future grants run as DAO-controlled Pay streams.

### 7.2 Phase-2 integrations (planned, see Phase W5P5)

| Integration | What it enables | Owner |
|---|---|---|
| Invoice-paid signal | "User paid 10 invoices on time" → score bump | Phase W5P5 |
| Escrow-completed signal | "User completed 5 escrows" → counterparty trust | Phase W5P5 |
| Repaid-loan signal (Credit → Score) | Credit market emits encrypted repay event → score | Phase W5P5 |
| Insurance-active signal | "User has active subscriptions" → behavioral signal | Phase W5P5 |
| Vote-quality signal | Not just participation count, also tier-of-vote (Treasury Streamer recipients only) | Phase W5P6 |

### 7.3 Phase-3 cross-product UX

- **Credit dashboard shows Pay-derived signals**: "your score is X because of N streams, M
  votes, K contacts" (all bucketed, never raw).
- **Pay dashboard shows Credit unlock**: "create N more streams to reach Tier 2 and unlock
  +200 bps LLTV".
- **Vote dashboard shows Pay activity**: "your $OBS earnings this period: ████ (reveal)" —
  pulled from Rewards contract.

### 7.4 Treasury Streamer as DAO-controlled Pay primitive

`ObscuraTreasuryStreamer` already exists and is timelock-only. Build a frontend in `/vote`
that lets governance create grants as Pay streams to grantee addresses. This unifies
governance + payment + privacy in one flow.

---

## 8. Competitive Advantage Opportunities

What we have that nobody else does:

1. **Encrypted reputation that's actually wired into a credit market**. Other privacy
   protocols stop at hiding balances. We hide balances AND use the hidden activity to grant
   real economic benefits (LLTV boost). This is unique.
2. **Single-chain coherent ecosystem**. Pay + Credit + Vote on one chain, one token family,
   one design system. No bridges, no L2-jumping, no fragmented liquidity.
3. **Handle-based composability**. `confidentialTransferFromHandle` lets any future contract
   move encrypted value without forwarding proofs. We can compose new financial primitives
   without re-solving the InvalidSigner problem.
4. **Honest mainnet posture**. We can say "testnet-only, here's why, here's the gate" with
   zero hedging. That's a trust feature, not a weakness.
5. **DAO-controlled grant streams**. Governance can fund recipients via encrypted continuous
   streams, not lumpy public airdrops. New shape of treasury management.
6. **Privacy + composability**. Most privacy projects sacrifice composability. We chose the
   amount-private / parties-public threat model precisely so we stay composable with public
   DeFi (oracles, AMMs, governance).

What we should pursue to compound the advantage:

- **Subscription primitive as a public good**. Encrypted recurring payments solve a real
  problem nobody else has. Position it as the "Stripe for confidential recurring revenue".
- **Encrypted payroll for DAOs**. Existing on-chain payroll (Sablier, Llamapay) leaks every
  contributor's pay. Obscura is the only chain-native answer.
- **Verifiable balance proofs for KYC-lite credit**. Lenders / landlords can verify
  "borrower has ≥ $X in encrypted balance" without learning the balance. We're one of the
  few projects with the cryptographic primitive AND a credit market that can use it.

---

## 9. New Feature Proposals (curated, not feature spam)

Each item below has a clear user, clear primitive, clear contract owner. Items that did NOT
make this list (gift cards, NFT integration, in-app token launchpad, social feed,
quadratic-tipping) are deferred or rejected.

### 9.1 Subscription Hub (frontend surface over existing Insurance contract)

The contract is shipped. The UI isn't. Build `/pay/subscriptions`:
- List active subscriptions: "Provider X — $5 / month — next debit June 1"
- Cancel, pause, resume
- Reveal upcoming total ("you will be debited $20 next 7 days")
- Recipient-side: "manage your subscribers" with encrypted totals

### 9.2 Magic claim links

New `ObscuraClaimLinks` contract:
- `createLink(mode, encAmt, secretHash, expiry)` — mode in {bearer, email-bound, address-bound}
- `claim(linkId, secret, claimerProof)` — verifies hash, transfers encrypted amount
- Expiry cap: 365 days max
- Domain-separated hashes: `keccak256(OBSCURA_CLAIM_v1, mode, secret, ...)`
- Frontend: `/claim/<chainId>/<linkId>#<secret>` — public page, openable on mobile

### 9.3 Encrypted balance proofs

New `ObscuraProofRegistry` contract:
- `createProof(threshold, expiry)` — generates `FHE.gte(balance, threshold)` verdict
- `publishProof(proofId)` — runs `FHE.publishDecryptResult(verdict)` once threshold network signs
- Frontend: `/v/<proofId>` — anyone with the URL can verify (no wallet needed)
- Use case: rental application, lending application, employer-of-record proof

### 9.4 Split-pay primitive

New `ObscuraSplit` contract:
- `createSplit(recipients[], encAmounts[])` — pulls one encrypted total from sender
- Each recipient gets their slice as a stealth-claimable amount
- One sender popup, N recipients. Replaces N separate `pay` calls.

### 9.5 Gift envelopes (encrypted, expiry-bounded)

Extension of claim links:
- `createGift(secretHash, encAmt, expiry, refundable)` — bearer envelope
- Equal-split or random-split variants
- Auto-refund to sender on expiry

### 9.6 Selective disclosure for auditors

New `ObscuraDisclosure` contract:
- `grantAuditor(auditor, period, scope)` — sender grants permit
- Auditor reads `sum(transfers in period)` only, never line items
- Mirrors aggregate-only model from CipherRoll
- Use case: accountants, tax authorities (consent-based)

### 9.7 In-app help / onboarding tour

Not a contract — pure UX. Walks new user through:
1. Faucet → get test USDC
2. Shield → convert to ocUSDC
3. Send → first private payment
4. Reveal balance → see math work
5. (Optional) Pay an invoice / start a stream
Done in 4 minutes. Skippable. Replayable.

### 9.8 Activity feed + notifications

Indexer-backed. In-product. Surface:
- payments received (anonymized sender if stealth)
- invoices paid
- streams about to exhaust
- subscriptions about to debit
- escrow expiring
- credit position approaching liquidation

Web push + email opt-in via wallet-signed challenge (no traditional auth).

### 9.9 Stealth-key rotation UI

Contract exists (`ObscuraStealthRotation`). UI doesn't. Add a `/pay/stealth/rotate` button
that lets users rotate their stealth keys after a compromise. Important for paranoid users.

### 9.10 CSV / PDF export

User-triggered, runs locally over decrypted balance+activity. Never sends decrypted data to
a server. Outputs a signed report (user's wallet signature) for accountant submission.

---

## 10. Technical Feasibility Notes

| Proposal | Feasibility | Blockers |
|---|---|---|
| Smart account + paymaster | High | Needs paymaster funding policy + deploy + EntryPoint v0.7 on Arb Sepolia (✅ available). |
| Indexer + Supabase | High | Standard Node.js workload. Supabase free tier covers testnet. |
| Magic claim links | High | Pure new contract, fits handle-based pattern. |
| Balance proofs | Medium | Requires `FHE.publishDecryptResult` flow; needs threshold-network turnaround time UX. |
| Split-pay | High | Loop over recipients with handle pattern. Gas cost grows linearly. |
| Selective disclosure | Medium | Permit ACL model exists; aggregator math needs encrypted-sum over events (cofhe supports). |
| Subscription Hub UI | High | Contract live; pure frontend work. |
| Onboarding tour | High | Pure frontend. |
| Activity feed | High | Once indexer exists, trivial. |
| Stealth rotation UI | High | Contract exists. |
| CSV/PDF export | High | Pure client-side. |
| Mobile PWA | High | Vite + React already PWA-able. |
| Multi-chain expansion | Blocked | Awaits Fhenix CoFHE on additional chains. |
| Mainnet launch | Blocked | Awaits Fhenix CoFHE mainnet GA + audit + threshold decentralization. |

---

## 11. Smart Contract Tasks

> All contracts MUST follow the existing handle-based pattern, use `FHE.allowThis` after
> every encrypted state write, use `FHE.select` not if/else on ebool, expose
> `setOperator`-compatible spender semantics, and ship with full Hardhat tests.

### Phase W5P3 (Smart Account + Paymaster)
- `ObscuraSmartAccount.sol` — ERC-4337 account, P-256 + EOA dispatch, length-discriminated
- `ObscuraSmartAccountFactory.sol` — CREATE2 deploy, deterministic addr
- `ObscuraPaymaster.sol` — sponsors whitelisted targets, 4-layer defense, withdrawable by governance

### Phase W5P5 (Reputation expansion)
- `ObscuraCreditScoreV3.sol` — adds invoice-paid, escrow-completed, repaid-loan, insurance-active signals
- `ObscuraInvoice.sol` patch — emit `InvoicePaid(payer)` event for score
- `ObscuraConfidentialEscrow.sol` patch — emit `EscrowCompleted(parties)` event for score
- `ObscuraCreditMarket.sol` patch — emit `RepaymentMade(borrower)` event for score (encrypted)

### Phase W5P6 (New primitives)
- `ObscuraClaimLinks.sol` — magic claim links (bearer/email/address-bound)
- `ObscuraProofRegistry.sol` — balance proof publishing
- `ObscuraSplit.sol` — multi-recipient split-pay
- `ObscuraDisclosure.sol` — selective aggregate disclosure for auditors

### Phase W5P7 (Hardening)
- All contracts → UUPS upgradeable proxy if not already
- Add `__gap[50]` to every storage-layout-tracked contract
- Storage-layout snapshots committed to repo
- Replace any remaining `require(plaintext)` with `FHE.select` where condition is on encrypted

### Phase W5P9 (Mainnet readiness)
- External audit (Spearbit / Trail of Bits / OpenZeppelin)
- Constructor-only initialization → initializer pattern review
- ReentrancyGuard on every external state-mutating function
- 3-of-5 multisig as governance + paymaster admin

---

## 12. Frontend Tasks

### Phase W5P1 (UX polish — non-breaking) ✅ COMPLETE
- Add tooltips to every `FHEStepStatus` state
- Add "stay revealed for 5 minutes" toggle on encrypted balance display (in-memory only)
- Add stream preview: rate-per-second → $/day, $/month, runway calculator
- Empty states on dashboard with CTAs
- Faucet card promoted to top of dashboard for new wallets
- Network-mismatch UI with one-click switch button
- Persistent toast for in-flight FHE txs (replaces transient toast)

### Phase W5P1.5 — IA + Guided UX Refactor (inserted 2026-05-25)

**Problem**: Pay UX is still too complex for normal users. Navigation is protocol-oriented,
advanced concepts are visible by default, and there is no guided onboarding path.

**Goal**: Transform Obscura Pay from a "feature-first crypto dashboard" into the easiest
privacy-payments experience possible. The user must NEVER feel lost.

#### 1. Information Architecture Refactor
- **Reduce sidebar: 9 tabs → 6** (Overview / Pay / Get Paid / Automations / Activity / Settings)
- `send` → `pay` (label: "Pay", same content)
- `receive` → `getpaid` (label: "Get Paid", absorbs invoice creation + claim link)
- New `automations` tab: merges Streams + Escrow + Receivables (subscription/coverage)
- New `activity` tab: receipts + payment history
- `contacts` → merged into Settings tab
- `advanced` (Legacy) → collapsed section inside Settings (accessible but hidden by default)

#### 2. Guided Onboarding State Machine
- New `useOnboardingState.ts` hook detects: ETH balance, USDC balance, ocUSDC balance, stealth registration
- Returns: `OnboardingStage = 'new' | 'has-eth' | 'has-usdc' | 'shielded' | 'registered' | 'active'`
- Dashboard shows different UI for each stage with next-step CTA

#### 3. Dynamic Dashboard States
| Stage | Dashboard Shows |
|---|---|
| new | "Welcome" card, Get ETH CTA, explainer |
| has-eth | Shield USDC card as primary action |
| has-usdc | Make Private CTA prominent |
| shielded | Register private address CTA |
| registered | First payment CTA, "You're ready" |
| active | Full dashboard: balance, activity, streams |

#### 4. UX Terminology Rewrite
| Old (protocol) | New (user-facing) |
|---|---|
| "Shield USDC" | "Make USDC private" |
| "Unshield" | "Convert to plain USDC" |
| "Stealth meta-address" | "Private receive address" |
| "Stealth inbox" | "Private inbox" |
| "Register meta-address" | "Set up private receiving" |
| "ocUSDC" (UI copy) | "private USDC" |
| "Confidential" (UI) | "Private" |
| "Escrow" (primary label) | "Protected payment" |
| "Streams" (label) | "Automations" |

#### 5. Progressive Disclosure
- Advanced features (ResolverManager, BulkPayroll, V1 legacy) hidden by default
- Expandable "Advanced" / "More options" sections
- UIMode="beginner" hides technical details (already in PreferencesContext)

#### 6. Primary-Action UX
- Every tab has ONE primary CTA with strong visual hierarchy
- Secondary actions are smaller / placed below the fold
- No wall of equal-weight forms

#### 7. Smart Context Banners
- Missing ETH → "Add ETH for gas" banner with faucet link
- Missing USDC → "Get USDC" banner with faucet link
- Not shielded → "Make USDC private to start sending" with Shield CTA
- Not registered → "Set up private receiving" banner on Get Paid tab
- Pending inbox claims → "You have X private payments waiting"

#### 8. Mobile-First Improvements
- Add mobile bottom navigation bar (4 primary tabs + Settings)
- Larger touch targets on primary CTAs (min 48px)
- Reduce form density on mobile (stacked layouts)
- Sticky CTA bars on long forms (mobile only)

#### 9. Cleanup
- Remove duplicate StealthInbox V1 (legacy only)
- Collapse deprecated V1 forms behind "Legacy" section
- Dead imports removed from PayPage.tsx

**Files changed**: PayPage.tsx, PayHarmonyTabShell.tsx, PayHarmonyHome.tsx,
HarmonyAppShell.tsx, PayHomeDashboard.tsx, + new useOnboardingState.ts

### Phase W5P1.8 — UX Rearchitecture & Workflow Simplification (inserted 2026-05-25)

**Problem**: W5P1.5 reduced sidebar to 6 tabs, but each top tab still renders
a vertically-stacked wall of cards. Users land on `automations` and see five
giant forms at once (Streams + Escrow + MyEscrows + Subscription + ReceivablesHub
+ Advanced). `getpaid` stacks six cards. `pay` stacks four. Result: pages feel
random, scrolling is heavy, users do not know what is primary, and advanced
features (resolver, batch payroll, legacy) appear inline with primary actions.

**Goal**: Workflow-first IA. Each top tab becomes a *workspace* with a
sub-navigation strip. Only ONE workflow panel is visible at a time. Forms get
collapsible "Advanced" sections via `<details>`. Primary actions dominate
visually. Mirrors Stripe Dashboard / Mercury / Linear sub-navigation patterns.

#### 1. Nested workspace navigation
Each top tab gets a chip-style sub-navigation rendered by a new `HarmonySubNav`
primitive. The sub-tab state is local to the parent tab, deep-linkable via
`?sub=<key>`, and only one sub-panel renders at a time.

| Top tab | Sub-tabs (default first) | Replaces |
|---|---|---|
| `home` | (flat — dashboard only) | unchanged |
| `pay` | Send · Make private · Bridge | 4-card stack |
| `getpaid` | Inbox · Setup · Request · Inbound streams | 6-card stack |
| `automations` | Streams · Escrows · Subscriptions · Payroll | 6-card + Advanced details |
| `activity` | (flat — receipts only) | unchanged |
| `settings` | Preferences · Privacy · Contacts · Data · Legacy | 4-card + ContactsSection + Legacy |

URL preserved on switch: `/pay?tab=automations&sub=escrow`.

#### 2. Smart default sub-tab (context-aware)
- `getpaid` defaults to `inbox` if stealth-registered, else `setup`
- `automations` defaults to `streams`
- `pay` defaults to `send`
- `?claim=<id>` or `?invoice=<id>` forces `getpaid` sub-tab to `inbox`

#### 3. Progressive disclosure inside forms
- Optional fields (memo, expiry, resolver, jitter, auto-insure) hidden inside
  `<details>` "Advanced options" blocks on first render
- Forms no longer stack labels vertically with all controls visible
- Compact mode is the default; full mode opens on user action

#### 4. Quick-action header on home
- Sticky action bar above the dashboard with 3 primary buttons:
  Send · Get Paid · Make Private
- Each button jumps to the relevant sub-tab in one click

#### 5. Sub-nav anatomy (HarmonySubNav)
```
<HarmonySubNav
  value={sub}
  onChange={setSub}
  items={[
    { key: "send", label: "Send", icon: Send },
    { key: "convert", label: "Make private", icon: Shield },
    { key: "bridge", label: "Bridge", icon: Network, badge: "CCTP" },
  ]}
/>
```
- Rounded full hairline pill row, deep-green active state
- Optional badge per item (e.g. unread inbox count)
- Mobile: horizontal scroll, no wrap

#### 6. Anti-stacking rule (codified)
A top tab may render at most:
- 1 sub-navigation strip
- 1 active workspace panel (the chosen sub-tab)
- 0 or 1 contextual banner above the workspace
Anything else moves into another sub-tab or `<details>` block.

#### 7. Form chrome simplification
- `HarmonyFormCard` continues to wrap each workspace panel
- Inside cards: required fields first, action button second,
  "Advanced options" `<details>` last
- Diagrams (`SectionDiagram`) moved into dedicated sub-tab or removed from
  primary view

#### 8. Reduced terminology load
- "Subscription" sub-tab label instead of "Recurring payment"
- "Escrows" plural for the management sub-tab (vs "Create a protected payment")
- Tab descriptions trimmed to single sentence

#### 9. Files changed
- `src/components/harmony/harmony-ui.tsx` — add `HarmonySubNav` primitive
- `src/pages/PayPage.tsx` — refactor renderActiveSection per spec, add sub-tab state per top tab, deep-link via `?sub=`
- `src/components/harmony/PayHarmonyHome.tsx` — add quick-action header
- `src/components/pay-v4/CreateStreamFormV2.tsx` — wrap optional fields in `<details>` (if needed)
- `src/components/pay-v4/OcUSDCEscrowForm.tsx` — wrap resolver + auto-refund window in `<details>` (if needed)

#### 10. Acceptance criteria
- Navigating to `/pay?tab=automations` shows ONE workspace (Streams) + sub-nav, not a stack
- Navigating to `/pay?tab=getpaid&sub=request` shows ONLY the invoice form
- Build is green
- All existing routes/deep links (`?claim`, `?invoice`, legacy `?tab=` values) still resolve correctly
- No Pay ↔ Credit ↔ Vote contracts changed

### Phase W5P1.9 — Premium Fintech UX Refinement (inserted 2026-05-25)

**Problem**: W5P1.5 + W5P1.8 fixed IA. They did NOT fix interaction density,
giant-page syndrome, oversized buttons/forms, or the absence of mission-control
onboarding. Pages still feel crypto-admin, not Stripe/Mercury/Linear.

**Goal**: Product-grade fintech polish. No new features, no contract changes —
only UX, hierarchy, density, onboarding, and workflow architecture.

#### UX research extract (Stripe, Mercury, Linear, Ramp, Arc, Raycast)
| Pattern | Source | We adopt |
|---|---|---|
| Mission-control hero with single primary CTA driven by state | Stripe onboarding, Mercury account opening | Yes — `HarmonyMissionHero` |
| Compact action tile row (4 items, 1 icon + 1 label each) | Mercury home, Ramp dashboard | Yes — `HarmonyActionTile` |
| Right-side slide-in drawer for create/edit flows | Linear "create issue", Stripe Connect onboarding | Yes — `HarmonyDrawer` |
| Workspace → list-of-items → "+ New" → drawer | Linear, Notion, Ramp expenses | Yes — automations sub-tabs |
| Compact 2-column form rows with grouped inputs | Mercury, Ramp send | Yes — refined `.pay-input` density |
| One dominant CTA per surface; secondaries are ghost pills | Linear, Vercel dashboard | Yes — neutral primary, hairline ghost |
| Activity rows: 1 line of high signal, no chips per row | Mercury feed | Yes — compact `ActivityRow` |
| Collapsible secondary content (learn, advanced) | Notion, Stripe docs | Yes — `<details>` for "How it works" |

#### Findings — what currently feels wrong
- **Overloaded**: PayHarmonyHome renders a 12-col balance hero + 4 step-cards + activity panel + setup panel — 4 sections of equal visual weight.
- **Crypto-native, not product-native**: chips like "Encrypted", "Sealed", "Public→Sealed" on every row; mono uppercase eyebrows everywhere.
- **Should be drawer/modal**: every create-form in `automations` sub-tabs (escrow, subscription, batch payroll) → inline today, should be triggered by "+ New" → right drawer.
- **Should be compact**: `.pay-input` uses `0.55rem 0.75rem` padding on dark bg; `.btn-pay` uses `0.6rem 1.25rem` + uppercase + neon glow. Need ivory bg, 32–36 px height, no glow.
- **Should be progressive disclosure**: "How it works" 4 step-cards on Home should collapse into a `<details>` below the fold.
- **Should be mission-control onboarding**: Home should answer "what should I do next?" with ONE state-driven primary CTA, not 5 stacked banners + 4 action buttons.
- **Should be removed/reduced**: Decorative `SectionDiagram` panels inside primary workspaces; `BulkPayrollImport` from the primary surface; "Advanced" resolver always-visible.

#### New primitives (`src/components/harmony/harmony-ui.tsx`)
1. **`HarmonyDrawer`** — right-side slide-in panel (max-width 480 px on desktop, full-width on mobile). Props: `open, onClose, title, eyebrow, children, footer?`. Escape + backdrop close. Focus trap. Body scroll lock. Framer-motion slide+fade.
2. **`HarmonyActionTile`** — square-ish tile, icon (h-4) over label, optional sub-label, hairline bg-card hover bg-muted. Used in Home quick-actions row.
3. **`HarmonyMissionHero`** — stage-driven hero card: eyebrow (stage label) + headline + one-line description + ONE primary CTA + tiny progress dots (5 stages). No giant numbers, no 12-col layout.
4. **`HarmonyMetricRow`** — compact horizontal stat row, mono micro label + display value, used for workspace summaries (e.g. "3 active streams · $—— monthly outflow").
5. **`HarmonyActivityRow`** — single-line compact row (icon · title · meta · value · time). No badges, no chips. Used for Activity list (5 max).

#### Mission Control (PayHarmonyHome rebuild)
Single state engine drives the hero. Stage → primary CTA mapping:
| Stage | Hero headline | Primary CTA | Target |
|---|---|---|---|
| `not-connected` | "Connect a wallet to begin" | Connect wallet | wallet modal |
| `new` (no ETH) | "Get a tiny amount of test ETH" | Get Arbitrum ETH | faucet link |
| `has-eth` (no USDC) | "Add some test USDC" | Get testnet USDC | Circle faucet |
| `has-usdc` | "Convert USDC to private USDC" | Make USDC private | `pay/convert` |
| `shielded` (not registered) | "Enable private receiving" | Set up address | `getpaid/setup` |
| `registered` | "Send your first private payment" | Send payment | `pay/send` |
| `active` | "Welcome back" + inbox/balance summary | View inbox / Send | smart default |

Sections (in order, NO equal weight):
1. **HarmonyMissionHero** — stage-driven, single primary CTA.
2. **Quick Actions row** — 4 `HarmonyActionTile`: Send · Request · Stream · Bridge.
3. **Compact balance summary** — single horizontal row (`HarmonyMetricRow`): private balance · public USDC · inbox count. No giant 12-col card.
4. **Activity** — last 5 rows only via `HarmonyActivityRow`. "View all →" link to `activity` tab. Empty state collapses to one inline line.
5. **`<details>` Learn how privacy works** — collapsed by default; expands to the 4-step lifecycle. Renamed from "How it works".

Removed from Home: balance hero card, quick-send card with 3-step lifecycle inline, setup panel (already in `getpaid/setup`), separate 5-banner stack (collapsed into hero).

#### Automations workspace UX
Each sub-tab now follows: **summary metrics → existing items list → "+ New" CTA → drawer**. NO inline create-forms.

| Sub-tab | Summary | List | Drawer (create) |
|---|---|---|---|
| `streams` | active count · total monthly outflow | `<StreamsDashboard>` already serves as list | "+ New stream" → drawer with `CreateStreamFormV2` |
| `escrows` | active escrows · total locked (encrypted) | `<MyEscrows>` | "+ New escrow" → drawer with `OcUSDCEscrowForm` |
| `subscriptions` | active subscriptions | `<ReceivablesHub>` (collapsed sections) | "+ New subscription" → drawer with `SubscriptionForm` |
| `payroll` | last batch | empty / `<ResolverManager>` collapsed | "+ New batch" → drawer with `BatchEscrowForm` |

#### Form system refinement
- `.pay-input`: ivory bg-card, hairline border, `0.5rem 0.7rem` padding, font-size 0.8rem, no inset shadow. Focus = accent ring (no neon glow).
- `.btn-pay`: drop uppercase + tight letter-spacing. New canonical pattern is the `btn-pay-primary` (foreground bg + background text, 36 px h, rounded-full). Keep `btn-pay-ghost` (hairline). Deprecate `btn-pay-emerald/cyan/amber/violet` gradient + glow buttons in primary surfaces (kept for backwards compat only).
- All forms inside workspaces should prefer 2-col grid for related inputs (recipient + amount, duration + frequency).

#### Button system refinement
- ONE dominant primary per surface (`btn-pay-primary` or `HarmonyAction primary`).
- Secondaries become hairline ghost pills.
- Drawer footer = "Cancel (ghost)" + "Submit (primary)" — never two primary buttons.

#### Visual hierarchy
Attention order codified:
1. Current state (mission hero)
2. Recommended next action (primary CTA)
3. Balance/context (compact metric row)
4. Recent activity (5 rows)
5. Advanced tools (collapsed)

#### Files changed
- `src/components/harmony/harmony-ui.tsx` — +HarmonyDrawer, +HarmonyActionTile, +HarmonyMissionHero, +HarmonyMetricRow, +HarmonyActivityRow
- `src/components/harmony/PayHarmonyHome.tsx` — full rebuild as Mission Control
- `src/pages/PayPage.tsx` — automations sub-tabs use drawer pattern; remove inline create forms from `escrows`, `subscriptions`, `payroll`
- `src/index.css` — `.pay-input` + `.btn-pay` density + ivory pass; new `.btn-pay-primary`

#### Acceptance criteria
- Home renders ONE hero with ONE primary CTA; no equal-weight sections
- Automations sub-tab opens with summary + list; create-form is hidden until "+ New" pressed
- Drawer slides in from right; Escape + backdrop close; body scroll locked
- All routes, deep links, onboarding hooks, sub-tab URLs preserved
- Build green; zero TS errors
- No contract / hook / FHE changes
- No dark theme, no neon, no crypto jargon added

### Phase W5P1.9.2 — Privacy Mission Control Overview Redesign (inserted 2026-05-26)

**Objective**: Redesign the Overview/Home tab (`PayHarmonyHome.tsx`) from a generic
dashboard into a cinematic "Privacy Mission Control" that puts the encrypted balance
front-and-centre, drives onboarding in a compact rail, and feels Stripe / Mercury /
Linear — never crypto admin.

**Scope**: `src/components/harmony/PayHarmonyHome.tsx` only. No contract, hook, FHE,
or route changes. No modifications to harmony-ui.tsx primitives.

**Changes shipped**:
1. **Privacy hero card** — single `rounded-2xl hairline bg-card` containing:
   - Privacy posture chip strip (top border strip): "Balance hidden · Receiving private · Inbox sealed"
   - State-driven eyebrow + display-serif headline (same 8-stage engine as W5P1.9)
   - Embedded `CipherBalanceDisplay` (AnimatePresence shimmer ↔ revealed value) as the focal element
   - Sub-metrics: public USDC + inbox count
   - Onboarding progress pip track (shown until step 5 complete)
   - Right-aligned primary CTA + secondary activity link
2. **Quick actions** — unchanged 4-tile grid (Send / Request / Automate / Make private)
3. **Onboarding rail** — compact `rounded-2xl hairline bg-card` with 5 step rows:
   - Each row: step indicator circle → title → detail → action (CTA only on active step)
   - Progress bar fills as steps complete
   - Hidden once `onboarding.hasActivity === true`
4. **Activity feed** — same as W5P1.9 but with improved empty state copy
5. **Removed**: separate `HarmonyMetricRow`, `HarmonyPrivacyPosture` strip, and "How encrypted payments work" collapsible — the hero + onboarding rail replace them
6. **Motion**: `AnimatePresence` for balance reveal/hide; smooth pip transitions; no CSS animations added

**Acceptance criteria**:
- All 5 onboarding steps visible in compact rail; done steps have line-through + check icon
- `CipherBalanceDisplay` shows `•••••` cipher-shimmer by default; reveals on click (no auto-decrypt on mount)
- Privacy posture chips visible at top of hero for any connected wallet
- `space-y-4` gap between all sections (tighter than previous `space-y-6`)
- Build green; zero TS errors; no new primitives added to harmony-ui.tsx

---

### Phase W5P1.9.1 — Product-Grade UX Polish & Privacy Storytelling (inserted 2026-05-25)

**Problem (post W5P1.9 audit)**: W5P1.9 introduced the Mission Control hero, drawer
pattern, and a new ivory `.pay-input` / `.btn-pay-primary` system. The architecture is
right, but the *forms themselves, the buttons inside forms, and the privacy storytelling*
were left unchanged. Result: most pages still feel "crypto admin panel" rather than
Stripe / Mercury / Linear — vertical mile-long field stacks, oversized `w-full py-2.5`
submit bars, leftover dark-mode utility classes (`bg-white/[0.025]`, `border-white/[0.07]`,
`bg-gradient-to-br from-emerald-500/20`), and a Mission Control hero that does not
visually *sell* the FHE / hidden-balance / stealth-treasury story.

This phase is the **interior polish pass**: the surfaces W5P1.9 wrapped now get
rewritten inside.

**Hard constraints (still binding)**
- No new features, no contract changes, no hook signature changes, no FHE changes.
- No new routes; preserve `?tab`, `?sub`, `?claim`, `?invoice`, and all legacy aliases.
- Build must be green; zero TS errors before this phase is considered complete.
- No dark theme, no neon, no cyberpunk; institutional fintech only.

#### Audit findings (per surface)

| Surface | Audit finding | Action |
|---|---|---|
| **Hierarchy audit (Home)** | Mission hero copy is generic ("What would you like to do?"). Privacy is the product, but it is invisible. | Rewrite hero copy by state; add "Privacy posture" micro-strip beneath metric row. |
| **Density audit (forms)** | Each field on its own row with 10-px uppercase eyebrow + full-width input. 6–8 row vertical scrolls per form. | Group related fields in 2-col grids; tighten label/input spacing. New `HarmonyFieldGrid` + `HarmonyField` primitives. |
| **Spacing audit** | `space-y-5` / `space-y-4` everywhere — too airy for a workspace drawer (480 px wide). | Drop to `space-y-3` inside drawers and `space-y-4` inside workspace cards. |
| **Onboarding audit** | Hero CTA logic exists, but secondary visual reassurance is missing — user does not see *what they have already accomplished*. | Add a `HarmonyProgressTrail` 5-dot strip beneath hero showing completed stages in a muted state. |
| **Workflow audit (Streams)** | `StreamsDashboard` still renders `CreateStreamFormV2` **inline** even though W5P1.9 added a drawer. Users see the form twice (drawer + inline). | Remove inline `CreateStreamFormV2` from `StreamsDashboard`. Drawer is the only entry point. |
| **Form audit (CreateStreamFormV2)** | Vertical stack: Recipient → Period pills → Duration → Jitter → Auto-insure → Submit. ~520 px vertical. | 2-col grid: Recipient (full row) + Period pills (full row) + Duration / Jitter (2-col) + Auto-insure collapsible row + Submit. ~360 px vertical. |
| **Form audit (SubscriptionForm)** | Vertical stack of 4 single-field rows + summary card. | Merchant (full) + Monthly / Duration (2-col, quick-amounts inline) + Summary + Submit. |
| **Form audit (OcUSDCPanel)** | 3 stacked sections (wrap / unwrap / authorize), each with its own label + input + button row — 460 px vertical. | Convert to 3-tab compact panel: "Make private · Convert back · Authorize". Single body, single submit row per tab. |
| **Form audit (OcUSDCEscrowForm)** | Heavy dark-mode utility leftovers (`bg-gradient-to-br from-emerald-500/20`, `border-white/[0.1]`). | Replace with ivory hairline tokens; condense recipient/amount to 2-col. |
| **Form audit (BatchEscrowForm)** | Same dark-mode utility leftovers + tall list rows. | Ivory token swap; row height reduced from `py-2.5` to `py-2`. |
| **Button audit (global)** | Many submit buttons use `btn-pay btn-pay-emerald w-full py-2.5` — `py-2.5` overrides `.btn-pay` 36 px height to ~44 px; `w-full` produces giant dark bars. | New `.btn-pay-sm` (28 px, drawer-internal). Drop `w-full` from form submits; align with `flex justify-end` in a footer row. Add `!important` to `.btn-pay` height to defeat `py-*` overrides. |
| **Visual priority audit** | Every section uses identical hairline card weight; nothing stands out. | Mission hero gets stronger contrast (subtle `bg-card` with darker hairline); secondary cards become flatter. |
| **Privacy storytelling audit** | UI shows "•••• ocUSDC" but does not contextualize *why* it is masked. No visible "encryption posture" indicator. | Add `HarmonyPrivacyBadge` micro-component ("Hidden on-chain · only you can decrypt") used beside masked values. Add subtle blur-mask treatment on default `HarmonyMaskedValue`. |
| **Interaction model audit** | Drawers slide in but inputs inside still focus-ring with foreground; no consistent submit-row pattern. | Standardize drawer footer: ghost "Cancel" + primary "Submit", right-aligned, `pt-4 border-t`. |

#### Density & spacing system (canonical)

| Token | Value | Use |
|---|---|---|
| `--pay-input-h` | 32 px (h-8) | All inputs and selects inside forms |
| `--pay-input-h-sm` | 28 px (h-7) | Inputs inside drawer 2-col grids |
| `--pay-btn-h` | 36 px (h-9) | Primary surface CTAs (drawer footer, workspace header) |
| `--pay-btn-h-sm` | 28 px (h-7) | Inline / row-level CTAs |
| Field group vertical gap | `space-y-3` | Inside any form container ≤ 520 px wide |
| Workspace vertical gap | `space-y-5` | Between top-level workspace sections |
| Drawer body padding | `p-6` | All `HarmonyDrawer` bodies |
| Drawer footer | `px-6 py-4 border-t` | Submit row anchored at bottom |

#### Button system (canonical, post W5P1.9.1)

| Class | Height | Weight | Use |
|---|---|---|---|
| `.btn-pay-primary` | 36 px | foreground / background | Drawer "Create", workspace "+ New", hero primary CTA |
| `.btn-pay-ghost` | 36 px | transparent / hairline border | Secondary action, drawer "Cancel" |
| `.btn-pay-sm` (new) | 28 px | matches parent variant | Row-level action ("Copy link", "Authorize", "Pay cycle") |
| `.btn-pay-link` (new) | unset | text-link, no border, foreground/80 hover foreground | "Learn more", "View all →", quick navigation |

Rule: **exactly ONE primary CTA per visible card / drawer / workspace at a time.**
All others must be ghost, sm, or link.

#### Form system (canonical, post W5P1.9.1)

New primitives:
- **`HarmonyFieldGrid`** — `<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3" />`. Used to pair related fields. Single-column on mobile.
- **`HarmonyField`** — label (sentence case, 11 px text-muted-foreground) + input slot + optional helper line. No mono uppercase eyebrow.
- **`HarmonyDrawerFooter`** — sticky-feeling footer row inside drawer: `px-6 py-4 border-t flex justify-end gap-2`. Always renders cancel-then-submit.

Rules:
- Form labels: sentence case, `text-[11px] text-muted-foreground`. No more `text-[10px] uppercase tracking-[0.15em]`.
- Helper text: `text-[11px] text-muted-foreground/60`, max 2 lines.
- Pair related fields in 2-col grid (recipient + amount, duration + frequency, monthly + months).
- Submit buttons are right-aligned in a footer row, never full-width inside a drawer.

#### Workflow shell rules

- Drawer width: `sm` 420 px (single-field ops), `md` 520 px (most), `lg` 640 px (CSV batch).
- Inline page workflow (non-drawer) max content width: 720 px to prevent wide forms.
- Every workspace tab opens with: workspace header + summary metric row + list-of-items. Creation lives in a drawer.

#### Motion language

- All Framer-motion entries: `initial={{opacity:0, y:4}}` → `animate={{opacity:1, y:0}}` with `duration:0.18 ease:'easeOut'`.
- Drawer: slide-in 220 ms cubic-bezier, fade backdrop 180 ms.
- Hover: `transition-colors duration-150`. No transforms on hover for cards.
- Masked balance reveal: `transition: filter 280 ms` (blur 6 → 0).
- No motion on disabled/loading buttons.

#### Onboarding orchestration

Hero already drives state → CTA. Additions in this phase:
- Beneath hero: `HarmonyProgressTrail` — 5 small dots (`new → has-eth → has-usdc → shielded → registered`). Past stages = filled deep-green; current = ring; future = hairline. Empty `not-connected` and `active` stages → trail hidden.
- Activity empty state for `registered` user reads: "No private payments yet. Try a self-test or send to a teammate." (1 line + 1 ghost CTA).
- Once `active`, hero collapses verbose copy: "Welcome back" + "Send a payment" CTA + "Open inbox →" link.

#### Privacy storytelling system

New micro-primitives:
- **`HarmonyMaskedBalance`** — renders `••••` with subtle 4-px letter-spacing OR the revealed value with a 280 ms blur transition. Always paired with a `HarmonyPrivacyBadge` tooltip.
- **`HarmonyPrivacyBadge`** — small pill: `Lock` icon + text "Hidden on-chain". Hover tooltip: "Encrypted with FHE — only you can decrypt." Sentence case, no jargon (no "FHE", no "CoFHE" outside the tooltip body).
- **`HarmonyPrivacyPosture`** — single-row strip on Home, beneath metric row, reads: `Balance hidden · Receiving private · Inbox sealed`. Three icon+label items. No card chrome, just a hairline divider above.

Copy guidelines (institutional, calm):
- "Hidden on-chain" not "Encrypted via FHE coprocessor".
- "Private balance" not "Sealed balance" or "Shielded balance".
- "Make private" / "Convert back" not "Shield" / "Unshield".
- "Privately received" not "Stealth-claimed".

#### Interaction hierarchy

Within any visible workspace at any time, the user must be able to identify:
1. **Where they are** — workspace header title + breadcrumb.
2. **What is the state** — mission hero or metric row.
3. **What they can do next** — exactly one primary CTA + ≤2 ghost actions.
4. **Where to learn more** — collapsed `<details>` or footer link.

Anything that does not belong to one of those four roles must be removed from the primary surface (move to `Settings` or `<details>`).

#### Files changed (planned)

| File | Change |
|---|---|
| `src/index.css` | Tighten `.btn-pay` height with `!important`. Add `.btn-pay-sm`, `.btn-pay-link`. Add `.pay-input-sm`. Neutralize any remaining `pay-card-*` gradient borders to plain hairline. |
| `src/components/harmony/harmony-ui.tsx` | + `HarmonyFieldGrid`, `HarmonyField`, `HarmonyDrawerFooter`, `HarmonyMaskedBalance`, `HarmonyPrivacyBadge`, `HarmonyPrivacyPosture`, `HarmonyProgressTrail`. |
| `src/components/harmony/PayHarmonyHome.tsx` | Hero copy rewrite per state with privacy framing. Insert `HarmonyProgressTrail` beneath hero. Insert `HarmonyPrivacyPosture` strip beneath metric row. |
| `src/components/pay-v4/StreamsDashboard.tsx` | Remove inline `CreateStreamFormV2` (drawer is sole entry). Remove `BulkPayrollImport` collapsible (move to Payroll workspace). Compact balance banner + tab strip. |
| `src/components/pay-v4/CreateStreamFormV2.tsx` | Full rewrite: 2-col field grid, ivory tokens, sentence-case labels, drawer-footer submit. Drop framer-motion bulk wrapper. |
| `src/components/pay-v4/SubscriptionForm.tsx` | Compact rewrite: merchant (full) + monthly/duration (2-col with quick-pills inline) + summary + drawer-footer submit. Drop dark utility leftovers. |
| `src/components/pay-v4/OcUSDCPanel.tsx` | Convert to 3-tab compact panel: "Make private · Convert back · Authorize PayStream". Single submit per tab. |
| `src/components/pay-v4/OcUSDCEscrowForm.tsx` | Ivory token swap; condense recipient + amount to 2-col grid; replace amber/cyan gradient post-create panel with hairline success card. |
| `src/components/pay-v4/BatchEscrowForm.tsx` | Ivory token swap; reduce row height; compact CSV import row. |
| `src/components/pay-v4/RegisterMetaAddressForm.tsx` | Sentence-case labels; remove uppercase eyebrows; compact submit footer. |
| `src/pages/PayPage.tsx` | Adjust automations sub-tabs to use new `HarmonyDrawerFooter` pattern when needed. Verify Pay/Get-Paid workspaces follow workspace-header + body pattern. |
| `memory_pay_5.md` | Append W5P1.9.1 section. |
| `summary5.md` | Append W5P1.9.1 entry. |

#### Acceptance criteria

- Every redesigned form fits in ≤ 420 px vertical inside its drawer (no scroll on default 720 px viewport drawer body).
- All primary CTAs use `btn-pay-primary` at 36 px height; no `w-full py-2.5` overrides remain in any pay-v4 form.
- All labels in pay-v4 forms are sentence case 11 px — no uppercase 10 px eyebrows.
- `StreamsDashboard` renders zero create-form code (drawer is sole entry).
- `OcUSDCPanel` shows one tab at a time, never three stacked sections.
- Mission Control hero copy explicitly mentions privacy/hidden state once per stage.
- `HarmonyPrivacyPosture` strip visible on Home for any connected wallet.
- `HarmonyMaskedBalance` used wherever raw `••••` appears today.
- Build green; zero TS errors.
- No contract / hook / FHE changes; no new routes; no broken deep links.

### Phase W5P2 (Subscription Hub UI) ✅ COMPLETE
- `/pay/subscriptions` route
- Subscriber dashboard: list, cancel, pause, resume
- Provider dashboard: aggregated encrypted totals
- Wire to existing `ObscuraInsuranceSubscriptionV2` ABI

### Phase W5P3 (Smart Account integration)
- `useSmartAccount()` hook: 6-state FSM (idle → deploying → deployed → signing → submitting → confirmed)
- `useUnifiedWrite()` hook: dispatches to EOA or smart account path
- Passkey creation flow: WebAuthn enroll → CREATE2 deploy on first action
- Batched UserOp builder: `shield + pay` as one user-visible action

### Phase W5P4 (Indexer-backed activity feed)
- `/pay/activity` route
- Filterable list (received, sent, invoice, stream, subscription, escrow)
- Notification preferences page
- "Mark all read" + grouped notifications

### Phase W5P6 (New-primitive UIs)
- `/pay/links` — create magic claim link
- `/claim/<chainId>/<linkId>#<secret>` — public claim page
- `/pay/proofs` — create + list balance proofs
- `/v/<proofId>` — public verify page
- `/pay/split` — multi-recipient split-pay
- `/pay/disclosure` — grant auditor permit + revoke

### Phase W5P8 (Mobile PWA)
- Add manifest.json, service worker (Vite plugin)
- Mobile nav (bottom tab bar)
- Touch-target audit (44px minimum)
- Pull-to-refresh on activity feed
- iOS Add-to-Home-Screen prompt

### Phase W5P10 (Polish)
- In-app onboarding tour (4-min, replayable)
- CSV/PDF export
- Stealth rotation UI
- Help page in-product

---

## 13. Backend / Indexer / Keeper Tasks

### Phase W5P4 (Indexer)
- `packages/pay-indexer/` — new TypeScript service
- Listens to: Pay, Invoice, Stream, Escrow, Insurance, Stealth, Rewards events
- Writes to Postgres (Supabase) with RLS enabled, no public policies, service-role key
  blocked at build time
- Exposes REST + Realtime subscription endpoints
- Auth: wallet-signed challenge for user-scoped reads
- Asymmetric replay window: server clock + nonce + 60s

### Phase W5P4 (Notifications)
- `packages/pay-notifications/` — same service or sibling
- Web Push (VAPID) + email (Postmark / Resend)
- Opt-in via wallet-signed challenge; never email-password
- Notification types: payment received, invoice paid, stream ending, subscription debited,
  escrow expiring, credit position at risk

### Phase W5P3 (Paymaster relay)
- `packages/pay-relay/` — UserOp submission endpoint
- KMS-backed signer (AWS KMS in prod, env-var in dev)
- Rate-limited per smart-account address
- Budget cap per day / per user

### Existing: `packages/credit-keeper/` (already shipped, DRY_RUN mode)
- Phase W5P9: production-grade keeper key in HSM
- Phase W5P9: monitoring + alerting + auto-restart

---

## 14. Security Tasks

### Phase W5P7
- All UUPS proxies → storage layout snapshot committed
- CI gate: `pnpm storage:check` runs on every PR
- All external functions → `nonReentrant`
- All initializer functions → `_disableInitializers()` in constructor
- All FHE comparisons that branch on result → `FHE.select` not if/else
- All `require(plaintext)` reviewed for leakage
- 4-tier permit audit: `allowThis`, `allowSender`, `allow`, `allowTransient` — correct tier per use

### Phase W5P9 (External audit)
- Spearbit / Trail of Bits / OpenZeppelin
- Scope: all 13 active Pay contracts + 4 new Wave-5 primitives + smart account + paymaster
- Fix all critical/high before mainnet
- Public audit report

### Phase W5P9 (Operational security)
- 3-of-5 multisig (Safe) for: protocol governance, paymaster funding, treasury control
- Keeper HSM
- Indexer service-role key never exposed to frontend
- Permissions-Policy headers
- CSP locked down (no unsafe-eval)
- Wallet-signed challenges on every email/push endpoint

### Phase W5P9 (Bug bounty)
- Immunefi listing, scaled rewards
- Public security policy in repo (already exists; extend)

---

## 15. Testing Tasks

### Phase W5P1 → continuous
- Vitest unit tests for every new hook
- Playwright E2E for every user-facing flow
- Hardhat tests for every new contract (≥ 90% coverage)
- Storage-layout snapshot tests on every UUPS contract
- Differentiating test for any encrypted comparison (e.g. auction-style FHE tournaments)

### Phase W5P7
- Fuzz testing on credit market math (Foundry)
- Integration tests: Pay → Credit (score boost) → Vote (participation) round-trip
- Chaos test: indexer down, frontend should degrade gracefully (read from chain)

### Phase W5P9
- External audit firm tests
- Mainnet rehearsal on testnet fork
- Multi-wallet two-browser-window QA

---

## 16. Deployment Tasks

### Phase W5P3
- Deploy `ObscuraSmartAccount` + factory + paymaster to arb-sepolia
- Fund paymaster with 0.5 ETH
- Whitelist Pay, Invoice, Stream, Escrow, Insurance, Stealth call targets

### Phase W5P4
- Stand up Supabase Postgres project
- Deploy indexer to Render / Railway / Fly.io
- Deploy notifications service alongside

### Phase W5P6
- Deploy 4 new primitive contracts to arb-sepolia
- Verify all on Arbiscan
- Append to `deployments/arb-sepolia.json`
- Update frontend env vars

### Phase W5P9 (mainnet gate — BLOCKED on CoFHE GA)
- Mainnet deployment runbook
- Multisig handoff
- Threshold-operator decentralization gate

### Phase W5P10
- PWA deploy to Vercel
- Custom domain + SSL
- Subdomain split: `app.obscura.xyz`, `claim.obscura.xyz`, `v.obscura.xyz` (proof verify)

---

## 17. Migration Tasks

### Phase W5P3
- Existing EOA users → optional smart account upgrade path
- Migration helper: detect EOA, offer "upgrade to passkey wallet" with explanation
- Existing balances stay on EOA; new flows preferentially route through smart account
- Both paths supported via `useUnifiedWrite()` — never deprecate EOA

### Phase W5P5 (Score V3)
- `setScoreOracle(scoreV3)` on all 3 markets via timelock + governance proposal
- Score V2 stays callable for backward compat (no state migration needed; same `IEncryptedScore`)

### Phase W5P6 (New primitives — additive, no migration)
- New contracts are net-new. No existing state to migrate.

### Phase W5P9 (mainnet)
- Document, but do not execute, full mainnet migration plan
- State export is not required (testnet is separate); fresh deploy on mainnet

---

## 18. Analytics / Telemetry Tasks

Privacy constraint: telemetry MUST NOT leak any encrypted value or correlate stealth addresses
back to primary addresses.

### Phase W5P4
- Privacy-respecting analytics: Plausible or self-hosted Umami (no cookies, no IPs stored)
- Track only: page views, button clicks, feature usage, error rates
- Never track: amounts, addresses, transaction details
- Opt-out toggle in settings

### Phase W5P4
- Sentry for error tracking (opt-in via env var, like Blank does)
- PII scrubbing: addresses, amounts, tx hashes scrubbed before send
- Source maps uploaded only for non-FHE files

### Phase W5P10
- Health dashboard at `/status`
- Indexer lag, RPC latency, gas price, paymaster balance, FHE coprocessor health

---

## 19. Mobile UX Tasks

### Phase W5P8 (mobile-first PWA)
- Add manifest.json, icons, splash screens
- Service worker (Workbox via Vite PWA plugin)
- Bottom-tab nav: Home / Pay / Activity / Account
- Touch-target audit: every button ≥ 44px
- Swipe gestures on activity feed (mark read)
- Pull-to-refresh on dashboard, activity, subscriptions
- iOS Add-to-Home prompt with explainer modal
- Passkey wallet shines on mobile: WebAuthn UX is best-in-class on iOS/Android
- Camera access for QR-code scanning (recipient address, claim links)
- Test on iPhone SE (small screen), iPhone 15 Pro Max, Pixel 7, foldable

### Phase W5P10 (mobile polish)
- Haptic feedback on confirmed txs (where supported)
- Native share sheet for claim links
- Biometric prompt before reveal (additional UX layer over passkey)

---

## 20. Risk Analysis

### 20.1 Protocol risk

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| FHE precompile gas estimation drift | Med | Med | Manual 5M gas limit on FHE txs; existing pattern |
| CoFHE threshold network downtime | Low | High | Graceful UX: queue txs, retry; user-visible status |
| Storage layout drift on upgrade | Med | Critical | CI gate + snapshot tests + `__gap` discipline |
| Paymaster drain attack | Med | Med | Whitelisted targets, per-user rate limits, 4-layer defense |
| Operator approval bug | Low | High | Cap encrypted amount per operator; audit |
| Stealth address linkability | Low | High | Educate users; future: VPN-layer guidance |

### 20.2 Business / regulatory risk

| Risk | Mitigation |
|---|---|
| FATF travel rule | Sender + receiver public; only amount encrypted. Bank-account-style privacy, not mixer-style. Legal review pre-mainnet. |
| Sanctioned wallet acceptance | Optional address-blocklist module at paymaster layer (governance-controlled) |
| Mainnet liability | Testnet-only until audit + threshold decentralization + 3-of-5 multisig |
| Token expectation | Project documents "no token" stance loudly. Rewards are non-transferable points or denominated in $OBS (governance, not speculation). |

### 20.3 Operational risk

| Risk | Mitigation |
|---|---|
| Indexer corruption | Re-index from chain (always source of truth) |
| Supabase outage | Frontend degrades to direct-chain reads (slower, no notifications, but functional) |
| RPC outage | Multi-RPC failover; Alchemy + public PublicNode + Infura |
| Frontend deploy bricks | Vercel rollback; Playwright smoke tests run post-deploy |
| Keeper bot crashed → liquidation missed | Monitoring + alert; encourage third-party keeper participation |

---

## 21. Scaling Considerations

### 21.1 On-chain

- Arbitrum Sepolia gas is cheap but FHE precompile cost dominates. Each `FHE.add` is ~50k gas;
  each `FHE.select` is ~100k. Profile every contract.
- Batch operations (split-pay, payroll) scale linearly with N recipients. Cap at N=30 like
  existing payroll.
- UUPS proxies + `__gap` slots allow forward-compatible upgrades without state migration.

### 21.2 Off-chain

- Indexer scales horizontally (per-event-type sharding) once event volume grows.
- Supabase Postgres free tier covers testnet; mainnet would require Pro plan or self-host.
- Notification fan-out: web push handles thousands of concurrent; email batched via Resend
  free tier (3k/mo).

### 21.3 Frontend

- Vite + React + code splitting per route. Bundle target: < 500KB initial load.
- Lazy-load CoFHE SDK (already done; loads only on first FHE action).
- Service worker caches static assets; encrypted data NEVER cached.

### 21.4 Cost model (post-mainnet, projected)

- Paymaster: assume $0.05 per user per day, capped at $1.50/mo per active wallet.
- Indexer + DB: $50/mo at 10k MAU; scales to $500/mo at 100k.
- RPC: $200/mo at 100k MAU with Alchemy growth tier.
- Audit: one-off $50–150k pre-mainnet.

---

## 22. Recommended Priorities

Ordered by ROI (user value per engineering hour), informed by current friction:

1. **W5P1 — UX polish** (1–2 weeks). Highest leverage. Fixes today's friction without new
   contracts.
2. **W5P2 — Subscription Hub UI** (1 week). Contract exists; just needs UI. Unlocks
   recurring-payment narrative.
3. **W5P3 — Smart Account + Paymaster** (3–4 weeks). Single biggest onboarding lever.
   Eliminates MetaMask-dependency. Enables batched UserOps (3 popups → 1).
4. **W5P4 — Indexer + Notifications + Activity Feed** (2–3 weeks). Once shipped, every
   future feature gets activity tracking for free.
5. **W5P5 — Score V3 (cross-product reputation expansion)** (1–2 weeks). Compounds the
   Pay ↔ Credit ↔ Vote thesis.
6. **W5P6 — New primitives (claim links, proofs, split, disclosure)** (3–4 weeks). High
   user value, additive (no migration).
7. **W5P7 — Security hardening + storage layout CI** (1–2 weeks). Audit prerequisite.
8. **W5P8 — Mobile PWA** (2 weeks). Real payments are mobile.
9. **W5P9 — External audit + mainnet readiness** (6–8 weeks calendar, audit-firm dependent).
   BLOCKED on Fhenix CoFHE mainnet GA for actual broadcast.
10. **W5P10 — Polish, onboarding, exports, status page** (1–2 weeks). Pre-mainnet finish.

---

## 23. Execution Phases (W5P1 → W5P10)

Each phase below follows the same structure: objective, exact tasks, dependencies, affected
contracts, frontend impact, testing requirements, deployment requirements, risk level,
estimated complexity, success criteria.

---

### W5P1 — Design System Migration + Dashboard Rebuild (non-breaking)

**Objective**: Two parallel tracks running concurrently:
1. **Harmony migration** — eliminate ALL remaining dark/neon/gradient patterns from every
   Pay, Credit, and Vote component. Make the app look like the screenshots: ivory, green,
   editorial, minimal, premium. No visual inconsistency between any two tabs.
2. **Dashboard rebuild** — rebuild the Overview tab against the §24 layout spec and eliminate
   the 28 observed UX friction points from §4. No new contracts; no new routes.

**Exact tasks** (grouped):

*Track A — Harmony design system migration (§26.9 checklist)*\
Priority order: highest-impact inconsistencies first.

1. **`SettingsPanel` in [PayPage.tsx](frontend/obscura-os-main/src/pages/PayPage.tsx)**
   - Extract inline `SettingsPanel` to `components/pay-v4/PaySettingsPanel.tsx`
   - Replace `PrettySelect` (dark bg, `bg-[#0a0d12]`) with a `HarmonySelect` component
     (hairline border, ivory bg, green focus ring)
   - All labels: `font-mono uppercase tracking` eyebrow pattern from `harmony-ui.tsx`

2. **[StreamsDashboard.tsx](frontend/obscura-os-main/src/components/pay-v4/StreamsDashboard.tsx)**
   - Wrap in `PayHarmonyTabShell`
   - Replace dark card backgrounds with `bg-card hairline rounded-2xl`
   - Replace neon amount displays with `HarmonyEncryptedValue` or `HarmonyStat`

3. **[SubscriptionForm.tsx](frontend/obscura-os-main/src/components/pay-v4/SubscriptionForm.tsx)**
   - Wrap in `HarmonyFormCard`
   - Plain-language copy: "Recurring payment" not "Insurance subscription"
   - Amount preview: "You will be debited \$20 every 30 days"

4. **[BatchEscrowForm.tsx](frontend/obscura-os-main/src/components/pay-v4/BatchEscrowForm.tsx) +
   [ClaimEscrowCard.tsx](frontend/obscura-os-main/src/components/pay-v4/ClaimEscrowCard.tsx)**
   - Wrap in `HarmonyFormCard`
   - Remove any dark gradient backgrounds

5. **[BuyCoverageForm.tsx](frontend/obscura-os-main/src/components/pay-v4/BuyCoverageForm.tsx)**
   - Wrap in `HarmonyFormCard`

6. **[GovernorPanel.tsx](frontend/obscura-os-main/src/components/vote/GovernorPanel.tsx)**
   - Audit for dark backgrounds. Apply `bg-card hairline` pattern.
   - Apply amber accent for Vote vs green for Pay

7. **[CreditPage.tsx](frontend/obscura-os-main/src/pages/CreditPage.tsx) + credit components**
   - Audit page-level background (must be `var(--background)` ivory, not dark)
   - `EncryptedTile accent="violet"` is already correct — just needs correct page bg
   - `HealthBar`, `HealthBadge`, `HealthRibbon`, `AuctionCard`: apply Harmony border/bg tokens

8. **[GooeyNav.tsx](frontend/obscura-os-main/src/components/elite/GooeyNav.tsx)**
   - Audit. If it uses neon/dark patterns and is not rendered in any live path, delete it.
   - If it IS rendered, replace gooey effect with clean hover state per §26.5.

9. **[SectionDiagram.tsx](frontend/obscura-os-main/src/components/elite/SectionDiagram.tsx)**
   - Audit. Port to ivory/green palette. If it's only a landing-page component, apply landing
     palette (can differ from app; landing already uses the premium light style).

*Track B — Overview dashboard rebuild*

- **Hero layout fix**: Balance hero takes 60% of above-the-fold space. Quick-send card drops
  to a secondary position (not inverted dark — use a `bg-card hairline` card instead of the
  dark inverted block). Primary CTA buttons (`[Send]`, `[Receive]`, `[Shield/Unshield]`) must
  be the most visually prominent elements on the page.
- **Plain-language translations** in all UI copy:
  - "Shield USDC" → "Make USDC private" (subtitle: "Convert to ocUSDC — encrypted on-chain")
  - "Operator approval" → "Allow this feature to move your funds" (on approval buttons)
  - "Stealth meta-address" → "Private receive address" (in setup step)
  - "FHE" → "End-to-end encrypted" on first occurrence; "FHE" acceptable in badges thereafter
  - "ocUSDC" → shown as "ocUSDC" always (technical term is the product name, keep it)
- **Setup guide** (already exists in [PayHomeDashboard.tsx](frontend/obscura-os-main/src/components/pay-v4/PayHomeDashboard.tsx)):
  - Reduce to 3 steps max: "Get ETH for gas → Shield USDC → Register private address"
  - Step 4 ("Register stealth") is already there — consolidate with step 3
  - Auto-collapse the entire guide card once all steps done (already works); hide after 7
    days even if incomplete (frustrated users don't need recurring guilt)
- **Quick Actions strip**: `[Send]` `[Receive]` `[Shield]` `[Sweep inbox]` — 4 buttons,
  borderless text buttons with icon, always above the fold in every viewport
- **Activity panel**: freshness strip (`Synced · Checked HH:MM:SS · [↺]`); dual-CTA empty
  state; `[View all →]` link
- **Transaction lifecycle explainer**: rewrite copy from technical to benefit-first:
  - "Compose" → "Amount encrypted here, on your device. It never leaves as a plain number."
  - "Relay" → "Your encrypted instruction is sent to the network."
  - "Compute" → "Math runs on the encrypted data — no one can see the amounts."
  - "Settle" → "The result lands on Arbitrum. Confirmed. Private."
- **Privacy reveal session**: *"Stay revealed for 5 minutes"* in-memory permit session with
  visible countdown chip (`Hidden again in 4:23`); amber chip when < 60s
- **Degradation banner**: poll CoFHE health every 30s; on slow → amber banner auto-dismisses
  on recovery
- **Network-mismatch banner**: wrong chain → "You're on [ChainName]. [Switch to Arbitrum
  Sepolia →]" one-click button
- **Persistent FHE toast**: in-flight tx doesn't auto-dismiss; shows step indicator +
  `[View on Arbiscan]` link; clears when READY

*Track C — Empty states + error states*
- Every tab gets a structured empty state per §26.7 template
- Every error maps to the §26.8 copy patterns
- FHE step tooltips added to `useFHEStatus` indicator: each state has a one-line plain explanation

**Dependencies**: None.

**Affected contracts**: None.

**Frontend impact**:
- Track A: ~15 component files. No behavior changes. Pure visual migration.
- Track B: [PayHomeDashboard.tsx](frontend/obscura-os-main/src/components/pay-v4/PayHomeDashboard.tsx),
  [PayHarmonyHome.tsx](frontend/obscura-os-main/src/components/harmony/PayHarmonyHome.tsx),
  layout tweaks to [HarmonyAppShell.tsx](frontend/obscura-os-main/src/components/harmony/HarmonyAppShell.tsx)
- Track C: ~8 component files (empty-state additions only)
- No new routes. No new env vars.

**Testing requirements**:
- Visual regression: snapshot all 9 tabs before + after. No dark backgrounds should appear.
- Playwright E2E: empty-state CTAs navigate correctly; reveal countdown decrements
- Manual: Chrome desktop + Safari iOS + Android Chrome + 375px viewport
- Accessibility: `axe-core` pass on all tab root elements (color contrast ≥ 4.5:1 for text)

**Deployment requirements**: Vercel preview deploy + visual QA sign-off by designer before
production promote. No contract redeploy.

**Risk level**: 🟢 Low (visual only — behavior preserved).

**Complexity**: Medium. 2–3 weeks (Tracks A + B + C are parallelizable).

**Success criteria**:
- Zero dark backgrounds (`#0a0d12`, `#111`, `rgba(0,0,0,*) > 0.5`) visible in any tab at
  any viewport
- Color contrast ≥ 4.5:1 for all text elements (axe-core pass)
- Time-to-first-payment for new wallet < 4 minutes
- All 9 tabs feel visually consistent (Harmony audit sign-off)
- Getting Started checklist auto-collapses after all steps complete
- Degradation banner renders within 30s of injected CoFHE failure (mock test)
- Zero new contract deploys

---

### W5P2 — Receivables Hub (unify Subscriptions + Insurance + Invoice receive + Escrow claim)

**Objective**: The contract is shipped. So are most components ([SubscriptionForm.tsx](frontend/obscura-os-main/src/components/pay-v4/SubscriptionForm.tsx),
[MyPolicies.tsx](frontend/obscura-os-main/src/components/pay-v4/MyPolicies.tsx),
[BuyCoverageForm.tsx](frontend/obscura-os-main/src/components/pay-v4/BuyCoverageForm.tsx),
[InvoicePayCard.tsx](frontend/obscura-os-main/src/components/pay-v4/InvoicePayCard.tsx),
[ClaimEscrowCard.tsx](frontend/obscura-os-main/src/components/pay-v4/ClaimEscrowCard.tsx)).
What's missing is a **unified "Receivables" tab** that consolidates everything the user
receives — instead of forcing them to hunt across Insurance, Streams, Stealth Inbox, Escrow
claim, Invoice payment.

This phase is **consolidation + provider-side dashboard**, not greenfield. All new components
built here MUST use Harmony (§26) — W5P1 establishes the foundation; W5P2 builds on it.

**Exact tasks**:
- Replace `insurance` sidebar tab with `receivables` tab (per §24 IA)
- Subscriber view (consolidates [MyPolicies](frontend/obscura-os-main/src/components/pay-v4/MyPolicies.tsx)):
  *"Next debit: \$5 to Provider X on June 1"* — countdown, pause, cancel, reveal
  upcoming-total-encrypted
- Provider view (NEW): list of active subscribers (count + aggregate-revealable encrypted
  total), per-period revenue chart (bucketed)
- Subscription wizard polish: amount + period + recurrence preview ("\$5 × 12 months = \$60
  encrypted total"); plain-language labels throughout
- Unify stealth-inbox + invoice-receive + escrow-claim into one *"Pending claims"* card on
  Receivables home — driven by [useStealthInbox.ts](frontend/obscura-os-main/src/hooks/useStealthInbox.ts) +
  [useStealthScan.ts](frontend/obscura-os-main/src/hooks/useStealthScan.ts)
- Notifications stub (becomes active in W5P4): "You have 2 pending claims" header chip
- Wire `useSubscriptions()` over existing `ObscuraInsuranceSubscriptionV2` ABI; expose
  `subscriberCount(provider)` and `aggregateRevenue(provider, period)` view helpers (see W5P5
  for the contract patch)

**Dependencies**: W5P1 (Harmony migration must be complete before W5P2 builds new surfaces).

**Affected contracts**: None for shipping; **optional** view-helper additions to
`ObscuraInsuranceSubscriptionV2` consolidated with W5P5 patches.

**Frontend impact**: ~10 file touches, ~5 new files. Removes 1 sidebar tab (`insurance`),
adds 1 (`receivables`). Migration: redirect `/pay?tab=insurance` → `/pay?tab=receivables` for
90 days.

**Testing requirements**:
- Vitest: hook contract calls correct ABI methods
- Playwright: full create-subscription flow, end-to-end pause/cancel, provider revenue
  reveal
- Manual: two-wallet test (subscriber + provider), verify aggregate-only privacy on provider
  side
- Visual: all new components pass Harmony audit (no dark backgrounds, correct type scale)

**Deployment requirements**: Frontend deploy only.

**Risk level**: 🟢 Low.


**Complexity**: Low–Medium. 1–1.5 weeks (less greenfield than originally scoped).

**Success criteria**: Subscription create + first debit observed end-to-end. Provider can see
aggregate revenue (encrypted, revealable). User can manage 100% of receivables from one tab
without navigating elsewhere.

---

### W5P3 — Smart Account + Paymaster + Batched UserOps ✅ COMPLETE

**Status**: Production-deployed. Contracts live on Arbitrum Sepolia. Frontend integrated. Tests 40/40.

**Deployed addresses**:
- `ObscuraSmartAccountFactory`: `0xbe8dC1d4Dcc368e0dBb6c7A5BDFfac2Fe72AFd05`
- `ObscuraPaymaster`: `0x9B1F61A65467F11339A8d0834349Be32EB2CF878` (funded 0.5 ETH, 10 contracts whitelisted)

**Objective**: Eliminate MetaMask dependency. Enable batched encrypted txs. Single biggest
onboarding lever.

**Exact tasks**:

*Contracts*:
- `ObscuraSmartAccount.sol` — ERC-4337 v0.7 account, length-discriminated EOA / P-256
  passkey dispatch, ERC-1271 length guards
- `ObscuraSmartAccountFactory.sol` — CREATE2 deterministic deploy
- `ObscuraPaymaster.sol` — sponsors whitelisted call targets (Pay, Invoice, Stream V3,
  Escrow V2, Insurance V2, Stealth), 4-layer defense (target whitelist + per-user rate
  limit + global daily cap + signature gate), withdrawable by governance

*Backend*:
- `packages/pay-relay/` — UserOp submission endpoint with AWS KMS signer in prod, env-var
  signer in dev; asymmetric replay window auth

*Frontend*:
- `useSmartAccount()` 6-state FSM hook
- `useUnifiedWrite()` dispatcher (EOA path + smart account path)
- Passkey enroll flow: WebAuthn registration → CREATE2 deploy on first action
- `prehash: false` on every passkey signature (critical for RIP-7212 on-chain verifier)
- `lib/userop.ts` reads `userOpHash` from EntryPoint on-chain (don't reimplement EIP-712 in JS)
- Batched UserOp builder: `shield + pay` as one user action

*FHE integration*:
- `SmartAccountCofheBinder` provider: waits for `isDeployed` before binding CoFHE permit
  to smart account address

**Dependencies**: EntryPoint v0.7 (✅ live on arb-sepolia).

**Affected contracts**: New smart-account contracts; no existing contract changes.

**Frontend impact**: ~30 new files; every existing write hook routed through `useUnifiedWrite()`.

**Testing requirements**:
- Hardhat: full smart-account + paymaster test suite (≥ 95% coverage)
- Vitest: hook FSM transitions, batched UserOp builder
- Playwright: passkey enroll + first-action deploy + batched shield-and-pay
- Manual: tested on iOS Safari (WebAuthn), Chrome desktop, Android Chrome

**Deployment requirements**:
- Deploy smart account factory + paymaster
- Fund paymaster with 0.5 ETH initial
- Deploy relay backend (Render / Fly.io)
- Configure KMS in prod environment

**Risk level**: 🟡 Medium. AA + FHE interaction is novel; needs careful integration testing.

**Complexity**: High. 3–4 weeks.

**Success criteria**:
- New user signs up with passphrase (no MetaMask) and completes first private payment in
  < 90 seconds
- `shield + pay` reduced from 3 popups to 1
- Paymaster sponsors first 10 txs per new wallet successfully

---

### W5P4 — Indexer + Notifications + Activity Feed ✅ COMPLETE

**Status**: All services built and ready for Render deployment. Supabase schema applied. Frontend integrated.

**Infrastructure**:
- Supabase project: `woqfefgrkpleedsuxavd` (us-east-1), schema applied, Realtime enabled
- `render.yaml` at repo root defines all 3 services
- Pending: fill `BUNDLER_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_*`, `RESEND_API_KEY` in Render dashboard

**Objective**: Off-chain read model for instant activity feed + cross-channel notifications.
Frontend gets fast lists; users get notified out-of-band.

**Exact tasks**:

*Backend (`packages/pay-indexer/`)*:
- TypeScript Node service
- Listens to: Pay, Invoice, Stream V3, Escrow V2, Insurance V2, Stealth, Rewards events
- Writes to Supabase Postgres with RLS enabled, no public policies
- Service-role key blocked at build time (Vite no-`VITE_` prefix discipline)
- REST `/api/activity?address=0x...&since=...` with wallet-signed challenge auth
- Realtime channel subscriptions per address
- Re-index from chain on startup; chain is source of truth

*Backend (`packages/pay-notifications/`)*:
- Web Push (VAPID) registration endpoint
- Email opt-in via Resend / Postmark, wallet-signed challenge for enroll
- Notification types: payment received, invoice paid, stream ending in 24h, subscription
  about to debit, escrow expiring in 48h, credit position health factor < 1.5
- Per-user preferences (toggle each notification type per channel)

*Frontend*:
- `/pay/activity` route with filterable list
- `useActivityFeed()` hook with Realtime subscription
- Settings page: notification preferences, channel enrollment
- Push permission prompt on first visit (deferred until user clicks "enable")

**Dependencies**: Supabase project provisioned; Resend account; web-push library.

**Affected contracts**: None.

**Frontend impact**: 2 new routes; ~15 new files; 1 new provider for realtime subscription.

**Testing requirements**:
- Unit: indexer reorg handling, replay-safety on restart
- Integration: emit test event on contract → assert appears in `/api/activity` within 5s
- Playwright: enroll for push → trigger test payment → notification arrives
- Load test: indexer can keep up with 1000 events/min sustained

**Deployment requirements**:
- Supabase Postgres project (RLS enabled)
- Render / Fly.io for indexer + notifications service
- Vercel cron for periodic health checks

**Risk level**: 🟡 Medium. RLS misconfiguration would leak data; auth flow needs review.

**Complexity**: Medium. 2–3 weeks.

**Success criteria**:
- Activity feed loads in < 200ms for any user
- Push notification delivered within 30s of on-chain event
- Indexer never falls > 1 block behind chain head
- Zero RLS bypass in audit

---

### W5P5 — Credit Score V3 (cross-product reputation expansion)

**Objective**: Compound the Pay ↔ Credit ↔ Vote thesis. Add invoice / escrow / repaid-loan
/ insurance-active signals to the encrypted credit score.

**Exact tasks**:
- `ObscuraInvoice.sol` patch — emit `InvoicePaid(payer)` event
- `ObscuraConfidentialEscrow.sol` patch — emit `EscrowCompleted(parties[])` event
- `ObscuraCreditMarket.sol` patch — emit `RepaymentMade(borrower)` event
- `ObscuraInsuranceSubscriptionV2.sol` — expose `subscriberCount(user)` view
- `ObscuraCreditScoreV3.sol` — adds 4 new signals with clamps:
  - invoices paid ≤ 30 (× 5 weight)
  - escrows completed ≤ 20 (× 4 weight)
  - repayments made ≤ 50 (× 8 weight — highest, reflects loan discipline)
  - active subscriptions ≤ 10 (× 2 weight)
- Score V3 keeps same `IEncryptedScore` external surface; markets need only
  `setScoreOracle(scoreV3)` via governance proposal

**Dependencies**: W5P4 indexer (for testing signal aggregation); Governor (for `setScoreOracle`).

**Affected contracts**: 5 contracts touched (4 patched + 1 new).

**Frontend impact**: Credit dashboard shows expanded signal breakdown; Pay dashboard shows
"reach Tier N by..." CTA tied to new signals.

**Testing requirements**:
- Hardhat: each signal contributes correctly; clamps work; anti-grind verified
- Integration: complete one of each (invoice / escrow / repayment / subscription) →
  observe score bump
- Differentiating test: user with high invoice count but no votes vs user with high votes
  but no invoices → different scores

**Deployment requirements**:
- Patch + redeploy affected contracts (Invoice, Escrow, Market are NOT UUPS in current
  state — confirm before patching; if not UUPS, this becomes net-new + migration)
- Deploy Score V3
- Governor proposal: `setScoreOracle(scoreV3)` on all 3 markets
- Timelock delay (2 days) → execute

**Risk level**: 🟡 Medium. Touching the credit market is risky; minimize blast radius.

**Complexity**: Medium. 1–2 weeks for code + 2 days for timelock.

**Success criteria**: Score V3 live on all 3 markets; users with Pay activity see measurable
score bump vs cold-start users.

---

### W5P6 — New Primitives (Claim Links, Proofs, Split, Disclosure)

**Objective**: 4 new contracts that fill real product gaps without bloating the surface.

**Exact tasks**:

*Contracts*:
- `ObscuraClaimLinks.sol` — UUPS upgradeable
  - `createLink(mode, encAmt, secretHash, expiry)` — mode = bearer | email-bound | address-bound
  - `claim(linkId, secret, proofForMode)` — verifies hash, transfers via handle
  - Domain-separated: `keccak256(OBSCURA_CLAIM_v1, mode, secret, ...)`
  - 365-day max expiry
- `ObscuraProofRegistry.sol` — UUPS upgradeable
  - `createProof(threshold, expiry)` — generates `FHE.gte(balance, threshold)` verdict
  - `publishProof(proofId, sig)` — runs `FHE.publishDecryptResult` once threshold-network signed
  - Public `verify(proofId) returns (bool, expiry)`
- `ObscuraSplit.sol` — UUPS upgradeable
  - `createSplit(recipients[], encAmounts[])` — pulls one encrypted total from sender
  - Each recipient gets stealth-claimable amount
  - Cap N=30 recipients per split (gas)
- `ObscuraDisclosure.sol` — UUPS upgradeable
  - `grantAuditor(auditor, period, scope)` — sender grants aggregate-only permit
  - `revealAggregate(grantId)` — auditor reads encrypted sum, decrypts locally
  - Audit-trail event for every disclosure

*Frontend*:
- `/pay/links` create + list user's links + revoke
- `/claim/<chainId>/<linkId>#<secret>` public claim page (works without wallet → smart-account
  onboarding flow)
- `/pay/proofs` create + list user's proofs
- `/v/<proofId>` public verify page (no wallet needed)
- `/pay/split` split-pay wizard (paste N recipients + amounts; one tx)
- `/pay/disclosure` grant / revoke auditor; auditor side: `/audit/<grantId>`

**Dependencies**: W5P3 smart account (for wallet-less claim/verify pages).

**Affected contracts**: 4 net-new; no existing changes.

**Frontend impact**: 6 new routes; ~25 new files.

**Testing requirements**:
- Hardhat: each contract ≥ 90% coverage; replay/expiry/revocation paths covered
- Differentiating tests: e.g. email-bound link rejects bearer-mode claim
- Playwright: claim-link flow on mobile Safari (worst-case WebAuthn UX)
- Integration: split-pay → all N recipients receive → score signal updates

**Deployment requirements**:
- Deploy 4 contracts to arb-sepolia
- Verify on Arbiscan
- Append to `deployments/arb-sepolia.json`
- Update frontend env

**Risk level**: 🟡 Medium. New attack surface; rely on domain-separated hashes + audit.

**Complexity**: High. 3–4 weeks.

**Success criteria**: Each primitive used in a real end-to-end demo on testnet; no
cross-feature replay possible; balance-proof verifiable by a non-wallet visitor.

---

### W5P7 — Security Hardening + Storage Layout CI

**Objective**: Make every contract upgrade-safe and audit-ready.

**Exact tasks**:
- Convert any non-UUPS Pay contracts to UUPS (Invoice, Escrow if needed)
- Add `__gap[50]` to every UUPS contract; decrement when adding state vars
- Snapshot storage layout for all UUPS contracts; commit to `contracts-hardhat/storage-layouts/`
- CI gate: `pnpm storage:check` runs on every PR, fails on slot drift
- ReentrancyGuard on every external state-mutating function
- `_disableInitializers()` in every UUPS constructor
- Audit pass: every `require(plaintext)` reviewed; replace with `FHE.select` where
  condition depends on encrypted state
- 4-tier permit audit: every `FHE.allow*` call reviewed for correct tier
- Operator-cap feature: optional max-encrypted-amount per operator per token

**Dependencies**: All prior phases shipped (so we know the final shape).

**Affected contracts**: All 17 active contracts (13 Pay + 4 new from W5P6).

**Frontend impact**: None.

**Testing requirements**:
- Foundry fuzz tests on credit math + new primitive math
- Storage-layout snapshot tests pass in CI
- Re-run full Hardhat suite

**Deployment requirements**: None (pre-deploy hardening).

**Risk level**: 🟢 Low — purely defensive.

**Complexity**: Medium. 1–2 weeks.

**Success criteria**: 100% UUPS storage coverage; CI fails any layout-breaking PR; all
encrypted comparisons use `FHE.select`.

---

### W5P8 — Mobile-First PWA

**Objective**: Real payments are mobile. Make Obscura Pay best-in-class on iPhone and Android.

**Exact tasks**:
- Vite PWA plugin: manifest, service worker (Workbox), offline shell
- Bottom-tab nav on viewport < 768px: Home / Pay / Activity / Account
- Touch-target audit: every interactive element ≥ 44 × 44 px
- Pull-to-refresh on dashboard, activity, subscriptions
- Swipe-to-dismiss on notifications / activity entries
- iOS Add-to-Home prompt with explainer
- Camera access for QR scanning (recipient address, claim-link URL)
- Native share sheet for claim links + payment requests
- Test matrix: iPhone SE, iPhone 15 Pro Max, Pixel 7, Samsung Galaxy S23, foldable
- Lighthouse PWA score ≥ 90

**Dependencies**: W5P3 smart account (passkey UX shines on mobile).

**Affected contracts**: None.

**Frontend impact**: ~20 file touches + new mobile-specific components.

**Testing requirements**:
- Playwright mobile viewport tests
- Manual: full payment flow on 4 physical devices
- Lighthouse audit on every route

**Deployment requirements**: Vercel deploy with PWA assets.

**Risk level**: 🟢 Low.

**Complexity**: Medium. 2 weeks.

**Success criteria**: Lighthouse PWA ≥ 90; first-time mobile user completes payment in
< 3 minutes; works offline for read-only views.

---

### W5P9 — External Audit + Mainnet Readiness Gate

**Objective**: Get audit-ready and document the mainnet broadcast runbook. ACTUAL mainnet
broadcast remains BLOCKED on Fhenix CoFHE mainnet GA.

**Exact tasks**:

*Audit prep*:
- Freeze contract surface (no new contracts during audit)
- Document threat model per contract
- Spearbit / Trail of Bits / OpenZeppelin engagement
- Public audit report

*Operational readiness*:
- 3-of-5 Safe multisig for: governance, paymaster admin, treasury control
- Keeper key migrated to HSM (AWS KMS or hardware wallet)
- Bug bounty program on Immunefi (scaled rewards)
- Incident response runbook
- Monitoring + alerting (Grafana / Datadog) on indexer, paymaster, RPC

*Mainnet deployment runbook (documentation only — DO NOT BROADCAST)*:
- Step-by-step deployment order (token → markets → score → governor → paymaster → app)
- Multisig handoff procedure
- Frontend env switch process
- Rollback plan

**Dependencies**: All prior phases shipped + frozen.

**Affected contracts**: All. (No code changes during audit.)

**Frontend impact**: None during audit; post-audit, add `/status` health page.

**Testing requirements**: Audit firm runs theirs.

**Deployment requirements**: Mainnet deploy BLOCKED on:
1. Fhenix CoFHE mainnet GA (external)
2. Audit complete + all critical/high fixed
3. Threshold-operator decentralization milestone
4. 3-of-5 multisig provisioned

**Risk level**: 🔴 High (mainnet money). Mitigated by the gate.

**Complexity**: Calendar-bound (6–8 weeks audit). Code work low.

**Success criteria**: Audit report published; all critical/high resolved; multisig
operational on testnet; runbook reviewed by external operator.

---

### W5P10 — Polish, Onboarding, Exports, Status Page

**Objective**: Pre-launch finish. Make the product feel complete.

**Exact tasks**:
- In-app onboarding tour (4-min, replayable, skippable): faucet → shield → send → reveal
- CSV export: user-triggered, runs locally over decrypted activity, signed by user wallet
- PDF export: same data, formatted for accountant submission
- Stealth-key rotation UI (`/pay/stealth/rotate`)
- In-product help portal: `/help` with searchable docs
- `/status` health dashboard: indexer lag, RPC health, gas price, paymaster balance,
  CoFHE coprocessor health
- "About" page with mainnet gate disclosure, audit report link, security policy
- Final accessibility audit: WCAG AA, 99+ aria-labels, keyboard focus indicators

**Dependencies**: W5P4 indexer (for activity export); W5P9 audit (for "About" disclosures).

**Affected contracts**: None.

**Frontend impact**: ~15 new files; 4 new routes.

**Testing requirements**:
- A11y audit (axe-core in CI)
- Manual: onboarding tour walks new user through full first-payment

**Deployment requirements**: Frontend only.

**Risk level**: 🟢 Low.

**Complexity**: Low–Medium. 1–2 weeks.

**Success criteria**: New user completes onboarding tour and first payment in < 5 min;
CSV export validated by external accountant; status page green.

---

## 24. Information Architecture (canonical sidebar)

Adjacent privacy-pay apps in the same category surface **16+ sidebar items** (P2P Exchange,
Group Expenses, Creator Support, AI Agents, Inheritance, Encrypted Proofs, Gift Envelopes,
Stealth Payments, Smart Wallet, History, Business Tools, ...). The user has no idea what to
click. Most surfaces are zero-state forever.

Obscura Pay deliberately collapses to **7 sidebar entries**, ordered by frequency-of-use.
This is the **target state** (some tabs renamed vs current implementation — see migration notes):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  OBSCURA                                               [Search pay…]        │
│                                                                              │
│  ▸ Overview          — balance hero, setup guide, quick actions, activity   │
│  ▸ Send              — unified send (direct · stealth · claim-link)         │
│  ▸ Receive           — share address, request, invoice, claim link          │
│  ▸ Streams           — payroll streams + tick dashboard                     │
│  ▸ Receivables       — escrow claims + subscriptions + stealth inbox        │
│  ▸ Contacts          — encrypted address book                               │
│  ▸ Settings          — preferences, operators, stealth, rotation, gas       │
│                                                                              │
│  ─── Legacy (collapsed, power users only) ───────────────────────────────── │
│  · Advanced          — raw contract interactions, resolver manager          │
│                                                                              │
│  ─── Cross-app rail (left icon strip) ───────────────────────────────────── │
│  [Pay] [Credit] [Vote] [Ecosystem]                                           │
│                                                                              │
│  ─── Footer ─────────────────────────────────────────────────────────────── │
│  ARB SEPOLIA · 0.95 ETH · 0xD208…171A                ·  FHE: Ready  · v5   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Current → target tab renames**:

| Current `Tab` key | Current label | Target label | Reason |
|---|---|---|---|
| `home` | Overview | Overview | ✅ keep as-is |
| `send` | Send | Send | ✅ keep |
| `receive` | Receive | Receive | ✅ keep |
| `streams` | Streams | Streams | ✅ keep |
| `escrow` | Escrow | *(folded into Receivables)* | Escrow is a payment mode, not a top-level destination |
| `insurance` | Insurance | Receivables | Consolidate subscriptions + escrow claims + stealth inbox |
| `contacts` | Contacts | Contacts | ✅ keep |
| `settings` | Settings | Settings | ✅ keep |
| `advanced` | Legacy | Legacy | ✅ keep, stay collapsed |

**Routing**: single-route + `?tab=` param model — keep as-is. Do NOT shard into `/pay/streams` etc.

**Three-panel layout** (target for W5P1 rebuild):

```
┌───────────────┬─────────────────────────────────────────────────┬──────────────────┐
│ 64px icon rail│  16px sidebar (tab list)     │  Content pane    │  (future: detail │
│               │                              │                  │   slide-in panel)│
│ [Pay]         │  Overview                    │  Balance hero    │                  │
│ [Credit]      │  Send                        │  Setup guide     │                  │
│ [Vote]        │  Receive                     │  Quick actions   │                  │
│               │  Streams                     │  Recent activity │                  │
│               │  Receivables                 │                  │                  │
│               │  Contacts                    │                  │                  │
│               │  Settings                    │                  │                  │
│               │  ──────────                  │                  │                  │
│               │  Legacy ▾                    │                  │                  │
└───────────────┴──────────────────────────────┴──────────────────┴──────────────────┘
```

**Cross-app routes** (separate origins for trust isolation):
- `app.obscura.xyz/pay` — main app (this IA)
- `app.obscura.xyz/credit` — credit market (separate top-level)
- `app.obscura.xyz/vote` — governance (separate top-level)
- `claim.obscura.xyz/<chainId>/<linkId>#<secret>` — public claim page (no wallet needed; W5P6)
- `verify.obscura.xyz/<proofId>` — public balance-proof verify (no wallet; W5P6)
- `hub.obscura.xyz` — invisible iframe-storage hub (§5.11)
- `status.obscura.xyz` — `/status` health dashboard (W5P10)

**Surfaces explicitly NOT in IA** (each rejected with reason):
- *P2P Exchange / Order Book* — out of thesis; we're a payments app, not a DEX
- *Group Expenses / Bill Splitting* — Split-pay primitive (W5P6) covers the contract layer;
  no dedicated tab
- *Creator Support / Tipping* — out of thesis; not a creator-economy app
- *AI Agents* — premature; LLM + FHE composability needs separate research wave
- *Inheritance* — premature; needs legal framework + dead-man-switch contract; revisit post-audit
- *Gift Envelopes as separate tab* — folded into Send (mode: bearer claim link)
- *Smart Wallet as separate tab* — folded into Settings → Account
- *Reputation as separate tab* — folded into Credit → score card; not prominent enough in Pay
  to justify a top-nav entry at this stage

---

## 25. Reliability & SLOs

Privacy is brittle if reliability is bad. Encrypt + threshold-decrypt + paymaster +
indexer + RPC is a 5-system pipeline. We must publish SLOs and surface health.

### 25.1 User-visible health primitives

| Surface | Source | Refresh | Failure UX |
|---|---|---|---|
| Sticky degradation banner | CoFHE coprocessor `/health` + threshold network status | 30s | Render banner with retry hint; persist until recovery |
| Encryption Status sidebar card | Same + paymaster balance + RPC latency | 30s | Show queue depth + ETA + amber dot when degraded |
| Activity freshness strip | `useReceipts` last fetch time | on view | `Synced · Checked HH:MM:SS · [Refresh]` |
| `/status` page (W5P10) | All systems aggregated | 15s | Full per-system pass/fail + uptime % rolling 24h/7d/30d |

### 25.2 SLO targets (initial; tune post-launch)

| System | Latency target | Availability | Action on miss |
|---|---|---|---|
| RPC (Arbitrum Sepolia) | p50 < 200ms, p99 < 1.5s | 99.5% | Failover Alchemy → PublicNode → Infura |
| CoFHE coprocessor | p50 encrypt < 2s | 99.0% | Banner + queue depth visible |
| Threshold-network decrypt | p50 < 5s, p99 < 30s | 99.0% | Banner + retry button on stuck UserOp |
| Paymaster (W5P3) | p50 < 1s submit, deploy < 30s | 99.5% | Banner + EOA-fallback option |
| Indexer (W5P4) | < 1 block behind head | 99.9% | Activity falls back to direct chain read |
| Frontend Web Vitals | LCP < 2.5s, INP < 200ms, CLS < 0.05 | n/a | Vercel Speed Insights alert |

### 25.3 Retry & idempotency rules

- Every encrypted write hook MUST be idempotent on UserOp hash (re-submitting a stuck op
  cannot double-spend)
- Decrypt requests MUST be retryable without re-signing (cache the permit for the session)
- The persistent in-flight toast (W5P1) MUST show `[Cancel] [Retry] [View on Arbiscan]`
- Failed UserOps MUST surface a *"Why this failed"* explainer pulled from a curated map of
  known revert reasons (`InvalidSigner` → "your wallet's signature didn't match — please
  re-submit"; `supply` → "unshield exceeds your shielded balance"; etc.)

### 25.4 Disaster scenarios (and our answer)

| Scenario | User-visible | Mitigation |
|---|---|---|
| CoFHE coprocessor down 4h | Encrypt actions queue, banner shown | Activity still readable; existing balances still revealable from cache; write actions queue with explicit retry; user can switch to EOA path |
| Threshold network slow (60s+) | Decrypt actions queue, banner shown | Reveal button shows queue ETA; user can keep using app for sends |
| Indexer down | Activity tab degraded | Falls back to direct chain reads via [useReceipts](frontend/obscura-os-main/src/hooks/useReceipts.ts); slower, no notifications |
| Paymaster drained | New users blocked; existing users still EOA-pay | Banner + EOA-fallback prompt + admin alert |
| Supabase outage | Notifications + Activity degraded | Same as indexer-down |
| RPC outage | Everything blocked | Multi-RPC failover via wagmi transports |

---

---

## 26. Design System — Harmony

The **Harmony** design system is the single canonical source of truth for all Obscura
Pay, Credit, and Vote frontend surfaces. It replaces every prior dark/cyberpunk/neon
pattern with a minimal, premium, institutional-privacy aesthetic.

> **Status**: Core implemented in `frontend/obscura-os-main/src/components/harmony/`.
> Systematic token audit + remaining legacy-component migration is W5P1 scope.

### 26.1 Visual foundations

| Token | Value | Notes |
|---|---|---|
| **Background** `--background` | `#F9F7F4` (soft ivory) | Near-white, warm. Never pure `#FFFFFF`. |
| **Surface** `--surface` | `#F3F1EE` | One step darker than bg; cards, sidebar |
| **Card** `--card` | `#FFFFFF` | Inset cards on surface. Hairline border only. |
| **Foreground** `--foreground` | `#1A1917` | Near-black, warm undertone |
| **Muted** `--muted-foreground` | `#6B6860` | Eyebrows, labels, secondary text |
| **Accent (green)** `--accent` | `#2D6A4F` | Primary action, FHE-active badge, CTA buttons |
| **Accent fg** `--accent-foreground` | `#FFFFFF` | Text on green buttons |
| **Success** `--success` | `#1E7A4C` | Confirmed states, check marks |
| **Amber** `--warning` | `#92600A` | Slow-service banner, degraded states |
| **Destructive** `--destructive` | `#9B1D1D` | Errors, cancel, revoke |
| **Border** `--border` | `rgba(26,25,23,0.10)` | Hairline. Never heavy. |

> Dark mode: NOT planned for initial release. The editorial light palette is the brand. Do not
> build a dark mode toggle — it adds maintenance weight without user demand evidence at this
> stage. Revisit post-W5P9.

### 26.2 Typography

| Role | Font | Weight | Size (desktop) | Notes |
|---|---|---|---|---|
| Display / page titles | `font-display` (Fraunces or equivalent editorial serif) | 400–600 | 28–48px | Used for H1 hero titles only |
| Body | `font-sans` (Inter or system) | 400 | 14–16px | All paragraph text |
| Labels / eyebrows | `font-mono` (JetBrains Mono) | 400–500 | 10–11px | ALL CAPS, tracked 0.15–0.25em |
| Numbers / amounts | `font-mono` tabular | 400–600 | context-dependent | Always `tabular-nums` |
| Code / addresses | `font-mono` | 400 | 12px | Truncated with ellipsis |

**Type scale rules**:
- Never more than 3 type sizes on one screen
- H1 display only once per page
- All secondary labels use `font-mono` ALL CAPS — this is the brand's editorial fingerprint
- Encrypted/hidden values use the cipher dot pattern (`• • • • •`) or `████████`, never `***`

### 26.3 Component hierarchy

```
HarmonyAppShell          ← root layout (icon rail + sidebar + content pane)
  HarmonySidebarItem     ← tab list items
  HarmonyPageIntro       ← eyebrow + H1 + action buttons (top of each tab)
  HarmonySection         ← titled content section (eyebrow + title + hint)
    HarmonyFormCard      ← contained form within a section (hairline border)
      HarmonyEncryptedValue  ← balance display with reveal mechanic
      HarmonyAction      ← action button (primary / secondary)
      HarmonyStat        ← label + value stat pair
  PayHarmonyTabShell     ← per-tab layout wrapper
  PayHarmonyHome         ← Overview tab (balance hero + quick actions + activity)
  PayHarmonyPanelCard    ← right-panel card (quick-send context widget)
  PayHarmonySendBar      ← persistent top send bar (future W5P3)
```

> These components exist. Do not create new top-level layout components unless they slot
> cleanly into this hierarchy. New features = new content inside existing shells.

### 26.4 Spacing & density

- Base unit: 4px
- Card padding: 20–24px (do NOT use < 16px or > 32px)
- Section gap: 40–48px between major sections
- Form field gap: 16px
- No more than **4 visual items in a horizontal row** on desktop (exceptions: icon strips)
- No more than **3 cards in a grid** at standard viewport
- Mobile: single column only. No horizontal scrolling.

### 26.5 Interaction & motion

- **Framer Motion** is the canonical animation library. Do NOT use raw CSS transitions for
  layout-affecting animations.
- Entry animations: `opacity: 0 → 1, y: 12 → 0, duration 0.4–0.5s` (see `PayHarmonyHome`)
- Hover states: background opacity lift only (`hover:bg-muted`). Never scale or shadow-pop.
- FHE step indicators: `ENCRYPTING → COMPUTING → SENDING → SETTLING → READY` — animated
  dots, no spinners. Each state has a one-line tooltip.
- Reveal animations: cipher dots morph to number via `AnimatePresence` + digit-by-digit
  reveal. Max 0.3s. Must not shift layout (use `min-w` on the amount container).

### 26.6 Privacy UI conventions

| State | Display | Component |
|---|---|---|
| Encrypted, not revealed | `• • • • •` cipher dots + `FHE Protected` badge | `HarmonyEncryptedValue` |
| Reveal loading | Animated dots + `DECRYPTING…` label | Same, with `loading` prop |
| Revealed | Formatted amount + countdown chip (`Hidden again in 4:23`) | Same, with `revealed` + `displayValue` |
| Expired / re-hidden | Back to cipher dots, no flash | Same, `revealed=false` |
| Public data (no FHE) | Plain number, no badge | `HarmonyStat` |

**Rules**:
- Countdown timer MUST be visible when balance is revealed (never silent)
- Reveal chip uses amber color when < 60s remaining (`text-[hsl(var(--warning))]`)
- Do NOT reveal on mount. Always require explicit user action.
- Do NOT persist decrypted values to localStorage or sessionStorage.

### 26.7 Empty states

Every tab that can be empty MUST render a structured empty state. Template:

```
[Icon — 32px, muted-foreground]
[Title — "No streams yet"]
[Body — "Create a stream to send continuous encrypted payments to any address."]
[Primary CTA — "Create stream →"]
[Secondary CTA — "Or learn how streams work ↗" (links to docs)]
```

Rules:
- Icon must be the tab's primary action icon (not a generic empty-box icon)
- Always two CTAs — primary action + secondary discovery
- Body copy explains the privacy benefit, not just the feature
- Never use "Nothing here yet" alone — that's a dead end

### 26.8 Error states

| Error type | Display | Copy pattern |
|---|---|---|
| Wrong chain | Sticky yellow banner | "You're on Ethereum Mainnet. Switch to Arbitrum Sepolia →" |
| CoFHE slow | Sticky amber banner | "Encryption service is slow. Sends still work. Decryption may need a retry." |
| TX reverted | Inline form error, NOT toast | "Transaction failed: unshield exceeds your shielded balance. [Retry]" |
| RPC error | Toast + inline spinner stops | "Network error. Check your connection and try again. [Retry]" |
| Insufficient gas | Inline before submit | "You need ~0.001 ETH for gas. [Get ETH ↗]" |
| Unknown revert | Inline | "Something went wrong on-chain. [View on Arbiscan ↗] [Report issue]" |

### 26.9 Design system migration checklist (for W5P1)

The following components were built under the old dark/neon aesthetic and need Harmony
migration. Status is audited from the current codebase:

| Component | File | Migration status | Action |
|---|---|---|---|
| `SettingsPanel` (inline in PayPage) | [PayPage.tsx](frontend/obscura-os-main/src/pages/PayPage.tsx) | ⚠️ Uses old `.pay-select`, `bg-[#0a0d12]` dark colors | Replace with `HarmonyFormCard` + `HarmonyStat` |
| `PrettySelect` | PayPage.tsx inline | ⚠️ Dark background hardcoded | Extract to `harmony-ui.tsx` `HarmonySelect` |
| `StreamsDashboard` | [StreamsDashboard.tsx](frontend/obscura-os-main/src/components/pay-v4/StreamsDashboard.tsx) | Needs audit | Check for dark bg / neon colors |
| `SubscriptionForm` | [SubscriptionForm.tsx](frontend/obscura-os-main/src/components/pay-v4/SubscriptionForm.tsx) | Needs audit | Check for dark bg / neon colors |
| `BatchEscrowForm` | [BatchEscrowForm.tsx](frontend/obscura-os-main/src/components/pay-v4/BatchEscrowForm.tsx) | Needs audit | Check for dark bg / neon colors |
| `BuyCoverageForm` | [BuyCoverageForm.tsx](frontend/obscura-os-main/src/components/pay-v4/BuyCoverageForm.tsx) | Needs audit | Check for dark bg / neon colors |
| `ClaimEscrowCard` | [ClaimEscrowCard.tsx](frontend/obscura-os-main/src/components/pay-v4/ClaimEscrowCard.tsx) | Needs audit | Check for dark bg / neon colors |
| `GovernorPanel` | [GovernorPanel.tsx](frontend/obscura-os-main/src/components/vote/GovernorPanel.tsx) | Needs audit | Must use Harmony tokens |
| Credit page tiles | [CreditPage.tsx](frontend/obscura-os-main/src/pages/CreditPage.tsx) | Needs audit | `EncryptedTile` uses dark accent classes |
| `GooeyNav` | [GooeyNav.tsx](frontend/obscura-os-main/src/components/elite/GooeyNav.tsx) | ⚠️ Likely neon/gradient | Audit and remove or port to Harmony |
| `SectionDiagram` | [SectionDiagram.tsx](frontend/obscura-os-main/src/components/elite/SectionDiagram.tsx) | Needs audit | Check for dark bg |

**Migration rule**: Never do a cosmetic global search-replace of color tokens. Open each
component, understand its purpose, then re-implement with the correct Harmony component from
§26.3. Preserving behavior is non-negotiable; visual correctness follows.

### 26.10 Cross-app consistency (Pay + Credit + Vote)

All three apps share the same `HarmonyAppShell` icon rail. They must also share:

- Identical token sheet (`--background`, `--accent`, etc.) — one CSS file, loaded by all 3
- Same header bar height (64px), same sidebar width (192px), same content max-width (960px)
- `EncryptedTile` accent colors: Pay → emerald, Credit → violet, Vote → amber (current
  `EncryptedTile.tsx` accent prop already supports this)
- Identical `HarmonyPageIntro` layout at the top of every tab in every app
- No app may override `--background` or `--foreground` — those are global

The credit page's `EncryptedTile` dark accent classes (`border-violet-500/25`, `bg-violet-500/[0.06]`)
already follow the correct pattern when `accent="violet"` is passed. The underlying
`EncryptedTile` component is Harmony-compatible. The issue is the *page* background — audit
`CreditPage.tsx` for any hardcoded dark backgrounds.

---

## Closing Notes

**What this plan deliberately rejects** (each with reason):
- ❌ In-app token launchpad — out of thesis; we're a payments app, not a token issuance platform
- ❌ NFT integration — privacy story doesn't extend to NFTs cleanly (ownership is the value;
  hiding it breaks transferability)
- ❌ Quadratic-tipping / social feed — out of thesis; not a creator-economy app
- ❌ Inheritance / dead-man-switch — premature; needs legal framework + standalone audit;
  revisit post-W5P9
- ❌ AI Agents — premature; LLM + FHE composability needs a separate research wave; surface
  bloat without proven user demand
- ❌ P2P Exchange / order book — out of thesis; that's a DEX, not a payments app
- ❌ Group Expenses as standalone surface — Split-pay primitive (W5P6) covers the contract
  layer; no dedicated tab
- ❌ Additional chains — blocked on Fhenix CoFHE coverage; do not fragment liquidity early
- ❌ L2-bridging beyond CCTP USDC top-up — single-chain coherence > multi-chain sprawl
- ❌ Mainnet broadcast before the gate closes (CoFHE GA + audit + multisig + threshold
  decentralization)
- ❌ Traditional email-password auth — wallet-signed challenges only
- ❌ KYC, AML beyond what jurisdictions legally require for our sender/receiver-public model
- ❌ "Encrypted DeFi yield" speculation products — risk surface explosion, regulatory tar pit

**What this plan preserves**:
- Handle-based architecture (`confidentialTransferFromHandle`)
- Two-token ocUSDC split (Pay wrapper vs Credit faucet)
- `FHE.allowThis` discipline
- `FHE.select` not if/else on ebool
- No auto-decrypt on mount
- Public chain data auto-load, encrypted data user-triggered
- Privacy-first UI defaults (`***` placeholders, explicit reveal)
- Testnet honesty (mainnet gate stated openly)

**Final word**: The protocol's thesis is *"send, invoice, stream, escrow, subscribe, payroll —
privately — and then borrow against the receipts you never showed"*. Every phase above
exists to make that sentence more true and more usable. Phases that don't serve the thesis
were rejected. Phases that serve it but aren't yet feasible are explicitly blocked, not
silently omitted.

This is the plan. Build in phase order. Update [summary5.md](summary5.md) at the end of each
phase. Update [docs/pay_wave5.md](docs/pay_wave5.md) when architecture changes. Do not skip
W5P7 or W5P9.

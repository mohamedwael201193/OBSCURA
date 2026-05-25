# CREDIT_MASTER_EXECUTION_PLAN.md

**Owner**: Obscura Protocol — `ObscuraCredit` (Wave-5+ track)
**Network**: Arbitrum Sepolia (chainId 421614). Mainnet blocked on Fhenix CoFHE GA.
**Status at writing**: v3.19 live; 3 isolated markets (M-86 / M-70-WETH / M-50-OBS), 2 vaults (Conservative V2 / Balanced V2), Router `0x46275A34…`, Score V2 wired, Chainlink adapters live, governance live, keeper dry-running.
**Doctrine**: build *on top of* the live system. Do not redesign or redeploy what already works. Treat every shipped contract as a frozen primitive; reach for new contracts only when an immutable property of an existing one blocks the goal.

---

## Table of Contents

0. [Executive Summary](#0-executive-summary)
1. [Reality Snapshot](#1-reality-snapshot)
2. [Strengths to Preserve](#2-strengths-to-preserve)
3. [Weaknesses, Gaps, and Real Friction](#3-weaknesses-gaps-and-real-friction)
4. [Competitive Deep Dive](#4-competitive-deep-dive)
5. [Architectural Constraints (frozen by deployment)](#5-architectural-constraints-frozen-by-deployment)
6. [Privacy Matrix](#6-privacy-matrix)
7. [UX Problems (concrete)](#7-ux-problems-concrete)
8. [Design Principles](#8-design-principles)
9. [Phased Execution Roadmap (W5C-0 → W5C-12)](#9-phased-execution-roadmap-w5c-0--w5c-12)
10. [Onboarding Redesign](#10-onboarding-redesign)
11. [Information Architecture & Dashboard Hierarchy](#11-information-architecture--dashboard-hierarchy)
12. [Position Surface — definitive redesign](#12-position-surface--definitive-redesign)
13. [Market Discovery](#13-market-discovery)
14. [Vault UX](#14-vault-ux)
15. [Liquidation UX (Sealed-bid Tournament)](#15-liquidation-ux-sealed-bid-tournament)
16. [Reveal UX & Permit Session](#16-reveal-ux--permit-session)
17. [Risk Presentation (Health Factor)](#17-risk-presentation-health-factor)
18. [PAY ↔ CREDIT ↔ VOTE Integration](#18-pay--credit--vote-integration)
19. [Score Evolution](#19-score-evolution)
20. [Indexer Architecture](#20-indexer-architecture)
21. [Notification Architecture](#21-notification-architecture)
22. [Keeper Expansion](#22-keeper-expansion)
23. [Mobile + PWA UX](#23-mobile--pwa-ux)
24. [Observability & SLOs](#24-observability--slos)
25. [Security Hardening & Audit Readiness](#25-security-hardening--audit-readiness)
26. [Deployment & Migration Strategy](#26-deployment--migration-strategy)
27. [Technical Debt Cleanup](#27-technical-debt-cleanup)
28. [AI-Agent Execution Rules](#28-ai-agent-execution-rules)
29. [Risks, Blockers, Open Questions](#29-risks-blockers-open-questions)
30. [Closing Notes & Non-Goals](#30-closing-notes--non-goals)

---

## 0. Executive Summary

ObscuraCredit is, at this writing, the most architecturally complete confidential
credit protocol on Fhenix CoFHE:

- isolated **Morpho-Blue-shaped** markets (`ObscuraCreditMarket.sol`) with
  encrypted per-user `borrowShares`, `collateral`, `disburseTo` (`eaddress`)
- a Router (`ObscuraCreditRouter`) that solves the CoFHE proof-binding restriction
  via `confidentialTransferFromHandle`
- a 2-tier vault layer (Conservative V2 → 100 % M-86; Balanced V2 → M-86 +
  M-70-WETH split)
- an in-place Chainlink price adapter (`ChainlinkPriceAdapter.sol`) that avoids
  the immutability of `market.oracle`
- a wired `ObscuraCreditScoreV2` cross-product reputation oracle that boosts
  LLTV from Pay streams, Vote participation, and AddressBook contacts —
  exposed to markets via `IEncryptedScore`
- a `ObscuraGovernor` + `ObscuraTimelock` + `ObscuraTreasuryStreamer` governance
  loop bound to the Vote V5 participation counter
- a `credit-keeper` dry-run bot that proves the full read path (market →
  oracle → adapter → HF math) against live Arbitrum Sepolia state

**The protocol is done. The product isn't.**

What is missing is *not more contracts* — it is:

1. **Onboarding** (8+ wallet popups today; users bounce)
2. **Reveal UX** (every encrypted balance view = 1 MetaMask popup)
3. **Indexed backend** (activity, exports, notifications)
4. **Liquidation discoverability** (sealed-bid surface for bidders)
5. **Mobile** (desktop-first today; real money is mobile-first)
6. **Privacy honesty** (a publishable `PRIVACY_MATRIX.md` like CipherRoll)
7. **Two-token mental model** (Pay ocUSDC vs Credit ocUSDC; UI invisible split)

This plan ships those — and only those — without touching live contract code
except where a *demonstrated user-blocking bug* forces a redeploy.

**Phase order is binding.** Each phase has a measurable exit criterion and a
rollback path. AI agents may execute any phase whose prereqs are merged to
`main` without operator intervention; phases that broadcast on-chain require
explicit operator approval (private key not in repo).

---

## 1. Reality Snapshot

### 1.1 Inventory of live infrastructure

#### Contracts (`contracts-hardhat/contracts/credit/`)

| Contract | Status | Notes |
|---|---|---|
| [ObscuraCreditFactory.sol](contracts-hardhat/contracts/credit/ObscuraCreditFactory.sol) | Live | Used to deploy M-86 / M-70-WETH / M-50-OBS |
| [ObscuraCreditMarket.sol](contracts-hardhat/contracts/credit/ObscuraCreditMarket.sol) | Live × 3 | Encrypted per-user state; immutable `oracle`, `irm`, `lltvBps`, `liqBonusBps`, `liqThresholdBps` |
| [ObscuraCreditOracle.sol](contracts-hardhat/contracts/credit/ObscuraCreditOracle.sol) | Live | Original 1e12 scaler — fed by `ChainlinkPriceAdapter` per-asset (Wave-5 Phase 2 fix) |
| [ObscuraCreditIRM.sol](contracts-hardhat/contracts/credit/ObscuraCreditIRM.sol) | Live | Public IRM; reads `totalSupplyAssets`/`totalBorrowAssets` public scalars |
| [ObscuraCreditRouter.sol](contracts-hardhat/contracts/credit/ObscuraCreditRouter.sol) | Live | Solves CoFHE proof-forwarding limit via `confidentialTransferFromHandle` |
| [ObscuraCreditVault.sol](contracts-hardhat/contracts/credit/ObscuraCreditVault.sol) | Live × 2 | Conservative V2 + Balanced V2 |
| [ObscuraCreditAuction.sol](contracts-hardhat/contracts/credit/ObscuraCreditAuction.sol) | Live | Sealed-bid liquidation engine |
| [ObscuraCreditScoreV2.sol](contracts-hardhat/contracts/credit/ObscuraCreditScoreV2.sol) | Live | Cross-product reputation; correct adapter interfaces (vs broken V1) |
| [ChainlinkPriceAdapter.sol](contracts-hardhat/contracts/credit/ChainlinkPriceAdapter.sol) | Live × 2 | ETH/USD + USDC/USD on Arb Sepolia; 24 h staleness gate |
| [ObscuraConfidentialToken.sol](contracts-hardhat/contracts/credit/ObscuraConfidentialToken.sol) | Live × 3 | ocUSDC (faucet, 6 dp), ocWETH2 (faucet, 6 dp), ocOBS2 (faucet, 6 dp) |
| [ObscuraCreditStreamHook.sol](contracts-hardhat/contracts/credit/ObscuraCreditStreamHook.sol) | Live | Score signal hook from Pay streams |
| [ObscuraCreditInsuranceHook.sol](contracts-hardhat/contracts/credit/ObscuraCreditInsuranceHook.sol) | Live | Score signal hook from insurance |
| [ObscuraCreditGovernanceProxy.sol](contracts-hardhat/contracts/credit/ObscuraCreditGovernanceProxy.sol) | Live | Bound to `ObscuraGovernor` / `Timelock` (Wave-5 Phase 4/5) |
| [ObscuraConfidentialWrapperFactory.sol](contracts-hardhat/contracts/credit/ObscuraConfidentialWrapperFactory.sol) | Live | Unused at production but kept for v316 path |
| [IEncryptedScore.sol](contracts-hardhat/contracts/credit/IEncryptedScore.sol) | Frozen | Interface integrated in market `borrow` + `liquidate` |
| [IObscuraCreditIRM.sol](contracts-hardhat/contracts/credit/IObscuraCreditIRM.sol) | Frozen | IRM interface |
| [IObscuraCreditOracle.sol](contracts-hardhat/contracts/credit/IObscuraCreditOracle.sol) | Frozen | Oracle interface; **no `setOracle` on market** (see §5) |

#### Frontend (`frontend/obscura-os-main/src/`)

**Page**: [CreditPage.tsx](frontend/obscura-os-main/src/pages/CreditPage.tsx) — 5 tabs:
`overview | markets | position | vaults | liquidations` + slide-over Settings.

**Components** (29):
[AuctionCard.tsx](frontend/obscura-os-main/src/components/credit/AuctionCard.tsx),
[BorrowForm.tsx](frontend/obscura-os-main/src/components/credit/BorrowForm.tsx),
[CreditAlertDrawer.tsx](frontend/obscura-os-main/src/components/credit/CreditAlertDrawer.tsx),
[CreditDrawer.tsx](frontend/obscura-os-main/src/components/credit/CreditDrawer.tsx),
[CreditOnboarding.tsx](frontend/obscura-os-main/src/components/credit/CreditOnboarding.tsx),
[CreditScoreCard.tsx](frontend/obscura-os-main/src/components/credit/CreditScoreCard.tsx),
[CreditScoreRing.tsx](frontend/obscura-os-main/src/components/credit/CreditScoreRing.tsx),
[CreditTabBar.tsx](frontend/obscura-os-main/src/components/credit/CreditTabBar.tsx),
[EncryptedTile.tsx](frontend/obscura-os-main/src/components/credit/EncryptedTile.tsx),
[EncryptedValue.tsx](frontend/obscura-os-main/src/components/credit/EncryptedValue.tsx),
[HealthBadge.tsx](frontend/obscura-os-main/src/components/credit/HealthBadge.tsx),
[HealthBar.tsx](frontend/obscura-os-main/src/components/credit/HealthBar.tsx),
[HealthRibbon.tsx](frontend/obscura-os-main/src/components/credit/HealthRibbon.tsx),
[HistoryFeed.tsx](frontend/obscura-os-main/src/components/credit/HistoryFeed.tsx),
[LiquidationAlertCenter.tsx](frontend/obscura-os-main/src/components/credit/LiquidationAlertCenter.tsx),
[MarketCard.tsx](frontend/obscura-os-main/src/components/credit/MarketCard.tsx),
[MarketStatStrip.tsx](frontend/obscura-os-main/src/components/credit/MarketStatStrip.tsx),
[OperatorApprovalModal.tsx](frontend/obscura-os-main/src/components/credit/OperatorApprovalModal.tsx),
[PrivateExplorer.tsx](frontend/obscura-os-main/src/components/credit/PrivateExplorer.tsx),
[PrivatePortfolio.tsx](frontend/obscura-os-main/src/components/credit/PrivatePortfolio.tsx),
[RepayForm.tsx](frontend/obscura-os-main/src/components/credit/RepayForm.tsx),
[RiskMonitorCard.tsx](frontend/obscura-os-main/src/components/credit/RiskMonitorCard.tsx),
[SealedAuctionCard.tsx](frontend/obscura-os-main/src/components/credit/SealedAuctionCard.tsx),
[SettingsPanel.tsx](frontend/obscura-os-main/src/components/credit/SettingsPanel.tsx),
[SetupSheet.tsx](frontend/obscura-os-main/src/components/credit/SetupSheet.tsx),
[SupplyCollateralForm.tsx](frontend/obscura-os-main/src/components/credit/SupplyCollateralForm.tsx),
[SupplyForm.tsx](frontend/obscura-os-main/src/components/credit/SupplyForm.tsx),
[VaultCard.tsx](frontend/obscura-os-main/src/components/credit/VaultCard.tsx),
[VaultPerformanceChart.tsx](frontend/obscura-os-main/src/components/credit/VaultPerformanceChart.tsx).

**Hooks** ([useCredit.ts](frontend/obscura-os-main/src/hooks/useCredit.ts) — 19 exports):
`useCreditMarkets`, `useCreditVaults`, `useVaultPosition`, `useEnsureOperator`,
`useCreditMarket`, `useCreditVault`, `useCreditAuctions`, `useCreditScore`,
`useCreditStreamHook`, `useCreditInsuranceHook`, `useCreditPosition`,
`useApprovedSets`, `useGovernanceProxy`, `useIRMSnapshot`, `useHealthFactor`,
`useUtilizationApr`, `useMarketPosition`, `useCreditScoreValue` +
[useCreditRouter.ts](frontend/obscura-os-main/src/hooks/useCreditRouter.ts) +
[useCreditOnboarding.ts](frontend/obscura-os-main/src/hooks/useCreditOnboarding.ts) +
[useCreditAlerts.ts](frontend/obscura-os-main/src/hooks/useCreditAlerts.ts).

**Config**: [credit.ts](frontend/obscura-os-main/src/config/credit.ts) — addresses,
ABIs, `CREDIT_TOKENS` registry, `CREDIT_MARKETS` registry, `CREDIT_VAULTS` registry.

#### Packages

- [packages/credit-keeper/](packages/credit-keeper/) — TypeScript bot, viem + cofhe-sdk,
  dry-run by default. Smoke-tested against live state.

#### Documentation
- [WAVE4-CREDIT-PROGRESS.md](WAVE4-CREDIT-PROGRESS.md) — v3.19 progress, deploy
  ledger, end-to-end transaction confirmation.
- [summary5.md](summary5.md) — Phase 0–8 ecosystem narrative, mainnet honesty.
- [docs/credit/](docs/credit/) — placeholder for the deferred `PRIVACY_MATRIX.md`.

### 1.2 What is verified working end-to-end

Confirmed against live Arbitrum Sepolia state on the v3.18.2 audit pass and
the v3.19 supply-collateral fix:

| Path | Verification |
|---|---|
| Faucet → claim 2 of each ocUSDC/ocWETH2/ocOBS2 | 3 successful txs |
| `setOperator(Router, 30 d)` | confirmed |
| Supply to M-86 via Router | confirmed |
| Supply collateral on M-86 | confirmed |
| Supply collateral on M-70-WETH2 (post-v3.19) | confirmed |
| Supply collateral on M-50-OBS2 (post-v3.19) | confirmed |
| Stealth borrow → `setupAndBorrowStealth` | tx `0x1ad0e5d9…` confirmed |
| Position reveal — supply / borrow / collateral all decrypt | confirmed |
| Keeper scan path (market → oracle → Chainlink adapter → HF math) | `[scan 0xcf98d979] borrowers=1 liqT=9000bps HF=18000bps ok` |
| Score V2 lookup on M-86 borrow flow | live |
| ChainlinkPriceAdapter ETH/USD → market read | live |

### 1.3 What is deprecated and must NOT be re-introduced

| Item | Reason |
|---|---|
| `ObscuraCreditScore` v1 (`0xA83aCeE5…`) | Wrong adapter interfaces (called nonexistent `totalVotesByUser` etc.) → silent try/catch → score 0 for all |
| `ObscuraCreditOracle` direct Chainlink (without adapter) | 1e12 scaler underflows for 8-dp feeds → returns 0 |
| `cUSDC` / `cWETH` / `OBS` symbol names | Replaced by `ocUSDC` / `ocWETH` / `ocOBS` in Plan V2 |
| ocWETH (`0xA377AF2b…`) and ocOBS (`0x68d61fb8…`) v1 tokens | Missing `confidentialTransfer(address, InEuint64)` overload → reverts on supply collateral; 8 dp mismatch. **Replaced by ocWETH2 + ocOBS2.** |
| `CreditMarket M-70-WETH` v1 / `M-50-OBS` v1 | Wired to v1 tokens → unusable |
| `setOracle(...)` calls on `ObscuraCreditMarket` | Function does not exist; oracle is `immutable` (see §5) |
| The phrase "CoFHE" / "ctHash" / "ACL" / "euint" / "permit" in user-facing copy | banned |

---

## 2. Strengths to Preserve

These are the moats. Every phase below MUST preserve them.

1. **Handle-based cross-contract FHE pattern**. `ObscuraCreditRouter` uses
   `confidentialTransferFromHandle` to forward an encrypted handle a user
   produced for the token to the market — bypassing CoFHE's hard restriction
   that "a proof bound to user U cannot be forwarded by contract A to contract
   B". This is the single hardest piece of FHE engineering in the repo.
2. **Pre-computed FHE constants**. `_zero`, `_lltv`, `_basis`, `_liqT` are
   built once in the market constructor. Every borrow/withdraw avoids
   runtime `FHE.asEuint64(plaintext)` which is gas-prohibitive on the
   coprocessor. Keep this pattern in every future market.
3. **Encrypted supply shares**. Suppliers are not just protected on the debt
   side — `_encSupplyShares` is encrypted too. Walnut and Lendi do not have
   this. Lender position size is private.
4. **Plain shadows for revert guards only**. `_plainBorrow` / `_plainCollateral`
   / `_plainSupplyShares` are private storage, never exposed via ABI — used
   only for accounting correctness and liquidity pre-checks. This is the
   correct trade between FHE safety and revert guarantees.
5. **`FHE.allowThis` discipline**. Every encrypted state mutation in
   `_credit`, `_debit`, borrow, withdraw, supplyCollateral, withdrawCollateral
   is followed by `FHE.allowThis(newHandle)`. Verified in the v3.18.2 audit.
6. **`FHE.allowTransient(handle, target)` before external token calls**. Used
   everywhere the market hands an encrypted amount to a token contract.
7. **`FHE.select` not `if/else` on ebool**. Verified across the codebase.
   A revert on an encrypted comparison would leak one bit.
8. **`FHE.eq` real-vs-trivial-handle guard**. In borrow, withdraw,
   withdrawCollateral, withdrawToVault, unshield — protects against
   accidental zero-handle confusion.
9. **No plaintext amounts in events**. All events emit only `bytes32` ctHash
   handles. Verified.
10. **Encrypted stealth disbursement** via `eaddress disburseTo`. Even though
    public stealth via `StealthRegistry` is used today (eaddress not GA on
    Arb Sepolia), the storage slot exists and the upgrade path is in place.
11. **Dual-mode token** (`underlying == address(0)` = faucet, else wrapper).
    Lets us run both Pay-side wrapped ocUSDC and Credit-side faucet ocUSDC
    from the same contract code — required by the two-token split (§5).
12. **In-place oracle adapter pattern**. `ChainlinkPriceAdapter` reuses the
    existing `IPlainFeed` interface so no market or oracle needs redeploy.
    This is the right move under immutability constraints — replicate this
    pattern for any future oracle issue.
13. **`scoreOracle` is mutable** (factory-only). Market keeps the right
    `setScoreOracle(address)` so we can upgrade the score logic without a
    market redeploy. Already used to migrate from v1 → V2.
14. **Privacy-first UI defaults**: `***` placeholders, `EncryptedTile` 30 s
    reveal timer with auto-expire, no auto-decrypt on mount, `decryptShares()`
    is always user-triggered.
15. **`useFHEStatus` step machine**
    (`IDLE → ENCRYPTING → COMPUTING → SENDING → SETTLING → READY`) is wired
    across all credit hooks with `waitForTransactionReceipt` before flipping
    to `READY`.
16. **Public chain data auto-loads** (TVL, rates, utilization, market config).
    No wallet popups just to view the protocol. Encrypted positions are
    user-triggered.
17. **batchRead multicall for public reads**. Used in `useCredit.ts` market
    reads to avoid RPC rate limits.
18. **`withRateLimitRetry` wrapper** on all write calls — proven in v3.18.2
    after the SetupSheet `429 Too Many Requests` regression.
19. **Live capped fees** via `estimateCappedFees(publicClient)` on every
    write — fixes the wagmi stale gas regression. No inline fee math in
    components.
20. **Mainnet honesty**. summary5.md openly states CoFHE is testnet-only;
    Phase 21 is a *gate*, not a deployment. Maintain this.

---

## 3. Weaknesses, Gaps, and Real Friction

Ordered by severity. Items the protocol genuinely lacks today.

| # | Gap | Severity | Notes |
|---|---|---|---|
| 1 | First-time onboarding is 8+ popups | 🔴 critical | connect → switch network → faucet × 3 → setOperator → supply → setOperator(collateral) → borrow. Users bounce. |
| 2 | Every encrypted balance reveal = 1 MetaMask popup | 🔴 critical | No persistent permit session across reveals |
| 3 | No indexed activity feed | 🔴 critical | Event reads per-page-load; no notifications; no exports |
| 4 | Liquidations tab is invisible to bidders | 🟠 high | SealedAuctionCard exists but no surface that lists open auctions to outside bidders |
| 5 | Two-token ocUSDC split is invisible | 🟠 high | Users see Pay balance, switch to Credit, see 0. Need a clear mental model + one-click bridge |
| 6 | No mobile layout | 🟠 high | Position tab + market cards collapse poorly under 640 px |
| 7 | Score V2 has no user-facing breakdown | 🟠 high | "How did I get my score" is unanswerable. Tier shows; signals don't. |
| 8 | No `PRIVACY_MATRIX.md` | 🟠 med | CipherRoll and Walnut both publish theirs; we look opaque without it |
| 9 | No notification system | 🟠 med | User doesn't know: HF dropped, liquidation incoming, repayment confirmed, score went up |
| 10 | Keeper is dry-run only (no operator) | 🟠 med | Protocol has no liquidation execution in production until someone runs the bot live |
| 11 | No CSV/PDF export | 🟡 low | Tax season unsupported |
| 12 | No public claim/auction-link surface | 🟡 low | A liquidator-friendly URL with HF, bonus, sealed bid form |
| 13 | No passkey/social login | 🟡 low | Wallet-only. Premature to fix on testnet, but design now. |
| 14 | Single chain | 🟡 low | Blocked on Fhenix CoFHE chain coverage |
| 15 | `ObscuraCreditMarket.scoreOracle` is set but UI never reveals score-based LLTV boost to the user | 🟠 med | "You can borrow up to 90 % LLTV (base 86 % + score boost +400 bps)" is invisible |
| 16 | `EncryptedTile` reveal countdown is the only privacy primitive — no "stay revealed for 5 min" session | 🟠 med | See §16 |
| 17 | `ObscuraCreditAuction` has no UI for bid encryption progress (FHEStepper not wired) | 🟠 med | |
| 18 | `CreditScoreRing` shown but tier-only — no contribution-by-signal breakdown | 🟠 med | |
| 19 | No "what if" health-factor simulator with encrypted amounts (only plain shadows) | 🟡 low | Acceptable: encrypted simulation would cost too much |
| 20 | No deposit confirmation receipt that says "your supply is now encrypted, txHash X" | 🟡 low | Toast-only follow-through |

---

## 4. Competitive Deep Dive

Each competitor analyzed against ObscuraCredit. Each row reports: *what they
have that we don't*, *what they did wrong that we should never do*, and
*how Obscura dominates*.

### 4.1 Walnut Protocol — direct competitor

URL: `walnut-finance.vercel.app/` · Chain: Arbitrum Sepolia · FHE: Fhenix CoFHE
+ Privara settlement.

**What they have**:
- Clean two-asset model: deposit real MockUSDC, borrow encrypted `wUSDC` (FHERC20).
- Public **credit tier 0–4** derived from encrypted `_repaymentCount` via CoFHE
  callback flow — 70 % / 75 % / 80 % / 85 % / 90 % LLTV step.
- Tagline: "Deposit USDC. Borrow wUSDC. Nobody sees how much."
- Real ERC20 collateral path (not just confidential token).
- Published privacy matrix (encrypted vs public vs inferable).
- Recent local verification: 61 passing tests, `npx hardhat compile`, build
  pipeline, deployment verification script.

**What Obscura has that Walnut does not**:
- Multiple **isolated markets** (Walnut is single-market). Morpho-Blue shape.
- Per-asset LLTV (Walnut bakes LLTV into a global tier; we have 86 / 70 / 50 %).
- **Vault layer** (Walnut has no aggregator above markets).
- **Sealed-bid liquidation** auctions (Walnut has none — repays-or-default model).
- **Cross-product reputation** (Walnut's tier is repayment-count only; ours
  spans Pay + Vote + AddressBook).
- **Governance loop** (Governor + Timelock + Treasury Streamer).
- **Encrypted lender positions** (Walnut: encrypted debt only; supply
  positions exposed as plain `vault.holdings`).
- **In-place oracle adapter** (Walnut uses Mock feeds at fixed 1.00 USD).
- **Stealth disbursement slot** (`eaddress disburseTo`).

**What Walnut did right that we should adopt**:
- **Published privacy matrix**. Their `Privacy Model` table is the cleanest
  in the space. We have none. **→ ship `docs/credit/PRIVACY_MATRIX.md` in W5C-1.**
- **Truthful framing**. "Walnut does not claim to hide the existence of an
  interaction" is exactly the right register. Mirror in our README.
- **`balanceOf(account)` public scaffolding for plain accounting +
  encrypted state**. They split clearly. We already do (plain shadow +
  encrypted) but never explain it to users.
- **Repayment count → tier** is a *legible* signal. Our score is opaque.
  **→ ship a "how is my score calculated" breakdown card in W5C-5.**
- **`deposit(token, amount)`** signature lets them accept any whitelisted
  ERC20 collateral. Worth a future think for collateral-set expansion.

**What Walnut did wrong that we must never do**:
- Single market → single rate / single LLTV class. Forces tier-baked LLTV.
  Isolated markets are strictly better.
- "Withdrawals after borrowing are intentionally blocked" — they removed the
  async decrypt withdrawal path. We solve this via `FHE.eq` real-vs-trivial
  guard + plain shadow check. Their fix is a UX regression we avoid.
- No governance. The protocol owner is the deployer EOA. Single point of
  failure.
- No vault. Suppliers must pick a market manually. We auto-route via
  Conservative / Balanced.

**How Obscura dominates**:
- We are *one generation ahead structurally*. Walnut is V1; we are V3.19
  with an upgrade path. The "deposit and borrow nobody sees" tagline is
  ours to take if we ship the onboarding + privacy matrix.

### 4.2 Blindference — confidential AI marketplace

URL: `blindference.vercel.app` · Chain: Ethereum Sepolia · FHE: Fhenix.

**Not a credit competitor** — confidential ML inference marketplace. Included
because they exemplify a *clean role-based UX with permit-only reveal*.

**Adopt**:
- **Role-aware product structure**: `data_source` vs `ai_lab` portals. Maps
  cleanly to our `borrower` vs `supplier` vs `liquidator` vs `governor`
  surface split. We don't need separate portals (over-engineered for credit)
  but the *mental model* is right: every screen knows who you are.
- **`PaymentEscrow` separate from inference**. Mirrors our split:
  `ObscuraCreditMarket` (logic) separate from `ObscuraConfidentialToken`
  (custody). Keep this split — never inline custody into market.
- **IPFS-backed profile metadata**. Useful long-term for an opt-in public
  reputation page ("I have a score > 700, here's my IPFS-anchored profile").
  Deferred to W5C-11.

**Avoid**:
- MongoDB as orchestration backend with PII. We have nothing to anchor in a
  centralized DB; use The Graph subgraph for activity (W5C-7).
- 6-step admin onboarding (connect → sign nonce → role-pick → profile → IPFS
  publish → on-chain activate). For Credit, we cut to 1 step in W5C-3.

### 4.3 Prova — trade credit insurance

URL: `getprova.trade/` · Chain: Arbitrum Sepolia · FHE: Fhenix + ReineiraOS.

**Not a competitor** — invoice insurance, not lending. Included because their
FHE-priced risk premium pattern (`FHE.mul(invoiceAmount, riskMultiplier)`)
is exactly the pattern we'd use if we added **encrypted variable APR** to a
future Aggressive market tier.

**Adopt**:
- **Niche-first GTM narrative**. "SME exporters in emerging markets,
  $5k–$50k invoices, structural gap left by legacy insurers." Strong.
  Obscura's equivalent: "Power-user DeFi traders + DAO treasuries who
  must borrow without revealing position size to MEV / competitors."
- **CCTP embed at point of invoice generation**. The cross-product hook
  pattern. Our equivalent: embed Credit "borrow against this invoice" at
  the moment Pay creates an invoice. Mentioned in §18.

**Avoid**:
- Dual-protocol stack (ReineiraOS + Fhenix). We use only Fhenix. Their
  dual-layer is a coupling tax we don't pay.

### 4.4 CipherRoll — confidential payroll

URL: `cipher-roll.vercel.app/` · Chain: Arbitrum Sepolia · FHE: Fhenix CoFHE.

**Not a credit competitor**, but the most *product-mature* Fhenix project
shipped. **Adopt aggressively**.

**Adopt** (their Wave-4 pattern is our W5C-7 + W5C-8 + W5C-9 blueprint):
- **Backend layer with indexed read models, notifications, summaries,
  exports, support APIs**. Hosted on Render with Supabase Postgres
  persistence. **This is what an institutional confidential credit product
  looks like.** Mirror in our indexer (§20) + notifications (§21).
- **Shared SDK package** (`packages/cipherroll-sdk`) — runtime config, backend
  client, shared types, cross-surface helpers. We should extract
  `packages/credit-sdk` covering: address book, ABI re-exports, score type
  defs, market metadata. Used by frontend + keeper + future mobile.
- **CipherBot in product**. In-product retrieval-backed support bot.
  Premature for us (LLM ops cost + hosting) but design the seam now:
  reserve a `<HelpDock />` slot in every page (W5C-12 deferral).
- **PRIVACY_MATRIX.md as a first-class deliverable**. They have one. We don't.
- **Truthful scope boundary**. "Not yet a live product workflow" + "Shipped
  now" tables. Honesty as a feature. Replicate in our README.

**Avoid**:
- Aggregate-only auditor flow with auditor-shared permit payload. Our
  governance + DAO treasury are *the* aggregate views. Don't bolt on a
  separate auditor portal.
- Supabase Postgres as the canonical store. For us, The Graph subgraph is
  the right indexer because everything we need is on-chain events.

### 4.5 Lendi — DeFi lending (landing page only)

URL: shipped as `lendi-landing-page` (Next.js) + an unfinished `dapp` that is
literally the Fhenix CoFHE hardhat starter.

**Adopt**:
- The "door intro" first-visit animation (one-time, stored as
  `localStorage.lendi_door_intro_v1`, `prefers-reduced-motion` aware).
  Steal the pattern for our 30-second product tour (W5C-3).

**Avoid**:
- Shipping a landing page before a product. We are inverse — we have a
  product without a great landing page. Build a real landing page only after
  W5C-9 (notifications + indexer + mobile shipped).
- Pure marketing claims with no contract behind them.

### 4.6 Zalary — confidential payroll on Zama

URL: `zalary-frontend.vercel.app/` · Chain: Ethereum Sepolia · FHE: Zama FHEVM.

**Adopt**:
- **Public landing page → wallet-first onboarding → role-pick** flow. Three
  clear screens. We can replicate this for the unauthenticated path: visit
  `/credit` → see public market metrics → click "Borrow privately" → land
  in role-aware borrower flow.
- `.env`-driven contract config with `VITE_…_ADDRESS`. We already do this.

**Avoid**:
- Marketing-grade UI but minimal under the hood. They have only 3 contracts
  (ConfidentialToken, PayrollVault, SwapRouter). We have 18+ live and 30+
  tested. Don't dumb down our UX to fake simplicity — instead, **hide
  complexity behind clear role-aware screens**.

### 4.7 Z0tz

URL: `github.com/0xOucan/Z0tz` returned **404** (private / deleted). No
public surface to compete against. Skip.

### 4.8 Composite competitive thesis

> **Walnut owns the "simple" niche. CipherRoll owns the "production-feeling"
> niche. Obscura's wedge is "the only credit protocol where your borrow,
> collateral, recipient, and credit signals are all encrypted, with isolated
> markets, real vaults, real governance, and real liquidation auctions —
> built on the same primitives that Pay and Vote already use to encrypt
> your payments and your votes."**

No single competitor has the cross-product reputation moat. No single
competitor has isolated markets + vaults + auctions + governance. We are
ahead architecturally; we just need to *finish* the product.

---

## 5. Architectural Constraints (frozen by deployment)

These are immutable facts. Every phase MUST respect them, or pay the cost of
a redeploy + migration (which we never do without a user-blocking bug).

1. **`ObscuraCreditMarket.oracle` is `immutable`**. There is no `setOracle`.
   - Implication: oracle bugs are fixed in-place via per-asset `ChainlinkPriceAdapter`
     instances + `setPublicFeed(asset, adapter)` on `ObscuraCreditOracle`.
   - To swap the oracle *contract*, we redeploy the market and migrate state.
     This is a last resort. Done historically only when *no* in-place fix worked.
2. **`ObscuraCreditMarket.irm` is `immutable`**. Same rule. IRM upgrades require
   a market redeploy.
3. **`ObscuraCreditMarket.lltvBps` / `.liqBonusBps` / `.liqThresholdBps`** are
   immutable. To change risk parameters we deploy a new market.
4. **`ObscuraCreditMarket.scoreOracle` IS mutable** (factory-only). Score
   logic can be upgraded without market redeploy. This is the upgrade seam —
   use it.
5. **`auctionEngine` IS mutable** (factory-only). Auction logic can be
   upgraded without market redeploy.
6. **CoFHE proof-forwarding restriction**. A proof bound to user U cannot
   be forwarded by contract A to contract B. The only working pattern is
   `confidentialTransferFromHandle(handle, ...)` on the token + transient
   ACL. Every cross-contract encrypted flow MUST use this. Already in
   `ObscuraCreditRouter`.
7. **Two ocUSDC tokens**. Pay-side wrapper (`underlying = Circle USDC`) and
   Credit-side faucet (`underlying = address(0)`) cannot be unified without
   a full M-86 market redeploy. The frontend env split is permanent until
   M-86 v2 with the wrapper version of ocUSDC. **Do not attempt to unify
   in W5C-1..12.** UI must make the split *legible* — see §18.
8. **`eaddress` not GA on Arb Sepolia**. The `disburseTo` slot exists in
   `Position` but stealth borrow currently flows through the public
   `StealthRegistry` announcement path. When eaddress ships on Arb Sepolia,
   activate the encrypted-recipient path without redeploying the market.
9. **Faucet tokens are 6 decimals**. After v3.19 redeploy, all three credit
   tokens are 6 dp. The frontend formatter assumes 6 dp. Future tokens MUST
   be 6 dp or the formatter is generalized — choose at design time.
10. **`ObscuraConfidentialToken` requires the `confidentialTransfer(address, InEuint64)`
    overload** for user → market deposits. Tokens deployed before this
    overload (legacy ocWETH v1 / ocOBS v1) are unusable for supply
    collateral. Every new collateral token MUST be deployed from the
    current `ObscuraConfidentialToken.sol` code (post-v3.14).
11. **Public scalars `totalSupplyAssets` / `totalBorrowAssets` are required
    by the IRM and the keeper**. They are *not* a privacy leak — they are
    aggregate values needed to compute utilization. The privacy contract is
    per-user values are encrypted; aggregates are public. Maintain this rule.
12. **`userTier(address)` returns a plain `uint8` bucket (0–3)**. Intentionally
    leaks the bucket, not the raw score, so the market can do a public
    branch on tier without an FHE select. Same trade as today. Do not break.

---

## 6. Privacy Matrix

> **Mandatory deliverable**: ship `docs/credit/PRIVACY_MATRIX.md` in W5C-1.
> Below is the canonical content. Copy verbatim into the doc.

### 6.1 Private by design (encrypted on-chain, decryptable by owner only)

| Value | Storage | Decrypt path |
|---|---|---|
| Borrow position size | `Position.borrowShares` (`euint64`) | User-signed permit; UI: Position tab → Reveal |
| Collateral amount | `Position.collateral` (`euint64`) | Same |
| Lender supply shares | `_encSupplyShares[user]` (`euint64`) | Same |
| Stealth disbursement address | `Position.disburseTo` (`eaddress`) | Only the recipient learns it post-decrypt |
| Encrypted credit score | `ObscuraCreditScoreV2.scoreOf(user)` (`euint64`) | User-signed permit; transient market access during borrow |
| Encrypted token balances | `ObscuraConfidentialToken._encBalances[user]` (`euint64`) | Same; auto-revealed in shielded wallet view |
| Sealed bid amount | `ObscuraCreditAuction.encBid[bidder][auctionId]` (`euint64`) | Only the auction owner reveals winning bid at settle |

### 6.2 Public by design (legible to anyone)

| Value | Why public | Where |
|---|---|---|
| Market addresses | Discovery + audit | `deployments/arb-sepolia.json` |
| Market parameters (LLTV, liqBonus, liqThreshold) | IRM input + risk transparency | Market storage |
| `totalSupplyAssets` / `totalBorrowAssets` | IRM input + utilization display | Market storage |
| `utilizationBps` / borrow APR / supply APR | UX | Computed from above |
| User's *tier* (0–3) | Allows public LLTV-boost branch | `ObscuraCreditScoreV2.userTier(user)` |
| User's `hasBorrow` flag | Liquidator triage | Market `_borrowers` array |
| Transaction sender + timestamps | Blockchain metadata | All txs |
| Oracle adapter addresses + Chainlink feed addresses | Audit | `ChainlinkPriceAdapter` |
| Vault total assets + total shares | Vault NAV | Vault contract |
| Governance proposals + votes (counts) | DAO transparency | `ObscuraGovernor` |

### 6.3 Inferable (not hidden, do not claim otherwise)

| Inference | Source |
|---|---|
| "User had a borrow event" | `Borrowed` event was emitted with their address |
| "User had a supply event" | `Supplied` event was emitted with their address |
| "User had a repayment event" | `Repaid` event was emitted with their address |
| Approximate borrow ratio | Aggregate `totalBorrowAssets` change ≈ delta of a known borrower |
| Time-of-day patterns | Tx timestamps |
| Linkability across products | Same EOA on Pay + Credit + Vote |

### 6.4 Hard guarantees

- No event carries plaintext amounts. All amount-bearing events emit `bytes32`
  ctHash handles only.
- No view function returns a user's encrypted value to a *non-owning* caller.
- No FHE comparison is wrapped in an `if/else` — all branches use `FHE.select`.
- `FHE.eq` real-vs-trivial-handle guard is in every withdrawal / liquidation
  path that touches user encrypted state.
- After every encrypted state write, `FHE.allowThis(handle)` is called so
  the contract keeps the right to read its own data.

### 6.5 What we do not (yet) hide

- The fact a borrow happened (event leak).
- Anti-MEV / time obfuscation.
- Cross-EOA linkability (one EOA across Pay + Credit is still one EOA).
- Stealth disbursement is currently public-announced via `StealthRegistry`;
  fully-encrypted recipient awaits eaddress GA on Arb Sepolia.

---

## 7. UX Problems (concrete)

Documented friction observed on the v3.19 build:

1. **Onboarding cliff**. To go from "/credit" to "borrowed 1 ocUSDC" takes:
   connect (1) → switch network (2) → faucet ocUSDC (3) → faucet ocWETH2 (4) →
   faucet ocOBS2 (5) → setOperator router (6) → supply collateral (7) →
   borrow (8). 8 popups. Industry leaders do 1–2.
2. **Encrypted balance reveals cost a popup each**. Reveal supply → popup.
   Reveal borrow → popup. Reveal collateral → popup. We need a single
   session permit that covers all of a user's positions for 5 min.
3. **Setup sheet is buried**. The "Get test funds" CTA in the header is
   easy to miss. New users land on Markets tab, see public TVL, click
   Position, see nothing — and have no obvious next step.
4. **Two-token split is invisible**. A user with 5 ocUSDC on Pay opens
   Credit and sees 0 ocUSDC. There is no inline explanation that Pay-ocUSDC
   and Credit-ocUSDC are distinct tokens (and currently no automatic bridge).
5. **HF dropped silently**. If a user's HF goes from 1.8 to 1.05, no
   notification fires. The only signal is the HealthRibbon banner if the
   user happens to be looking at the Position tab.
6. **Score is opaque**. `CreditScoreRing` shows tier 2, but the user has
   no idea *why* — what signals contributed, how to raise it, what each
   tier unlocks.
7. **Liquidation tab is bidder-hostile**. Auctions render in
   `SealedAuctionCard` only if the user already knows the auction ID and
   opens the tab. There's no surface that says "live auctions with
   estimated bonus, here's how to bid privately."
8. **FHEStepper runs but doesn't explain WHY**. "ENCRYPTING → COMPUTING →
   SENDING → SETTLING → READY" means nothing to a first-time user. Each
   step needs a tooltip in plain language.
9. **No "your borrow is now confidential" follow-through**. After a
   successful borrow, the user sees a toast and is dropped back to the
   form. No celebratory confirmation card with the new encrypted
   position summary.
10. **Mobile broken**. At 375 px:
    - Tab bar wraps awkwardly
    - Market cards lose their right-side stats column
    - Position cards stack into a wall of `***` with no hierarchy
    - SetupSheet content overflows the viewport
11. **"Insufficient liquidity" reverts are user-hostile**. The market
    reverts on aggregate shadow checks; the UI shows a generic
    "transaction failed". Need pre-submit liquidity check that says
    "this market has only 1.2 ocUSDC borrowable; reduce or pick another."
12. **`useFHEStatus` resets to IDLE after 4 s** but the success state has no
    "view your position" CTA — the user is left staring at an empty form.

---

## 8. Design Principles

The principles all phases below must obey.

1. **Public data must load with zero wallet popups.** TVL, rates, market
   list, vault NAV — auto-load.
2. **Encrypted data must never load without explicit user action.** Reveal
   is always opt-in.
3. **One permit, multiple reveals.** A 5-minute in-memory session permit
   covers all encrypted reads for that user (Pay + Credit), gated by a
   single MetaMask sign at the start of the session.
4. **The user always knows what is encrypted and what is public.** Every
   tile that shows an encrypted value carries a visible "FHE Protected"
   badge. Every public stat carries a "Public" label.
5. **Plain language everywhere in user-facing copy.** Never "euint",
   "ctHash", "ACL", "permit", "CoFHE", "coprocessor". Always "encrypted",
   "private", "encryption service", "your private balance".
6. **No silent reverts.** Every revert path has a pre-submit predicate that
   shows the cause in plain text before the user signs.
7. **No surprise popups.** If a popup is coming, the UI says so first:
   "Approve the router (1 sign, ~5 s)".
8. **Every screen explains: what you can do here, what is encrypted, what
   happens next, current risk state.** See §11–§17 for the canonical
   layout.
9. **Mobile is first-class.** Designed at 375 px first, progressively
   enhanced.
10. **Composable across Pay + Vote + Credit.** A credit action that
    benefits from a Pay invoice (e.g. borrow against expected receivables)
    is one click from the Pay surface, not a separate flow.
11. **No new contracts unless an immutable property blocks a real user
    need.** Adapter + hook patterns before new markets.
12. **Honest framing.** Privacy matrix shipped. Mainnet status stated.
    Testnet posture owned.

---

## 9. Phased Execution Roadmap (W5C-0 → W5C-12)

> **Numbering**: `W5C-N` = Wave 5 Credit phase N. Independent of Pay phases.
> Each phase has: scope, files touched, exit criteria, rollback path, and
> AI-agent execution notes.

### W5C-0 — Audit & Privacy Matrix (no-code prereq, 1 day)

**Scope**: ratify this document; ship privacy matrix; verify deployment
ledger is current.

**Tasks**:
- [ ] Ship [docs/credit/PRIVACY_MATRIX.md](docs/credit/PRIVACY_MATRIX.md)
      (content from §6 above)
- [ ] Update [README.md](README.md) Credit section with mainnet honesty
      paragraph (lift from summary5.md)
- [ ] Verify `deployments/arb-sepolia.json` matches `.env` — open mismatch
      issue if any
- [ ] Re-run keeper smoke test against live state; record output as baseline

**Exit**: privacy matrix merged; deployment ledger verified.

**Rollback**: doc-only; no rollback.

**AI agent**: full autonomy.

---

### W5C-1 — Permit Session (the single biggest UX win)

**Scope**: one MetaMask sign → 5-minute session permit covers ALL encrypted
reveals across Position, Pay, Vote (shared session). Eliminates 80 % of
popup spam.

**Files**:
- New: `frontend/obscura-os-main/src/hooks/usePermitSession.ts`
- New: `frontend/obscura-os-main/src/components/shared/PermitSessionCountdown.tsx`
- Edit: `frontend/obscura-os-main/src/hooks/useFHEPermitStatus.ts` — wrap
  with session-aware path; do not break Pay's existing usage
- Edit: every credit hook that calls `getOrCreateSelfPermit()` → route
  through `usePermitSession`
- Edit: `EncryptedTile.tsx` — if session active, reveal without prompting

**Behavior**:
- On first reveal click → MetaMask popup → permit signed → stored in
  `useMemo` + sessionStorage flag (NOT the permit material — that stays
  in memory only). Countdown chip shown in header.
- For the next 5 min, any reveal in Position / Pay / Vote skips MetaMask.
- At 60 s remaining, chip turns amber. At 0 s, session clears, next
  reveal prompts MetaMask again.
- Toggle in Settings: "Reveal session duration: 1 min / 5 min / 15 min /
  off (sign every time)".
- Hard rule: permit material never touches localStorage / IndexedDB.
  Lost on tab close. Session resumes only via re-sign.

**Exit**: From a fresh wallet connect, revealing all 3 Position tiles
(supply, borrow, collateral) on M-86 + reading Pay's encrypted balance =
**1 MetaMask popup total** (was 4).

**Rollback**: Feature flag `VITE_PERMIT_SESSION_ENABLED=false` falls back
to per-reveal sign.

**AI agent**: autonomous; tested via Vitest hook + manual smoke. No
on-chain broadcast required.

---

### W5C-2 — Two-token UX: bridge + clear mental model

**Scope**: make the Pay-ocUSDC vs Credit-ocUSDC split *legible* and
crossable in one click.

**Files**:
- New: `frontend/obscura-os-main/src/components/credit/TokenBridgeStrip.tsx`
- Edit: `CreditPage.tsx` Markets tab header — render `TokenBridgeStrip`
- New: `frontend/obscura-os-main/src/hooks/useCreditTopUp.ts` — handles
  "claim faucet" path for Credit ocUSDC (since the two tokens are not
  bridgeable on-chain pre-M-86-v2)

**Behavior**:
- Header strip shows: **"Pay ocUSDC: 5.20 (Public wallet) · Credit ocUSDC: 0
  → Get test funds"** with a single CTA.
- Clicking "Get test funds" opens the SetupSheet pre-filled for
  Credit-ocUSDC faucet.
- Tooltip: "Pay and Credit currently use separate USDC pools for testnet.
  A unified pool ships with M-86 v2 on mainnet."

**Exit**: New user can go from "I have 5 ocUSDC on Pay" → "I have 5 ocUSDC
borrowable on Credit" in ≤ 2 clicks (Faucet → confirm).

**Rollback**: hide `TokenBridgeStrip` behind `VITE_BRIDGE_STRIP_ENABLED=false`.

**AI agent**: autonomous.

---

### W5C-3 — Onboarding redesign (8 popups → 2)

**Scope**: collapse the new-user path. See §10 for full layout.

**Files**:
- Edit: `frontend/obscura-os-main/src/components/credit/SetupSheet.tsx`
  → 3 steps become 2:
  1. **Get funds** (single tx: batched faucet via multicall *if* available
     on `ObscuraConfidentialToken`; else 3 sequential txs with shared
     gas estimate + per-tx step indicator)
  2. **Authorize router** (single setOperator call, 30-day expiry)
- Edit: `frontend/obscura-os-main/src/hooks/useCreditOnboarding.ts` —
  add `getOnboardingState()` returning `{ step: 'connect' | 'fund' |
  'authorize' | 'ready' }`; persist progress in sessionStorage
- New: `frontend/obscura-os-main/src/components/credit/CreditTour.tsx` —
  30-second product tour (steal Lendi's door pattern; once-per-browser
  via `localStorage.obscura_credit_tour_v1`, `prefers-reduced-motion`
  aware)
- Edit: `CreditPage.tsx` Position tab — render `CreditOnboarding` empty
  state when `step !== 'ready'`; auto-open SetupSheet on first land

**Behavior**:
- First land on `/credit` → unauthenticated → see Markets tab (public TVL)
  → "Borrow privately →" CTA → connect wallet
- Post-connect, if not on Arb Sepolia: sticky banner "Switch to Arbitrum
  Sepolia to continue" with one-click switch
- Post-network: if `step !== 'ready'`, SetupSheet auto-opens with progress
  indicator
- Step 1: "Get test funds (3 tokens, 1 confirmation)" — if batched faucet
  available, 1 popup; else 3 with shared progress bar
- Step 2: "Authorize Credit Router (1 confirmation)" — explains "this
  lets the protocol move your encrypted tokens for borrows and supplies"
- Done → tour overlay → "You're ready to borrow privately"

**Exit**: From connect → first borrow = 2 popups (3 if no batched faucet,
which we treat as 1 logical step).

**Rollback**: `VITE_ONBOARDING_V2_ENABLED=false` falls back to v1
SetupSheet.

**AI agent**: autonomous for UI; if batched faucet is added to
`ObscuraConfidentialToken`, that needs operator approval to deploy
(W5C-3a).

#### W5C-3a — Optional: batched faucet (operator-gated)

If `ObscuraConfidentialToken` does not support `claimFaucetBatch()`, add a
helper contract `ObscuraCreditFaucetMux.sol` that calls `claimFaucet()` on
each of the 3 tokens in one tx. Token must `allow` the mux as a per-user
authorized faucet caller (or we accept the 3-tx fallback). Deploy only if
the 3-tx fallback proves to be the friction killer in user testing.

---

### W5C-4 — Position surface redesign

**Scope**: turn the Position tab from "3 encrypted tiles + HealthBar" into
the definitive private position view.

**Files**:
- Major edit: `CreditPage.tsx` Position tab → swap for a new component
  `<PositionWorkspace />`
- New: `frontend/obscura-os-main/src/components/credit/PositionWorkspace.tsx`
- New: `frontend/obscura-os-main/src/components/credit/PositionHeader.tsx`
  (market picker + reveal-all button)
- New: `frontend/obscura-os-main/src/components/credit/PositionLifecyclePanel.tsx`
  (transaction history for this market, sourced from `useActivityFeed`
  filtered by market — needs W5C-7 indexer)
- Edit: `EncryptedTile.tsx` — accept optional `score?: ScoreContribution`
  prop for the tier-3 boost annotation

**Layout** (see §12 for the canonical wireframe):
- Header: market picker + "Reveal all" (uses session permit)
- 3-tile row: Supply / Borrow / Collateral (encrypted)
- Health Bar with what-if simulator (plain-shadow based, no FHE cost)
- "Borrowing power" card: shows `lltvBps + scoreBoostBps` with breakdown
- Quick actions: Borrow more · Repay · Add collateral · Withdraw
- Lifecycle panel below the fold

**Exit**: Position tab loads with public skeleton; reveal-all single
click; HF with what-if works; lifecycle panel renders (mock data before
W5C-7).

**Rollback**: keep v1 Position tab behind feature flag.

**AI agent**: autonomous.

---

### W5C-5 — Score breakdown UX

**Scope**: make the encrypted score *legible*. User must understand what
they did to earn their tier and what they can do to raise it.

**Files**:
- Major edit: `CreditScoreRing.tsx` — accept `signals` prop with per-source
  contribution
- New: `frontend/obscura-os-main/src/components/credit/ScoreBreakdownCard.tsx`
- Edit: `frontend/obscura-os-main/src/hooks/useCredit.ts` →
  `useCreditScore()` returns `{ tier, signals: { source, count, points,
  hint }[] }`
- Add view-only helpers to `ObscuraCreditScoreV2`:
  - `getStreamCount(address)` → unwrapped Pay-stream count input
  - `getContactCount(address)` → AddressBook contact count input
  - `getVoteCount(address)` → Vote V5 participation count input
  - All public, no state changes — only expose what we already use
    internally. Deployable via a `ScoreV2View` companion contract if we
    don't want to redeploy ScoreV2.

**Behavior**:
- Breakdown card lists each signal:
  - "Streams sent (Pay): 7 → +35 pts"
  - "Contacts added (AddressBook): 12 → +24 pts"
  - "Votes cast (Vote): 4 → +32 pts"
  - "Total: 91 pts → Tier 1 (75 % LLTV base + 100 bps boost)"
- Hint per signal: "Send 3 more payroll streams to reach Tier 2."
- Privacy footnote: "Your *raw* score is encrypted. These signal counts
  are public on each source contract — the score function is what's
  hidden."

**Exit**: User sees a complete, accurate breakdown after one click
"Show score details".

**Rollback**: Show only `CreditScoreRing` (tier-only) if the view helpers
fail to deploy.

**AI agent**: autonomous for UI; deploy of `ScoreV2View` requires operator.

---

### W5C-6 — Liquidation surface (the bidder UX)

**Scope**: make `ObscuraCreditAuction` discoverable + biddable by anyone
with a wallet, not just curated keepers.

**Files**:
- Major edit: `CreditPage.tsx` Liquidations tab → `<LiquidationBoard />`
- New: `frontend/obscura-os-main/src/components/credit/LiquidationBoard.tsx`
- Edit: `SealedAuctionCard.tsx` — wire FHEStepper through every step of
  sealed-bid submission; add plain-language explanations
- Edit: `useCreditAuctions()` — paginate; expose
  `{ id, market, collateralUsd (approx via plain shadow), liqBonusBps,
  closesAt, status }` for each
- New: `frontend/obscura-os-main/src/pages/PublicLiquidationPage.tsx` at
  route `/liquidate/:auctionId` — public URL, wallet optional to view,
  required to bid

**Behavior**:
- Board shows live + recently-closed auctions with HF, est. bonus, time
  remaining
- Click → opens `SealedAuctionCard` with bid form
- Bid form encrypts client-side, submits via `confidentialBid(InEuint64)`
- After settle, the protocol publishes the winning bid as the only
  decrypt result; losers learn nothing
- Sharable URL: copy `/liquidate/:auctionId` to invite outside bidders

**Exit**: A non-borrower can land on `/liquidate/<id>` and submit a
sealed bid in ≤ 3 clicks.

**Rollback**: hide `LiquidationBoard` behind feature flag.

**AI agent**: autonomous for UI.

---

### W5C-7 — Activity Indexer (the platform substrate)

**Scope**: ship a real indexer for the credit subgraph so the frontend
stops doing event reads per page-load.

**Files**:
- New: `indexer/credit/subgraph.yaml` (or `indexer/credit/<custom>/`)
- New: `indexer/credit/schema.graphql` — entities: `MarketEvent`,
  `UserPosition` (aggregated), `AuctionEvent`, `VaultEvent`,
  `ScoreEvent`
- New: `indexer/credit/src/mapping.ts` — handle events:
  `Supplied`, `Withdrew`, `Borrowed`, `Repaid`, `CollateralSupplied`,
  `CollateralWithdrew`, `AuctionStarted`, `AuctionBid`, `AuctionSettled`,
  `Liquidated`, `ScoreUpdated`, `VaultDeposit`, `VaultWithdraw`
- New: hosted endpoint (The Graph hosted service / Goldsky / Railway-self-
  hosted) — choice per ops team
- New: `frontend/obscura-os-main/src/hooks/useCreditActivity.ts` — reads
  from `/api/credit/activity?address=&market=&limit=&cursor=`
- Edit: `HistoryFeed.tsx` → reads from indexer instead of RPC events

**Schema highlights**:
- `MarketEvent { id, type, market, user, txHash, blockNumber, timestamp,
  amountCtHash, public_amount_if_settled }` — no plaintext amounts
- `UserPosition { user, market, supplyCtHash, borrowCtHash,
  collateralCtHash, lastUpdated }` — handle aggregation only
- `AuctionEvent { auctionId, market, borrower, status, openedAt,
  closedAt, winningBidCtHash, winner }`

**Exit**: `useCreditActivity({ address, market: 'M-86' })` returns the
last 50 events in < 500 ms with cursor pagination.

**Rollback**: `VITE_INDEXER_ENABLED=false` keeps `HistoryFeed` reading
RPC events.

**AI agent**: contract authoring + subgraph deployment require operator
(deploy key + indexer hosting credentials).

---

### W5C-8 — Notifications

**Scope**: turn the indexer into a notification stream. User learns when
HF drops, score rises, liquidation looms, repayment confirms — without
manually refreshing.

**Files**:
- New: `notifications/credit/src/worker.ts` — polls indexer (or SSE),
  emits notifications via:
  - In-app (WebSocket / SSE to frontend)
  - Browser Notification API (opt-in)
  - Email (optional, requires SMTP — Resend recommended)
  - Webhook (for power users)
- New: `frontend/obscura-os-main/src/hooks/useCreditNotifications.ts`
- New: `frontend/obscura-os-main/src/components/shared/NotificationCenter.tsx`
- New: `frontend/obscura-os-main/src/components/credit/HealthAlertSubscription.tsx`
  — opt-in to "alert me when HF < 1.2"
- Edit: `LiquidationAlertCenter.tsx` → uses notification stream

**Notification types**:
- `health_dropped` — your HF crossed a configured threshold (default 1.3)
- `liquidation_imminent` — HF < 1.05 on one of your positions
- `liquidation_executed` — a position you owned was liquidated
- `repayment_confirmed` — your repay tx settled
- `score_increased` — your tier moved up
- `auction_outbid` — your bid was beaten in a sealed auction (only the
  fact, not the amount)
- `vault_yield_milestone` — your vault deposit crossed +X %

**Privacy**: notifications only contain public chain data (tx hash, market
address, event type). Encrypted amounts are NEVER pushed.

**Exit**: User subscribes to HF alerts; lowers their collateral until HF
crosses threshold; sees notification within 30 s.

**Rollback**: hide notification center; in-app stream falls back to
manual refresh.

**AI agent**: autonomous for hook + UI; worker deployment requires operator.

---

### W5C-9 — Mobile + PWA

**Scope**: full mobile redesign at 375 px first, then enhance.

**Files**:
- Edit: `CreditPage.tsx` — tab bar collapses to drawer at < 640 px
- Edit: every credit component for 375 px → test in Chrome DevTools mobile
- New: `frontend/obscura-os-main/public/manifest.webmanifest` — PWA install
- New: service worker (`vite-plugin-pwa`) — offline fallback for public
  pages; no caching of encrypted state
- New: `frontend/obscura-os-main/src/components/credit/MobilePositionSheet.tsx`
  — bottom-sheet variant of the Position workspace
- Edit: `SetupSheet.tsx` — mobile-first viewport behavior

**Rules**:
- All forms single-column at < 640 px
- Touch targets ≥ 44 × 44 px
- Sticky bottom action bar on Position screen (Borrow / Repay / Add
  collateral / Reveal)
- No hover-only affordances
- No fixed-width tables — convert to stacked cards

**Exit**: Lighthouse mobile ≥ 90 on `/credit`, `/credit/position`,
`/credit/liquidations`. Real device test on iOS Safari + Android Chrome.

**Rollback**: existing desktop layout is preserved at ≥ 1024 px.

**AI agent**: autonomous.

---

### W5C-10 — Keeper to production

**Scope**: lift `packages/credit-keeper` from dry-run to operator-run live
liquidation execution, with safety rails.

**Files**:
- Edit: `packages/credit-keeper/src/scan.ts` — implement `executeLiquidation`
  path behind `DRY_RUN=false` + `MAX_SLIPPAGE_BPS` env
- New: `packages/credit-keeper/src/bid-policy.ts` — pluggable bid policy
  interface (operators bring their own)
- New: `packages/credit-keeper/README.md` — operator runbook
- New: `packages/credit-keeper/src/observability.ts` — Prometheus metrics
  endpoint: `keeper_scans_total`, `keeper_liquidations_attempted`,
  `keeper_liquidations_succeeded`, `keeper_balance_eth`,
  `keeper_balance_ocusdc`
- New: `packages/credit-keeper/Dockerfile` — containerized run

**Safety rails**:
- `MAX_LIQUIDATIONS_PER_HOUR` (default 5)
- `MIN_KEEPER_BALANCE_ETH` (default 0.02)
- `KILLSWITCH_FILE` (presence of file → halt)
- Refuse to bid above policy ceiling
- Refuse to bid if HF on re-read > threshold (race protection)

**Tip mechanism** (deferred from v3.18):
- New view in market: `getKeeperTipBps()` (mutable by governance)
- Tip credited to keeper from liquidation bonus
- Encourages decentralized keeper participation

**Exit**: With `DRY_RUN=false` and policy configured, keeper executes a
real liquidation in stage (controlled position) and emits expected metrics.

**Rollback**: re-set `DRY_RUN=true`.

**AI agent**: autonomous for code; production-run requires operator.

---

### W5C-11 — Score Evolution (V3 design + opt-in IPFS reputation)

**Scope**: design ScoreV3 (do not deploy yet) and prepare the opt-in
IPFS-anchored public reputation page.

**Files**:
- Design doc: `docs/credit/SCORE_V3_DESIGN.md`
- New: `frontend/obscura-os-main/src/components/credit/PublicReputationCard.tsx`
  — opt-in card that shows "I have Tier 2+" with an IPFS attestation
  signed by the user
- New: `frontend/obscura-os-main/src/hooks/useReputationAttestation.ts`

**ScoreV3 design points** (not implemented; design only):
- Add **invoice repayment count** (from Pay invoices) as a signal — high
  weight
- Add **subscription streak** (from Pay subscriptions) — medium weight
- Add **escrow-good-claim count** — medium weight
- Add **time-decayed weights** (recent activity weighs more)
- Move to `IEncryptedScoreV2` interface that adds `breakdownOf(user)
  returns(SignalBreakdown[])` (encrypted per-signal contribution)
- Backwards-compatible: market continues to call `IEncryptedScore.scoreOf`
- Deploy plan: deploy ScoreV3 + `setScoreOracle(V3)` on all 3 markets —
  no market redeploy

**Exit**: design doc reviewed; PublicReputationCard ships (opt-in).

**Rollback**: design only; no on-chain action.

**AI agent**: autonomous.

---

### W5C-12 — Polish: Help dock, exports, landing page, audit-readiness

**Scope**: the institutional finish.

**Files**:
- New: `frontend/obscura-os-main/src/components/shared/HelpDock.tsx` —
  bottom-right collapsible help shelf with: "What's encrypted?", "How
  does reveal work?", "Why two ocUSDCs?", "How do I improve my score?"
- New: CSV/PDF export from indexer activity (frontend → blob → download)
- New: `frontend/obscura-os-main/src/pages/CreditLandingPage.tsx` at
  `/credit/about` — public landing page (Lendi-style polish)
- New: `docs/credit/AUDIT_CHECKLIST.md` — mainnet readiness gate
- New: `docs/credit/RUNBOOK.md` — operator runbook (deploy, swap oracle,
  freeze market, emergency pause)

**Audit-readiness gate**:
- [ ] All contracts have ≥ 80 % branch coverage in Hardhat tests
- [ ] Slither static analysis clean
- [ ] Mythril symbolic execution clean on critical paths
- [ ] Privacy matrix matches contract behavior 1:1
- [ ] Keeper has been live for 30+ days without incident
- [ ] At least one full liquidation cycle observed end-to-end
- [ ] External audit booked (Spearbit / Trail of Bits / Code4rena)
- [ ] Fhenix CoFHE mainnet GA available

**Exit**: All checklist items either complete or flagged with owner +
ETA.

**Rollback**: docs only; no rollback.

**AI agent**: autonomous for everything except booking external auditors.

---

## 10. Onboarding Redesign

### 10.1 The 8-popup problem (today)

```
1. connect wallet
2. switch network
3. claim ocUSDC
4. claim ocWETH2
5. claim ocOBS2
6. setOperator(Router)
7. supply collateral
8. borrow
```

### 10.2 The 2-popup target (W5C-3)

```
[unauthenticated path — 0 popups, 0 cost]
  visit /credit → see public Markets

[onboarding — 2 popups]
1. connect (1 wallet popup; network auto-switch via wagmi)
2. fund + authorize (1 logical step):
     - if batched faucet available: 1 popup → 3 tokens claimed
     - else: 3 popups bundled with shared step indicator (counted as 1
       UX step)
   then auto-chain: setOperator(Router, 30d) → 1 popup
   → total signs: 2 (batched faucet path) or 4 (sequential faucet path)

[first action — 1 popup]
3. supply collateral OR borrow (one tx, one sign)
```

Total: **2 popups in the batched path**, 4 in the sequential path. Industry
median for non-FHE lending is 3 popups. We are competitive or better
*even with FHE overhead*.

### 10.3 SetupSheet layout (W5C-3)

```
┌─────────────────────────────────────────────────────────┐
│  Welcome to Obscura Credit                        [X]   │
│  Borrow privately. Nobody — including us — sees how    │
│  much.                                                  │
│                                                         │
│  Step 1 of 2:  Get test funds                  [ • • ] │
│  ────────────                                           │
│  We'll send you 10,000 ocUSDC, 2 ocWETH, and 2 ocOBS.  │
│  These are testnet tokens — no real value.             │
│                                                         │
│  [ Get test funds  ➜ ]                  Estimated: 1 tx │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Step 2 of 2:  Authorize the Credit Router    [ • • ] │
│  ────────────                                           │
│  Lets the protocol move your encrypted tokens for      │
│  borrows and supplies. Valid for 30 days. You can      │
│  revoke anytime in Settings.                            │
│                                                         │
│  [ Authorize  ➜ ]                       Estimated: 1 tx │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Need help?  [ Watch 30 s tour ↗ ]                     │
└─────────────────────────────────────────────────────────┘
```

### 10.4 First-land empty state (Position tab, unauthenticated)

```
┌──────────────────────────────────────────────┐
│  🔒 Your encrypted positions will appear     │
│      here.                                    │
│                                               │
│  • Borrow amounts, collateral, and recipient │
│    are encrypted on-chain.                   │
│  • Only you can decrypt them.                │
│  • Even Obscura cannot see your size.        │
│                                               │
│  [ Connect wallet ]   [ See public markets → ]│
└──────────────────────────────────────────────┘
```

### 10.5 Passkey + social login (long-term, not in W5C-1..12)

Deferred per §29. Design seam preserved: `useAccount()` is the only place
that assumes EOA today. Replacing with a smart-account abstraction
(EIP-4337) is a single integration point post-W5C-12, post-CoFHE-mainnet,
once paymasters exist on Fhenix mainnet.

---

## 11. Information Architecture & Dashboard Hierarchy

### 11.1 Top-level tabs (5, post-redesign)

```
Overview · Markets · Position · Vaults · Liquidations    [ ⚙ Settings ]
```

Settings stays a slide-over (not a tab) per current design — correct.

### 11.2 Per-tab responsibility table

| Tab | Public auto-load | User-triggered |
|---|---|---|
| Overview | TVL, your tier (plain), market health summary | Your score breakdown (reveals signal counts; W5C-5) |
| Markets | All 3 markets' TVL / utilization / APR / config | Borrow / Supply action sheets |
| Position | Market picker (plain), HF (plain shadow), borrowing power (lltv + score boost plain) | Reveal supply / borrow / collateral (1 session permit) |
| Vaults | Vault NAV, allocations, APY | Reveal your shares; deposit / withdraw |
| Liquidations | Live + recent auctions (public scalars), HF heatmap | Submit sealed bid |

### 11.3 Header (every Credit page)

```
[OBSCURA · Credit]   Markets  Position  Vaults  Liquidations
                     ────────────────────────────────────────
[Pay ocUSDC: 5.2 · Credit ocUSDC: 10,000] [🔓 Reveal session: 4:23] [⚙]
                                          (W5C-2)             (W5C-1)
```

The reveal session chip is global — visible on every page with encrypted
content (Credit, Pay, Vote). One session, one shared countdown.

### 11.4 Overview tab (new in W5C-5)

The default landing after connect. Replaces today's auto-redirect to Markets.

```
┌─────────────────────────────────────────────────────────┐
│  Welcome back, 0x1ad0…ed91                              │
│                                                          │
│  Your tier:  ★★☆ (Tier 2)              +200 bps LLTV    │
│             [ Show breakdown ]                           │
│                                                          │
│  Your encrypted positions across 3 markets:             │
│  ┌─────────────────────────────────┐                    │
│  │ M-86 (ocUSDC)     HF: 1.82  ●●● │ [ Open Position ]  │
│  │ M-70-WETH         HF: 2.14  ●●● │ [ Open Position ]  │
│  │ M-50-OBS          (no position) │ [ Open Market   ]  │
│  └─────────────────────────────────┘                    │
│  HF computed from plain shadows. Amounts encrypted —   │
│  reveal in Position tab.                                │
│                                                          │
│  Recent activity (last 7 days)                          │
│  • Borrowed (M-86)                  2 d ago   tx ↗      │
│  • Repaid (M-86)                    1 d ago   tx ↗      │
│  • Score moved Tier 1 → Tier 2      8 h ago             │
│  [ View all activity → ]                                │
└─────────────────────────────────────────────────────────┘
```

---

## 12. Position Surface — definitive redesign

```
┌────────────────────────────────────────────────────────────┐
│  Position · [ M-86 ▾ ]                       [ 🔓 Reveal ] │
│  Loan: ocUSDC   Collateral: ocUSDC    LLTV: 86 % + 200 bps │
├────────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │ Supply    │  │ Borrow    │  │ Collateral│               │
│  │ ████████  │  │ ████████  │  │ ████████  │               │
│  │ FHE       │  │ FHE       │  │ FHE       │               │
│  └───────────┘  └───────────┘  └───────────┘               │
│                                                             │
│  Health Factor                                              │
│  ━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░    1.82  (Safe)         │
│  Liquidate at 1.00. Buffer: 82 %.                          │
│  ↳ Add 100 ocUSDC collateral → 2.45 (very safe)            │
│  ↳ Borrow 500 more → 1.21 (caution)                        │
│  [ Simulate ]                                               │
│                                                             │
│  Borrowing power                                            │
│  Base LLTV: 86 %  +  Score boost: 200 bps  =  88 %         │
│  You can borrow up to: ████████ ocUSDC  [ Reveal ]         │
│                                                             │
│  Quick actions                                              │
│  [ Borrow more ]  [ Repay ]  [ Add collateral ]            │
│  [ Withdraw collateral ]                                    │
│                                                             │
│  ─────────────  Lifecycle (this market)  ─────────────     │
│  • Borrowed                 2 d ago      tx ↗               │
│  • Collateral added         3 d ago      tx ↗               │
│  • Supplied for yield       5 d ago      tx ↗               │
└────────────────────────────────────────────────────────────┘
```

**Behavioral notes**:
- "Reveal" button at top reveals all 3 tiles + Borrowing-power amount
  simultaneously via the session permit.
- Simulator uses plain shadows (`_plainBorrow`, `_plainCollateral`) — no
  FHE cost. Users see "what if" without spending an encrypted op.
- "Withdraw collateral" disabled if `hasBorrow == true`; tooltip explains.
- After a successful action, a celebration card appears for 4 s with the
  new HF + tx hash + "View on Arbiscan" link, then collapses.

---

## 13. Market Discovery

### 13.1 Markets tab redesign

```
┌─────────────────────────────────────────────────────────┐
│  Lending Markets                          [↻ Refresh]   │
│                                                          │
│  Total supplied: $52,310     Total borrowed: $11,420    │
│  Active markets: 3                                       │
│                                                          │
│  ┌─ M-86 · ocUSDC ─────────────────────────────────────┐ │
│  │ Conservative · 86 % LLTV · 5 % liq bonus            │ │
│  │ Supply APR: 3.4 %    Borrow APR: 5.1 %    Util: 67%│ │
│  │ ──────────────────────────────────────────────────  │ │
│  │ [ Borrow privately ]  [ Supply for yield ]          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ M-70-WETH · ocWETH → ocUSDC ───────────────────────┐ │
│  │ Balanced · 70 % LLTV · 8 % liq bonus                │ │
│  │ Supply APR: 6.2 %    Borrow APR: 9.8 %    Util: 41%│ │
│  │ ──────────────────────────────────────────────────  │ │
│  │ [ Borrow privately ]  [ Supply for yield ]          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ M-50-OBS · ocOBS → ocUSDC ─────────────────────────┐ │
│  │ Aggressive · 50 % LLTV · 12 % liq bonus             │ │
│  │ Supply APR: 11.4 %   Borrow APR: 18.2 %   Util: 22%│ │
│  │ ──────────────────────────────────────────────────  │ │
│  │ [ Borrow privately ]  [ Supply for yield ]          │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  🔒 All positions are encrypted on-chain.               │
│     [ Read the privacy matrix → ]                       │
└─────────────────────────────────────────────────────────┘
```

### 13.2 Market card explanatory copy (mandatory)

Each card must explain in plain language:
- *what you supply* (e.g. "Supply ocUSDC. Earn 3.4 % APR. Withdraw any time
  the market has liquidity.")
- *what you can borrow against* (e.g. "Deposit ocUSDC collateral. Borrow
  up to 86 % LLTV.")
- *liquidation risk* (e.g. "If your health factor drops to 1.0, your
  collateral can be liquidated for a 5 % bonus to the liquidator.")

---

## 14. Vault UX

### 14.1 Vaults tab redesign

```
┌─────────────────────────────────────────────────────────┐
│  Vaults · One deposit, auto-routed across markets       │
│                                                          │
│  ┌─ Conservative V2 ───────────────────────────────────┐ │
│  │ 100 % → M-86 (ocUSDC, 86 % LLTV)                    │ │
│  │ Net APY: 3.2 %      NAV: $24,810      Shares: 24,810│ │
│  │ Your shares: ████████ [ Reveal ]                    │ │
│  │ ──────────────────────────────────────────────────  │ │
│  │ [ Deposit ocUSDC ]  [ Withdraw ]                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌─ Balanced V2 ───────────────────────────────────────┐ │
│  │ 60 % → M-86 · 40 % → M-70-WETH                      │ │
│  │ Net APY: 4.8 %      NAV: $19,420      Shares: 19,108│ │
│  │ Your shares: ████████ [ Reveal ]                    │ │
│  │ ──────────────────────────────────────────────────  │ │
│  │ [ Deposit ocUSDC ]  [ Withdraw ]                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  How vaults work                                         │
│  • One deposit, allocated across markets per strategy   │
│  • Your share balance is encrypted                       │
│  • Withdrawals execute pro-rata from each market         │
│  • A 24 h queue applies to withdrawals > 25 % of NAV    │
│    (W5C deferred — see Roadmap)                          │
└─────────────────────────────────────────────────────────┘
```

### 14.2 Vault withdraw queue (deferred from v3.18)

Tracked for post-W5C-12. Design:
- New mutable: `withdrawQueueWindowSec` on vault (default 86_400)
- New view: `pendingWithdrawals(user)` returns `{ shares, claimableAt }`
- New ext fn: `requestWithdraw(shares)` → queues
- New ext fn: `claimWithdraw()` → executes if `block.timestamp ≥ claimableAt`

Implementation in W5C-13 (post-roadmap) only if a real run on a market shows
withdrawal blackouts are a problem. Pre-mainnet not required.

---

## 15. Liquidation UX (Sealed-bid Tournament)

### 15.1 Public board (W5C-6)

```
┌─────────────────────────────────────────────────────────┐
│  Liquidations · Sealed-bid auctions, encrypted bids     │
│                                                          │
│  Live auctions (3)                                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │ #4287 · M-86 · HF 0.94                             │ │
│  │ Est. bonus: ~5 % of collateral                     │ │
│  │ Closes in: 03:14:09                                │ │
│  │ Bids received: 7 (encrypted)                       │ │
│  │ [ Submit bid privately ]                            │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ #4286 · M-70-WETH · HF 0.88                        │ │
│  │ Est. bonus: ~8 % of collateral                     │ │
│  │ Closes in: 06:42:11                                │ │
│  │ Bids received: 12 (encrypted)                      │ │
│  │ [ Submit bid privately ]                            │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Recently settled (7)                                    │
│  • #4280 · M-86      Settled 4 h ago    Winner: 0x4f…   │
│  • #4279 · M-70-WETH Settled 6 h ago    Winner: 0xa7…   │
│  ...                                                     │
│  [ View archive → ]                                      │
│                                                          │
│  How sealed bids work                                    │
│  1. Bid amount encrypted in your browser                │
│  2. Submitted on-chain — nobody (including the borrower)│
│     can read it                                          │
│  3. At settlement, the protocol decrypts only the       │
│     winning bid. Losers learn nothing.                   │
└─────────────────────────────────────────────────────────┘
```

### 15.2 Sealed bid form

```
┌─────────────────────────────────────────────────────────┐
│  Bid on auction #4287                              [X]  │
│  Market: M-86 · ocUSDC                                  │
│  Borrower HF: 0.94 (eligible for liquidation)           │
│  Estimated bonus: ~5 % of collateral                    │
│                                                          │
│  Your bid (ocUSDC)                                       │
│  [ 1,250.00 ]                                            │
│  Your bid will be encrypted before leaving your browser.│
│                                                          │
│  [ FHE Stepper ]                                         │
│  IDLE → ENCRYPTING → COMPUTING → SENDING → SETTLING →   │
│  READY                                                   │
│                                                          │
│  [ Submit encrypted bid ]                                │
└─────────────────────────────────────────────────────────┘
```

### 15.3 Sharable URL

`/liquidate/4287` — public, wallet optional. Allows outside bidders to
participate without navigating the full app.

---

## 16. Reveal UX & Permit Session

### 16.1 The session permit (W5C-1)

Architecture:

```
[User clicks Reveal on Position tile]
  ↓
[usePermitSession.getSession()]
  ↓
  ├─ if no session OR expired:
  │   → MetaMask popup → user signs domain-bound permit
  │   → session stored in module memory (NOT localStorage)
  │   → countdown chip mounted in global header
  │   → expiry = now + sessionDurationMs (default 300_000)
  │
  └─ if session active:
      → skip MetaMask, return cached permit material
      → all reveals proceed immediately
```

### 16.2 EncryptedTile state machine (preserved + extended)

| State | Display | Behavior |
|---|---|---|
| Encrypted, not revealed | `████████` + "FHE Protected" badge | Idle |
| Reveal loading | Animated dots + "DECRYPTING…" | Decrypt in flight |
| Revealed | Formatted amount + countdown chip | Auto-hides at session expiry |
| Re-hidden | Back to `████████` | Smooth fade, no flash |
| Public | Plain number, no badge | Public stat |

### 16.3 Settings toggle (Settings panel)

```
Reveal session duration
  ◯ Sign every time          (most secure)
  ● 5 minutes (recommended)
  ◯ 15 minutes
  ◯ 1 hour                   (least friction)
```

Choice persisted in localStorage. Permit material **never** persisted.

### 16.4 Hard rules

- Permit material lives in module memory only. Lost on tab close.
- Session is per-tab; opening a second tab requires a new sign.
- Settings toggle only sets the *default* duration; per-session expiry
  is fixed at sign time.
- Privacy-sensitive screens (Position, Vault) show the countdown
  prominently; less-sensitive screens (Markets) do not.

---

## 17. Risk Presentation (Health Factor)

### 17.1 HF display rules

| HF range | Color | Label | Action |
|---|---|---|---|
| ≥ 2.0 | green | "Very safe" | none |
| 1.5–2.0 | green | "Safe" | none |
| 1.2–1.5 | amber | "Caution" | "Add collateral or repay" suggestion |
| 1.05–1.2 | orange | "Liquidation risk" | sticky banner |
| 1.0–1.05 | red | "Imminent liquidation" | sticky banner + push notification |
| < 1.0 | red | "Eligible for liquidation" | sticky banner + notification + recovery card |

### 17.2 HealthRibbon (sticky banner)

```
⚠ Imminent liquidation risk on M-86. HF 1.04.
   Add collateral or repay to avoid liquidation.
   [ Repay now ]  [ Add collateral ]
```

Only shows when HF in the orange/red bands. Dismissible per session, but
re-armed if HF drops further.

### 17.3 Plain-shadow what-if simulator

Sliders on Position page let user simulate:
- "If I borrow X more, HF becomes Y"
- "If I add X collateral, HF becomes Y"
- "If I repay X, HF becomes Y"

All math runs on plain shadows; no FHE cost. The simulator is honest
about the math (uses `liqThresholdBps`, not `lltvBps`).

### 17.4 Score-boost transparency

The Position tab's borrowing-power card must split out:

```
Base LLTV:       86 % (M-86 market parameter)
Score boost:    +200 bps (Tier 2: streams + votes + contacts)
Effective LLTV:  88 %

Max borrow:  ████████ ocUSDC   [ Reveal ]
```

If `scoreOracle == address(0)` (no boost active), show "Score boost: —"
with a tooltip explaining.

---

## 18. PAY ↔ CREDIT ↔ VOTE Integration

### 18.1 The thesis

> Pay generates encrypted financial reputation.
> Vote generates encrypted civic reputation.
> Credit consumes both via `IEncryptedScore`.

Already shipped at contract level (`ObscuraCreditScoreV2`). The UX layer
needs to make this *visible*.

### 18.2 Cross-product CTAs (visible from each app)

**From Pay**:
- After 5th stream sent: toast "Your credit score just went up. See it in
  Credit ↗".
- Invoice creation flow: "Borrow against this invoice on Credit ↗"
  (deferred; needs `ObscuraInvoice` → `ObscuraCreditMarket` collateral
  hook, post-W5C-12).

**From Vote**:
- After every vote cast: subtle "+5 score signal" badge.
- Governance proposal page: link "DAO treasury → Credit Treasury Streamer".

**From Credit**:
- Score breakdown card (§W5C-5) links each signal back to its source app:
  "Streams from Pay → [ Open Pay ↗ ]", etc.
- "Boost your tier" card: "Send 3 more streams · cast 2 more votes · add
  5 more contacts → reach Tier 3 (+400 bps LLTV)".

### 18.3 Shared session permit (W5C-1)

The permit session shipped in W5C-1 is shared across all three apps. Same
chip. Same countdown. Same lifecycle. No re-signing when moving between
Pay → Credit → Vote.

### 18.4 Shared activity feed (W5C-7)

The indexer indexes events from Pay + Credit + Vote contracts. The
`useActivity` hook returns a unified feed. Filters per app. A unified
activity tab in Settings shows the whole reputation history.

### 18.5 Borrow-against-invoice (deferred design, post-W5C-12)

When Pay creates an invoice and the recipient accepts, the receivable
becomes an attestation: "0xrecipient owes 0xsender N ocUSDC by D".
Future ObscuraCreditMarket variant could accept this attestation as
collateral. Not in W5C-1..12; designed only in W5C-11.

---

## 19. Score Evolution

### 19.1 V2 today (live)

- Inputs: `streamsByEmployer(user).length`, `listContactIds(user).length`,
  `voterParticipation(user)`.
- Clamps: streams ≤ 50 (×5), contacts ≤ 20 (×3), votes ≤ 30 (×8).
- Tier buckets (plain, leaked intentionally):
  - Tier 0: score < 250 → no boost
  - Tier 1: 250 ≤ score < 500 → +100 bps
  - Tier 2: 500 ≤ score < 750 → +200 bps
  - Tier 3: 750 ≤ score → +400 bps
- Wired on all 3 markets via `setScoreOracle(V2)`.

### 19.2 V3 design (W5C-11)

Add:
- **invoice repayment count** from Pay invoices (high weight, e.g. ×10
  clamped at 30)
- **subscription streak** from Pay subscriptions (×6 clamped at 20)
- **escrow-good-claim count** (×4 clamped at 25)
- **time decay**: 90-day half-life on each signal — recent activity
  contributes more

New interface:

```solidity
interface IEncryptedScoreV2 {
    function scoreOf(address user) external view returns (euint64);
    function userTier(address user) external view returns (uint8);
    function allowTransientForMarket(address user, address market) external;
    function breakdownOf(address user) external view returns (
        SignalBreakdown[] memory
    );
    function bumpFromMarket(address user) external;
}

struct SignalBreakdown {
    bytes32 source;        // keccak256("PayStream") etc.
    uint32 rawCount;       // public, post-clamp
    uint32 contributionBps; // public, contribution to score (in bps of total)
}
```

Deploy plan:
- Deploy `ObscuraCreditScoreV3` against same Pay/AddressBook/Vote sources
- `setAuthorizedMarket(M-86 / M-70-WETH / M-50-OBS, true)` on V3
- `setScoreOracle(V3)` on each market (factory-signed)
- **No market redeploy required** — leverage the mutable seam

### 19.3 Score upgrade hygiene

Every score upgrade MUST:
1. Pass the same FHE-discipline audit (FHE.allowThis, FHE.eq guard,
   no plaintext leaks)
2. Preserve `userTier(user)` semantics (tier is the only public branch)
3. Ship behind a feature flag in the frontend so old score breakdowns
   stay correct until the swap is confirmed
4. Be observable: emit `ScoreUpdated(user, oldHandle, newHandle, source)`
   for indexer

---

## 20. Indexer Architecture

### 20.1 Choice: The Graph hosted vs custom indexer

**Recommendation**: The Graph hosted service or Goldsky (managed).

Reasons:
- All credit data is on-chain events; no off-chain orchestration like
  CipherRoll needs.
- Subgraph syntax handles pagination + filtering well.
- Free tier sufficient for testnet; pay-per-query at mainnet.
- Rollback = redeploy subgraph; no DB migrations.

Fallback: custom indexer on Railway / Fly with Postgres if subgraph
indexing latency exceeds 30 s.

### 20.2 Schema (GraphQL)

```graphql
type Market @entity {
  id: ID! # market address
  loanAsset: Bytes!
  collateralAsset: Bytes!
  lltvBps: Int!
  liqBonusBps: Int!
  totalSupplyAssets: BigInt!
  totalBorrowAssets: BigInt!
  events: [MarketEvent!]! @derivedFrom(field: "market")
}

type MarketEvent @entity(immutable: true) {
  id: ID! # txHash-logIndex
  market: Market!
  type: MarketEventType!
  user: Bytes!
  amountCtHash: Bytes # always encrypted; null if public
  publicAmount: BigInt # only for accrue / borrower-count changes
  txHash: Bytes!
  block: BigInt!
  timestamp: BigInt!
}

enum MarketEventType {
  Supplied
  Withdrew
  Borrowed
  Repaid
  CollateralSupplied
  CollateralWithdrew
  Liquidated
  Accrued
}

type Auction @entity {
  id: ID! # auctionId
  market: Market!
  borrower: Bytes!
  status: AuctionStatus!
  openedAt: BigInt!
  closedAt: BigInt
  winningBidCtHash: Bytes
  winner: Bytes
}

enum AuctionStatus { Open Settled Cancelled }

type Vault @entity {
  id: ID!
  totalAssets: BigInt!
  totalShares: BigInt!
  apySnapshots: [VaultApySnapshot!]! @derivedFrom(field: "vault")
}

type VaultApySnapshot @entity(immutable: true) {
  id: ID!
  vault: Vault!
  apyBps: Int!
  timestamp: BigInt!
}

type ScoreEvent @entity(immutable: true) {
  id: ID!
  user: Bytes!
  oldTier: Int
  newTier: Int!
  txHash: Bytes!
  timestamp: BigInt!
}
```

### 20.3 Privacy rules in the indexer

- **NEVER** decode encrypted amounts. Always store as raw `bytes` (ctHash).
- **NEVER** join encrypted events across users to infer aggregate (subgraph
  shouldn't, but discipline matters).
- **Aggregates are limited to public scalars** (totalSupplyAssets,
  totalBorrowAssets, vault NAV).
- **Rate limit per IP** on the query layer (default 100 req/min).

### 20.4 Endpoints exposed to frontend

```
GET /credit/markets               → list with public scalars
GET /credit/markets/:addr         → single market detail
GET /credit/activity?address=     → per-user events (ctHash only)
GET /credit/activity?market=      → per-market events
GET /credit/auctions?status=open  → live auctions
GET /credit/auctions/:id          → single auction
GET /credit/vault/:addr/apy       → APY snapshots (timeseries)
GET /credit/score/:address        → score events (tier history)
```

### 20.5 Frontend wiring

`useCreditActivity({ address, market, limit, cursor })` returns
`{ items, hasMore, nextCursor, isLoading, refresh }`. Cached via TanStack
Query with 30 s stale time.

---

## 21. Notification Architecture

### 21.1 Layer model

```
[On-chain events]
     ↓
[Indexer (W5C-7)]
     ↓
[Notification worker (W5C-8)]
     ↓                        ↓
[WebSocket/SSE → frontend]   [Email / Webhook (opt-in)]
     ↓
[In-app notification center]
[Browser Notification API (opt-in)]
```

### 21.2 Subscriber model

User subscriptions stored as plain JSON in the worker's DB (Postgres / KV):

```typescript
type Subscription = {
  user: Address;             // 0x address
  notifyChannels: ('inapp' | 'browser' | 'email' | 'webhook')[];
  email?: string;            // only if 'email' channel chosen
  webhookUrl?: string;       // only if 'webhook' channel chosen
  hfThresholds: { market: Address; threshold: number }[];
  enabledTypes: NotificationType[];
};
```

Auth: subscriber must prove ownership of the address via signed message.
Worker stores signature + nonce.

### 21.3 Privacy

- Only public chain data flows through notifications.
- Email body never contains plaintext amounts (e.g. "Your HF on M-86 dropped
  below 1.2" — never "Your debt is X").
- Webhook payloads use the same rule.
- Users can revoke any channel any time via signed message.

### 21.4 In-app notification center

Mounts as a bell icon in the global header (Pay + Credit + Vote share it).

```
┌──────────────────────────────┐
│  Notifications        [✓ All] │
├──────────────────────────────┤
│  • HF dropped on M-86         │
│    1.4 → 1.18 · 4 min ago     │
│    [ Open Position ]          │
│                               │
│  • Repayment confirmed        │
│    M-86 · 18 min ago · tx ↗   │
│                               │
│  • Score moved to Tier 2      │
│    +200 bps LLTV · 1 d ago    │
└──────────────────────────────┘
```

---

## 22. Keeper Expansion

### 22.1 Today

`packages/credit-keeper`: dry-run, single operator key, scan-only.

### 22.2 W5C-10 production

- Live execution (operator-gated)
- Safety rails (max liquidations / hr, balance check, killswitch)
- Prometheus metrics
- Docker image for ops
- Pluggable bid policy interface

### 22.3 Long-term: decentralized keeper market

Post-W5C-12 design:

1. Add `keeperTipBps` (governance-mutable) to market storage.
2. On successful liquidation, route `keeperTipBps` of the bonus to the
   liquidator's address (which is the bidder address, public).
3. Document keeper-runner economics in `docs/credit/KEEPER_ECONOMICS.md`.
4. Ship a public "Run a keeper" guide. Lower the barrier — multiple
   independent keepers improves liveness vs a single project-operated one.

### 22.4 Observability

Keeper must expose:
- `keeper_scans_total{market}` — counter
- `keeper_liquidations_attempted{market}` — counter
- `keeper_liquidations_succeeded{market}` — counter
- `keeper_liquidations_failed{market,reason}` — counter with revert reason
- `keeper_balance_eth` — gauge
- `keeper_balance_ocusdc` — gauge
- `keeper_oracle_age_seconds{asset}` — gauge (alert if > 3600)

Grafana dashboard JSON committed to `packages/credit-keeper/dashboard.json`.

---

## 23. Mobile + PWA UX

### 23.1 Breakpoints

```
< 640 px  → mobile (single column, drawer nav, bottom action bar)
640–1023  → tablet (two-column grid, top nav, condensed cards)
≥ 1024 px → desktop (current layout)
```

### 23.2 Mobile-specific patterns

- **Bottom action bar** on Position screen — sticky, always visible:
  `[Borrow] [Repay] [Add coll.] [Reveal]`
- **Bottom sheet** for forms instead of modal (better thumb reach)
- **Sticky header** with reveal-session chip
- **Pull-to-refresh** on every list view
- **Haptic feedback** (where available) on critical actions (borrow,
  repay, settle bid)

### 23.3 PWA

- `manifest.webmanifest` with icons + theme color
- Service worker: cache shell + public market data; never cache encrypted
  reads
- "Install Obscura Credit" prompt after 2nd session
- Standalone display mode → app feels native

### 23.4 Mobile testing

- Real-device check on iOS Safari + Android Chrome
- Lighthouse mobile target ≥ 90 (perf, a11y, best practices)
- Slow-3G network throttle test (first paint < 3 s)

---

## 24. Observability & SLOs

### 24.1 Frontend RUM

Tracked anonymous metrics (no wallet address, no encrypted material):
- `credit_page_load_ms{tab}` — histogram
- `credit_reveal_latency_ms` — histogram, per reveal
- `credit_session_permit_age_s` — histogram, at reveal time (proxy for
  popup-cost saved)
- `credit_setup_completed_total` — counter (onboarding completion)
- `credit_setup_abandoned_at_step{step}` — counter (where users drop)
- `credit_borrow_attempted_total{market}` — counter
- `credit_borrow_succeeded_total{market}` — counter

Stored in a privacy-respecting analytics layer (Plausible self-hosted,
or PostHog with sensitive event masking).

### 24.2 Contract-side observability

- Indexer exposes `/health` with last-indexed-block lag
- Keeper exposes `/metrics` (Prometheus)
- Notification worker exposes `/health`
- Oracle adapter freshness checked via keeper `oracle_age_seconds`

### 24.3 SLOs (post-W5C-9)

| Service | SLO |
|---|---|
| Markets tab load (public) | p95 < 2 s |
| Reveal latency (post-session) | p95 < 1 s |
| Borrow tx end-to-end | p95 < 30 s |
| Indexer lag | p95 < 30 s behind chain head |
| Keeper alert→liquidation tx | p95 < 60 s |
| Notification delivery | p95 < 60 s after event |
| Uptime (frontend) | 99.5 % monthly |

### 24.4 Status page

Public at `/status` showing: chain status, oracle freshness, indexer lag,
keeper status, notification worker status, last incident.

---

## 25. Security Hardening & Audit Readiness

### 25.1 Contract-level hardening

Already in place (preserve):
- `FHE.allowThis` discipline
- `FHE.allowTransient` before external token calls
- `FHE.eq` real-vs-trivial-handle guard
- `FHE.select` not `if/else` on ebool
- Pre-computed FHE constants
- No plaintext in events

Add (W5C-12):
- [ ] Slither static analysis CI gate
- [ ] Mythril symbolic execution on `ObscuraCreditMarket`
- [ ] Branch coverage ≥ 80 % for all credit contracts in Hardhat tests
- [ ] Invariant tests with Foundry / Echidna:
  - Aggregate `_plainBorrow` shadow equals `totalBorrowAssets` (modulo
    encrypted shares scaling)
  - Aggregate `_plainSupplyShares` shadow equals `totalSupplyAssets`
    (modulo)
  - No user can withdraw more collateral than `_plainCollateral[user]`
  - No user can borrow more than tier-boosted LLTV
- [ ] Replay attack tests on `ObscuraCreditAuction.confidentialBid`
- [ ] Re-entrancy tests on Router + market boundary
- [ ] Out-of-gas test on FHE-heavy paths (borrow with score boost +
  liquidation interaction)
- [ ] Oracle staleness test (advance time past `maxStaleness`; expect
  revert)

### 25.2 Frontend hardening

- [ ] Content Security Policy headers (no inline scripts; nonce only)
- [ ] Strict `permissions-policy` (deny geolocation, camera, etc.)
- [ ] `Strict-Transport-Security` max-age ≥ 1 year
- [ ] `X-Frame-Options: DENY`
- [ ] Subresource integrity for all CDN assets
- [ ] No `eval` / `Function` constructor in app code
- [ ] Sensitive computation (encryption) happens only after MetaMask
  confirms wallet is connected and chain is correct
- [ ] Wallet-signed challenge for any worker-stored data (subscriptions)

### 25.3 Audit gate (pre-mainnet)

Required before any mainnet broadcast (which is in turn blocked on
Fhenix CoFHE mainnet GA — see §29):

- [ ] External audit by ≥ 1 of: Spearbit, Trail of Bits, Code4rena,
      OpenZeppelin
- [ ] All Critical + High findings remediated
- [ ] Medium findings either fixed or documented with risk acceptance
- [ ] Public audit report published
- [ ] Bug bounty program live (Immunefi recommended)
- [ ] Multisig deployer (≥ 3-of-5) replaces single-EOA deployer
- [ ] Threshold-decentralized governance handover (timelock + multisig)

---

## 26. Deployment & Migration Strategy

### 26.1 Default posture: in-place fixes only

For any bug, ask in order:
1. Can we fix in the frontend? (most cases — copy, wiring, hook logic)
2. Can we fix via an adapter? (oracle issues — pattern established)
3. Can we fix via a hook? (score signal additions)
4. Can we fix via `setScoreOracle` / `setAuctionEngine`? (mutable seams)
5. Last resort: redeploy market + migrate.

### 26.2 When a market redeploy IS required

Triggered only by:
- Bug in immutable storage (lltvBps wrong, liqThresholdBps wrong)
- Bug in market logic that no adapter can route around
- Switching to a wrapper-mode collateral (Pay-side ocUSDC unification)

Migration runbook:
1. Pause new borrows on old market (via governance: `setAuctionEngine(0)`
   freezes the liquidation path; communicate "wind down" to users)
2. Deploy new market with same IRM but corrected params + new tokens
3. Open new market with seed liquidity (operator)
4. Communicate migration window (e.g. 14 days) — users repay + supply elsewhere
5. After window: liquidate any remaining positions on old market through
   auction; close old vault routing to old market
6. Update `deployments/arb-sepolia.json`; update `.env`; update `config/credit.ts`
7. Frontend: feature-flag old market hidden behind `?legacy=true`

### 26.3 Frontend deployment

- Vite static build → Vercel
- `.env` production split per environment (testnet today; mainnet gated)
- Preview deploys per PR
- Production deploy from `main` only, after CI green + manual approval
- Rollback: redeploy previous commit (Vercel one-click)

### 26.4 Indexer deployment

- The Graph hosted: `npm run deploy:subgraph` → versioned subgraph
- Versioning: `obscura-credit/v1`, `v2`, etc.
- Frontend can pin to a specific subgraph version via env var

### 26.5 Keeper deployment

- Docker image pushed to GHCR
- Operator runs on Fly.io / Railway / their own infra
- Helm chart for k8s users (post-W5C-10)
- Killswitch via file presence (see §22.2)

---

## 27. Technical Debt Cleanup

### 27.1 Code-level debt

| Item | File | Action |
|---|---|---|
| `as any` ABI casts in `config/credit.ts` | `frontend/.../config/credit.ts` | Type via generated ABI types from `wagmi` cli |
| `useCredit.ts` is 1100+ lines | `frontend/.../hooks/useCredit.ts` | Split: `useCreditMarkets`, `useCreditPositions`, `useCreditVaults`, `useCreditAuctions`, `useCreditScore` into separate files |
| `CreditScore` v1 ABI still referenced in config | `config/credit.ts` | Mark `@deprecated`; remove in W5C-12 |
| Legacy `CREDIT_MARKET_V316_ADDRESS` references | `config/credit.ts` + hooks | Remove after Pay-side audit confirms no consumers |
| Stale comments referencing `cUSDC` | various | Rename pass alongside v3.18.1 work; sweep in W5C-1 |
| `liqBonusBps` was 750 then 500 — verify all code paths use config not constants | `BorrowForm.tsx`, `MarketCard.tsx` | Audit |
| `BorrowForm.tsx` has stealth + non-stealth paths inline | `frontend/.../components/credit/BorrowForm.tsx` | Extract `StealthBorrowForm` + `DirectBorrowForm` |
| `SetupSheet.tsx` `fhe.set` regression | already fixed (v3.18.1) | Add ESLint rule to ban `fhe\.set\(` |

### 27.2 Contract-level debt

| Item | Contract | Action |
|---|---|---|
| Deprecated `ObscuraCreditScore` v1 still on-chain | `0xA83aCeE5…` | Document as deprecated; do not touch |
| Old ocWETH / ocOBS tokens still on-chain | `0xA377AF2b…` / `0x68d61fb8…` | Do not touch; archive |
| Old M-70-WETH / M-50-OBS markets (v1) | (pre-v3.19) | Same |
| `ObscuraConfidentialWrapperFactory` unused at production | `contracts-hardhat/contracts/credit/ObscuraConfidentialWrapperFactory.sol` | Keep for future Pay-Credit unification |
| `ObscuraCreditStreamHook` and `InsuranceHook` interfaces | review | Are they on the active integration path? If not, deprecate (post-audit) |

### 27.3 Doc debt

| Item | Action |
|---|---|
| `WAVE4-CREDIT-PROGRESS.md` is 700+ lines, mixes versions | Snapshot v3.19 state into `docs/credit/STATE.md`; archive WAVE4 progress as `docs/archive/` |
| `summary5.md` covers Pay + Credit + Vote | Keep as multi-product log; reference from this doc |
| `docs/credit/` is mostly empty | Populate per §6 (privacy matrix), §10 (onboarding), §22 (keeper economics), §25 (audit checklist) |

---

## 28. AI-Agent Execution Rules

This doc is designed for AI-agent execution. Rules for agents working on
Credit:

### 28.1 Universal rules (binding)

1. **Read [.github/copilot-instructions.md](.github/copilot-instructions.md)
   and [AGENTS.md](AGENTS.md) before any FHE edit.** Load the relevant
   skill from `.github/skills/` per the task domain.
2. **Never touch a deployed contract** without explicit operator approval.
3. **Never auto-decrypt** in `useEffect`. Decrypt is always user-triggered.
4. **Always `await waitForTransactionReceipt`** before flipping
   `FHEStepStatus → READY`.
5. **Always include `fhe` in `useCallback` deps.**
6. **Never edit `about.md`, `README.md`, or `wave4.md`** without explicit
   user instruction.
7. **Never introduce KURA, CovertMRV, or "MRV"** naming anywhere.
8. **User-facing copy** must avoid: euint, ctHash, ACL, permit, CoFHE,
   coprocessor.
9. **Every encrypted state mutation** in Solidity must be followed by
   `FHE.allowThis(handle)`.
10. **Every cross-contract encrypted flow** must use `confidentialTransferFromHandle`
    + transient ACL — never direct proof forwarding.
11. **Every FHE comparison** must use `FHE.select`, never `if/else` on
    `ebool`.
12. **Every public scalar** in events is fine; **every amount** in events
    is `bytes32` ctHash.
13. **Always use `withRateLimitRetry`** on writes; **always `batchRead`
    multicall** for public reads.
14. **Always `estimateCappedFees(publicClient)`** on writes; never inline
    fee math.

### 28.2 Phase autonomy matrix

| Phase | AI autonomy | Operator gate |
|---|---|---|
| W5C-0 (audit + privacy matrix) | full | — |
| W5C-1 (permit session) | full | — |
| W5C-2 (token bridge UX) | full | — |
| W5C-3 (onboarding) | full UI | operator if W5C-3a deploys mux |
| W5C-4 (position surface) | full | — |
| W5C-5 (score breakdown) | full UI | operator for `ScoreV2View` deploy |
| W5C-6 (liquidation surface) | full UI | — |
| W5C-7 (indexer) | full schema + mapping | operator for subgraph deploy |
| W5C-8 (notifications) | full hooks + UI | operator for worker deploy |
| W5C-9 (mobile + PWA) | full | — |
| W5C-10 (keeper to prod) | full code | operator for live run |
| W5C-11 (score V3 design) | full design | operator for V3 deploy |
| W5C-12 (polish + audit-ready) | full docs | operator for audit booking |

### 28.3 Per-PR rules (AI-authored PRs)

- **Max 400 lines changed per PR.** Larger features split.
- **CI must be green** before review.
- **Type check + lint must pass.**
- **Vitest unit tests for every new hook.**
- **PR title format**: `[credit] W5C-N: <description>`.
- **PR body** must include: scope, files touched, exit criterion this
  satisfies, rollback path, manual test steps.
- **Never self-merge.** Require human approval.

### 28.4 Forbidden patterns (ESLint enforced where possible)

- `decryptForView(...)` inside `useEffect` — ban
- `getOrCreateSelfPermit(...)` inside `useEffect` — ban
- `fhe.set(` (should be `fhe.setStep(`) — ban
- Direct `writeContractAsync` without `estimateCappedFees` — warn
- Direct `readContract` calls without `batchRead` or `withRateLimitRetry`
  for write paths — warn
- `useCallback` without `fhe` in deps when body calls `fhe.*` — error

---

## 29. Risks, Blockers, Open Questions

### 29.1 Hard blockers (external)

| Blocker | Impact | Mitigation |
|---|---|---|
| Fhenix CoFHE mainnet not GA | No mainnet deploy possible | Build mainnet-readiness; broadcast when GA lands |
| `eaddress` not available on Arb Sepolia | Stealth borrow uses public registry instead of encrypted recipient | Storage slot already exists; activate when eaddress ships |
| No paymaster / sponsored gas on Fhenix mainnet | Passkey + social onboarding premature | Design integration seam (single `useAccount` call site); ship post-mainnet |
| Single RPC dependency (Arbitrum Sepolia public RPC) | Rate limits during traffic spikes | Add fallback RPCs in wagmi config; document in W5C-12 |

### 29.2 Soft risks

| Risk | Severity | Mitigation |
|---|---|---|
| Score V2 signal sources change behavior | medium | Adapter interfaces are tight; deploy ScoreV3 if sources mutate |
| Chainlink feed deprecation on Arb Sepolia | medium | Adapter is per-feed; redeploy adapter, call `setPublicFeed` |
| Indexer subgraph latency > 30 s | medium | Switch to managed (Goldsky); fallback to RPC reads behind flag |
| Notification worker abuse (spam to webhook) | low | Rate-limit per subscription; require signed challenge |
| Keeper-runner economics unfavorable | medium | Ship `keeperTipBps` mechanism (§22.3) |
| User accidentally signs malicious permit | medium | Permit material domain-bound; settings panel shows what's signed |

### 29.3 Open product questions

1. **Should we expose `userTier` publicly on a profile page?** Pro: clear
   social signal of creditworthiness. Con: leak vector. Resolution:
   opt-in only (W5C-11 PublicReputationCard).
2. **Should vault APY be smoothed (EMA) or instantaneous?** Recommendation:
   instantaneous on the card, 7-day EMA on the chart. Document at vault
   addition.
3. **Should we add a "deposit limit" guard to vaults at testnet scale?**
   Probably no — testnet should stress-test capacity.
4. **Should liquidations expose post-settle bid amount publicly?**
   Currently yes (winner public). Confirmed correct: protocol needs to
   prove the bid won.
5. **Two-token unification: M-86 v2 with wrapper ocUSDC — when?** Blocked
   on Fhenix mainnet. Until then, the split is permanent and managed via
   the bridge strip UX (§W5C-2).

### 29.4 Things explicitly NOT in this plan

| Item | Reason |
|---|---|
| Aave-style liquidity mining rewards | Out of thesis; speculative |
| Flash loans | Risk surface explosion; out of thesis |
| Cross-chain credit | Blocked on Fhenix multi-chain support |
| Tokenized credit positions (NFT) | Privacy story doesn't compose cleanly with transferable NFTs |
| Permissionless market creation | Premature pre-audit; security ramps |
| Variable-rate IRM | IRM is `immutable`; design via market redeploy if needed; not in 5C-N |
| AI-priced LLTV | Out of thesis; trust assumption explosion |
| Centralized off-chain risk engine | Defeats the privacy thesis |
| Restaking yields layer | Out of thesis |
| Real-world asset collateral | Massive regulatory + oracle risk; not in scope |

---

## 30. Closing Notes & Non-Goals

### 30.1 What this plan preserves (non-negotiable)

- Handle-based architecture (`confidentialTransferFromHandle`)
- Pre-computed FHE constants in market constructor
- Encrypted lender supply shares (we are the only one in the space)
- Plain shadows for revert guards only (never ABI-exposed)
- `FHE.allowThis` discipline
- `FHE.allowTransient` before external token calls
- `FHE.eq` real-vs-trivial-handle guard
- `FHE.select` not `if/else` on ebool
- No plaintext amounts in events
- Mutable upgrade seams: `scoreOracle`, `auctionEngine`
- In-place oracle adapter pattern
- Two-token ocUSDC split (until M-86 v2)
- Privacy-first UI defaults
- No auto-decrypt on mount
- Public data auto-load, encrypted data user-triggered
- Testnet honesty + mainnet gate

### 30.2 What this plan rejects (with reason)

| Rejected | Reason |
|---|---|
| Re-deploying any of the 3 live markets without a user-blocking bug | Cost outweighs benefit; in-place patterns work |
| Replacing The Graph subgraph with a custom indexer pre-launch | Premature optimization |
| Custom passkey wallet pre-mainnet | No paymaster on Fhenix mainnet yet |
| Adding more isolated markets just to look like Aave | Each new market is a capital fragmentation cost |
| In-app token launchpad | Out of thesis |
| Encrypted yield speculation products | Risk surface explosion |
| AI agents (LLM-driven actions) | Premature; ship after notification + indexer stable |
| Mainnet broadcast | Blocked: CoFHE GA + audit + multisig + threshold governance |
| Email-password auth | Wallet-signed challenges only |
| Tokenized credit position as NFT | Privacy thesis incompatible |
| Replacing isolated markets with shared pool | Loses LLTV-per-asset; reverts to Walnut's tier system |

### 30.3 Final word

> The product thesis is *"borrow privately, lend privately, get a credit
> score from your private payments and your private votes, and never let
> anyone — not even Obscura — see your position size."*

Every phase above exists to make that sentence *true and usable*. Phases
that don't serve it were rejected. Phases that serve it but aren't yet
feasible are explicitly blocked, not silently omitted.

> Build in phase order. Update [summary5.md](summary5.md) at the end of
> each phase. Update [docs/credit/PRIVACY_MATRIX.md](docs/credit/PRIVACY_MATRIX.md)
> when contract behavior changes. Do not skip W5C-1 — the permit session
> is the single highest-leverage change in the entire plan. Do not skip
> W5C-7 — the indexer unblocks notifications, mobile, exports, and the
> activity feed in one shipment.

The protocol is done. Finish the product.

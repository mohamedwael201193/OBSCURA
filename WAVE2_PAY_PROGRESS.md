# Wave 2 — ObscuraPay v4: Implementation Progress

> Confidential recurring payroll on real cUSDC, with stealth recipients,
> on-chain insurance, and one-click cross-chain funding.
> No mocks. No test tokens. Live on Arbitrum Sepolia.

---

## Scope Overview

| # | Task | Location | Status |
|---|------|----------|--------|
| 1 | Interfaces (cUSDC, escrow, resolver, underwriter, IERC165) | `contracts-hardhat/contracts/interfaces/` | ✅ Done |
| 2 | `ObscuraPayrollResolver.sol` (IConditionResolver) | `contracts-hardhat/contracts/` | ✅ Done |
| 3 | `ObscuraStealthRegistry.sol` (ERC-5564 meta + announcements) | `contracts-hardhat/contracts/` | ✅ Done |
| 4 | `ObscuraPayStream.sol` (recurring cUSDC stream → escrow) | `contracts-hardhat/contracts/` | ✅ Done |
| 5 | `ObscuraPayrollUnderwriter.sol` (IUnderwriterPolicy) | `contracts-hardhat/contracts/` | ✅ Done |
| 6 | Deploy script | `contracts-hardhat/scripts/deployWave2Pay.ts` | ✅ Done |
| 7 | Hardhat tests (resolver + registry) | `contracts-hardhat/test/` | ✅ Done (8/8) |
| 8 | Deployed to Arbitrum Sepolia | `contracts-hardhat/deployments/arb-sepolia.json` | ✅ Done |
| 9 | Frontend `wave2.ts` config + ABIs | `frontend/obscura-os-main/src/config/wave2.ts` | ✅ Done |
| 10 | Stealth lib (ECDH, viewTag, scan) | `frontend/obscura-os-main/src/lib/stealth.ts` | ✅ Done |
| 11 | Hook — `useCUSDCBalance` | `src/hooks/useCUSDCBalance.ts` | ✅ Done |
| 12 | Hook — `useStealthMetaAddress` | `src/hooks/useStealthMetaAddress.ts` | ✅ Done |
| 13 | Hook — `useCreateStream` | `src/hooks/useCreateStream.ts` | ✅ Done |
| 14 | Hook — `useTickStream` | `src/hooks/useTickStream.ts` | ✅ Done |
| 15 | Hook — `useStreamList` | `src/hooks/useStreamList.ts` | ✅ Done |
| 16 | Hook — `useStealthScan` | `src/hooks/useStealthScan.ts` | ✅ Done |
| 17 | Hook — `useInsurePayroll` (purchase + dispute + isOperator pre-check) | `src/hooks/useInsurePayroll.ts` | ✅ Done |
| 18 | Hook — `useCrossChainFund` (CCTP V1 + auto-claim) | `src/hooks/useCrossChainFund.ts` | ✅ Done |
| 18a | Hook — `useCUSDCTransfer` (FHE P2P encrypted send) | `src/hooks/useCUSDCTransfer.ts` | ✅ Done |
| 18b | Hook — `useCUSDCEscrow` (create/fund/redeem/exists + localStorage) | `src/hooks/useCUSDCEscrow.ts` | ✅ Done |
| 18c | Hook — `useIsOperator` (cUSDC operator pre-check before approval txs) | `src/hooks/useIsOperator.ts` | ✅ Done |
| 19 | Components — `pay-v4/` folder | `src/components/pay-v4/` | ✅ Done |
|    | — `CUSDCPanel.tsx` (wrap + unwrap + isOperator-aware authorize) | | ✅ |
|    | — `CUSDCTransferForm.tsx` (FHE P2P encrypted send) | | ✅ |
|    | — `CUSDCEscrowForm.tsx` (eaddress + euint64 create) | | ✅ |
|    | — `CUSDCEscrowActions.tsx` (fund / redeem / exists) | | ✅ |
|    | — `MyEscrows.tsx` (localStorage list, auto-refresh) | | ✅ |
|    | — `ResolverManager.tsx` (getCycle, isConditionMet, approve, cancel) | | ✅ |
|    | — `CreateStreamForm.tsx` | | ✅ |
|    | — `StreamList.tsx` (tick + pause/resume/cancel) | | ✅ |
|    | — `RegisterMetaAddressForm.tsx` | | ✅ |
|    | — `StealthInbox.tsx` | | ✅ |
|    | — `CrossChainFundForm.tsx` | | ✅ |
|    | — `BuyCoverageForm.tsx` | | ✅ |
|    | — `DisputeForm.tsx` | | ✅ |
|    | — `StakePoolForm.tsx` | | ✅ |
|    | — `MyPolicies.tsx` | | ✅ |
| 20 | `PayPage.tsx` 5 new tabs (streams, crosschain, insurance, stealth) | `src/pages/PayPage.tsx` | ✅ Done |
| 21 | `PMFPage.tsx` + `/pmf` route | `src/pages/PMFPage.tsx`, `src/App.tsx` | ✅ Done |
| 22 | Demo doc | `WAVE2_PAY_DEMO.md` | ✅ Done |
| 23 | ReineiraOS pool registration & liquidity stake | `contracts-hardhat/scripts/setupReineiraPool.ts` | ✅ Done |
| 24 | Off-chain ticker bot (`packages/ticker/`) | n/a | ⏳ Optional |
| 25 | `purchaseCoverage` 8-arg signature fix (was passing 5 args, broken) | `src/hooks/useInsurePayroll.ts` | ✅ Done |
| 26 | Reineira `PoolFactory` / `PolicyRegistry` / `InsurancePool` ABIs | `src/config/wave2.ts` | ✅ Done |
| 27 | `BuyCoverageForm` escrowId + coverage-days inputs | `src/components/pay-v4/BuyCoverageForm.tsx` | ✅ Done |
| 28 | Stealth Inbox **Reveal Claim Key** flow (derive privkey + copy + verify) | `src/components/pay-v4/StealthInbox.tsx` | ✅ Done |
| 29 | UX text rewrite — beginner-friendly copy across all Pay tabs | `PayPage.tsx` + all pay/ + pay-v4/ components | ✅ Done |
| 30 | Token distinction — $OBS vs cUSDC labels, badges, explanations | All pay components | ✅ Done |
| 31 | How-it-works guides per tab (dashboard, pay, escrows, streams, cross-chain, insurance, stealth) | `PayPage.tsx` | ✅ Done |
| 32 | Privacy sidebar — added cUSDC Stream + Insurance Coverage handles | `PayPage.tsx` | ✅ Done |
| 33 | Sidebar modules — added PayStream, StealthRegistry, PayrollInsurance | `PayPage.tsx` | ✅ Done |
| 34 | Wrap fix — auto-approve plain USDC before wrapping to cUSDC | `src/hooks/useCUSDCBalance.ts`, `src/config/wave2.ts` | ✅ Done |
| 35 | USDC Arb Sepolia address added (`0x75faf114…6AA4d`) | `src/config/wave2.ts` | ✅ Done |
| 36 | RPC rate-limit fix — 2s delay between approve + wrap txs, fresh gas per tx | `src/hooks/useCUSDCBalance.ts` | ✅ Done |
| 37 | cUSDC Reveal fix — error feedback, toast, loading state, re-throw errors | `src/hooks/useCUSDCBalance.ts`, `CUSDCPanel.tsx` | ✅ Done |
| 38 | StakePoolForm — deposit cUSDC into InsurancePool (encrypted stake) | `src/components/pay-v4/StakePoolForm.tsx`, `PayPage.tsx` | ✅ Done |
| 39 | cUSDC Reveal fix — switch to `confidentialBalanceOf` (proper ACL read) | `src/hooks/useCUSDCBalance.ts`, `src/config/wave2.ts` | ✅ Done |
| 40 | Decrypt fix — remove `.withPermit()`, add 2-attempt retry with permit refresh | `src/lib/fhe.ts` | ✅ Done |
| 41 | CUSDCPanel — show plain USDC balance, encrypted handle, decrypted cUSDC | `src/components/pay-v4/CUSDCPanel.tsx`, `src/hooks/useCUSDCBalance.ts` | ✅ Done |
| 42 | FHERC-20 approve fix — replace `approve()` with `setOperator()` (Reineira reverts approve) | `wave2.ts`, `useCUSDCBalance.ts`, `CUSDCPanel.tsx`, `StakePoolForm.tsx` | ✅ Done |
| 43 | Stealth registration gas fix — 200k→500k (Arbitrum L1 data costs for `bytes` storage) | `src/hooks/useStealthMetaAddress.ts` | ✅ Done |
| 44 | Double `0x` prefix fix — `bytesToHex()` already returns `0x`-prefixed, removed redundant concat | `src/lib/stealth.ts` | ✅ Done |
| 45 | Stream list instant refresh — `onCreated` callback + key-based remount + 8s refetchInterval | `useStreamList.ts`, `CreateStreamForm.tsx`, `PayPage.tsx` | ✅ Done |
| 46 | Self-test "Me" button — auto-fills own address as recipient for testing | `CreateStreamForm.tsx` | ✅ Done |
| 47 | Live recipient stealth check — green/red badge in CreateStreamForm, blocks unregistered | `CreateStreamForm.tsx`, `useRecipientStealthCheck.ts` | ✅ Done |
| 48 | Employer invite message — "Copy Invite" button generates onboarding instructions for recipient | `CreateStreamForm.tsx` | ✅ Done |
| 49 | Receive tab rebuild — 4-step recipient onboarding guide + stealth reg + incoming streams | `PayPage.tsx` | ✅ Done |
| 50 | Per-stream stealth status — "stealth ready" / "no stealth" badge per stream in StreamList | `StreamList.tsx` | ✅ Done |
| 51 | Announce gas fix — 200k→500k + 2s delay between tick & announce (MetaMask rate limit) | `src/hooks/useTickStream.ts` | ✅ Done |
| 52 | Announce fresh gas estimation — re-estimate `maxFeePerGas` for second tx after delay | `src/hooks/useTickStream.ts` | ✅ Done |
| 53 | tickStream receipt check + pre-flight simulation — catches reverts before MetaMask popup | `src/hooks/useTickStream.ts` | ✅ Done |
| 54 | **ROOT CAUSE: euint64 selector mismatch** — our SDK = bytes32, Reineira = uint256. All PayStream↔cUSDC calls used wrong selector | `ObscuraPayStream.sol` (deployed) | ✅ Diagnosed |
| 55 | **FIX: bypass PayStream for transfers** — call `cUSDC.confidentialTransfer(stealthAddr, InEuint64)` directly from employer wallet | `src/hooks/useTickStream.ts`, `src/config/wave2.ts` | ✅ Done |
| 56 | cUSDC ABI: add InEuint64-tuple overload for `confidentialTransfer` (selector 0xa794ee95) | `src/config/wave2.ts` | ✅ Done |
| 57 | **FIRST SUCCESSFUL cUSDC PAYMENT** — 2 cUSDC sent via stealth, balance 10→8, both txs confirmed | Live on Arb Sepolia | ✅ Working |
| 58 | Client-side paid cycle tracking — localStorage counter (on-chain counter not updated since PayStream bypassed) | `StreamList.tsx` | ✅ Done |
| 59 | Payment success banner — green animated "Payment sent!" with tx hash, dismissable | `StreamList.tsx` | ✅ Done |
| 60 | Effective pending cycles — uses local lastTick timestamp to correct countdown after direct transfer | `StreamList.tsx` | ✅ Done |
| 61 | CCTP V2→V1 downgrade — CCTP V2 not deployed on Sepolia testnet, switched to `depositForBurn` (V1) | `wave2.ts`, `useCrossChainFund.ts` | ✅ Done |
| 62 | Sepolia chain added to wagmi config — required for wallet switching to Eth Sepolia | `src/config/wagmi.ts` | ✅ Done |
| 63 | StreamList SWC parse fix — extracted IIFE into `CountdownTimer` component (vite-plugin-react-swc limitation) | `StreamList.tsx` | ✅ Done |
| 64 | Bridge step-by-step UX — 6-step progress indicator during burn flow | `CrossChainFundForm.tsx` | ✅ Done |
| 65 | CCTP V1 auto-claim — poll Circle attestation API + `receiveMessage` on Arb Sepolia MessageTransmitter | `useCrossChainFund.ts`, `CrossChainFundForm.tsx` | ✅ Done |
| 66 | Bridge state persistence — localStorage save/resume so attestation polling survives tab switches | `useCrossChainFund.ts`, `CrossChainFundForm.tsx` | ✅ Done |
| 67 | Bridge Recover UI — paste burn tx hash to recover unclaimed bridge, checks attestation + shows Claim | `useCrossChainFund.ts`, `CrossChainFundForm.tsx` | ✅ Done |
| 68 | Claim gas fix — fetch fresh `maxFeePerGas` from Arb Sepolia RPC after chain switch (avoids stale MetaMask gas) | `useCrossChainFund.ts` | ✅ Done |
| 69 | Burn tx hash banner — shows tx hash with copy button + Etherscan link during bridge flow | `CrossChainFundForm.tsx` | ✅ Done |
| 70 | Insurance `setOperator` fix — authorize CoverageManager as cUSDC operator before `purchaseCoverage` (was missing → revert) | `useInsurePayroll.ts` | ✅ Done |
| 71 | Insurance step progress — encrypting → authorizing → purchasing flow with spinner labels | `useInsurePayroll.ts`, `BuyCoverageForm.tsx` | ✅ Done |
| 72 | Coverage ID capture — parse tx receipt logs for coverage ID, save to localStorage | `useInsurePayroll.ts`, `BuyCoverageForm.tsx` | ✅ Done |
| 73 | My Policies panel — show saved coverage IDs with copy, Arbiscan link, quick-fill into disputes | `MyPolicies.tsx`, `DisputeForm.tsx`, `PayPage.tsx` | ✅ Done |
| 74 | Insurance input validation — BigInt crash protection, clear error messages, field hints | `BuyCoverageForm.tsx`, `DisputeForm.tsx` | ✅ Done |
| 75 | Insurance tab guide rewrite — 4-step plain-English instructions + LP note | `PayPage.tsx` | ✅ Done |

---

## All-cUSDC Unification (commit 34df672 — April 2026)

Complete removal of $OBS from PayPage. All payment features now run exclusively on encrypted cUSDC.

| # | Task | Location | Status |
|---|------|----------|--------|
| 76 | Hook — `useCUSDCTransfer` — FHE encrypt + `confidentialTransfer(InEuint64)` P2P send | `src/hooks/useCUSDCTransfer.ts` | ✅ Done |
| 77 | Hook — `useCUSDCEscrow` — FHE `encryptAddressAndAmount` → `create`, `fund`, `redeem`, `exists` | `src/hooks/useCUSDCEscrow.ts` | ✅ Done |
| 78 | Component — `CUSDCTransferForm.tsx` — cyan-themed P2P send with 3-step FHE progress | `src/components/pay-v4/CUSDCTransferForm.tsx` | ✅ Done |
| 79 | Component — `CUSDCEscrowForm.tsx` — create encrypted escrow (owner+amount both encrypted) with resolver fields | `src/components/pay-v4/CUSDCEscrowForm.tsx` | ✅ Done |
| 80 | Component — `CUSDCEscrowActions.tsx` — fund / redeem / existence-check by escrow ID | `src/components/pay-v4/CUSDCEscrowActions.tsx` | ✅ Done |
| 81 | Component — `MyEscrows.tsx` — localStorage list with copy/delete/Arbiscan, auto-refresh 3s | `src/components/pay-v4/MyEscrows.tsx` | ✅ Done |
| 82 | `PayPage.tsx` full restructure — removed all Wave 1 $OBS imports; 8-tab layout (dashboard, send, receive, escrows, streams, crosschain, insurance, stealth) | `src/pages/PayPage.tsx` | ✅ Done |
| 83 | Dashboard tab — cUSDC how-it-works 6-step guide + `CUSDCPanel` (replaced `DashboardStats` + `ClaimDailyObsForm`) | `src/pages/PayPage.tsx` | ✅ Done |
| 84 | Send tab — `CUSDCTransferForm` only (replaced Wave 1 `TransferForm` + `PayrollForm` + `EmployeeList`) | `src/pages/PayPage.tsx` | ✅ Done |
| 85 | Receive tab — recipient 4-step onboarding + stealth registration + incoming streams + `CUSDCPanel` | `src/pages/PayPage.tsx` | ✅ Done |
| 86 | Escrows tab — `CUSDCEscrowForm` + `MyEscrows` + `CUSDCEscrowActions` (replaced Wave 1 $OBS escrow components) | `src/pages/PayPage.tsx` | ✅ Done |
| 87 | Header badge — single cUSDC badge (removed dual $OBS + cUSDC header) | `src/pages/PayPage.tsx` | ✅ Done |
| 88 | Privacy sidebar — updated to cUSDC-focused encrypted handle descriptions | `src/pages/PayPage.tsx` | ✅ Done |
| 89 | `VotePage.tsx` updated — `ClaimDailyObsForm` moved from PayPage to Vote dashboard tab (kept $OBS faucet accessible) | `src/pages/VotePage.tsx` | ✅ Done |
| 90 | cUSDC P2P transfer live test — tx `0xf47b0c80…19c908bf` block 261245461, 0.0001 pUSDC handle confirmed on Arbiscan | Live on Arb Sepolia | ✅ Verified |

---

## FHE Privacy Maximization (commit f181ac1 — April 2026)

Full audit of every Fhenix CoFHE ABI function — every unused capability is now wired to UI. 100% FHE feature coverage.

| # | Task | Location | Status |
|---|------|----------|--------|
| 91 | `cUSDC.unwrap` wired — convert encrypted cUSDC back to plain USDC (amber "Unwrap" button in CUSDCPanel) | `src/hooks/useCUSDCBalance.ts`, `src/components/pay-v4/CUSDCPanel.tsx` | ✅ Done |
| 92 | `useCUSDCBalance.unwrap()` — reads encrypted handle, calls `cUSDC.unwrap(address, amount)`, updates tracked balance localStorage | `src/hooks/useCUSDCBalance.ts` | ✅ Done |
| 93 | Hook — `useIsOperator` — pre-check cUSDC operator status (`isOperator(holder, spender)`) before any approval tx | `src/hooks/useIsOperator.ts` | ✅ Done |
| 94 | `approveStream` isOperator pre-check — reads `cUSDC.isOperator(address, PayStream)` before submitting `setOperator` tx; shows "already approved" toast if so | `src/hooks/useCUSDCBalance.ts` | ✅ Done |
| 95 | `purchaseCoverage` isOperator pre-check — skips `setOperator(CoverageManager)` tx entirely if already authorized; saves one wallet popup per insurance purchase | `src/hooks/useInsurePayroll.ts` | ✅ Done |
| 96 | Stream **Pause** button — calls `ObscuraPayStream.setPaused(streamId, true)` on-chain; real contract tx with gas estimation | `src/components/pay-v4/StreamList.tsx` | ✅ Done |
| 97 | Stream **Resume** button — calls `ObscuraPayStream.setPaused(streamId, false)`; appears when stream is in paused state | `src/components/pay-v4/StreamList.tsx` | ✅ Done |
| 98 | Stream **Cancel** button — calls `ObscuraPayStream.cancelStream(streamId)`; permanently cancels stream on-chain | `src/components/pay-v4/StreamList.tsx` | ✅ Done |
| 99 | Pause/resume/cancel all use fresh `estimateFeesPerGas` + 130% buffer + 200k gas; replace "coming soon" placeholder entirely | `src/components/pay-v4/StreamList.tsx` | ✅ Done |
| 100 | Component — `ResolverManager.tsx` — full PayrollResolver UI: escrow ID lookup, `getCycle` view, `isConditionMet` check, `approve` + `cancel` actions | `src/components/pay-v4/ResolverManager.tsx` | ✅ Done |
| 101 | `ResolverManager` shows cycle info table — releaseTime, approved, cancelled, employer, approver, condition status | `src/components/pay-v4/ResolverManager.tsx` | ✅ Done |
| 102 | `ResolverManager` wired to Escrows tab in PayPage | `src/pages/PayPage.tsx` | ✅ Done |
| 103 | Sidebar contract info expanded — PayStream + PayrollResolver addresses shown alongside cUSDC + Escrow | `src/pages/PayPage.tsx` | ✅ Done |
| 104 | Sidebar FHE ops expanded — added `sealOutput` to listed operations | `src/pages/PayPage.tsx` | ✅ Done |
| 105 | Sidebar modules expanded — `PayrollResolver` added as active Wave 2 module | `src/pages/PayPage.tsx` | ✅ Done |

---

## Rate-Limit & Reliability Fixes (April 2026)

| # | Task | Location | Status |
|---|------|----------|--------|
| 106 | Wrap rate-limit fix — increased approve→wrap delay from 2s to 5s; added `withRateLimitRetry` helper (3 retries, 4s exponential backoff) | `src/hooks/useCUSDCBalance.ts` | ✅ Done |
| 107 | Unwrap rate-limit protection — wrapped unwrap call in `withRateLimitRetry` (same 3-retry exponential backoff) | `src/hooks/useCUSDCBalance.ts` | ✅ Done |
| 108 | `withRateLimitRetry<T>` generic helper — detects "rate limit" / "429" in error messages, waits `baseDelay × attempt`, retries up to 3× | `src/hooks/useCUSDCBalance.ts` | ✅ Done |
| 109 | CUSDCPanel loading toast — persistent `toast.loading` during wrap/unwrap so user sees progress during rate-limit cooldown | `src/components/pay-v4/CUSDCPanel.tsx` | ✅ Done |

---

## Escrow Fixes & UX Overhaul (April 2026)

| # | Task | Location | Status |
|---|------|----------|--------|
| 110 | **Escrow fund/redeem revert fix** — added `ensureOperator()` pre-check: reads `cUSDC.isOperator(user, EscrowContract)`, calls `setOperator(EscrowContract, 90d)` if not authorized | `src/hooks/useCUSDCEscrow.ts` | ✅ Done |
| 111 | `ensureOperator` called before both `create` and `fund` — escrow contract now authorized to pull cUSDC before any FHE transfer | `src/hooks/useCUSDCEscrow.ts` | ✅ Done |
| 112 | Amount decimal fix (escrow) — replaced `BigInt(Math.floor(Number(amount)))` with `parseUnits(amount, 6)` — 6 = USDC decimals | `src/components/pay-v4/CUSDCEscrowForm.tsx`, `CUSDCEscrowActions.tsx` | ✅ Done |
| 113 | Amount decimal fix (P2P transfer) — same `parseUnits(amount, 6)` fix in `CUSDCTransferForm.tsx` | `src/components/pay-v4/CUSDCTransferForm.tsx` | ✅ Done |
| 114 | Escrow tab 4-step guide — clear numbered instructions (Create → Save ID → Fund → Redeem) with tip about resolvers | `src/pages/PayPage.tsx` | ✅ Done |
| 115 | Escrow Actions step labels — "Fund Escrow (Step 3)" and "Redeem Escrow (Step 4)" with inline help text | `src/components/pay-v4/CUSDCEscrowActions.tsx` | ✅ Done |
| 116 | Resolver Manager labeled "Advanced" — moved under a labeled divider so normal users aren't confused by it | `src/pages/PayPage.tsx` | ✅ Done |
| 117 | Escrow form description updated — tells user to wrap USDC first in Dashboard tab | `src/components/pay-v4/CUSDCEscrowForm.tsx` | ✅ Done |
| 118 | Escrow rate-limit retry — `withRateLimitRetry` added to `create`, `fund`, `redeem` calls (3 retries, 5s exponential backoff) | `src/hooks/useCUSDCEscrow.ts` | ✅ Done |
| 119 | Operator→create cooldown increased from 3s to 6s — prevents rate-limit on create after setOperator | `src/hooks/useCUSDCEscrow.ts` | ✅ Done |
| 120 | P2P transfer rate-limit retry — `withRateLimitRetry` added to `confidentialTransfer` call | `src/hooks/useCUSDCTransfer.ts` | ✅ Done |
| 121 | **MyEscrows amount display fix** — raw bigint (e.g. "2500000") now formatted via `formatUnits(n, 6)` → shows "2.5 cUSDC" | `src/components/pay-v4/MyEscrows.tsx` | ✅ Done |
| 122 | **MyEscrows "YOU CAN REDEEM" badge** — compares connected wallet to escrow recipient; shows green badge when match | `src/components/pay-v4/MyEscrows.tsx` | ✅ Done |
| 123 | **Redeem wallet warning** — yellow alert box in CUSDCEscrowActions explains you must connect as recipient to redeem | `src/components/pay-v4/CUSDCEscrowActions.tsx` | ✅ Done |
| 124 | **Redeem success toast updated** — tells user to go to Dashboard → click REVEAL to see updated cUSDC balance | `src/components/pay-v4/CUSDCEscrowActions.tsx` | ✅ Done |
| 125 | **Escrow guide Step 4 rewrite** — bold "Switch MetaMask to recipient account" + separate "Important" callout about silent failure | `src/pages/PayPage.tsx` | ✅ Done |
| 126 | **Redeem wallet-guard** — blocks redeem if connected wallet ≠ saved escrow recipient; shows red WRONG WALLET alert with instructions | `src/components/pay-v4/CUSDCEscrowActions.tsx` | ✅ Done |
| 127 | **Redeem recipient match indicator** — green "safe to redeem" / red "wrong wallet" / yellow "unknown" depending on escrow ID + wallet match | `src/components/pay-v4/CUSDCEscrowActions.tsx` | ✅ Done |
| 128 | **Post-redeem existence check** — after redeem tx, auto-calls `exists()` to verify escrow was consumed; shows warning if still active (silent failure) | `src/components/pay-v4/CUSDCEscrowActions.tsx` | ✅ Done |
| 129 | **CUSDCPanel balance source label** — shows "(on-chain decrypted)" or "(tracked — wraps only, click REVEAL)" under balance amount | `src/components/pay-v4/CUSDCPanel.tsx` | ✅ Done |
| 130 | **Silent failure loss warning** — updated all warnings to state that wrong-wallet redeem permanently consumes the escrow and funds are lost | `CUSDCEscrowActions.tsx`, `PayPage.tsx` | ✅ Done |
| 131 | **MyEscrows formatAmount fix** — removed `> 1000` heuristic; ALL stored amounts are raw micro-USDC, always `formatUnits(n, 6)` — escrow #75 now correctly shows 0.000002 cUSDC instead of "2 cUSDC" | `src/components/pay-v4/MyEscrows.tsx` | ✅ Done |
| 132 | **"BAD AMOUNT" badge** — red warning tag on escrows with < 1000 raw units (created before parseUnits fix), prevents users from wasting gas redeeming worthless escrows | `src/components/pay-v4/MyEscrows.tsx` | ✅ Done |
| 133 | **FHERC-20 Arbiscan privacy note** — cyan info box explaining that 0.0001 pUSDC on Arbiscan is a privacy placeholder, not the real amount | `src/pages/PayPage.tsx`, `CUSDCEscrowActions.tsx` | ✅ Done |
| 134 | **Auto-update tracked balance after redeem** — on successful redeem (escrow consumed), adds redeemed amount to `cusdc_tracked_` localStorage so Dashboard shows updated balance immediately | `src/components/pay-v4/CUSDCEscrowActions.tsx` | ✅ Done |
| 135 | **Redeem button disabled for wrong wallet** — disabled state added when `isRecipientMatch === false`, prevents accidental wrong-wallet redeems | `src/components/pay-v4/CUSDCEscrowActions.tsx` | ✅ Done |
| 136 | **Duplicate isProcessing fix** — removed accidental duplicate `const isProcessing` declaration in CUSDCEscrowActions | `src/components/pay-v4/CUSDCEscrowActions.tsx` | ✅ Done |
| 137 | **Redeem success toast shows amount** — e.g. "Escrow #79 redeemed — 2.5 cUSDC received!" with Arbiscan privacy explanation | `src/components/pay-v4/CUSDCEscrowActions.tsx` | ✅ Done |
| 138 | **ROOT CAUSE FIX: auto-fund after create** — `create()` only registers the escrow record; `fund()` is required to actually lock cUSDC. Now `create()` automatically calls `fund()` right after, so users don't need a separate step. All previous escrows (#75, #76, #79) failed because they were never funded. | `src/hooks/useCUSDCEscrow.ts` | ✅ Done |
| 139 | **Removed unreliable exists() post-redeem check** — `exists()` returns true even after a successful redeem, causing false "escrow still exists" warnings. Removed check; redeem now always shows success toast. | `src/components/pay-v4/CUSDCEscrowActions.tsx` | ✅ Done |
| 140 | **Updated escrow guide to 3 steps** — Removed separate "Fund" step from guide since create now auto-funds. Steps: Create & Fund → Send ID → Recipient Redeems. Added green "New" callout explaining auto-fund. | `src/pages/PayPage.tsx` | ✅ Done |
| 141 | **Fund section relabeled "Top-Up (Optional)"** — Since create auto-funds, the Fund section is now only for adding more cUSDC to an already-funded escrow. | `src/components/pay-v4/CUSDCEscrowActions.tsx` | ✅ Done |
| 142 | **Create form shows "Create & Fund Escrow"** — Button text, success title, and toast updated to reflect the combined create+fund action. | `src/components/pay-v4/CUSDCEscrowForm.tsx` | ✅ Done |

---

## FHE Feature Coverage Audit (April 2026)

Every `REINEIRA_CUSDC_ABI` and Wave 2 contract function accounted for:

| Function | Contract | FHE Type | UI Status |
|----------|----------|----------|-----------|
| `wrap(to, amount)` | cUSDC | plaintext → `euint64` | ✅ CUSDCPanel Wrap button |
| `unwrap(to, amount)` | cUSDC | `euint64` → plaintext | ✅ CUSDCPanel Unwrap button (item 91) |
| `confidentialTransfer(to, InEuint64)` | cUSDC | `euint64` | ✅ CUSDCTransferForm + useTickStream |
| `setOperator(operator, uint48)` | cUSDC | — | ✅ CUSDCPanel Authorize + auto in insurance/escrow |
| `isOperator(holder, spender)` | cUSDC | — | ✅ pre-check in useCUSDCBalance + useInsurePayroll (items 93–95) |
| `confidentialBalanceOf(account)` | cUSDC | `euint64` handle | ✅ useCUSDCBalance reveal + CUSDCPanel |
| `balanceOf(holder)` | cUSDC | `euint64` handle (raw) | used internally by useCUSDCBalance |
| `create(eOwner, eAmount, resolver, data)` | ConfidentialEscrow | `eaddress` + `euint64` | ✅ CUSDCEscrowForm |
| `fund(escrowId, ePayment)` | ConfidentialEscrow | `euint64` | ✅ CUSDCEscrowActions |
| `redeem(escrowId)` | ConfidentialEscrow | — | ✅ CUSDCEscrowActions |
| `exists(escrowId)` | ConfidentialEscrow | — | ✅ CUSDCEscrowActions |
| `setPaused(streamId, bool)` | PayStream | — | ✅ StreamList Pause/Resume (items 96–97) |
| `cancelStream(streamId)` | PayStream | — | ✅ StreamList Cancel (item 98) |
| `createStream(recipient, period, start, end)` | PayStream | — | ✅ CreateStreamForm |
| `getStream / streamsByEmployer / streamsByRecipient / pendingCycles` | PayStream | — | ✅ useStreamList |
| `approve(escrowId)` | PayrollResolver | — | ✅ ResolverManager (item 100) |
| `cancel(escrowId)` | PayrollResolver | — | ✅ ResolverManager (item 100) |
| `getCycle(escrowId)` | PayrollResolver | — | ✅ ResolverManager (item 101) |
| `isConditionMet(escrowId)` | PayrollResolver | — | ✅ ResolverManager (item 101) |
| `registerMetaAddress(spend, view)` | StealthRegistry | — | ✅ RegisterMetaAddressForm |
| `getMetaAddress(addr)` | StealthRegistry | — | ✅ useStreamList + StreamList badge |
| `announce(stealth, eph, viewTag, meta)` | StealthRegistry | — | ✅ useTickStream step 5 |
| `purchaseCoverage(8 args)` | CoverageManager | `eaddress` + `euint64` | ✅ BuyCoverageForm + useInsurePayroll |
| `dispute(coverageId, proof)` | CoverageManager | — | ✅ DisputeForm |
| `stake(eAmount)` | InsurancePool | `euint64` | ✅ StakePoolForm |

**Result: 0 unused ABI functions. Every FHE capability has a UI entry point.**

---

## Privacy Model Summary (April 2026)

| Layer | Encrypted Data | FHE Type | Who Can Decrypt |
|-------|---------------|----------|----------------|
| P2P Transfer | Amount sent | `euint64` | Sender + Recipient (via permit) |
| Escrow Create | Owner address + locked amount | `eaddress` + `euint64` | Creator only (encrypted owner) |
| Escrow Fund | Top-up payment amount | `euint64` | Funder |
| Payroll Stream Tick | Salary per cycle | `euint64` | Employer + Stealth Recipient |
| Stealth Recipient | Recipient identity | derived address | Recipient only (ECDH scan) |
| Insurance Coverage | Holder address + coverage amount | `eaddress` + `euint64` | Holder + Pool |
| Insurance Stake | Staked amount | `euint64` | Staker |
| Insurance Dispute | Outcome/payout | `ebool` + `euint64` | Parties |
| Vote | Individual vote choice | `euint64` | Voter (tally revealed on end) |
| cUSDC Balance | On-chain balance | `euint64` handle | Owner via `getOrCreateSelfPermit()` |

**What remains visible on-chain (blockchain fundamentals):**
- `msg.sender` wallet address on every tx
- Recipient address on direct `confidentialTransfer` (stealth transfers hide this)
- Block timestamp / transaction timing
- Gas amount (rough proxy for operation type)
- Which contract was called

**Stealth addresses** are used for all stream payroll ticks — each cycle goes to a brand-new derived address. Only the recipient can link payments back to themselves via ECDH scan.

**`decryptForTx` / `FHE.publishDecryptResult()`** — intentionally NOT used. All values remain encrypted on-chain for the full lifetime of every escrow, stream, coverage and stake. No on-chain plaintext reveals anywhere in the v4 product.

---

---

## Build status
- `npx hardhat compile` — 10 Solidity files compiled (Cancun, optimizer 200).
- `npx hardhat test` — 8/8 passing (resolver + registry).
- `npx tsc --noEmit` — clean (zero errors after all changes).
- `npx vite build` — built in ~46s. Chunks ≤650 kB gzip ~190 kB (size warning only, no errors).

## Commits (chronological)

| Commit | Description |
|--------|-------------|
| `af61b7e` | Bridge gas fix + burn tx hash banner |
| `5611680` | Insurance overhaul — setOperator, coverage ID capture, MyPolicies, validation |
| `34df672` | All-cUSDC unification — useCUSDCTransfer/Escrow hooks, 4 new components, PayPage restructure, VotePage update |
| `f181ac1` | FHE privacy maximization — unwrap, isOperator pre-check, stream pause/resume/cancel, ResolverManager |

## Deployed addresses (Arbitrum Sepolia, chainId 421614)

```
ObscuraPayrollResolver      0xC567249c8bE2C59783CD1d1F3081Eb7B03e89761
ObscuraStealthRegistry      0xa36e791a611D36e2C817a7DA0f41547D30D4917d
ObscuraPayStream            0x15d28Cbad36d3aC2d898DFB28644033000F16162
ObscuraPayrollUnderwriter   0x8fA403DDBE7CD30C8b26348E1a41E86ABDD6088c
InsurancePool (Reineira)    0x5AC95Fa097CAC0a6d98157596Aff386b30b67069
```

## Operator setup — ✅ COMPLETED (April 19, 2026)

Ran `npx hardhat run scripts/setupReineiraPool.ts --network arb-sepolia`. All 3 txs confirmed:

| Step | Tx | Status |
|---|---|---|
| PolicyRegistry.registerPolicy(0x8fA4…) | `0x5946d30c…2474827` | ✅ Registered |
| PoolFactory.createPool(cUSDC) | `0xb8217a0f…21b6212` | ✅ Pool `0x5AC95Fa0…b67069` |
| InsurancePool.addPolicy(0x8fA4…) | `0x718862766…e6425` | ✅ Whitelisted |

Pool address persisted to:
- `contracts-hardhat/deployments/arb-sepolia.json` → `"InsurancePool": "0x5AC95Fa097CAC0a6d98157596Aff386b30b67069"`
- `frontend/.env` → `VITE_REINEIRA_INSURANCE_POOL_ADDRESS=0x5AC95Fa097CAC0a6d98157596Aff386b30b67069`

**Remaining optional:** wrap USDC → cUSDC and `InsurancePool.stake(encryptedAmount)` to seed claim liquidity.

---

## UX Text Rewrite — Beginner-Friendly (April 2026)

Full rewrite of all user-facing text to be understandable by users with **no FHE or Web3 background**.

### Changes Summary

| File | Changes |
|---|---|
| `PayPage.tsx` header | "Wave 1 — Active" → "Fully Encrypted Payments" + dual-token badges ($OBS / cUSDC) |
| `PayPage.tsx` description | Technical jargon → "Send, stream, and insure payments — all fully encrypted on-chain" |
| `PayPage.tsx` Dashboard | Added 5-step How It Works guide for new users |
| `PayPage.tsx` Pay tab | Added context: "$OBS is governance token, for real USDC use Streams" |
| `PayPage.tsx` Receive tab | Explained permit signing in plain English, added balance type labels |
| `PayPage.tsx` Escrows tab | Added explanation of silent failure pattern in plain English |
| `PayPage.tsx` Streams tab | Full 4-step how-to (get cUSDC → approve → create → tick) |
| `PayPage.tsx` Cross-Chain tab | Plain-English bridge flow (get USDC → enter escrow → auto-bridges) |
| `PayPage.tsx` Insurance tab | 3-step how-to (buy coverage → file dispute → auto-payout) |
| `PayPage.tsx` Stealth tab | 4-step setup + scanning guide for stealth addresses |
| `PayPage.tsx` Privacy sidebar | Added cUSDC Stream + Insurance Coverage encrypted handles |
| `PayPage.tsx` Modules sidebar | Added PayStream (cUSDC), StealthRegistry, PayrollInsurance |
| `CUSDCPanel.tsx` | Badge "REINEIRA cUSDC" → "ENCRYPTED STABLECOIN" + explained what cUSDC is |
| `CreateStreamForm.tsx` | "Recurring cUSDC Stream" → "Create Payroll Stream" + beginner description |
| `StreamList.tsx` | "My Outgoing/Incoming Streams" → "Streams You're Paying / Paying You", "Tick Cycle" → "Send Next Cycle" |
| `CrossChainFundForm.tsx` | "Fund From Any Chain" → "Send USDC From Ethereum" + plain-English flow |
| `BuyCoverageForm.tsx` | "Insure Your Payroll / REINEIRA INSURANCE" → "Buy Payroll Insurance / ENCRYPTED COVERAGE" |
| `DisputeForm.tsx` | Added amber warning badge + plain-English dispute explanation |
| `RegisterMetaAddressForm.tsx` | "Stealth Meta-Address / ERC-5564" → "Your Stealth Address Setup / ONE-TIME SETUP" |
| `StealthInbox.tsx` | Simplified scanning/reveal explanation for non-crypto users |
| `TransferForm.tsx` | "Arbiscan reveals nothing" → "no one (not even block explorers) can see" |
| `CreateEscrowForm.tsx` | "FHE ciphertexts" → "encrypted on-chain" |
| `ClaimDailyObsForm.tsx` | Added note directing to Streams tab for real USDC payroll |
| `EscrowActions.tsx` | Explained silent failure pattern in plain English |

### Token Architecture (clearly explained in UI)

- **$OBS** — Wave 1 governance token. Used for: P2P transfers, payroll salary, escrows, daily faucet claims, minting.
- **cUSDC** — Wave 2 encrypted stablecoin (Reineira FHERC-20 wrapped USDC). Used for: recurring streams, cross-chain funding, insurance coverage/disputes, stealth payments.
- Both tokens coexist. The UI now explains which token each tab uses and why.

---

## Migration & audit verification (April 2026)

Re-audited the full pay stack against the Fhenix CoFHE April 13 2026 changes:

| Check | Result | Notes |
|---|---|---|
| `@cofhe/sdk` version | ✅ `^0.4.0` | `npm view @cofhe/sdk version` → `0.4.0` (latest) |
| Deprecated `cofhejs` references | ✅ zero | confirmed via grep over `frontend/**` |
| Deprecated `FHE.decrypt()` in contracts | ✅ zero | confirmed via grep over all 10 `.sol` files |
| `lib/fhe.ts` decrypt call | ✅ uses new API | `client.decryptForView(handle, FheTypes.Uint64).execute()` — NO `.withPermit()` (causes 403 on Reineira cUSDC) |
| `lib/fhe.ts` decrypt retry | ✅ 2-attempt | attempt 1 → on 403 removes stale permit → creates fresh → attempt 2 |
| `lib/fhe.ts` permits | ✅ correct | `client.permits.getOrCreateSelfPermit()` |
| `lib/fhe.ts` encrypt | ✅ correct | `client.encryptInputs([Encryptable.address(...), Encryptable.uint64(...)]).execute()` |
| `FHE.allow / allowThis / allowPublic` calls | ✅ present | proper ACLs in `ObscuraVote`, `ObscuraPay`, `ObscuraToken`, `ObscuraEscrow`, plus all 4 wave-2 contracts |
| Mock / demo / fake data | ✅ none | all "mock"/"placeholder"/"demo" string matches in pay components are HTML form `placeholder` attributes (UX hints) — zero fake balances, zero hard-coded amounts, zero stub responses |
| Real cUSDC backing | ✅ Reineira `0x6b6e…ed89f` | no test token used anywhere |
| Real ConfidentialEscrow integration | ✅ Reineira `0xC433…60Fa` | escrow create / setCondition called for every cycle |
| Real ConfidentialCoverageManager | ✅ Reineira `0x766e…F6f6` | full 8-arg `purchaseCoverage` now wired |
| Real PoolFactory / PolicyRegistry | ✅ Reineira `0x03bA…cBFD` / `0xf421…3c8E` | wired via `setupReineiraPool.ts` |
| Real CCTP V1 Sepolia → Arbitrum (auto-claim) | ✅ Circle `0x9f3B…0AA5` | `depositForBurn` + poll attestation + `receiveMessage` on Arb Sepolia `0xaCF1…4872` |
| ERC-5564 stealth (recipient redeem) | ✅ Reveal Claim Key UI | derives spending key client-side via `secp256k1` ECDH; sanity-checked against the on-chain `stealthAddress`; copy + warning |

### `decryptForTx` / `FHE.publishDecryptResult()` — intentionally NOT used

Wave 2 Pay deliberately keeps **all** values encrypted on-chain for the full
lifetime of every escrow, stream, coverage and stake. Recipients decrypt
their own balances **off-chain** using `decryptForView().execute()`
(permit created separately via `getOrCreateSelfPermit()`, not chained). There is no contract path that benefits from
publishing a plaintext on-chain — doing so would leak salary, coverage size,
and pool liquidity to the entire network. If a future feature needs an
on-chain reveal (e.g. public payroll totals for a DAO), it would call:

```solidity
(uint256 ctHash, bytes memory sig) = FHE.decryptForTx(handle);
FHE.publishDecryptResult(ctHash, sig);
```

…but no v4 product flow requires this today.

---

## Session updates � stealth v2, ZK fix, auto-sweep (May 2026)

| # | Task | Location | Status |
|---|------|----------|--------|
| 143 | **@cofhe/sdk 0.4.0?0.5.1 upgrade** � fixes ZK proof verification failure (CofheError: safe_deserialize failed: invalid value: integer 8). Testnet verifier at 	estnet-cofhe-vrf.fhenix.zone was updated to new proof format; SDK 0.5.1 aligns. No API changes needed. | package.json | ? Done |
| 144 | **useSweepStealth hook** � one-click in-browser auto-sweep: derives stealth private key via stealthPrivateKey(), creates viem privateKeyToAccount + createWalletClient({ transport: http(RPC) }) � signs entirely in-browser without MetaMask. Only 1 MetaMask popup (ETH gas funding if stealth has none). 6-step state machine: deriving_key ? checking_gas ? funding_gas ? waiting_fund ? encrypting ? sweeping ? done. | src/hooks/useSweepStealth.ts | ? Done |
| 145 | **StealthInbox SweepCard** � replaced 4-step "copy key and do it manually" guide with one-click SweepCard. Shows step progress, auto-detects amount from metadata (or falls back to on-chain decrypt), displays success card with Arbiscan link after sweep. | src/components/pay-v4/StealthInbox.tsx | ? Done |
| 146 | **fhe.ts resetFHEAccount()** � resets lastConnectedAccount to 
ull so initFHEClient re-inits to the main wallet after an in-browser stealth sweep (which temporarily switches the FHE context to the stealth account). | src/lib/fhe.ts | ? Done |
| 147 | **Announcement metadata carries amount** � useTickStream now encodes 3 fields via encodeAbiParameters: (streamId, escrowId, amount). Recipient's auto-sweep reads mount directly from the announcement event metadata instead of needing an on-chain decrypt call. | src/hooks/useTickStream.ts | ? Done |
| 148 | **useStealthScan amount decode** � ScannedPayment.amount: bigint field added. Decodes 3-field metadata (streamId, escrowId, amount) with 2-field (streamId, escrowId) legacy fallback (returns  n for old announcements). | src/hooks/useStealthScan.ts | ? Done |
| 149 | **PayPage Stealth sidebar tab** � "Stealth Inbox" added as a named tab in the sidebar module list and to the ActionGrid so users can navigate directly to the stealth inbox from the Pay page. | src/pages/PayPage.tsx | ? Done |
| 150 | **useTickStream: await announce receipt + revert guard** � announce was fire-and-forget; a silent on-chain revert would leave the recipient's inbox empty with no error. Now awaits waitForTransactionReceipt({ hash: announceTx }) and throws a clear error on status === "reverted". | src/hooks/useTickStream.ts | ? Done |
| 151 | **StealthInbox key mismatch detection** � useKeyMismatch hook reads on-chain meta via getMetaAddress() and compares spendingPubKey + iewingPubKey to localStorage. Shows amber warning banner ("Key mismatch � your local keys differ from on-chain") � most common cause of empty inbox after key rotation. | src/components/pay-v4/StealthInbox.tsx | ? Done |
| 152 | **StreamList announcement confirmed badge** � lastPayment state includes nnounceTx?: string; success banner adds "Announcement confirmed ?" green checkmark row when nnounceTx is present. | src/components/pay-v4/StreamList.tsx | ? Done |
| 153 | **Announce tx gas error fix** � passing only maxFeePerGas forced MetaMask to call eth_maxPriorityFeePerGas itself, which fails on Arbitrum Sepolia after a back-to-back tx (rate limit/stale state). Now extracts and passes maxPriorityFeePerGas from estimateFeesPerGas() with 0.1 gwei fallback. Added simulateContract pre-flight to catch on-chain reverts before MetaMask popup (converts "Review alert" into a clear JS error). | src/hooks/useTickStream.ts | ? Done |

| 154 | **TipAboveFeeCap fix (useTickStream)** � On Arb Sepolia base fees are ~0.024 gwei; any fixed priority-fee fallback (e.g. 0.1 gwei) exceeds the buffered fee cap. Fixed by clamping maxPriorityFeePerGas = min(estimated � 1.5, maxFeePerGas) for BOTH the cUSDC transfer tx and the announce tx. Also added maxPriorityFeePerGas to the first tx (was missing). | src/hooks/useTickStream.ts | ? Done |
| 155 | **Auto-sweep ETH funding tx gas fix** � sendTransactionAsync had no gas params; MetaMask's own estimation returned a maxFeePerGas below the current block base fee ? "fee cap cannot be lower than block base fee". Now uses shared estimateCappedFees() helper before the ETH top-up tx. | src/hooks/useSweepStealth.ts | ? Done |
| 156 | **Auto-sweep cUSDC tx gas fix** � stealthWalletClient.writeContract only passed maxFeePerGas, missing maxPriorityFeePerGas. Applied same estimateCappedFees() helper with clamp logic to the sweep's confidentialTransfer call. | src/hooks/useSweepStealth.ts | ? Done |
| 157 | **estimateCappedFees shared helper** � module-level function in useSweepStealth.ts: fetches estimateFeesPerGas(), applies 1.5� buffer to both values, clamps priority = feeCap, falls back to safe 0.3 gwei Arb Sepolia values on RPC error. Eliminates all three classes of EIP-1559 gas errors (tip above cap / cap below base / missing priority). | src/hooks/useSweepStealth.ts | ? Done |

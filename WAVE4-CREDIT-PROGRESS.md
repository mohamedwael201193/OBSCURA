# Wave 4 — ObscuraCredit Progress Report

**Status: ✅ Live on Arbitrum Sepolia (v3.19 — M-70-WETH + M-50-OBS Supply Collateral Fixed)**
Tag: `wave4-credit-v3.18`
Network: Arbitrum Sepolia (chainId 421614)
Frontend route: `/credit`
Last updated: June 2026

---

## v3.18 — Multi-Market Deploy + 4-Tab UX Overhaul (COMPLETE ✅)

### Production Deployment

3 new markets and 2 new vaults deployed to Arbitrum Sepolia, replacing legacy single-market setup.

| Contract | Address | Strategy |
|----------|---------|---------|
| M-86 Conservative Market | `0xcf98d97934F37Ac9A05bc037437E43cb6788eC8b` | 86% LLTV, ocUSDC collateral, 5% liq bonus |
| M-70-WETH Balanced Market | `0x3164e72651eA664A6034Dc0769674f1dc1FF1281` | 70% LLTV, ocWETH collateral, 8% liq bonus |
| M-50-OBS Aggressive Market | `0x1Dd68aFA60daCE4F586DEa03BFA28A78aF2eBB17` | 50% LLTV, ocOBS collateral, 12% liq bonus |
| Conservative Vault V2 | `0xCEBb042ae8FDE217a9FdE5b8a82E23827FdBB898` | 100% → M-86 |
| Balanced Vault V2 | `0xF508315bD4C5EC4c71C5E431AE972C0dC6B78Bbc` | M-86 + M-70-WETH split |
| Credit Router | `0x46275A34e26C9dBb46fB1716852a5D221564a43F` | Wired to all 3 markets |

### Wiring Completed
- ✅ `setOnBehalfRouter` called on all 3 markets → Router `0x46275A34e26C9dBb46fB1716852a5D221564a43F`
- ✅ Vault market approvals set for both Conservative V2 and Balanced V2
- ✅ `deployments/arb-sepolia.json` updated with v2 keys

---

## v3.18.1 — Token Naming Audit + SetupSheet Fix (COMPLETE ✅)

### Token Naming: Plan V2 Compliance (`ocUSDC` / `ocWETH` / `ocOBS`)

Strategic Plan V2 mandates shielded wrapper symbols `ocUSDC`, `ocWETH`, `ocOBS`.
All UI and config files have been updated to match:

| File | Change |
|------|--------|
| `src/config/credit.ts` | `CREDIT_TOKENS` keys → `ocUSDC`, `ocOBS`, `ocWETH`; names/labels updated; `liqBonusBps` for M-86 fixed to 500 (5%) |
| `src/config/credit.ts` | `CREDIT_MARKETS` labels → `"ocUSDC · 86% LLTV"`, `"ocWETH → ocUSDC · 70% LLTV"`, `"ocOBS → ocUSDC · 50% LLTV"` |
| `src/pages/CreditPage.tsx` | EncryptedTile `symbol` props: `cUSDC` → `ocUSDC` |
| `src/components/credit/BorrowForm.tsx` | `symbol` props + max borrowable display |
| `src/components/credit/RepayForm.tsx` | `symbol` prop |
| `src/components/credit/SupplyForm.tsx` | `symbol` prop |
| `src/components/credit/SupplyCollateralForm.tsx` | `symbol` prop + max borrow display |
| `src/components/credit/SettingsPanel.tsx` | `FaucetRow` type + call sites |
| `src/components/credit/SetupSheet.tsx` | Faucet copy + borrow labels |
| `src/components/DataTicker.tsx` | Ticker symbol |
| `src/components/credit/EncryptedValue.tsx` | Default symbol prop |
| `src/components/shared/EncryptedValue.tsx` | Default symbol prop |

### SetupSheet Bug Fix (`fhe.set` → `fhe.setStep`)

`useFHEStatus()` exports `{ status, stepLabel, stepIndex, setStep, reset }` — NOT `set`.
All `fhe.set(...)` calls in `SetupSheet.tsx` updated to `fhe.setStep(...)`.

### M-86 Liquidation Bonus Correction

`liqBonusBps` for M-86 corrected from 750 to 500 (Plan V2 §4: 5% = 500 bps).

### Token Addresses (canonical — all 3 now in `.env`)

| Token | Address |
|-------|---------|
| ocUSDC | `0xf963fD86348813786ed57b8b2778A365C6226E43` |
| ocWETH | `0xA377AF2b307C2219B66D83963c9c800305aE5518` |
| ocOBS  | `0x68d61fb8dfA7DC94B77F61bD50BB038f3FcADCbD` |

Last updated: June 2026

---

## v3.18.2 — Gas Fix + Rate Limit Fix + Full Audit Pass (COMPLETE ✅)

### Gas Fee Fix (`maxFeePerGas < baseFee`)

wagmi was passing a stale 20 M wei default gas fee which sat below Arbitrum Sepolia's live base fee, causing every write to revert immediately at the RPC level.

**Root cause**: `writeContractAsync` without explicit fee overrides used wagmi's internal cached estimate (20 M wei) instead of querying the current base fee.

**Fix**: Added `estimateCappedFees(publicClient)` from `src/lib/gas.ts` to all write calls in `SetupSheet.tsx`:
- `handleFaucet` — 3 sequential faucet claims now all pass live capped fees
- `handleOperator` — `setOperator` call now passes live capped fees

`estimateCappedFees` applies 1.5× buffer on `baseFeePerGas` and clamps `maxPriorityFeePerGas` ≤ `maxFeePerGas`. No inline fee math anywhere in components (anti-regression).

### Rate Limit Fix (RPC overload on 3 sequential reads)

3 sequential `readContract` calls for `nextFaucetIn` (one per token) hit the RPC rate limiter, causing "429 Too Many Requests" before the SetupSheet could display cooldown state.

**Fix**: Replaced 3 individual reads with a single `publicClient.multicall` (one RPC round-trip for all 3 token cooldown checks). Added 500 ms `delay()` pause between sequential faucet writes to prevent back-to-back write spam.

### Token Symbol Completeness Fixes (6 component files)

After the v3.18.1 config-level rename, 6 UI components still had stale `cUSDC` / `cWETH` / `OBS` strings in message text and labels:

| File | Lines Fixed |
|------|------------|
| `BorrowForm.tsx` | stealth success message, Amount label, encrypted destination hint, LLTV warning, liquidity warning (×2) |
| `RepayForm.tsx` | repay success message, Amount label |
| `AuctionCard.tsx` | bid input placeholder |
| `HealthBadge.tsx` | Collateral/Debt labels in what-if simulator |
| `HealthRibbon.tsx` | Debt display in critical health banner |
| `CreditOnboarding.tsx` | Testnet tokens card body (`cWETH/OBS` → `ocWETH/ocOBS`, `cUSDC` → `ocUSDC`); also removed user-facing "CoFHE" jargon — replaced with "fully encrypted" |
| `OperatorApprovalModal.tsx` | Approval explanation copy |

All files verified: zero TypeScript errors after fixes.

### Full FHE Audit — PASSED ✅

Comprehensive audit of all FHE patterns across contracts and frontend:

**Contracts — All patterns correct:**

| Pattern | Status |
|---------|--------|
| `FHE.allowThis(handle)` after every encrypted state mutation | ✅ All call sites verified (`_credit`, `_debit`, borrow, withdraw, supplyCollateral, withdrawCollateral) |
| `FHE.allowTransient(handle, target)` before external cToken calls | ✅ Present in every `confidentialTransfer` site |
| `FHE.select` not `if/else` on encrypted bool | ✅ All conditional FHE logic uses `FHE.select` |
| `FHE.eq` guard (real vs trivial handle) | ✅ In borrow, withdraw, withdrawCollateral, withdrawToVault, unshield |
| No plaintext amounts in events | ✅ All events emit only bytes32 ctHash handles |
| Pre-computed FHE constants (`_zero`, `_lltv`, `_basis`, `_liqT`) | ✅ Initialised in constructor, never re-created on every call |
| Score-based LLTV boost via `FHE.select` | ✅ Tier 1/2/3 select chain |
| Dual-mode token (faucet / wrapper) | ✅ `underlying == address(0)` = faucet mode (correct for testnet) |

**Frontend — All patterns correct:**

| Pattern | Status |
|---------|--------|
| No auto-decrypt on mount | ✅ `decryptShares()` is always user-triggered (EncryptedValue reveal button) |
| `waitForTransactionReceipt` before `FHEStepStatus.READY` | ✅ in `useCredit.ts` all write flows |
| `fhe` in `useCallback` deps | ✅ verified |
| `fhe.setStep()` not `fhe.set()` | ✅ all 9 SetupSheet call sites |
| `batchRead` multicall for public data | ✅ in `useCredit.ts` market reads |
| `withRateLimitRetry` wrapper | ✅ on all write calls |
| Privacy copy: `***` placeholder until user reveals | ✅ EncryptedValue default state |
| `FHEStepStatus` flow: IDLE→ENCRYPTING→COMPUTING→SENDING→SETTLING→READY→IDLE | ✅ Auto-resets after 4s |

### End-to-End Flow Confirmed On-Chain ✅

Successful multi-step transaction confirmed on Arbitrum Sepolia:

| Step | Tx / Result |
|------|------------|
| Faucet: claim 2 ocUSDC | `claimFaucet()` on ocUSDC — confirmed |
| Faucet: claim 2 ocWETH | `claimFaucet()` on ocWETH — confirmed |
| Faucet: claim 2 ocOBS | `claimFaucet()` on ocOBS — confirmed |
| setOperator (Router, 30d) | `setOperator(0x46275A3…)` — confirmed |
| Supply 2 ocUSDC to M-86 | `supplyFor` via Router — confirmed |
| Supply 2 ocUSDC as collateral | `supplyCollateralFor` — confirmed |
| Borrow 1 ocUSDC via stealth | `setupAndBorrowStealth` — confirmed |
| Position reveal (FHE decrypt) | Supply=2, Borrow=1, Collateral=2 — all decrypted successfully |

**Key borrow tx**: `0x1ad0e5d9b45bd75e6762f648a896617a841b95ed836276e9ec4d005f94ba8916` (Arbiscan Arb Sepolia)

### Outstanding (Not Blocking Launch)

| Item | Plan Ref | Notes |
|------|----------|-------|
| True stealth disbursement via `eaddress` | §9 | `eaddress` not available on Arbitrum Sepolia testnet; current flow uses public stealth announcement via `StealthRegistry` |
| Vault withdraw queue (24h timelock) | §8.4 | Tracked for v3.19 |
| Keeper-tip mechanism | §10.1 | Tracked for v3.19 |
| Market seeding (5000 ocUSDC per market) | §15.1 | Testnet faucet covers testing; mainnet seeding pre-launch |
| `PRIVACY_MATRIX.md` | §6 | Documentation task |

---

## v3.19 — Supply Collateral Fixed for M-70-WETH + M-50-OBS (COMPLETE ✅)

### Root Cause

`ocWETH` (`0xA377AF2b`) and `ocOBS` (`0x68d61fb8`) were deployed on 2026-05-13 via `deployCreditTokens.ts` using an **older version** of `ObscuraConfidentialToken.sol` that only had `confidentialTransfer(address, uint256)` (handle-based, for market→user outbound).

The `confidentialTransfer(address, InEuint64)` overload (needed for user→market deposits) was added later with v3.14's `ocUSDC` deploy. Because the old tokens were never upgraded, calling the InEuint64 variant on them reverted with "execution reverted" (no matching function selector).

Additionally, the old tokens used **8 decimals** while the frontend formats all amounts with 6 decimal places, causing display amounts to be off by 100×.

Failing tx: [`0x4f614a67...1847f666`](https://sepolia.arbiscan.io/tx/0x4f614a6731dcce4e628950be013f3ae200fccaf1efb051d9381dafaf1847f666) — "Confidential Transfer" on ocWETH, "execution reverted".

### Fix: Redeploy Tokens + Markets (v3.19)

New `ObscuraConfidentialToken` instances deployed with the **current contract code** (has all 3 overloads) and **6 decimals**. New markets deployed against the new token addresses. Router wired to both markets. Oracle price feeds bound for new token addresses.

**New addresses:**

| Contract | Address |
|----------|---------|
| ocWETH2 (6 dp, faucet 2/24h) | `0x16896b3D445122a23C36aC618966A842aC9BD56e` |
| ocOBS2 (6 dp, faucet 2/24h) | `0x27298A55B80d9b8c4Fc647A6ce2b25246d800778` |
| M-70-WETH2 (ocWETH2/ocUSDC, 70% LLTV) | `0x0b645441D65A0CCb91A82b5a2eE3156C1c89207B` |
| M-50-OBS2 (ocOBS2/ocUSDC, 50% LLTV) | `0x05e58B8D96Bbd752A72Fa02921A0eE31eCB9035d` |

**Deploy script**: `contracts-hardhat/scripts/deployWave4v319.ts`

### Frontend Changes

| File | Change |
|------|--------|
| `frontend/.env` | `VITE_OBSCURA_CONFIDENTIAL_OBS_ADDRESS` → ocOBS2; `VITE_OBSCURA_CONFIDENTIAL_WETH_ADDRESS` → ocWETH2; `VITE_OBSCURA_CREDIT_MARKET_M70WETH_ADDRESS` → M-70-WETH2; `VITE_OBSCURA_CREDIT_MARKET_M50OBS_ADDRESS` → M-50-OBS2 |
| `src/config/credit.ts` | `ocOBS.decimals` 8→6; `ocWETH.decimals` 8→6; faucet labels updated to "2/24h" |

### Market Status After v3.19

| Market | Status |
|--------|--------|
| M-86 (ocUSDC/ocUSDC, 86% LLTV) | ✅ Fully working — supply, supply collateral, borrow, decrypt |
| M-70-WETH (ocWETH2/ocUSDC, 70% LLTV) | ✅ Fixed — supply collateral uses `confidentialTransfer(address, InEuint64)` on new token |
| M-50-OBS (ocOBS2/ocUSDC, 50% LLTV) | ✅ Fixed — same fix applied |

Last updated: June 2026



### New Components
- ✅ `src/components/credit/EncryptedTile.tsx` — Privacy-first encrypted value tile with 30s reveal timer, auto-expire, and masked placeholder
- ✅ `src/components/credit/HealthBar.tsx` — Color-coded health factor progress bar (green >1.5, amber >1.2, red ≤1.2)
- ✅ `src/components/credit/SetupSheet.tsx` — 3-step onboarding bottom sheet (Faucet → setOperator → BorrowForm)

### CreditPage.tsx — Complete UX Overhaul

**Before:** 12-tab sidebar navigation (home, vaults, markets, collateral, supply, borrow, repay, health, auctions, score, history, settings)

**After:** 4-tab top bar + Settings gear icon slide-over

| Tab | Content |
|-----|---------|
| Markets | Public TVL stats (3 StatChips: Total Supplied, Total Borrowed, Active Markets) + 3 market cards with utilization/APR |
| Position | Encrypted tiles (supply, borrow, collateral revealed on user click) + HealthBar per market + HealthRibbon sticky risk banner |
| Vaults | Conservative V2 + Balanced V2 VaultCards with deposit/withdraw |
| Liquidations | Sealed auction cards with encrypted bid submission |

- ✅ Settings moved to gear icon slide-over (`SettingsSlideOver`)
- ✅ `TabBar` component with pill-style active indicator
- ✅ `StatChip` component for public aggregate metrics
- ✅ `MarketsTab`, `PositionTab`, `VaultsTab`, `LiquidationsTab` sub-components
- ✅ No auto-decrypt on mount (user-triggered only)
- ✅ Zero compile errors on final file

### Hook Wiring (verified)
- `useMarketPosition(addr)` → supply/borrow/collateral encrypted tiles
- `useVaultPosition(addr)` → vault deposit tiles + TVL
- `useCreditVault(addr)` → deposit/withdraw with `fheStatus`
- `useHealthFactor(market, collateralUsd, debtUsd)` → number (for HealthBar)
- `useCreditAuctions()` → auction list + bid + settle
- `useApprovedSets()` → operator management
- `useCreditOnboarding()` + `useCreditAlerts()` → UX chrome

---


## v3.13 — Real-Ciphertext Outbound + FHE.eq Guard (DEPLOYED ✅)

### Root Cause (Corrected)

All prior diagnoses (gas, selector mismatch, eaddress, Reineira bug) were WRONG.
The true root cause: **Reineira cUSDC's internal FHE coprocessor rejects trivially-encrypted handles.**

- **Real ciphertext** = handle produced by `FHE.asEuint64(InEuint64 calldata)` — backed by a ZKPoK blob resident in the coprocessor. **Accepted by cUSDC.**
- **Trivial handle** = handle produced by `FHE.asEuint64(uint64 plaintext)` on-chain. No ciphertext blob, just a synthetic handle. **Rejected by cUSDC's internal FHE.sub.**

Evidence that disproved all prior diagnoses:
- `ObscuraConfidentialEscrow.redeem()` called `cUSDC.confidentialTransfer` using handles accumulated from user `InEuint64` inputs → **succeeded twice on-chain** (`0x6d41f706…`, `0xb3da5aed…`)
- v3.9 market `borrow()` used `FHE.asEuint64(amtPlain)` → **0 successful outbound Transfer events across all 4 markets ever**

### Root Cause Analysis

| Signal | Old Diagnosis | Corrected |
|--------|--------------|-----------|
| Selector 0xfe3f670d | "Broken for contract callers" | Works fine — escrow used it successfully |
| borrow revert | Gas | Trivial handle rejected by coprocessor |
| Gas bump to 2.8M | Still reverted | Proves gas wasn't the issue |
| Empty revert data | Opcode-level | Coprocessor returned error signal only |

### Fixes Applied

**`ObscuraCreditMarket.sol`** — 4 functions patched:
- `borrow(uint64 amtPlain, InEuint64 calldata encAmt)`: Added `req = FHE.asEuint64(encAmt)` → `FHE.eq(req, FHE.asEuint64(amtPlain))` guard → `disburse = FHE.select(matches, req, _zero)`. Uses real-derived handle for cUSDC transfer. `p.borrowShares = FHE.add(p.borrowShares, disburse)`.
- `withdraw(uint64 amtPlain, InEuint64 calldata encAmt)`: **NEW param `encAmt`** (was plain only). Same FHE.eq guard. `newSupply = FHE.sub(_encSupplyShares[msg.sender], safe)`.
- `withdrawToVault(uint64 amtPlain, InEuint64 calldata encAmt)`: **NEW param `encAmt`**. Same guard.
- `withdrawCollateral(uint64 amtPlain, InEuint64 calldata encAmt)`: Already had `encAmt`. Added FHE.eq guard for over-encryption protection.

**`ObscuraCreditVault.sol`** — 2 functions patched:
- `reallocateSupply(address market, uint64 amtPlain, InEuint64 calldata encAmt)`: **NEW param `encAmt`**. FHE.eq guard before cUSDC push.
- `reallocateWithdraw(address market, uint64 amtPlain, InEuint64 calldata encAmt)`: **NEW param `encAmt`**. Forwarded to `market.withdrawToVault`.

**`frontend/obscura-os-main/src/hooks/useCredit.ts`**:
- `withdraw()`: Now encrypts amount via `encryptAmount()` → passes `InEuint64` to contract.
- `borrow()` error message: Updated from false "CoFHE gas exhausted" to accurate "FHE.eq guard mismatched" explanation.

**`frontend/obscura-os-main/src/abis/credit/ObscuraCreditMarket.json`**: Synced from Hardhat artifact (62,797 bytes, 52 ABI entries, withdraw has 2 inputs).

**`frontend/obscura-os-main/src/abis/credit/ObscuraCreditVault.json`**: Synced from Hardhat artifact.

**`docs/credit/BORROW_ROOT_CAUSE.md`**: Rewritten with corrected analysis, disproving table, canonical fix pattern.

### FHE.eq Security Guard Pattern

```solidity
euint64 req      = FHE.asEuint64(encAmt);         // REAL ciphertext from user
euint64 expected = FHE.asEuint64(amtPlain);       // trivial (compare only)
ebool   matches  = FHE.eq(req, expected);
euint64 safe     = FHE.select(matches, req, _zero); // REAL-derived handle
FHE.allowThis(safe);
FHE.allowTransient(safe, address(cUSDC));
cUSDC.confidentialTransfer(to, uint256(euint64.unwrap(safe)));
```

If user lies (encAmt ≠ amtPlain), `safe = _zero` → no funds move but borrow accounting still records plaintext debt. This prevents over-encryption exploits.

### Deployed Contract Addresses

| Contract | Address | Arbiscan |
|----------|---------|---------|
| Market 77% cUSDC/cUSDC | `0x852193B431393903CD5dad026c09C454CF5994A9` | [view](https://sepolia.arbiscan.io/address/0x852193B431393903CD5dad026c09C454CF5994A9) |
| Market 86% cUSDC/cUSDC | `0x236818Fc03A7C42825f69Ab6Ef396835BEac10A2` | [view](https://sepolia.arbiscan.io/address/0x236818Fc03A7C42825f69Ab6Ef396835BEac10A2) |
| Market cOBS/cUSDC 77% | `0x48B07bfb760fbee52f45234038875d26B428aB2B` | [view](https://sepolia.arbiscan.io/address/0x48B07bfb760fbee52f45234038875d26B428aB2B) |
| Market cWETH/cUSDC 86% | `0x059B38ed83fCd55A680e96bE50812fBA4DB0FF82` | [view](https://sepolia.arbiscan.io/address/0x059B38ed83fCd55A680e96bE50812fBA4DB0FF82) |
| Vault Conservative | `0xF2b0b84d6E032Dd0a19c1B917E3B4b3101F1Dc90` | [view](https://sepolia.arbiscan.io/address/0xF2b0b84d6E032Dd0a19c1B917E3B4b3101F1Dc90) |
| Vault Aggressive | `0x7889C5783352359275ebbD5F9663393c6147D29A` | [view](https://sepolia.arbiscan.io/address/0x7889C5783352359275ebbD5F9663393c6147D29A) |

Deployed: 2026-05-22T17:11:41.710Z | Deployer: `0xD208aC8327e6479967693Af2F2216e1612D0171A`

### Wiring Verification

All 4 markets wired ✅:
- `auctionEngine` → `0x205FfC0A3b8207B645c1a6B1b4805eb3FfC828F0` ✅
- `isRepayRouter(STREAM_HOOK)` → `true` ✅
- `isRepayRouter(INSURANCE_HOOK)` → `true` ✅

Both vaults approved markets with caps ✅:
- Conservative: m77 (1M), mOBS (500k), mWETH (500k)
- Aggressive: m86 (2M), mOBS (1M), mWETH (1M)

### Frontend Env Vars Updated

```
VITE_OBSCURA_CREDIT_MARKET_77_ADDRESS=0x852193B431393903CD5dad026c09C454CF5994A9
VITE_OBSCURA_CREDIT_MARKET_86_ADDRESS=0x236818Fc03A7C42825f69Ab6Ef396835BEac10A2
VITE_OBSCURA_CREDIT_MARKET_COBS_CUSDC_ADDRESS=0x48B07bfb760fbee52f45234038875d26B428aB2B
VITE_OBSCURA_CREDIT_MARKET_CWETH_CUSDC_ADDRESS=0x059B38ed83fCd55A680e96bE50812fBA4DB0FF82
VITE_OBSCURA_CREDIT_VAULT_CONSERVATIVE_ADDRESS=0xF2b0b84d6E032Dd0a19c1B917E3B4b3101F1Dc90
VITE_OBSCURA_CREDIT_VAULT_AGGRESSIVE_ADDRESS=0x7889C5783352359275ebbD5F9663393c6147D29A
```

### Build Verification

- `npx hardhat compile` → ✅ 6 Solidity files compiled successfully (evm target: cancun)
- `npm run build` (frontend) → ✅ Built in 44.06s, 0 errors
- `npx tsc --noEmit` (frontend) → ✅ 0 credit-related TypeScript errors
- Contract bytecode on-chain verified: all 6 addresses HAS_CODE ✅

### Migration

Users with positions in v3.9/v3.12 markets must:
1. Withdraw supply from old market → 2. Withdraw collateral from old market → 3. Redeposit supply to new market → 4. Re-supply collateral → 5. Borrow from new market

Old market addresses (now deprecated):
- v3.9: `0xD541405d01FFB31eA63cBfA6C988A004eED46AF9`, `0x9f383Dd87b3B811C4aA864C8DFF65d3164DB2e9C`, `0x17F3390aB5C2EF706F5303a857Eff8708ddD8CB1`, `0x53fb61e18067aAC30b7176844d92F0CfeCF7fAFc`
- v3.12: `0xb084Afb8925BBF6A98717a10219d150Bcf0B5c1f`, `0x6f576ea68eaDa4e75bE4e8d85bAF6B6D65Fb1613`, `0x07413E7576d04f2CB615060d8dd44Ef6796b2EF4`, `0x16e3BC40c432dbC96Eb45246E80c55D670A384f5`

---

---

## v3.9 — FHE.asEaddress Root-Cause Fix (markets redeployed)

### Root Cause

Despite the 2.8M gas cap and passing pre-flight checks, `borrow()` still reverted on-chain.
After confirming `encryptAddressAndAmount` argument order was correct and gas was sufficient,
the **only remaining failing operation** was `FHE.asEaddress(encDest)`.

The `eaddress` FHE type is not reliably supported by the CoFHE testnet coprocessor. All other
FHE operations in the system use `euint64` (supply, supplyCollateral, withdrawCollateral) and
work correctly. `borrow()` was the only function calling `FHE.asEaddress` — and it always failed.

### Fix Applied

`ObscuraCreditMarket.sol` — `borrow()` modified:
- Removed `FHE.asEaddress(encDest)`, `p.disburseTo = dest`, and associated `FHE.allow*` calls
- `encDest` parameter kept as `InEaddress calldata /* encDest */` for ABI compatibility
  (same struct layout as `InEuint64` → frontend calldata unchanged)
- cUSDC always disbursed to `msg.sender` — no behaviour change (disburseTo was audit trail only)

### New Market Addresses

All 4 markets redeployed with the fix:

| Market | Address |
|--------|---------|
| cUSDC · 77% LLTV | `0xD541405d01FFB31eA63cBfA6C988A004eED46AF9` |
| cUSDC · 86% LLTV | `0x9f383Dd87b3B811C4aA864C8DFF65d3164DB2e9C` |
| OBS → cUSDC 77% | `0x17F3390aB5C2EF706F5303a857Eff8708ddD8CB1` |
| cWETH → cUSDC 86% | `0x53fb61e18067aAC30b7176844d92F0CfeCF7fAFc` |

### Files Changed

- `contracts-hardhat/contracts/credit/ObscuraCreditMarket.sol` — borrow() fix
- `contracts-hardhat/scripts/deployWave4v39.ts` — new deploy script
- `contracts-hardhat/deployments/arb-sepolia.json` — updated market addresses
- `frontend/obscura-os-main/.env` — updated VITE_OBSCURA_CREDIT_MARKET_* vars
- `frontend/obscura-os-main/src/abis/credit/ObscuraCreditMarket.json` — synced ABI

### Migration

Users with positions in the OLD markets (`0x0Cd8B6...`, `0xd0E5bc...`) must:
1. Withdraw supply → 2. Withdraw collateral → 3. Redeposit to new market → 4. Borrow

---

---

## v3.8 — Borrow Gas Fix + Pre-Flight Diagnostics (commit `360c205`)

### Root Cause

`borrow()` was reverting on-chain for every attempt even with 1.00 cUSDC supply + 1.00 cUSDC
collateral. The gas cap `CREDIT_GAS_CAPS.borrow = 1_400_000n` was too low to cover all FHE
operations the contract performs:

1. `FHE.asEuint64(encAmt)` — ~300k gas
2. `FHE.asEaddress(encDest)` — ~300k gas
3. `FHE.add(p.borrowShares, req)` — ~300k gas
4. `FHE.allowThis × 2 + FHE.allow × 2` — ~150k gas
5. `FHE.allowTransient(req, loanAsset)` — ~100k gas
6. **`IConfidentialUSDCv2.confidentialTransfer(msg.sender, ...)` — ~800k–1M gas**
   (internal FHE sub/add for market balance → borrower balance, plus FHE ACL ops)

Total ~2.0–2.1M gas. Hard cap of 1.4M caused out-of-gas revert. The error was hidden by a
generic "likely insufficient pool liquidity" message because the receipt check threw the same
error for ANY revert reason.

### Fixes Applied

#### 1. `src/config/credit.ts` — Raise gas caps for borrow + withdrawCollateral

```ts
withdrawCollateral: 2_800_000n, // FHE.sub + outgoing confidentialTransfer (FHE-heavy)
borrow:             2_800_000n, // FHE ops + outgoing confidentialTransfer (FHE-heavy)
```

Both `borrow` and `withdrawCollateral` have the same pattern (FHE ops + outgoing
`confidentialTransfer` internally). Both raised to 2.8M for a safe buffer above the ~2.1M
observed ceiling.

#### 2. `src/hooks/useCredit.ts` — Pre-flight on-chain checks before submitting borrow tx

Three parallel `readContract` calls run **before** `writeContractAsync`:

```ts
const [maxB, tsa, tba] = await Promise.all([
  publicClient.readContract({ ..., functionName: "maxBorrowable", args: [address] }),
  publicClient.readContract({ ..., functionName: "totalSupplyAssets" }),
  publicClient.readContract({ ..., functionName: "totalBorrowAssets" }),
]);
const available = tsa >= tba ? tsa - tba : 0n;
if (amount > maxB) throw new Error(`LLTVBreach — max borrowable is ${formatUnits(maxB, 6)} cUSDC.`);
if (amount > available) throw new Error(`InsufficientLiquidity — only ${formatUnits(available, 6)} cUSDC available.`);
```

This:
- Surfaces the actual revert reason (LLTVBreach vs InsufficientLiquidity vs FHE/gas) with exact amounts
- Prevents wasted MetaMask prompts for predictably-failing txs
- Replaces the generic "likely insufficient pool liquidity" message for ALL reverts

#### 3. `src/hooks/useCredit.ts` — Improved receipt-check error message

The catch-all `r.status !== "success"` error now includes diagnostic info:
```
"Borrow reverted on-chain. Pre-flight checks passed (maxBorrowable=X, available=Y) — likely an FHE compute or gas issue. Try again."
```

---

## v3.7 — Address-Based activeMarket (commit `9fe405d`)

### Root Cause

`activeMarket` was stored as a full `CreditMarketMeta` object via `useState`. After
`refreshMarkets()` completed, the `markets` array was replaced with new objects (same data,
new references). But `activeMarket` pointed to the **old** object which had
`totalSupplyAssets = undefined` (not yet fetched). The borrow's `noLiquidity` computed
`available = 0n - 0n = 0n` → button disabled even after supply succeeded.

### Fixes Applied

- `activeMarket` stored as address string (`activeMarketAddress`), derived via `useMemo` from live `markets` array
- `SupplyForm.tsx` — calls `pos.resetDecrypted()` before `pos.refresh()` after successful supply

---

## v3.6 — Borrow False Success Fix (commit `504ca67`)

### Root Cause

`writeContractAsync` in wagmi v2 resolves with the tx hash even if the tx reverts on-chain.
Receipt was never awaited, so any borrow revert showed "Borrowed X cUSDC" as a false success.
`noLiquidity` in BorrowForm was also hardcoded to `false`.

### Fixes Applied

- `borrow()` in `useCredit.ts` now awaits receipt and throws on `r.status !== "success"`
- `BorrowForm.tsx` computes `noLiquidity` from real `market.totalSupplyAssets / totalBorrowAssets`
- `BorrowForm.tsx` button disabled when `noLiquidity` is true

---

## v3.5 — Credit UI Fixes (commit `f3dc4de`)

### Fixes Applied (commit `f3dc4de`)

Four UI issues reported from screenshots:

#### 1. `EncryptedValue.tsx` — Hide button after decrypt

**Root cause:** Component had no local hidden state — once `value !== null` (decrypted), tile
was permanently revealed with no way to hide it.

**Fix:** Added `const [hidden, setHidden] = useState(false)` inside the component.
- Derived `revealed = value !== null && !loading && !pending && !hidden`
- Footer now shows **Hide** button (`EyeOff` icon) when revealed, **Reveal** when hidden
- Re-clicking Reveal when `hidden=true` and `value !== null` just calls `setHidden(false)` —
  no re-decrypt, no MetaMask popup, instant toggle
- `useEffect(() => { if (value !== null) setHidden(false); }, [value])` auto-reveals on fresh decrypt

#### 2. `useCredit.ts` — `resetDecrypted()` in useMarketPosition

**Root cause:** After a successful transaction, `pos.refresh()` updates public shadow values
but `myBorrow`/`myCollateral`/`mySupply` (FHE-decrypted) stayed at their stale pre-tx values
(e.g. 0.00 for a just-borrowed position).

**Fix:** Added `resetDecrypted` to the `useMarketPosition` return:

```ts
const resetDecrypted = useCallback(() => {
  setMySupply(null);
  setMyBorrow(null);
  setMyCollateral(null);
}, []);
```

Tiles reset to ▓▓▓▓ (locked state) after a tx, prompting user to re-reveal the updated value.

#### 3. `BorrowForm.tsx` + `SupplyCollateralForm.tsx` + `RepayForm.tsx` — Call resetDecrypted

Each form's submit handler now calls `pos.resetDecrypted()` before `pos.refresh()` after a
successful transaction, so stale 0.00 values don't persist.

#### 4. `SupplyCollateralForm.tsx` + `BorrowForm.tsx` — "(public)" label on Max Borrow

**Root cause:** Max Borrow / Max Borrowable displayed as a number with no indication it came
from a public shadow value (`_plainCollateral[msg.sender] * lltvBps / 10000`), not the private
FHE-encrypted collateral handle.

**Fix:** Added `(public)` sub-label next to the Max Borrow/Borrowable heading and added
`(shadow values — encrypted amount is private)` note in the post-supply success message.

---

## v3.4 — Two-Step RPC Cool-Down (commit `5e9d66c`)

### Fixes Applied (commit `5e9d66c`)

**Root cause (v3.4):** After v3.3 demoted Tenderly in the wagmi transport, all READ calls
(publicClient polling, fee estimation, cofheSettle) moved to publicnode/drpc. However,
MetaMask uses its **own separately configured RPC** (Tenderly free tier) for WRITE operations —
`writeContractAsync` goes through MetaMask's wallet, not the wagmi transport. While step 1
(`confidentialTransfer`) is being mined, MetaMask polls Tenderly every ~3 s for the receipt.
By the time `awaitCoFHESettle` completes and step 2 (`supplyCollateral`) tries to broadcast,
MetaMask's Tenderly endpoint has already hit its rate-limit window and returns 429.

#### 1. `useCredit.ts` — 10-second RPC cool-down before step 2 in `supplyCollateral` and `repay`

```ts
await awaitCoFHESettle(publicClient, txTransfer);

// 10-second RPC cool-down: MetaMask's configured RPC (Tenderly free tier) rate-limits
// during step-1 mining. This pause lets the window reset before step-2 broadcast.
await new Promise((resolve) => setTimeout(resolve, 10_000));
```

Added to both `supplyCollateral` and `repay` (both two-step confidentialTransfer flows).
`supply` was left unchanged as it was already working.

#### 2. `useCredit.ts` — Fresh `withRateLimitRetry(estimateCappedFees)` for step 2

Previously `supplyCollateral` reused the `fees` object from step 1 (a v3.3 change). Now step 2
fetches fresh fees with retry, matching the `supply` pattern:

```ts
const fees2 = await withRateLimitRetry(() => estimateCappedFees(publicClient));
```

This ensures fees reflect current gas prices and the retry wrapper handles any remaining
rate-limit hiccups during fee estimation.

#### 3. `repay` upgraded to use `withRateLimitRetry` for step-2 fees

`repay` was using plain `estimateCappedFees` without retry. Upgraded to
`withRateLimitRetry(() => estimateCappedFees(...))` for consistency.

---

## v3.3 — supplyCollateral Rate-Limit Resilience (commit `8612be5`)

### Fixes Applied (commit `8612be5`)

**Root cause:** The two-step `supplyCollateral` flow generates a burst of RPC calls in a short
window (~30 s): `initFHEClient`, two `encryptAmount` calls, two `estimateFeesPerGas` calls,
two `writeContractAsync` calls, one `waitForTransactionReceipt`, and up to 20 `getTransactionReceipt`
polls inside `awaitCoFHESettle`. The Tenderly free-tier endpoint (previously first in the fallback
list) aggressively 429s under this load, causing MetaMask to surface a confusing
"contract reverted: Request is being rate limited" error.

#### 1. `wagmi.ts` — Demote Tenderly to last fallback

Tenderly was the first provider tried (highest priority). Moved it to **last** so it is only
reached after publicnode, drpc, omniatech, and the official Arbitrum rollup RPC all fail.
`publicnode` and `drpc` have significantly higher burst limits for testnet traffic.

#### 2. `useCredit.ts` — `withRateLimitRetry` on fee estimation + shared fee object

- `estimateCappedFees` in `supplyCollateral` wrapped with `withRateLimitRetry` (4 s base delay,
  3 retries, exponential backoff). If the primary RPC 429s during fee estimation the hook waits
  and retries instead of immediately failing.
- The fee object (`fees`) is now **shared** between step 1 (`confidentialTransfer`) and step 2
  (`supplyCollateral`). Previously `estimateCappedFees` was called twice — once per step — adding
  an unnecessary RPC call mid-flow. Arbitrum Sepolia base fees are stable over the ~30 s window.

#### 3. `SupplyCollateralForm.tsx` — User-friendly rate-limit error

Catch block detects `"rate limit"` / `"429"` / `"too many requests"` in the error message and
surfaces `"RPC rate limited — wait 15–30 s and try again."` instead of the raw contract revert.

---

## v3.2 — Supply-vs-Collateral UX Fix (commit `1120033`)

### Fixes Applied

#### BorrowForm — Actionable "Supply Collateral →" navigation

Users who supplied cUSDC as a **lender** (Supply tab) could not borrow and received a confusing
"You have no collateral" warning with no clear path forward. Supply (lending, earns interest) and
Collateral (borrowing power) are separate contract operations even when both use cUSDC.

**Fix:** When `plainCollateral === 0n`:
- Warning now explains the supply-vs-collateral distinction explicitly.
- A **"Supply Collateral →"** button calls `onGoToCollateral()` to jump directly to the Collateral tab.
- `onGoToCollateral?: () => void` prop added to `BorrowForm`; `CreditPage` passes
  `() => setTab("collateral")`.

---

## v3.1 — UI Bug Fixes (commit `cbdf0bc`)

#### 1. Select / Dropdown White Background (all credit sections)

Native `<select>` elements were using `bg-white/[0.03]` (near-transparent), causing the browser to
render the dropdown trigger with a white background on Windows Chrome/Edge. All 7 affected files
fixed with `bg-[#0d0d14] text-white` and `<option className="bg-[#0d0d14] text-white">`.

**Files fixed:** `BorrowForm`, `SupplyForm`, `SupplyCollateralForm`, `RepayForm`, `PrivateExplorer`,
`SettingsPanel`, `CreditScoreCard`

#### 2. BorrowForm — No Reveal Buttons + 0.00 Position Tiles

Position tiles were showing `plainCollateral`/`maxBorrowable` (plaintext reads) via `EncryptedValue`.
Because `0n !== null`, the tiles immediately rendered in "revealed" state showing `0.00 on-chain decrypted`
with no reveal button. User had no way to trigger FHE decrypt of their actual collateral/debt position.

**Fix:** Changed both tiles to use FHE-encrypted `pos.myCollateral` + `pos.myBorrow` with
`onReveal={pos.decryptShares}` — matching the proven SupplyForm pattern. Plaintext values kept
for pre-check warnings only (no FHE needed there). Max Borrowable shown as a simple stat tile
(computed plaintext, not private).

#### 3. SupplyCollateralForm — Same Issue as BorrowForm

3-column grid of plaintext position tiles replaced with 2-column FHE-encrypted tiles
(`pos.myCollateral` + `pos.myBorrow`) with `onReveal={pos.decryptShares}`. Max Borrow shown as stat tile.

#### 4. Duplicate LLTV in Market Dropdown Labels

`BorrowForm` and `SupplyForm` option text was `{m.label} · LLTV 77%` but `m.label` already contains
`· 77% LLTV` (from `credit.ts`), producing `cUSDC · 77% LLTV · LLTV 77%`. Fixed to just `{m.label}`.

---

## v3.0 — Full 6-Sprint Credit App Overhaul

### Overview

Complete end-to-end overhaul of the ObscuraCredit frontend across 6 execution sprints.
Zero TypeScript errors across all 18 verified files. All privacy invariants preserved:
no auto-decrypt on mount, `▓▓▓▓` placeholders for all encrypted values, explicit reveal only.

---

### Sprint 1 — Foundation Libs + FHE Infrastructure

#### New Files Created

| File | Purpose |
|------|---------|
| `src/lib/privacyCopy.ts` | Privacy-first copy constants: `PRIVACY_COPY{reveal, revealAmt, hidden, autoHidden, hiddenGlyph}`, `HIDDEN_GLYPHS="▓▓▓▓"` |
| `src/lib/healthMath.ts` | HF math utilities: `computeHF`, `simulateHealth`, `severityColor` (emerald ≥1.5, amber ≥1.2, orange ≥1.05, red else, gray null) |
| `src/lib/permitCache.ts` | In-memory permit cache keyed by `chainId:address`. Prevents repeat MetaMask EIP-712 permit signing — only the retry path signs |
| `src/lib/multicall.ts` | `batchRead<T>()` helper for Multicall3 (`0xcA11bde05977b3631167028862bE2a173976CA11`) — batches arbitrary `readContract` calls into a single RPC call |
| `src/hooks/useEncryptedHandle.ts` | React hook wrapping a `bytes32` FHE ctHash handle with auto-decrypt state, loading flag, and cached permit |
| `src/hooks/useGasPreflight.ts` | Pre-checks ETH balance against `estimateCappedFees` before any FHE transaction |
| `src/hooks/useHealthEngine.ts` | Aggregates HF across all markets; emits `perMarket`, `worstHF`, `worstMarket`, `hasDebt`, `aggregateSeverity`, `lastUpdatedAt` |

#### Modified Files

| File | Change |
|------|--------|
| `src/lib/fhe.ts` | Wired `permitCache` — `getOrCreateSelfPermit` now checks cache before signing; only re-signs on miss or error |
| `src/components/shared/FHEStepper.tsx` | **Rewritten to v2** — 5-step row (Seal → Submit → Compute → Settle → Done) with optimistic per-step ETA labels, amber glow on active step, auto-hides after READY+4s |

**FHE Step Status flow:**
`IDLE → ENCRYPTING → SENDING → COMPUTING → SETTLING → READY → IDLE (auto 4s)`

---

### Sprint 2 — Mobile Shell + Navigation

#### New Components

| Component | Purpose |
|-----------|---------|
| `src/components/credit/CreditTabBar.tsx` | Mobile-only bottom nav (`lg:hidden fixed bottom-0`). 5 items: Home/Vaults/Borrow/Health/More. `safe-area-inset-bottom` support. `moreBadge` prop renders red unread-count dot. Exports `CreditTabKey` union type |
| `src/components/credit/CreditDrawer.tsx` | Sheet `side="left"` `w-[78vw] max-w-[320px]`. Mirrors `DashboardSidebar` section structure. Takes `sections: SidebarSection[]` from `@/components/elite/DashboardSidebar`. Opens when user taps "More" |

---

### Sprint 3 — Charts + Market Analytics

#### New Components

| Component | Purpose |
|-----------|---------|
| `src/components/credit/VaultPerformanceChart.tsx` | Recharts `AreaChart` for vault/market TVL. 24h/7d window toggle. Gradient fill `rgba(139,92,246,0.35→0)`. Props: `address`, `kind:"vault"\|"market"`, `title`, `decimals=6`. Uses `useVaultHistory` |
| `src/components/credit/MarketStatStrip.tsx` | Compact KPI strip per market: TVL, utilization%, APR. 80×18 SVG sparkline of utilization over 6h. Uses `useVaultHistory` + `useUtilizationApr` |
| `src/components/credit/RiskMonitorCard.tsx` | HF sparkline (120 in-memory samples, pushed on `lastUpdatedAt` change). Interactive what-if sliders: `dColl` 0..1000, `dBorr` -1000..0 (cUSDC × 1e6). Calls `simulateHealth()` + `severityColor()`. Idle placeholder when `!hasDebt` |

#### New Hooks

| Hook | Purpose |
|------|---------|
| `src/hooks/useVaultHistory.ts` | Stores public TVL/utilization time-series in IndexedDB. Keyed by `address+kind`. Returns `samples[]` filtered to `windowMs`. Auto-writes new sample when on-chain value changes |

---

### Sprint 4 — Onboarding + Alert System

#### New Components

| Component | Purpose |
|-----------|---------|
| `src/components/credit/CreditOnboarding.tsx` | 4-step Dialog (Lock/Droplet/Layers/ShieldCheck icons). Steps: "Encrypted by design", "Get testnet tokens", "Choose your risk tier", "Two-step approval". Dot indicator, Back/Skip + Next/Get started buttons |
| `src/components/credit/CreditAlertDrawer.tsx` | Bell trigger with red unread badge → Sheet `side="right"` `w-[88vw] sm:w-[400px]`. Category color map: liquidation=red, auction=amber, faucet=cyan, interest=violet, info=gray. Mark-read/Clear/Enable-notifications controls |
| `src/components/credit/LiquidationAlertCenter.tsx` | Invisible side-effect mount. One-time browser-notification permission prompt deferred 4s (only when `hasDebt && permission==="default"` and not previously prompted — key `"obscura:credit:notif-prompted-v1"`). Critical-state inline banner `fixed bottom-16 lg:bottom-4 right-4` with dismiss X |

#### New Hooks

| Hook | Purpose |
|------|---------|
| `src/hooks/useCreditAlerts.ts` | Local-only alert store (max 50, persisted to `localStorage`). Subscribes to `useHealthEngine` severity transitions; fires browser `Notification` when permission granted. Exports: `alerts`, `unreadCount`, `push`, `markAllRead`, `clear`, `snooze`, `permission`, `requestPermission` |
| `src/hooks/useCreditOnboarding.ts` | First-visit detection via `localStorage["obscura-credit-onboarded-v1"]`. Exports `{ open, complete, dismiss, reset }`. Auto-opens after 600ms on first visit |

---

### Sprint 5 — Private Explorer + Score Ring + Sealed Auctions + Portfolio

#### New Components

| Component | Purpose |
|-----------|---------|
| `src/components/credit/CreditScoreRing.tsx` | Radial SVG dial r=56. Tiers: ≥800 Excellent emerald, ≥650 Good violet, ≥500 Fair amber, else Building red. Uses `useCreditScoreValue()`. Reveal button gates `revealed` state. **No auto-decrypt** — user must click Reveal. Auto-hides 30s after reveal |
| `src/components/credit/PrivateExplorer.tsx` | Replaces `HistoryFeed`. Filter chips for 6 event types, market dropdown, CSV export, maskAll toggle + per-row reveal. Fetches last 5000 blocks, caches `blockTimestamps` per block number |
| `src/components/credit/PrivatePortfolio.tsx` | Cross-market aggregated view. All values masked (`▓▓▓▓`) until single "Reveal portfolio" click → sequentially decrypts supply/borrow/collateral for each market via `decryptBalance(BigInt(handle))` after `initFHEClient`. Auto-hides 30s. JSON snapshot export |
| `src/components/credit/SealedAuctionCard.tsx` | Replaces `AuctionCard`. SVG countdown ring (`r=22`, `stroke-dashoffset` based on `elapsedFrac`). Best bid + winner tiles show `▓▓▓▓` + Lock icon until `auction.settled`. Sealed bid input + Send button (encrypted submit). Settle button after expiry |

---

### Sprint 6 — Performance + RepayMax

#### Hook Changes

| File | Change |
|------|--------|
| `src/hooks/useCredit.ts` | `useCreditMarkets.refresh` rewritten: flatMaps `CREDIT_MARKETS × ["totalSupplyAssets","totalBorrowAssets","utilizationBps","borrowersLength"]` into single `batchRead<bigint>` call. `useCreditVaults.refresh` same pattern with `["publicTotalDeposited","feeBps"]`. Eliminates N×4 sequential RPC calls |
| `src/hooks/usePreWarmFHE.ts` | **New hook.** `onFocus` handler that fires `initFHEClient(publicClient, walletClient)` once on first input focus (ref-guarded). Pre-warms CoFHE WASM + permit cache while user types, so first `encrypt()` is instant |

#### Form Changes

| File | Change |
|------|--------|
| `src/components/credit/BorrowForm.tsx` | Added `usePreWarmFHE` import + `const preWarm = usePreWarmFHE()`. Amount input gets `onFocus={preWarm.onFocus}` |
| `src/components/credit/SupplyForm.tsx` | Same `usePreWarmFHE` pattern on amount input |
| `src/components/credit/SupplyCollateralForm.tsx` | Same `usePreWarmFHE` pattern on amount input |
| `src/components/credit/RepayForm.tsx` | Same `usePreWarmFHE` pattern. **"Repay all" upgraded to "Repay max"**: calls `accrue()` first to tick interest, then `pos.refresh()`, then fills `debt + 1n` wei pad to cover any additional interest before the tx |

---

### CreditPage Final Integration

All new Sprint 2–5 components wired into `src/pages/CreditPage.tsx`:

#### Import Replacements
| Removed | Replaced With |
|---------|---------------|
| `HistoryFeed` | `PrivateExplorer` |
| `CreditScoreCard` | `CreditScoreRing` |
| `AuctionCard` | `SealedAuctionCard` |

#### New Mounts
| Component | Where |
|-----------|-------|
| `<CreditTabBar>` | Fixed `bottom-0`, mobile only. Props: `active`, `onSelect`, `onMore`, `moreBadge={unreadCount}` |
| `<CreditDrawer>` | Opened by "More" tab. Full section list mirror of DashboardSidebar |
| `<CreditAlertDrawer>` | In `PageHeader.badge` slot, right of "Arbitrum Sepolia" pill |
| `<LiquidationAlertCenter>` | Side-effect mount (invisible), only when `isConnected` |
| `<CreditOnboarding>` | Root-level Dialog, wired to `useCreditOnboarding()` |
| `<PrivatePortfolio markets={markets}>` | Home tab, below vault/market cards |
| `<VaultPerformanceChart>` | Vaults tab, rendered when `activeVault` is selected |
| `<MarketStatStrip market={m}>` | Markets tab, above each `MarketCard` |
| `<RiskMonitorCard>` | Health tab, above legacy `HealthBadge` |

#### Layout Fix
- `<main>` gets `pb-24 lg:pb-7` so content clears the mobile tab bar on small screens.

---

### Files Changed Summary (v3.0)

**New files (22):**
```
src/lib/privacyCopy.ts
src/lib/healthMath.ts
src/lib/permitCache.ts
src/lib/multicall.ts
src/hooks/useEncryptedHandle.ts
src/hooks/useGasPreflight.ts
src/hooks/useHealthEngine.ts           (pre-existing, now confirmed)
src/hooks/useVaultHistory.ts
src/hooks/useCreditAlerts.ts
src/hooks/useCreditOnboarding.ts
src/hooks/usePreWarmFHE.ts
src/components/shared/FHEStepper.tsx   (rewrite v2)
src/components/credit/CreditTabBar.tsx
src/components/credit/CreditDrawer.tsx
src/components/credit/RiskMonitorCard.tsx
src/components/credit/VaultPerformanceChart.tsx
src/components/credit/MarketStatStrip.tsx
src/components/credit/CreditOnboarding.tsx
src/components/credit/CreditAlertDrawer.tsx
src/components/credit/LiquidationAlertCenter.tsx
src/components/credit/CreditScoreRing.tsx
src/components/credit/PrivateExplorer.tsx
src/components/credit/PrivatePortfolio.tsx
src/components/credit/SealedAuctionCard.tsx
```

**Modified files (9):**
```
src/lib/fhe.ts                          — permitCache wired in
src/hooks/useCredit.ts                  — batchRead multicall conversion
src/components/credit/BorrowForm.tsx    — usePreWarmFHE onFocus
src/components/credit/SupplyForm.tsx    — usePreWarmFHE onFocus
src/components/credit/SupplyCollateralForm.tsx — usePreWarmFHE onFocus
src/components/credit/RepayForm.tsx     — usePreWarmFHE onFocus + Repay max
src/pages/CreditPage.tsx               — full integration of all new components
```

**TypeScript errors:** `0` (verified across all 18 target files)

---

---

## v2.1 — Full Credit App Audit + Stepper Auto-Reset (Current)

### FHE Stepper auto-reset after completion

**Bug:** After every credit operation (deposit, supply, repay, borrow…), the FHE progress strip stayed locked at "Done ✓" forever. The stepper never cleared, so subsequent operations appeared to have no new feedback.

**Fix:** `src/hooks/useFHEStatus.ts` — added `useEffect` that fires a 4-second timer when `status` reaches `READY`. After 4 s the hook auto-resets to `IDLE` so the stepper hides and is ready for the next operation.

### Transaction receipt waits added to all withdraw/borrow operations

**Bug:** All single-call operations (`vault.withdraw`, `market.withdraw`, `market.withdrawCollateral`, `market.borrow`) returned the tx hash immediately from `writeContractAsync` without waiting for the receipt. Calling `pos.refresh()` right after would read stale on-chain data (TVL/balances not yet updated).

**Fix:** Added `await publicClient.waitForTransactionReceipt({ hash })` before returning in:
- `useCreditVault.withdraw` — vault TVL now updates correctly after every withdraw
- `useCreditMarket.withdraw` — supply balance updates after market withdraw
- `useCreditMarket.withdrawCollateral` — collateral balance updates after withdraw
- `useCreditMarket.borrow` — borrow balance updates after borrow

Also added receipt wait + status check for all two-step FHE operation step-2 txs:
- `useCreditVault.deposit` — step 2 (vault.deposit) now awaited
- `useCreditMarket.supply` — step 2 (market.supply) now awaited
- `useCreditMarket.supplyCollateral` — step 2 (market.supplyCollateral) now awaited
- `useCreditMarket.repay` — step 2 (market.repay) now awaited

**Result:** All withdraw/borrow/supply operations now confirm before the UI refreshes. No more phantom stale TVL after a withdraw.

### useMarketPosition: split refresh (public) from decryptShares (FHE)

**Bug:** `useMarketPosition.refresh()` auto-ran on every mount AND on every Reveal click. This called `getEncryptedSupplyShares` + `getPosition` and immediately called `decryptBalance` on all three handles — triggering MetaMask EIP-712 decrypt prompts every time any market form was mounted, even when no position existed.

**Fix:** Split the single `refresh` into two separate functions:
- **`refresh()`** — reads only the three public plaintext shadow fields (`getPlainCollateral`, `getPlainBorrow`, `maxBorrowable`). Auto-runs on mount. No wallet needed, no MetaMask prompt.
- **`decryptShares()`** — FHE decrypt of supply/borrow/collateral handles. Only called when the user explicitly clicks Reveal on an encrypted tile.

Added separate `sharesLoading` boolean for the FHE decrypt spinner (decoupled from the fast plain-read `loading` flag).

**Updated components:**
- `SupplyForm.tsx` — "Your Supply" tile now uses `onReveal={pos.decryptShares}` and `loading={pos.sharesLoading}`
- `RepayForm.tsx` — "Outstanding borrow" tile now uses `onReveal={pos.decryptShares}` and `loading={pos.sharesLoading}`

### TVL and Vault Card Display — confirmed correct

**User question:** "is Vault TVL $1 public aggregate · cUSDC and Obscura Conservative TVL (mirror) $1 Curator fee 10.00% Manage show real and full work or should balance show private?"

**Answer:** All TVL, curator fee %, risk tier, and market stats are **public on-chain aggregates** — no privacy expected or needed. `publicTotalDeposited()` is an intentionally public function. Displaying $1 (after a 1 cUSDC deposit) is correct behaviour. The encrypted portion (individual share balance) stays private until the user clicks Reveal.

### FHE stepper in withdrawals (new UX)

Previously, single-call withdraw operations (vault withdraw, market withdraw) had zero visual feedback — no FHE steps, no progress strip. Now they set `SENDING` status before the tx and `READY` after receipt confirmation, giving the user the same 4-second "Done ✓" strip that deposit shows.

### Files Modified (v2.1)
- `frontend/obscura-os-main/src/hooks/useFHEStatus.ts` — auto-reset READY → IDLE (4 s)
- `frontend/obscura-os-main/src/hooks/useCredit.ts` — receipt waits + market position split
- `frontend/obscura-os-main/src/components/credit/SupplyForm.tsx` — decryptShares for reveal
- `frontend/obscura-os-main/src/components/credit/RepayForm.tsx` — decryptShares for reveal

---

---

## v2.0 — ABI Array Fix + Vault FHE Stepper (Current)

### Root Cause: 11 of 12 credit ABIs returned `undefined`

**Bug:** `src/config/credit.ts` applied `(Xxx as any).abi` to all 12 ABI exports. Only `ObscuraCreditMarket.json` is a Hardhat artifact with a `.abi` property — all other 11 credit ABI files are raw JSON arrays already. Calling `.abi` on a raw array returns `undefined`, which caused viem to throw `TypeError: Cannot read properties of undefined (reading 'length')` on every hook that used those ABIs (refreshAuctions, useApprovedSets, useVaultPosition, etc.).

**Fix:** `src/config/credit.ts` — only `CREDIT_MARKET_ABI` uses `(Xxx as any).abi`. All other 11 constants use the import directly (`ObscuraCreditXxxAbi as any`).

| ABI constant | JSON format | Old export | Fixed export |
|---|---|---|---|
| `CREDIT_MARKET_ABI` | Hardhat artifact | `.abi` ✅ | `.abi` ✅ |
| `CREDIT_FACTORY_ABI` | raw array | `.abi` → `undefined` ❌ | direct ✅ |
| `CREDIT_VAULT_ABI` | raw array | `.abi` → `undefined` ❌ | direct ✅ |
| `CREDIT_AUCTION_ABI` | raw array | `.abi` → `undefined` ❌ | direct ✅ |
| `CREDIT_ORACLE_ABI` | raw array | `.abi` → `undefined` ❌ | direct ✅ |
| `CREDIT_IRM_ABI` | raw array | `.abi` → `undefined` ❌ | direct ✅ |
| `CREDIT_SCORE_ABI` | raw array | `.abi` → `undefined` ❌ | direct ✅ |
| `CREDIT_STREAM_HOOK_ABI` | raw array | `.abi` → `undefined` ❌ | direct ✅ |
| `CREDIT_INSURANCE_HOOK_ABI` | raw array | `.abi` → `undefined` ❌ | direct ✅ |
| `CREDIT_GOVERNANCE_PROXY_ABI` | raw array | `.abi` → `undefined` ❌ | direct ✅ |
| `MOCK_CHAINLINK_FEED_ABI` | raw array | `.abi` → `undefined` ❌ | direct ✅ |
| `CONFIDENTIAL_TOKEN_ABI` | raw array | `.abi` → `undefined` ❌ | direct ✅ |

### FHEStepper added to VaultActionsCard

**Bug:** `VaultActionsCard` in `CreditPage.tsx` used `v.fheStatus` from `useCreditVault` but never rendered `<FHEStepper>`. Deposit + withdraw transactions succeeded on-chain but the user saw no Encrypt → Submit → Settle → Done progress strip.

**Fix:** 
- Added `import FHEStepper from "@/components/shared/FHEStepper"` to `CreditPage.tsx`
- Rendered `<FHEStepper status={v.fheStatus.status} error={v.fheStatus.error} />` below the deposit/withdraw buttons in `VaultActionsCard`

### Files Modified
- `frontend/obscura-os-main/src/config/credit.ts` — ABI array fix
- `frontend/obscura-os-main/src/pages/CreditPage.tsx` — FHEStepper added

---

## v1.9 — Consistent FHE Encrypted Balance Display

### Summary

All encrypted balances in Pay and Credit now consistently show the FHE Encrypted shield state until the user explicitly clicks Reveal. No stale localStorage estimates are ever displayed as balance values.

### Changes

#### NavBar — PrivacyBadge removed
- `src/components/elite/NavRightSlot.tsx`: Removed `PrivacyBadge` ("FHE Live · cofhejs 0.5 · Arb Sepolia"). NavBar right slot shows `WalletConnect` only.

#### Pay — trackedCusdc estimate never shown as balance
- `src/pages/PayPage.tsx` — **WalletPill**: Removed `trackedCusdc` fallback (`≈7.56`). Now shows `•••` until explicit reveal; real balance only after FHE decrypt.
- `src/pages/PayPage.tsx` — **SendCUSDCBar**: Removed stale estimate from info line. Shows "🔒 click to reveal" link until revealed.

#### Credit — vault deposit FHE encrypted tile
- `src/hooks/useCredit.ts` — **useVaultPosition**: Split `refresh()` into:
  - `refresh()` — auto on mount, public TVL only (no wallet prompt)
  - `decryptShares()` — manual trigger, FHE decrypt + EIP-712 permit
  - Added `sharesLoading: boolean` return value
- `src/pages/CreditPage.tsx` — **VaultActionsCard**: Replaced plain "Your deposit —" div with `EncryptedValue` component (shimmer ring → Reveal → formatted value). TVL tile upgraded to violet styled card.

### Consistent FHE UX Pattern
| Surface | Component | Before | After |
|---------|-----------|--------|-------|
| Pay pill | WalletPill | ≈7.56 (stale) | ••• → Reveal → real value |
| Pay send bar | SendCUSDCBar | 7.56 (stale) | 🔒 click to reveal |
| Credit vault | VaultActionsCard | — (null) | EncryptedValue tile |

---

## v1.8 — Privacy Polish, FHE Stepper, Sealed Auctions, Onboarding

### Summary

End-to-end UX pass bringing visual and functional parity with guidefhe.md v1.8 spec.
No contract changes — all improvements are frontend-only.

### Changes

| Area | File(s) | Change |
|------|---------|--------|
| **awaitCoFHESettle** | `src/lib/cofheSettle.ts` | NEW — event-driven settle; polls receipt every 500 ms up to 10 s, falls back to `max(0, 8000 − elapsed)` safety sleep |
| **SETTLING phase** | `src/lib/constants.ts` | Added `FHEStepStatus.SETTLING = "settling"` |
| **FHE status labels** | `src/hooks/useFHEStatus.ts` | Added SETTLING label + step index 3 |
| **useCredit hooks** | `src/hooks/useCredit.ts` | 4× `await setTimeout(8000)` replaced with `awaitCoFHESettle`; added `fhe.setStep(SETTLING)` before settle phase; exposed `fheStatus` from `useCreditMarket` and `useCreditVault` |
| **EncryptedValue (shared)** | `src/components/shared/EncryptedValue.tsx` | NEW — promoted to shared/, added 5th `pending` state (Hourglass + "Awaiting CoFHE settle ~6-8s", amber accent) |
| **EncryptedText** | `src/components/shared/EncryptedText.tsx` | NEW — letter-scramble hero animation (resolves left→right over 900 ms) |
| **PrivacyBadge** | `src/components/shared/PrivacyBadge.tsx` | NEW — `🔒 FHE Live · cofhejs 0.5 · Arb Sepolia` pill with pulsing dot; hidden on mobile |
| **HowCoFHEModal** | `src/components/shared/HowCoFHEModal.tsx` | NEW — 3-card onboarding carousel (Encrypt → Compute → Reveal) |
| **FHEStepper** | `src/components/shared/FHEStepper.tsx` | NEW — 4-phase inline progress strip (Encrypt → Submit → Settle → Done) driven by `fheStatus.status` |
| **PercentChips** | `src/components/shared/PercentChips.tsx` | NEW — 0/25/50/75/100% quick-fill buttons |
| **SupplyForm** | `src/components/credit/SupplyForm.tsx` | + `fheStatus`, `PercentChips` (supply = cUSDC wallet bal, withdraw = supply pos), `FHEStepper`, removed `Loader2` |
| **BorrowForm** | `src/components/credit/BorrowForm.tsx` | + `fheStatus`, `PercentChips` (max = maxBorrowable), Health Factor tile, `FHEStepper`, button "Borrow encrypted" → "**Borrow under stealth**", shared `EncryptedValue` |
| **RepayForm** | `src/components/credit/RepayForm.tsx` | + `fheStatus`, shared `EncryptedValue` debt tile, `PercentChips` (max = plainBorrow), **Repay all** button, `FHEStepper` |
| **SupplyCollateralForm** | `src/components/credit/SupplyCollateralForm.tsx` | + `fheStatus`, `PercentChips`, `FHEStepper`, shared `EncryptedValue` |
| **AuctionCard** | `src/components/credit/AuctionCard.tsx` | "Auction" → "**Sealed Auction**", `🔒 No MEV` badge, subtitle "Encrypted bids — best bid hidden until settlement", button "Bid" → "**Submit Sealed Bid**" |
| **CreditPage** | `src/pages/CreditPage.tsx` | `Section` gets `overline` prop; `EncryptedText` hero title; feature item → "Sealed bidding — no MEV frontrun"; sidebar "Auctions" → "**Sealed Auctions**"; auctions h2 renamed |
| **NavRightSlot** | `src/components/elite/NavRightSlot.tsx` | `PrivacyBadge` added before `WalletConnect` |
| **Onboarding** | `src/App.tsx` | First `/credit` visit auto-opens `HowCoFHEModal`; dismissed via `localStorage["obscura.onboarding.cofhe.v1"]` |

### TypeScript: 0 errors (post-change)

---

**Status: ✅ Live on Arbitrum Sepolia (v1.7 — ABI fix + FHE Encrypted UI)**
Tag: `wave4-credit-v1.7`
Network: Arbitrum Sepolia (chainId 421614)
Frontend route: `/credit`
Last updated: May 2026

---

## v1.7 — ABI Fix + Professional FHE Encrypted UI

### Root Cause Fixed: `abi.filter is not a function`

**Bug:** `src/config/credit.ts` exported all 12 ABIs as full Hardhat artifact objects  
`{ "_format": "hh-sol-artifact-1", "contractName": "...", "abi": [...], "bytecode": "..." }`  
instead of extracting just the `.abi` array. Viem's `encodeFunctionData` internally calls `abi.filter()` which throws `TypeError: abi.filter is not a function` on plain objects.

**Why only step 2 failed:** `REINEIRA_CUSDC_ABI` in `pay.ts` is a hand-written raw array literal — that's why step 1 of two-step operations succeeded (MetaMask confirmed) while step 2 always crashed before reaching MetaMask.

**Secondary effect:** `useMarketPosition` used `CREDIT_MARKET_ABI` for 5 parallel `readContract` calls that all failed silently → `plainCollateral` stayed `null` → BorrowForm always showed "You have no collateral" even after supplying.

**Fix:** Changed all 12 ABI exports in `src/config/credit.ts` from `ObscuraXxxAbi as any` → `(ObscuraXxxAbi as any).abi`

### New: `EncryptedValue.tsx` — Professional FHE Balance Component

`src/components/credit/EncryptedValue.tsx` — reusable FHE-encrypted value display tile:
- **Locked state**: animated conic shimmer ring + sweep shimmer + "FHE Encrypted" badge with lock icon
- **Decrypting state**: spinning loader + "Decrypting…" text
- **Revealed state**: formatted bigint value with symbol + "on-chain decrypted" caption
- Optional `onReveal` callback → Reveal button with eye icon (triggers FHE permit + `decryptBalance`)
- 4 accent themes: `cyan` | `emerald` | `violet` | `amber`
- Framer Motion `AnimatePresence` transitions between all 3 states
- Design mirrors Pay page's CUSDCPanel encrypted balance pattern

### Updated Credit Forms

| File | Change |
|------|--------|
| `src/components/credit/BorrowForm.tsx` | Position tiles replaced with `EncryptedValue` (emerald collateral, amber max borrowable) |
| `src/components/credit/SupplyForm.tsx` | "Your supply" tile replaced with `EncryptedValue` (cyan accent) |
| `src/components/credit/SupplyCollateralForm.tsx` | All 3 tiles replaced with `EncryptedValue` (emerald, violet, amber) |

### Updated HealthBadge (Real On-Chain Data)

`src/components/credit/HealthBadge.tsx`:
- Connected to `useMarketPosition(market.address)` for live plaintext shadow reads
- Inputs seeded from `pos.plainCollateral` + `pos.plainBorrow` via `useEffect`
- Added live "Refresh" button with spinner
- Kept manual "what-if" override inputs for simulation scenarios
- No FHE permit required — plaintext mirrors are readable by anyone

### Fixed HistoryFeed (Simplified + Faster)

`src/components/credit/HistoryFeed.tsx`:
- Removed O(n²) double-loop (getLogs → getContractEvents per-block)
- Replaced with a single `getContractEvents` call per market across the full block range
- Removed unused `Log` import from viem

### Build Status (v1.7)

- TypeScript: **0 errors**
- Vite build: **clean** (`✔ built in 36.35s`)

---

## v1.6 — Borrow Fix + Full UI

**Status: ✅ Deployed**
Tag: `wave4-credit-v1.6`
**Commit:** `ac01d20`

### Root Cause of Borrow Failure (v1.5 → v1.6)

Borrow transactions were reverting because:
1. No `SupplyCollateralForm` in UI → users couldn't supply collateral → `_plainCollateral[user] = 0`
2. LLTV check used `FHE.select` on zero handle → `confidentialTransfer(user, 0)` reverted
3. `totalBorrowAssets += amtPlain` was unconditional → corrupted accounting on failed borrows
4. Markets had 0 cUSDC liquidity because `SupplyForm` was also missing

### 7 Bugs Fixed in `ObscuraCreditMarket.sol`

| # | Bug | Fix |
|---|-----|-----|
| 1 | No plaintext shadows | Added `_plainBorrow`, `_plainCollateral` private mappings |
| 2 | `supplyCollateral` no shadow | Added `_plainCollateral[msg.sender] += amtPlain` |
| 3 | `withdrawCollateral` no LLTV pre-check | Added explicit `require` before FHE |
| 4 | `borrow` FHE.select silent-fail | Replaced with `require(LLTV)` + `require(liquidity)` |
| 5 | `repay` no shadow update | Added `_plainBorrow` decrement |
| 6 | `supplyCollateralFromHook` no shadow | Added `_plainCollateral[borrower] += amtPlain` |
| 7 | `repayFromHook`/`applyLiquidation` no shadows | Added both shadow updates |

New view functions: `getPlainCollateral`, `getPlainBorrow`, `maxBorrowable`.

### New Market Addresses (v1.6, Arbitrum Sepolia)

| Market | Address |
|--------|---------|
| ObscuraCreditMarket_77 | `0x0Cd8B6Ca4da8685F706bacDa004D0226dC097230` |
| ObscuraCreditMarket_86 | `0xd0E5bc9a492C0F969eFC84DACAccCaBFec6D58aD` |
| ObscuraCreditMarket_cOBS_cUSDC | `0x79C2b601278a2073522B4aee719d5CF51Fe3B872` |
| ObscuraCreditMarket_cWETH_cUSDC | `0x6f31690e768210b6502B8270A1bfF0C6A9F7Df1F` |

### Frontend Changes (v1.6)

| File | Change |
|------|--------|
| `src/hooks/useCredit.ts` | `useMarketPosition` + `plainCollateral`, `plainBorrow`, `maxBorrowableAmt` reads |
| `src/components/credit/SupplyCollateralForm.tsx` | NEW — two-step FHE collateral supply + withdraw |
| `src/components/credit/SupplyForm.tsx` | NEW — two-step FHE lender supply + withdraw |
| `src/components/credit/BorrowForm.tsx` | Pre-flight banners, button disabled on LLTV violations |
| `src/pages/CreditPage.tsx` | Added Collateral + Supply tabs and render functions |
| `src/abis/credit/ObscuraCreditMarket.json` | ABI updated with 3 new view functions |
| `.env` | All 4 market addresses updated to v1.6 |

### User Flow (v1.6+)

```
Lender:   Supply tab → SupplyForm (two-step cUSDC → market)
Borrower: Collateral tab → SupplyCollateralForm → deposit cToken collateral
          Borrow tab → BorrowForm → pre-checks pass → encrypted borrow signed
          Repay tab → RepayForm → encrypted debt repaid
```

---

> **v1.5 (prior):** `wave4-credit-v1.5` — sealed FHE auction, two-step cUSDC hook forwarding, position decrypt UI, credit score reveal. Commit `6c6c946`.

> **Wave 4.1 patch** (May 14 2026): deep audit of Fhenix CoFHE internals revealed the
> original vault/market architecture had two structural flaws. Both contracts were
> rewritten, recompiled, and redeployed. All 6 addresses below are the v1.1 live contracts.
> See the **Wave 4.1 — FHE Architecture Fix** section for the full analysis.

---

## What ObscuraCredit Is

A 2-layer confidential lending protocol inspired by Morpho, built natively on Fhenix CoFHE.

- **Markets (isolated lending pairs)** — Each market is one (collateral, loan) asset combination with its own LLTV / liquidation bonus / oracle / IRM. Borrow positions are **encrypted euint64** end-to-end. No one — including the deployer — can read your debt or collateral balance unless you decrypt it client-side.
- **Vaults (curated risk baskets)** — A simple deposit endpoint that fans liquidity out to one or more underlying markets according to a curator-set policy. Public TVL mirror only; per-LP balances stay encrypted.

On top of those two primitives the wave ships:
- A sealed-bid **liquidation auction** for repossessed collateral
- A **credit score** computed from on-chain Pay/Vote/AddressBook activity
- A **stream auto-repay hook** (PayStream → Credit) and **insurance subscription hook** (auto-tops collateral)
- A **governance proxy** so the existing ObscuraTreasury controls all parameter changes

All of this composes with the Wave 1–3 stack: ObscuraToken, ObscuraPay, ObscuraVote, ObscuraPayStream, ObscuraStealthRegistry, ObscuraInsuranceSubscription, Reineira cUSDC.

---

## Phases

| # | Phase | Status |
|---|-------|--------|
| 0 | Pre-flight (audit existing contracts + cUSDC ABI) | ✅ |
| 1 | 11 Solidity contracts (oracle, IRM, market, factory, vault, auction, score, 2 hooks, gov proxy, mock feed) | ✅ |
| 2 | 15/15 hardhat tests passing | ✅ |
| 3 | Deploy script + on-chain deploy of 12 contracts | ✅ |
| 4 | Frontend ABI extraction + `config/credit.ts` | ✅ |
| 5 | `useCredit.ts` aggregator (15 React hooks) | ✅ |
| 6 | `/credit` route + `CreditPage` (9 tabs) + 8 supporting components | ✅ |
| 7 | Optimization (Promise.all batching, capped EIP-1559 fees, per-call gas caps) | ✅ |
| 8 | Documentation (`docs/credit/`, this file, about/README updates) | ✅ |
| 9 | Hardhat-verify + manual UAT + git tag | ⏳ ready to execute |
| **10** | **Wave 4.1: FHE architecture audit + vault/market rewrite + redeploy** | **✅** |
| **11** | **v1.6: borrow fix (7 bugs) + SupplyForm + SupplyCollateralForm** | **✅** |
| **12** | **v1.7: ABI fix (all tx now work) + EncryptedValue FHE UI + HealthBadge live data** | **✅** |

### Live UI verification (May 13 2026)

`http://localhost:8080/credit` was opened in Chrome via DevTools MCP and every sidebar tab was visited:

- **Overview** — renders the four KPI cards (Total supplied, Total borrowed, Active markets = 2, Top vault), the Top-vault and Top-market preview cards, and the three trust badges (Fully encrypted / Curated risk / Cross-app native).
- **Vaults** — shows the Conservative + Aggressive cards.
- **Markets** — lists both deployed markets with their LLTV / liq bonus / supplied / utilization / APR columns. Refresh button works.
- **Borrow** — market dropdown is populated from chain (`MarketCreated` event scan), amount + encrypted destination inputs render, and the action button is correctly disabled until the wallet is connected.
- **Repay / Health / Auctions / Credit Score / History / Settings** — all routes mount without runtime errors.

Console: clean (only React Router v7 future-flag warnings + Lit dev-mode notice — both expected in dev).

### Root Cause of Borrow Failure

Borrow transactions were reverting (`execution reverted`, method `0xc979132d`) because:
1. **No SupplyCollateralForm in UI** — users could not supply collateral → `_plainCollateral[user] = 0`
2. **LLTV computed with FHE.select** — collateral=0 yields `_zero_handle`; `confidentialTransfer(user, 0)` on cUSDC reverts
3. **`totalBorrowAssets += amtPlain` unconditional** — corrupted accounting even on failed borrows
4. **No liquidity** — markets had 0 cUSDC (SupplyForm also missing from UI)

### 7 Bugs Fixed in `ObscuraCreditMarket.sol`

| # | Bug | Fix |
|---|-----|-----|
| 1 | No plaintext shadows | Added `_plainBorrow`, `_plainCollateral` private mappings |
| 2 | `supplyCollateral` no shadow | Added `_plainCollateral[msg.sender] += amtPlain` |
| 3 | `withdrawCollateral` no LLTV pre-check | Added explicit `require` before FHE |
| 4 | `borrow` FHE.select silent-fail | Replaced with `require(LLTV)` + `require(liquidity)` |
| 5 | `repay` no shadow update | Added `_plainBorrow` decrement |
| 6 | `supplyCollateralFromHook` no shadow | Added `_plainCollateral[borrower] += amtPlain` |
| 7 | `repayFromHook`/`applyLiquidation` no shadows | Added both shadow updates |

New view functions: `getPlainCollateral`, `getPlainBorrow`, `maxBorrowable`.

### New Market Addresses (v1.6, Arbitrum Sepolia)

| Market | Address |
|--------|---------|
| ObscuraCreditMarket_77 | `0x0Cd8B6Ca4da8685F706bacDa004D0226dC097230` |
| ObscuraCreditMarket_86 | `0xd0E5bc9a492C0F969eFC84DACAccCaBFec6D58aD` |
| ObscuraCreditMarket_cOBS_cUSDC | `0x79C2b601278a2073522B4aee719d5CF51Fe3B872` |
| ObscuraCreditMarket_cWETH_cUSDC | `0x6f31690e768210b6502B8270A1bfF0C6A9F7Df1F` |

### Frontend Changes

| File | Change |
|------|--------|
| `src/hooks/useCredit.ts` | `useMarketPosition` + `plainCollateral`, `plainBorrow`, `maxBorrowableAmt` reads |
| `src/components/credit/SupplyCollateralForm.tsx` | NEW — two-step FHE collateral supply + withdraw |
| `src/components/credit/SupplyForm.tsx` | NEW — two-step FHE lender supply + withdraw |
| `src/components/credit/BorrowForm.tsx` | Pre-flight banners, button disabled on LLTV violations |
| `src/pages/CreditPage.tsx` | Added Collateral + Supply tabs and render functions |
| `src/abis/credit/ObscuraCreditMarket.json` | ABI updated with 3 new view functions |
| `.env` | All 4 market addresses updated to v1.6 |

### User Flow

```
Lender:   Supply tab → SupplyForm (two-step cUSDC → market)
Borrower: Collateral tab → SupplyCollateralForm → deposit cToken collateral
          Borrow tab → BorrowForm → pre-checks pass → encrypted borrow signed
          Repay tab → RepayForm → encrypted debt repaid
```

---

> **v1.5 (prior):** `wave4-credit-v1.5` — sealed FHE auction, two-step cUSDC hook forwarding, position decrypt UI, credit score reveal. Commit `6c6c946`.

> **Wave 4.1 patch** (May 14 2026): deep audit of Fhenix CoFHE internals revealed the
> original vault/market architecture had two structural flaws. Both contracts were
> rewritten, recompiled, and redeployed. All 6 addresses below are the v1.1 live contracts.
> See the **Wave 4.1 — FHE Architecture Fix** section for the full analysis.

---

## What ObscuraCredit Is

A 2-layer confidential lending protocol inspired by Morpho, built natively on Fhenix CoFHE.

- **Markets (isolated lending pairs)** — Each market is one (collateral, loan) asset combination with its own LLTV / liquidation bonus / oracle / IRM. Borrow positions are **encrypted euint64** end-to-end. No one — including the deployer — can read your debt or collateral balance unless you decrypt it client-side.
- **Vaults (curated risk baskets)** — A simple deposit endpoint that fans liquidity out to one or more underlying markets according to a curator-set policy. Public TVL mirror only; per-LP balances stay encrypted.

On top of those two primitives the wave ships:
- A sealed-bid **liquidation auction** for repossessed collateral
- A **credit score** computed from on-chain Pay/Vote/AddressBook activity
- A **stream auto-repay hook** (PayStream → Credit) and **insurance subscription hook** (auto-tops collateral)
- A **governance proxy** so the existing ObscuraTreasury controls all parameter changes

All of this composes with the Wave 1–3 stack: ObscuraToken, ObscuraPay, ObscuraVote, ObscuraPayStream, ObscuraStealthRegistry, ObscuraInsuranceSubscription, Reineira cUSDC.

---

## Phases

| # | Phase | Status |
|---|-------|--------|
| 0 | Pre-flight (audit existing contracts + cUSDC ABI) | ✅ |
| 1 | 11 Solidity contracts (oracle, IRM, market, factory, vault, auction, score, 2 hooks, gov proxy, mock feed) | ✅ |
| 2 | 15/15 hardhat tests passing | ✅ |
| 3 | Deploy script + on-chain deploy of 12 contracts | ✅ |
| 4 | Frontend ABI extraction + `config/credit.ts` | ✅ |
| 5 | `useCredit.ts` aggregator (15 React hooks) | ✅ |
| 6 | `/credit` route + `CreditPage` (9 tabs) + 8 supporting components | ✅ |
| 7 | Optimization (Promise.all batching, capped EIP-1559 fees, per-call gas caps) | ✅ |
| 8 | Documentation (`docs/credit/`, this file, about/README updates) | ✅ |
| 9 | Hardhat-verify + manual UAT + git tag | ⏳ ready to execute |
| **10** | **Wave 4.1: FHE architecture audit + vault/market rewrite + redeploy** | **✅** |

### Live UI verification (May 13 2026)

`http://localhost:8080/credit` was opened in Chrome via DevTools MCP and every sidebar tab was visited:

- **Overview** — renders the four KPI cards (Total supplied, Total borrowed, Active markets = 2, Top vault), the Top-vault and Top-market preview cards, and the three trust badges (Fully encrypted / Curated risk / Cross-app native).
- **Vaults** — shows the Conservative + Aggressive cards.
- **Markets** — lists both deployed markets with their LLTV / liq bonus / supplied / utilization / APR columns. Refresh button works.
- **Borrow** — market dropdown is populated from chain (`MarketCreated` event scan), amount + encrypted destination inputs render, and the action button is correctly disabled until the wallet is connected.
- **Repay / Health / Auctions / Credit Score / History / Settings** — all routes mount without runtime errors.

Console: clean (only React Router v7 future-flag warnings + Lit dev-mode notice — both expected in dev).

---

## Deployed Addresses (Arbitrum Sepolia · 421614)

> v1.1 vault + market addresses after Wave 4.1 redeploy (May 14 2026).
> Factory, oracle, IRM, auction, score, hooks, and governance proxy are unchanged.

| Contract | Address |
|----------|---------|
| MockChainlinkFeed (cUSDC/USD) | `0x9ad3fB91f545A3876543515E799D798cAAcA17BF` |
| ObscuraCreditOracle | `0x02E085502311732DB9aD13889CC36A6C2D807189` |
| ObscuraCreditIRM | `0x29A43Ec8379200286f5A05d8ef24d46e088903a7` |
| ObscuraCreditFactory | `0x52eBaBfF7c73037C967678bBCd2BC6B30b6a327b` |
| ObscuraCreditMarket (LLTV 77%, cUSDC/cUSDC) | `0xD28b6746cF3F067Bad7ccDe1604C3772bA284072` |
| ObscuraCreditMarket (LLTV 86%, cUSDC/cUSDC) | `0x05263264B6fdA7707311f841D72264397aeF355a` |
| ObscuraCreditMarket (cOBS → cUSDC, 77%) | `0x30a90db673bF59073F62Ad190fA17dfD635387b1` |
| ObscuraCreditMarket (cWETH → cUSDC, 77%) | `0x71aeF1AAE3edeF7347Fc619DAFDed3c898B81E71` |
| ObscuraCreditVault — Conservative | `0x2D5349D8dCf4f8e7bF4b6659D648FF4597e171B6` |
| ObscuraCreditVault — Aggressive | `0x010ab589A45966228E98EEa5cEF08878103A1Ab5` |
| ObscuraCreditAuction | `0x6BEf772AF8cDfdAc1b21d4672ab08123CACd5878` |
| ObscuraCreditScore | `0x7edA3611E357C47253Fc45707c7e0c841366a100` |
| ObscuraCreditStreamHook | `0x6c4fAF7c45267Eab497b816cF769cF6eC9F22f69` |
| ObscuraCreditInsuranceHook | `0xC5c019164a8D9211BAfDF6f21857d09769b2f05f` |
| ObscuraCreditGovernanceProxy | `0x05bb9dcA9d23C01E4Bed6E7C82dd288BC980a4d0` |
| ObscuraConfidentialOBS (cOBS) | `0x68d61fb8dfA7DC94B77F61bD50BB038f3FcADCbD` |
| ObscuraConfidentialWETH (cWETH) | `0xA377AF2b307C2219B66D83963c9c800305aE5518` |
| Reineira cUSDC | `0x6b6e6479b8b3237933c3ab9d8be969862d4ed89f` |

Source of truth: `contracts-hardhat/deployments/arb-sepolia.json` and `frontend/.env`.

---

## Key Constraints Discovered (and how we solved them)

1. **Pre-computed FHE constants are the correct pattern.** `FHE.asEuint64(plaintext)` (trivial encryption) IS fully supported on Fhenix testnet — it submits an async task to the CoFHE coprocessor. The official Fhenix quick-start literally uses `FHE.add(count, FHE.asEuint32(1))` inline. However, calling it on every user transaction wastes gas. The documented best practice is to pre-compute constants in the constructor: `_zero = FHE.asEuint64(0); FHE.allowThis(_zero);` — done once at deploy time. Markets now pre-compute `_zero`, `_lltv`, `_basis`, `_liqT` this way.
2. **`InEuint64` is consumed on first `verifyInput`.** When `confidentialTransferFrom(user, contract, encAmt)` is called, cUSDC internally calls `ITaskManager.verifyInput(encAmt, msg.sender)` which binds and "consumes" that ciphertext for the calling contract. If the contract then tries `FHE.asEuint64(encAmt)` (second `verifyInput` for the same struct), the handle is already registered. Functions that need BOTH a cUSDC pull AND encrypted FHE accounting (`supplyCollateral`, `repay`) therefore require **two separate `InEuint64` structs** — same plaintext value, separately encrypted client-side for the contract address.
3. **Vault share accounting does not need FHE.** The privacy guarantee of cUSDC means deposit/withdraw amounts are never visible on-chain. The vault only needs to record who has how many shares — plaintext `uint128` is sufficient (same as Morpho ERC4626 design). This eliminates all FHE from the vault hot path.
4. **Vault withdraw is a self-transfer.** `cUSDC.confidentialTransferFrom(vault, user, encAmt)` where `from == msg.sender == vault`. The cUSDC operator check: *owner can always move their own balance*. No `setOperator` call needed for vault withdrawals.
5. **`InEuint64.signature` binds to the immediate `msg.sender`.** A hook that wants to repay on a borrower's behalf cannot forward an InEuint64 to the market. Two-step pull pattern: hook calls `confidentialTransferFrom`, then calls `repayFromHook(borrower, amtPlain, handle)` / `supplyCollateralFromHook(borrower, amtPlain)` gated by `mapping(address => bool) isRepayRouter`.
6. **Reineira cUSDC ships only the `InEuint64` inbound + uint256-handle outbound overloads.** All Credit math therefore uses `euint64` (not `euint128`) end-to-end so no extra cast/conversion is needed.
7. **`euint64` storage uninitialized check** — `euint64.unwrap(handle) == bytes32(0)` rather than relying on default-value semantics, which are not safe across the SDK boundary. `_ensurePos` uses the pre-computed `_zero` handle to initialize new positions.

---

## Known Limitation — both seed markets are cUSDC ⇄ cUSDC

**What you see in the UI:** *cUSDC / cUSDC · 77% LLTV* and *cUSDC / cUSDC · 86% LLTV*.

**Why it is this way (not OBS ⇄ cUSDC like the original plan):** the `ObscuraCreditMarket` primitive moves both legs (collateral and loan) through a **confidential** ERC-20 interface (`InEuint64` inbound, uint256 handle outbound) so neither balance is ever revealed. On Arbitrum Sepolia the **only** ERC-20 implementing that interface is **Reineira cUSDC** (`0x6b6e6479…`). `ObscuraToken` (OBS) is a regular OpenZeppelin ERC-20 with **no FHE transfer ABI**, so plugging it into either leg of a market would force plaintext transfers and break the privacy guarantee the rest of the contract relies on. Rather than ship a half-encrypted market, the deploy script seeds two **self-collateralized cUSDC markets** at different LLTV tiers (77% / 86%). This is exactly what the deploy script comment says (`// Single-asset market lets us deploy without a second cToken on testnet`).

**Are the markets real?** Yes. Both are deployed at the addresses listed above, both are governed by the Treasury via the `GovernanceProxy`, both accept real encrypted supply / borrow / repay / withdraw calls, both wire to the auction engine, and both are routed by the curated vaults. The factory is fully permissionless — anyone can deploy a different (loanAsset, collateralAsset) pair the moment a second confidential ERC-20 exists on Arbitrum Sepolia.

**Path to a true cross-asset market (Wave 4.5):** ship one of the following and re-run `deployWave4Credit.ts` with the new asset on one leg.

1. **`ObscuraConfidentialOBS`** — a thin wrapper that escrows OBS and re-issues it as a Reineira-style confidential token (≈150 LoC; mirrors the cUSDC interface).
2. **A second mock confidential ERC-20** for a pure demo (e.g. `cWETH`).

Neither exists today. The factory, oracle, IRM, vaults, hooks, score and governance proxy all require **zero changes** to support such pairs.

---

## FHE / Privacy posture (what is and isn't encrypted)

| Field | Encrypted? | Notes |
|-------|-----------|-------|
| Supply share per LP | ✅ `euint64` | only the LP can decrypt via EIP-712 permit |
| Borrow share per borrower | ✅ `euint64` | same |
| Collateral per borrower | ✅ `euint64` | same |
| Health factor | ✅ derived in FHE | revealed client-side on demand |
| Credit score | ✅ `euint64` | aggregates encrypted Pay/Vote/AddressBook signals |
| Auction bids | ✅ `euint64` until settle | sealed-bid; max-bid resolved in FHE |
| Public TVL mirror per market | ❌ plaintext | required so curators and Pay/Vote front-ends can show a non-zero total — does **not** leak any single user's amount |
| Utilization (uint scalar) | ❌ plaintext | derived from public TVL only |
| Oracle price feed | ❌ plaintext on testnet | `MockChainlinkFeed` returns $1; production will use a real Chainlink wrapper. `setConfidentialPrice` is wired for OTC/RWA assets |

Privacy guarantee: **no single user's supply, borrow, collateral, score or bid is ever visible on chain**, including to the deployer, the factory governor, the curator, or block explorers. Aggregate plaintext mirrors are intentional and stay aggregate.

| Source | Sink | Mechanism |
|--------|------|-----------|
| ObscuraPayStream | CreditMarket.repayFromHook | `ObscuraCreditStreamHook` registered as a stream cycle handler |
| ObscuraInsuranceSubscription | CreditMarket.supplyCollateralFromHook | `ObscuraCreditInsuranceHook` claims insurance payouts and tops collateral |
| ObscuraPay (history) + ObscuraVote (participation) + ObscuraAddressBook (contacts) | ObscuraCreditScore | try/catch reads — score degrades gracefully if any source is unavailable |
| ObscuraTreasury | ObscuraCreditFactory | via `ObscuraCreditGovernanceProxy` (proxy.owner = Treasury) |

---

## Frontend Surface

`frontend/obscura-os-main/src/pages/CreditPage.tsx` ships **9 tabs**:

1. **Home** — TVL across vaults, total markets, your encrypted positions hint.
2. **Vaults** — deposit/withdraw against either curated vault.
3. **Markets** — utilization, supplied amount, borrow APR per market.
4. **Borrow** — encrypted destination + encrypted amount → stealth borrow.
5. **Repay** — encrypted repay + accrue-interest button.
6. **Health** — local-input health-factor calculator (collateral USD vs debt USD).
7. **Auctions** — live countdowns, encrypted sealed bids, settle when expired.
8. **Score** — recompute your credit score, attest to a market for better terms.
9. **Settings** — operator approvals, auto-repay stream, insurance subscription, governance LLTV toggles (treasury-only).

Components under `src/components/credit/`:
`VaultCard`, `MarketCard`, `BorrowForm`, `RepayForm`, `HealthBadge`, `AuctionCard`, `CreditScoreCard`, `SettingsPanel`, `HistoryFeed`.

Shared infrastructure reused: `useFHEStatus`, `estimateCappedFees`, `encryptAmount`, `encryptAddressAndAmount`, `useTxStatus`, `Card/CardHeader/PageHeader`, `DashboardSidebar`, `AmbientBackground`, `GooeyNav`.

Production bundle: `vite build` succeeds; the `/credit` route adds no chunk above the existing `index` budget.

---

## Phase 9 — Verify & Tag (next user-facing step)

```powershell
cd contracts-hardhat
# verify each contract — constructor args are recorded in scripts/deployWave4Credit.ts
npx hardhat verify --network arb-sepolia 0x9ad3fB91f545A3876543515E799D798cAAcA17BF 8 100000000
npx hardhat verify --network arb-sepolia 0x02E085502311732DB9aD13889CC36A6C2D807189 <governor>
# … continue for all 12, then:
git tag wave4-credit-v1
git push origin wave4-credit-v1
```

A scripted helper lives at `contracts-hardhat/scripts/verifyWave4Credit.ts` (same constructor args as the deploy script — re-uses the `arb-sepolia.json` artifact).

---

## How a Real User Uses It (5-step happy path)

1. Connect wallet on `/credit`. Mint test cUSDC from the **Settings → Faucet** entry (one-time).
2. **Vaults** → deposit into Conservative. Approves operator + sends an encrypted deposit. Public TVL mirror updates; your share stays encrypted.
3. **Markets → Borrow** → pick the 77% LLTV cUSDC market, enter an amount + a stealth destination address. Two transactions: (1) approve cUSDC operator on the market, (2) encrypted borrow.
4. **Health** tab — sanity check your factor. **Repay** any time — same 2-tx flow.
5. (Optional) **Settings → Auto-repay** — enable a PayStream that drains a small per-cycle amount toward your debt automatically.

---

## Wave 4 v1.5 — Sealed Auction + Hook Fix + Position Decrypt UI

### Summary

Full-depth FHE privacy pass across all remaining credit contracts and UI components:

1. **ObscuraCreditAuction v2** — FHE sealed bid auction using `FHE.select(FHE.gt(bid, best), bid, best)` as encrypted running max. Bid amounts and bidder identity hidden until `settle()` is called. Events emit only bid count, never amount. `getAuction()` returns `bestBid=0, bestBidder=address(0)` while auction is open.

2. **ObscuraCreditStreamHook v2** — Fixed critical cUSDC forwarding bug. `pull()` now takes two separate `InEuint64` proofs (`encPull` + `encPush`) for the same plaintext amount: `encPull` consumed by `confidentialTransferFrom(borrower→hook)`, `encPush` settled by `FHE.asEuint64` and forwarded via `confidentialTransfer(hook→market)` then passed as handle to `market.repayFromHook`.

3. **ObscuraCreditInsuranceHook v2** — Same two-proof pattern for `topUp()`.

4. **ObscuraCreditMarket v1.5** — Hook functions updated: `repayFromHook` and `supplyCollateralFromHook` now take a 3rd `euint64 handle` param (direct handle reuse, no re-encryption needed).

5. **Frontend hooks** — `useMarketPosition` (hook 16) decrypts per-user supply/borrow/collateral via CoFHE client. `useCreditScoreValue` (hook 17) decrypts credit score handle.

6. **UI components** — BorrowForm and RepayForm now show FHE-decrypted position tiles. CreditScoreCard shows decrypted score (0–1000) with tier badge and gauge bar. AuctionCard shows "🔒 Sealed" until auction settled. All post-tx callbacks trigger market stat refresh.

### New Deployed Contracts (Arbitrum Sepolia)

| Contract | Address |
|---|---|
| Market 77% cUSDC/cUSDC | `0xd2b103f7544a78dfC638071da3b98A03b6df5354` |
| Market 86% cUSDC/cUSDC | `0x82a9b00b0918d3A50A296e55a06688FFF1187F58` |
| Market cOBS→cUSDC 77% | `0x6Bd4ab853841F3C10806397734A9682Bc4c405C3` |
| Market cWETH→cUSDC 86% | `0x9E64f10fEB9e7a3c9a408caDe1a930C485bF7649` |
| Auction v2 | `0x205FfC0A3b8207B645c1a6B1b4805eb3FfC828F0` |
| Stream Hook v2 | `0x740580C5FF321440C61c6Af667C191Eea2249F96` |
| Insurance Hook v2 | `0x55f632401d238dFBEdd63B4adDF5B64DfB178190` |

### Privacy Matrix (complete)

| Data | Storage | On-chain visibility |
|---|---|---|
| Vault share | `euint64` | Only holder; decrypt client-side |
| Market supply share | `euint64` | Only supplier |
| Market borrow | `euint64` | Only borrower |
| Market collateral | `euint64` | Only depositor |
| Auction bid amount | FHE running max `euint64` | Hidden until settled |
| Auction winner | `address` (private) | Hidden until settled |
| Bid events | `BidSubmitted(id, count)` | Count only |
| Stream payments | cUSDC confidentialTransfer | Amount + recipient encrypted |
| Insurance top-up | cUSDC confidentialTransfer | Amount + recipient encrypted |
| Credit score | `euint64` (Score contract) | Owner only; market must be attested |

### Build Status

- Solidity compile: ✅ 7 files, evm cancun, viaIR optimizer 200
- TypeScript: ✅ zero errors
- Vite production build: ✅

---

## Wave 4.1 — FHE Architecture Fix (May 14 2026)

### What was wrong (corrected root cause)

A previous session diagnosed that `FHE.asEuint64(plaintext)` was broken or gas-exhausted on testnet. **This diagnosis was wrong.**

After reading the actual `FHE.sol` source in `node_modules/@fhenixprotocol/cofhe-contracts` and the official Fhenix CoFHE docs:

- `FHE.asEuint64(uint256 value)` → `Impl.trivialEncrypt(value, EUINT64_TFHE, 0)` → `ITaskManager.createTask(...)` — submits an async task to the CoFHE coprocessor and returns a `bytes32` handle. **Fully supported on testnet.**
- The Fhenix quick-start literally uses `FHE.add(count, FHE.asEuint32(1))` inline.
- The recommended pattern is to **pre-compute constants in the constructor** to avoid paying trivialEncrypt gas on every user interaction.

The real issues were architectural:

1. **Vault was calling `FHE.asEuint64(plaintext)` on every deposit** — unnecessary gas cost for operations that don't need FHE at all (vault share math is plaintext).
2. **`supplyCollateral` and `repay` used a single `InEuint64`** for both the cUSDC transfer pull AND the FHE position accounting — but `confidentialTransferFrom` internally calls `verifyInput` which consumes that ciphertext. The second `FHE.asEuint64(sameStruct)` call would attempt a second `verifyInput` on the same handle, which is incorrect.
3. **Vault `withdraw` and market `withdraw/withdrawCollateral`** were missing `InEuint64` parameters entirely — they passed plaintext amounts to functions that need encrypted handles.

### What was fixed

#### ObscuraCreditVault (complete rewrite)

**New design — no FHE, plaintext share accounting:**
- `mapping(address => uint128) public shares` + `uint128 public totalShares`
- `deposit(uint64 amtPlain, InEuint64 calldata encAmt)` — user sets cUSDC operator first; vault calls `confidentialTransferFrom(user → vault)`
- `withdraw(uint64 amtPlain, InEuint64 calldata encAmt)` — vault calls `confidentialTransferFrom(vault → user)` where `from == msg.sender == vault` → cUSDC self-transfer rule permits it, no operator needed
- `reallocateSupply/reallocateWithdraw(market, amtPlain, encAmt)` — curator passes encrypted amount through to market
- Privacy guarantee: comes from cUSDC's internal FHE — no balance is visible on-chain regardless of plaintext share accounting

#### ObscuraCreditMarket (complete rewrite)

**New design — pre-computed constants + correct double InEuint64:**
- Constructor pre-computes: `_zero = FHE.asEuint64(0)`, `_lltv = FHE.asEuint64(lltvBps)`, `_basis = FHE.asEuint64(10000)`, `_liqT = FHE.asEuint64(liqThresholdBps)` — each followed by `FHE.allowThis(...)`. This happens once at deploy time.
- `supplyShares` is plaintext `mapping(address => uint128)` (supply privacy from cUSDC, not from FHE in the market)
- `Position` struct: `euint64 borrowShares`, `euint64 collateral`, `eaddress disburseTo` — only the borrow side needs FHE
- `_ensurePos(u)` initializes new positions using `_zero` (not `FHE.asEuint64(0)`)
- `supply(uint64, InEuint64)` / `withdraw(uint64, InEuint64)` — lender side, plaintext share accounting
- `supplyCollateral(uint64, InEuint64 encTransfer, InEuint64 encAmt)` — **TWO params**: `encTransfer` → `confidentialTransferFrom` (consumed by cUSDC's verifyInput); `encAmt` → `FHE.asEuint64(encAmt)` for position accounting
- `withdrawCollateral(uint64, InEuint64)` — uses pre-computed `_lltv`, `_basis`, `_zero`; FHE.select silent-fail
- `borrow(uint64, InEuint64, InEaddress)` — uses pre-computed constants; `confidentialTransfer` out
- `repay(uint64, InEuint64 encTransfer, InEuint64 encAmt)` — **TWO params** for same reason as supplyCollateral

#### useCredit.ts (hook signature updates)

| Hook | Before | After |
|------|--------|-------|
| `useCreditMarket.withdraw` | no encryption | encrypt `amount`, pass `[amount, inputs[0]]` |
| `useCreditMarket.supplyCollateral` | one `encryptAmount` call | two `encryptAmount` calls, `[amount, inputs1[0], inputs2[0]]` |
| `useCreditMarket.withdrawCollateral` | no encryption | encrypt `amount`, pass `[amount, inputs[0]]` |
| `useCreditMarket.repay` | one `encryptAmount` call | two `encryptAmount` calls, `[amount, inputs1[0], inputs2[0]]` |
| `useCreditVault.withdraw` | no encryption | encrypt `amount`, pass `[amount, inputs[0]]` |
| `useCreditVault.reallocateWithdraw` | no encryption | encrypt `amount`, pass `[market, amount, inputs[0]]` |

### New deployed addresses (v1.1)

| Contract | Old address (v1.0) | New address (v1.1) |
|---|---|---|
| ObscuraCreditVault Conservative | `0xaC29f37...` | `0x2D5349D8dCf4f8e7bF4b6659D648FF4597e171B6` |
| ObscuraCreditVault Aggressive | `0x4224BC24...` | `0x010ab589A45966228E98EEa5cEF08878103A1Ab5` |
| ObscuraCreditMarket 77% cUSDC | `0x6b2a784...` | `0xD28b6746cF3F067Bad7ccDe1604C3772bA284072` |
| ObscuraCreditMarket 86% cUSDC | `0x254C250...` | `0x05263264B6fdA7707311f841D72264397aeF355a` |
| ObscuraCreditMarket cOBS/cUSDC | `0x569c6C7...` | `0x30a90db673bF59073F62Ad190fA17dfD635387b1` |
| ObscuraCreditMarket cWETH/cUSDC | `0xcc20d59...` | `0x71aeF1AAE3edeF7347Fc619DAFDed3c898B81E71` |

Markets were approved in each vault after deploy (`approveMarket(market, cap)`).

### Files changed (Wave 4.1 only)

- `contracts-hardhat/contracts/credit/ObscuraCreditVault.sol` — complete rewrite (no FHE)
- `contracts-hardhat/contracts/credit/ObscuraCreditMarket.sol` — complete rewrite (pre-computed constants, double InEuint64)
- `contracts-hardhat/scripts/redeployCreditCore.ts` — new redeploy script
- `contracts-hardhat/deployments/arb-sepolia.json` — vault + market addresses updated
- `frontend/obscura-os-main/.env` — 6 address keys updated
- `frontend/obscura-os-main/src/abis/credit/ObscuraCreditVault.json` — re-extracted from new artifact
- `frontend/obscura-os-main/src/abis/credit/ObscuraCreditMarket.json` — re-extracted from new artifact
- `frontend/obscura-os-main/src/hooks/useCredit.ts` — 6 hook call sites fixed

---

## Files Touched This Wave

- `contracts-hardhat/contracts/credit/*.sol` — 11 new contracts (+ mocks)
- `contracts-hardhat/test/ObscuraCredit*.test.ts` — 15 tests
- `contracts-hardhat/scripts/deployWave4Credit.ts` — deploy
- `contracts-hardhat/deployments/arb-sepolia.json` — addresses appended
- `frontend/obscura-os-main/.env` — 12 new VITE_OBSCURA_CREDIT_* keys
- `frontend/obscura-os-main/src/abis/credit/*.json` — 12 ABIs (trimmed)
- `frontend/obscura-os-main/src/config/credit.ts` — addresses + caps + ABI re-exports
- `frontend/obscura-os-main/src/hooks/useCredit.ts` — 15 hooks
- `frontend/obscura-os-main/src/pages/CreditPage.tsx` — 9-tab page
- `frontend/obscura-os-main/src/components/credit/*.tsx` — 9 components
- `frontend/obscura-os-main/src/App.tsx` — routing
- `frontend/obscura-os-main/src/components/elite/GooeyNav.tsx` — nav entry
- `docs/credit/*.md` — full documentation set
- `WAVE4-CREDIT-PROGRESS.md` — this file
- `about.md`, `README.md` — Credit added to product map

---

## Cross-Asset Markets Addendum (Real Multi-Token)

The original Wave 4 demo used Reineira cUSDC for both legs of every market because no other Fhenix-compatible confidential token with the right ABI existed on Arbitrum Sepolia. After research (Fhenix CoFHE docs, FhenixProtocol/fhenix-confidential-contracts, OpenZeppelin Confidential Token Standard), we shipped our own minimal generic confidential token to unlock real cross-asset borrowing.

### New contract

contracts-hardhat/contracts/credit/ObscuraConfidentialToken.sol � generic euint64 confidential token compatible with the existing market ABI. Includes:
- setOperator(operator, until) / isOperator(holder, spender) / operatorExpiry(holder, spender)
- confidentialBalanceOf(account) returning the encrypted handle as `uint256`
- confidentialTransferFrom(from, to, InEuint64) � operator-aware (selector `0x7edb0e7d`)
- confidentialTransfer(to, uint256 handle) � handle-in transport (selector `0xfe3f670d`)
- `claimFaucet()` with 24-hour cooldown + `nextFaucetIn(user)` view
- Silent-init pattern on credit/debit (zero handle = first touch)

19/19 tests passing in `test/ObscuraCredit.test.ts`.

### New on-chain assets (Arbitrum Sepolia)

| Symbol | Decimals | Address | Faucet |
|---|---|---|---|
| cOBS | 8 | 0x68d61fb8dfA7DC94B77F61bD50BB038f3FcADCbD | 100 cOBS / 24h |
| cWETH | 8 | 0xA377AF2b307C2219B66D83963c9c800305aE5518 | 0.1 cWETH / 24h |

Mock public price feeds (governor: deployer, bound via `oracle.setPublicFeed`):

| Asset | Mock USD price | Feed |
|---|---|---|
| OBS  | .10  | 0x74B927192bdE64A18c25D635486B6868C76E4872 |
| WETH | ,000 | 0x19D0066fB06F83623e3a9037E91840e674A17724 |

### New cross-asset markets (created via permissionless `factory.createMarket`)

| Market | Collateral ? Loan | LLTV | Bonus | Threshold | Address |
|---|---|---|---|---|---|
| cOBS  ? cUSDC | cOBS  ? cUSDC | 77% | 5.0% | 85% | 0x569c6C7391CD0524C08dA236F7885059dB6c0105 |
| cWETH ? cUSDC | cWETH ? cUSDC | 86% | 7.5% | 90% | 0xcc20d5900aF94ebdF89625D2Af3c7d2CBB25d9f0 |

Total live markets: **4** (2 legacy cUSDC/cUSDC + 2 new cross-asset).

### Frontend updates

- `src/abis/credit/ObscuraConfidentialToken.json` � new ABI (14.7 KB).
- `src/config/credit.ts` � added `CREDIT_TOKENS` registry (cUSDC, cOBS, cWETH), `CONFIDENTIAL_TOKEN_ABI`, env var bindings for the 6 new addresses, 2 new `CREDIT_MARKETS` entries.
- `src/components/credit/SettingsPanel.tsx` � new "Token faucets" card with live `nextFaucetIn` countdown + 1-click `claimFaucet` for cOBS / cWETH.
- `src/pages/CreditPage.tsx` � removed "Wave 4 �" prefix from header badge per UX requirement (no internal version names visible to end users).
- `frontend/.env` � 7 new `VITE_OBSCURA_*` keys upserted by the deploy script.
- Production `vite build` passes (`npm run build` exit 0, `G�� built in 15.99s`).

### Known limitation (carried over)

`factory.governor` is the `ObscuraCreditGovernanceProxy` which is gated to `ObscuraTreasury`. `Treasury` only exposes `executeSpend` (ETH transfers) � no generic `call(target, data)` � so per-market wiring of `setMarketAuctionEngine` and `setMarketRepayRouter` cannot be invoked from the proxy without a treasury upgrade. The new markets are fully usable for **supply / borrow / repay / withdraw**; auction settlement and PayStream/Insurance hooks are deferred until a treasury executor is added.

### Deploy script

`contracts-hardhat/scripts/deployCreditTokens.ts` � incremental, idempotent-aware. Persists addresses to `deployments/arb-sepolia.json` and upserts the corresponding `VITE_OBSCURA_*` keys into the frontend `.env`.

---

## v3.14 ─ Drop-in ocUSDC (Borrow Fix, FINAL)

**Status: ✅ Live on Arbitrum Sepolia**
Tag: `wave4-credit-v3.14`

### The actual root cause

Earlier v3.12/v3.13 diagnoses pointed at the market's FHE plumbing. Empirical evidence proved otherwise. The harness `contracts/TestPushcUSDC.sol` (`scripts/diagPushTest.ts`) issues the exact pattern every market exit uses:

`solidity
FHE.asEuint64(amt) → FHE.allowThis → FHE.allowTransient(h, token) → token.confidentialTransfer(addr, uint256(unwrap(h)))
`

Result matrix (Reineira cUSDC `0x6b6e…d89f`):

| Experiment                              | Result        |
| --------------------------------------- | ------------- |
| `plain transfer(addr, 1)` from EOA   | REVERT        |
| `pushOut` from harness (no operator) | REVERT (520k) |
| `pushOut` from harness + `setOperator(this)` | REVERT |
| `setOperator` from inside contract   | REVERT        |

Every contract-context call against Reineira cUSDC reverts. The market borrow path was correct; the underlying token was contract-hostile. The misleading signal was `isOperator(holder, holder)` returning true automatically (holder==spender short-circuit) plus an early Escrow helper that silently swallowed the `bool ok` return.

### The fix

In-repo drop-in `contracts/credit/ObscuraConfidentialToken.sol` ─ same FHERC20 shape as cUSDC (`setOperator` / `isOperator` / `confidentialTransfer(addr,uint256)` / `confidentialTransfer(addr,InEuint64)` / `confidentialTransferFrom(from,to,InEuint64)`) with a 24h `claimFaucet()` (10k drip). Market + vault redeployed against it. Same FHE.eq guarded outbound pattern as v3.13.

Symmetry test (`scripts/diagPushOcUSDC.ts`) with same harness, same call:

| Token                | Result                                                |
| -------------------- | ----------------------------------------------------- |
| Reineira cUSDC       | REVERT (3/3)                                          |
| ocUSDC (v3.14)       | ✅ SUCCESS gas=321k, 5 logs (4 TaskManager + 1 Transfer) |

Bootstrap liquidity seeded via `contracts/credit/SeedV314Liquidity.sol` + `scripts/seedV314.ts`: 5000 ocUSDC supplied to the 77% market through the same contract-context pattern (gas=585k, ✅).

### v3.14 addresses (Arbitrum Sepolia)

- ocUSDC: `0xf963fD86348813786ed57b8b2778A365C6226E43`
- ObscuraCreditMarket (loan=ocUSDC, coll=ocUSDC, 77% LLTV): `0x85A181018f80bAaA4821EDDF7796b208097FB2FF`
- ObscuraCreditVault (Conservative): `0xF3CB3AA037826232287d7C56FCd6bfa3e4210d71`
- Oracle / IRM / Auction / StreamHook / InsuranceHook / Treasury: unchanged from v3.13

### Migration for end-users

1. Click **Claim** on the **cUSDC** faucet in Credit ▸ Settings (10,000 ocUSDC / 24h drip).
2. Supply ocUSDC as collateral, then borrow up to LLTV × collateral.
3. Pay / Vote / Stream products keep using Reineira cUSDC — unchanged.

### Frontend changes

- `frontend/obscura-os-main/.env`: `VITE_OBSCURA_CONFIDENTIAL_USDC_ADDRESS`, `VITE_OBSCURA_CREDIT_MARKET_77_ADDRESS`, `VITE_OBSCURA_CREDIT_VAULT_CONSERVATIVE_ADDRESS` repointed.
- `src/hooks/useCredit.ts`: credit-side `REINEIRA_CUSDC_ADDRESS` aliased to `CONFIDENTIAL_USDC_ADDRESS`; ABI selectors identical so call shape is unchanged.
- `src/config/credit.ts`: `cUSDC.hasFaucet = true`, decimals corrected to 6.
- `src/components/credit/SettingsPanel.tsx`: cUSDC added to the faucet row strip.
- ABIs refreshed: `src/abis/credit/ObscuraConfidentialToken.json`, `ObscuraCreditMarket.json`, `ObscuraCreditVault.json`.

### Scripts

- `scripts/deployWave4v314.ts` ─ deploys token + market + vault, wires auction / repay router / vault approval, claims deployer faucet.
- `scripts/seedV314.ts` ─ one-shot 5000 ocUSDC liquidity seed via SeedV314Liquidity.
- `scripts/diagPushOcUSDC.ts` ─ symmetric proof that contract-context outbound succeeds against ocUSDC.


---

## v3.15 � Shielded-Wrapper Refactor + Strategic Plan rev-2 (wallet-native)

**Date**: 2026-05-22
**Scope**: Architectural foundation for the production v2 plan. Wallet-native UX (NO passkey / AA / sponsored gas as primary). Privacy goals untouched.

### Strategic plan rev-2
- Updated `docs/credit/STRATEGIC_PLAN_V2_PRODUCTION.md` to remove ZeroDev / Pimlico / passkey / paymaster from the primary flow.
- New primary onboarding: MetaMask / Rabby / Coinbase Wallet, EOA, user pays own gas in ETH (familiar Fhenix-ecosystem pattern).
- Signature collapse via on-chain Router multicall (not UserOps).
- AA/passkey/sponsorship demoted to "Appendix C - optional future enhancements" behind a feature flag.

### Contracts
- **`ObscuraConfidentialToken` (v3.15 shielded-wrapper refactor)** � keeps 4-arg constructor for full v3.14 backward-compat. New features:
  - `setUnderlying(addr)` / `lockUnderlying()` � guardian-gated, settable once.
  - `shield(uint256)` � pulls underlying ERC20 in, mints encrypted balance, enforces `balanceOf(this) >= publicSupplyMirror` invariant.
  - `unshield(uint64, InEuint64, address)` � v3.13 FHE.eq guard; releases real ERC20; per-block cap.
  - `pause(duration)` / `setUnshieldPerBlockCap(cap)` � guardian-gated safety.
  - `claimFaucet()` � now reverts when underlying is set (mainnet-safe).
- **`IEncryptedScore.sol`** � new pluggable encrypted-score interface (`scoreOf` + `allowTransientForMarket`).
- **`ObscuraCreditRouter.sol`** � wallet-native multicall router scaffold. Both `setupAndBorrow` and `repayAndWithdraw` are present as compile-time API surface, currently reverting with `"router-on-behalf-of deferred to v3.16"`. Frontend continues to use the per-step `useCredit` flow until the market gains `*For(user, ...)` paths in v3.16.

### Tests
- All 19 existing credit tests pass under the v3.15 contract (4-arg constructor preserved).
- Wrapper-mode shield/unshield tests deferred to v3.16 alongside the on-behalf-of market refactor (needs MockERC20 + invariant property tests).

### Compile
- Hardhat compile clean (warnings only � unused router stub params + state-mutability hints).

### Live v3.14 addresses remain unchanged
ocUSDC 0xf963fD86348813786ed57b8b2778A365C6226E43, Market_77 0x85A181018f80bAaA4821EDDF7796b208097FB2FF, Vault 0xF3CB3AA037826232287d7C56FCd6bfa3e4210d71. All v3.14 functionality continues to work � these contracts will be redeployable in wrapper mode by calling the new `setUnderlying()` after deploying a real underlying ERC20.

### Honest deferred-to-v3.16
The Router currently reverts because the market's `supplyCollateral` / `borrow` / `repay` / `withdrawCollateral` bind state to `msg.sender` � when called via Router, that's the Router, not the user. Making the Router actually batch requires adding `*For(user, ...)` variants to the market with operator-or-signature auth. That refactor is non-trivial (security review needed on every credit path) and is scheduled for v3.16. Strategic-plan �14 reflects this in the implementation order.

### Not done in v3.15 (planned next)
- ObscuraConfidentialWrapperFactory.sol
- Stealth borrow path (needs market + Router on-behalf-of)
- Market on-behalf-of API
- IEncryptedScore implementation in ObscuraCreditScore + market LLTV-boost integration
- Async-decrypt isUnderwater liquidation gate
- Vault withdraw-queue + 0.2% instant-fee
- Auction `allowTransient` tightening
- Permissionless keeper-tip on hooks
- Frontend `useShield` / `useUnshield` hooks + OperatorApprovalModal
- Multi-asset deploy (ocWETH, ocOBS markets)
- ABI sync + frontend `.env` wiring


---

## v3.16 � Wallet-Native Production (deployed)

**Deployed Arbitrum Sepolia 421614 � 2026-05-22**

| Contract | Address |
|----------|---------|
| ObscuraCreditRouter | `0x46275A34e26C9dBb46fB1716852a5D221564a43F` |
| ObscuraCreditMarket (v3.16, 77 LLTV) | `0x269f59672F3fd7f95bF440941e618b54Ebc5717A` |
| ObscuraCreditVault (v3.16, queue) | `0xE0c5323006AEaF09E449f8B85B24C8A50b389C29` |

### What shipped
- `ObscuraCreditMarket.{supplyCollateral|borrow|repay|withdrawCollateral}For` � on-behalf-of API gated by `setOnBehalfRouter` whitelist. Maintains v3.14 ABI for legacy direct callers.
- `ObscuraCreditRouter.setupAndBorrow / repayAndWithdraw / setupAndBorrowStealth` � collapses two FHE tx into ONE EOA tx via a single wallet signature. Stealth variant also emits `StealthRegistry.announce`.
- `ObscuraCreditVault` withdraw-queue: 24h free path (`requestWithdraw` ? `claimWithdraw`) OR `instantWithdraw` with 0.2% fee to treasury.
- Frontend: `useCreditRouter` + `useVaultQueue` + `useOperatorGrant` hooks; ABIs synced; `CREDIT_ROUTER_ABI` + `CREDIT_*_V316_ADDRESS` env wired.
- All 19 existing credit tests still pass � full backward compatibility.

### Consciously deferred
- `IEncryptedScore` LLTV boost in market borrow path (high regression surface; plaintext shadow gate suffices on testnet).
- Async-decrypt `isUnderwater` liquidation gate (CoFHE async-decrypt complexity vs current plaintext shadow gate).
- Keeper-tip in hook trigger paths.
- `WrapperFactory` (single ocUSDC sufficient for current markets).

---

## End-to-end test guide (Credit app)

**Prereqs**
- MetaMask on Arbitrum Sepolia (chainId 421614); 0.05 ETH from `https://faucet.quicknode.com/arbitrum/sepolia`
- `cd frontend/obscura-os-main; npm install; npm run dev` ? open `http://localhost:5173`

**1. Claim ocUSDC (faucet)**
- Navigate to **Credit ? Onboarding**; click *Claim 10,000 ocUSDC* (24h cooldown per address).
- Verify encrypted balance pill shows `***`; click *Reveal* to decrypt-for-view.

**2. Vault deposit**
- Navigate to **Credit ? Vaults ? v3.16**; enter 1,000 ocUSDC; *Deposit*.
- Encrypted share balance updates after MetaMask receipt.

**3. Vault withdraw � queued (free)**
- Click *Request Withdraw* ? enter 500 shares ? confirm.
- `pendingWithdraw.claimableAt` advances by 24h.
- *Claim Withdraw* button stays disabled until `block.timestamp >= claimableAt`.
- (For local demo, you can shorten via `cancelWithdraw` then `instantWithdraw`.)

**4. Vault withdraw � instant (0.2% fee)**
- Click *Instant Withdraw* ? enter 500 shares ? confirm.
- 499.0 ocUSDC arrives, 1.0 ocUSDC goes to treasury (configured via constructor `feeRecipient`).

**5. One-time operator grant (Router)**
- Open **Operator Approvals** modal; click *Grant Router (7 days)* � single tx on ocUSDC contract.
- `isOperator(user, router)` becomes true.

**6. Single-tx borrow (router)**
- Navigate to **Credit ? Borrow**; pick the v3.16 market; enter 1,000 ocUSDC collateral + 600 ocUSDC borrow.
- Click *Setup & Borrow* � **ONE** MetaMask signature.
- Behind the scenes: Router pulls collateral via `confidentialTransferFrom`, calls `market.supplyCollateralFor`, then `market.borrowFor` which disburses 600 ocUSDC to the user.
- Encrypted balance increases by ~600 ocUSDC.

**7. Single-tx repay + withdraw**
- *Repay & Withdraw*; enter 600 repay + 1,000 collateral withdraw � **ONE** signature.

**8. Stealth borrow**
- *Borrow to Stealth Address*; the UI derives a one-time stealth address + ephemeral pubkey; submit.
- `StealthRegistry.AnnouncementPosted` event fires; the receiving stealth address holds the borrowed 600 ocUSDC encrypted balance.

**9. Per-step legacy flow (no operator)**
- Users who skip the operator grant still get the v3.14 two-step flow via the original `useCreditMarket` hook.

**10. Decrypt discipline**
- Balances stay `***` until *Reveal* is clicked � no auto-decrypt on mount, no MetaMask spam.

---

## v3.17 � IEncryptedScore LLTV Boost, WrapperFactory, Shield/Unshield, Keeper Tips

**Status: Contracts compiled + 19 tests passing. Deploy pending (requires testnet ETH).**
Tag: `wave4-credit-v3.17`

### What shipped

#### Contracts

**`IEncryptedScore.sol` (updated)**
- Added `userTier(address) -> uint8` � returns tier bucket 0/1/2/3 (NOT the raw score).
  - Tier 0 = score < 300; 1 = 300-599; 2 = 600-749; 3 >= 750.
- Total interface: `scoreOf(address)`, `allowTransientForMarket(user, market)`, `userTier(address)`.

**`ObscuraCreditScore.sol` (updated � now implements IEncryptedScore)**
- Added `is IEncryptedScore` to contract declaration.
- Added `mapping(address => uint8) public override userTier`.
- `updateScore()` now computes `userTier[user]` from raw score bucket.
- Added `scoreOf(address)` as alias to `_score[user]` (satisfies interface).
- Added `allowTransientForMarket(user, market)` � requires prior `attestForMarket` � calls `FHE.allowTransient(_score[user], market)`.

**`ObscuraCreditMarket.sol` (updated � score oracle + LLTV boost)**
- `address public scoreOracle` state var.
- `setScoreOracle(address)` � factory-only, emits `ScoreOracleSet`.
- `borrow()` and `borrowFor()` both get a two-layer LLTV boost block (before the plaintext guard):
  1. **Plaintext tier path**: `try scoreOracle.userTier(user)` � if tier >= 3, boosts LLTV by +400bps, capped at 9000.
  2. **FHE in-circuit path**: `try scoreOracle.allowTransientForMarket(user, this)` + `FHE.gte(eScore, 750)` + `FHE.select(eTier3, boostedLLTV, _lltv)` � proves selection in-circuit without revealing score.
  Both paths use try/catch � oracle failures are non-reverting.

**`ObscuraCreditInsuranceHook.sol` (updated � keeper tips + failure isolation)**
- Added `event HookSkipped(uint256 indexed subId, string reason)`.
- Added `event KeeperTip(address indexed keeper, uint256 indexed subId, uint64 amt)`.
- `topUp()` body wrapped in try/catch � operator failures emit `HookSkipped` instead of reverting.
- On success: emits `KeeperTip(msg.sender, subId, tip)` where tip = 0.05% of perCycle, capped at 1 USDC (1_000_000 units). Off-chain treasury batch-processes payouts.

**`ObscuraCreditStreamHook.sol` (updated � keeper tips + failure isolation)**
- Identical changes: `HookSkipped`, `KeeperTip` events; try/catch in `pull()`; same tip formula.

**`ObscuraConfidentialWrapperFactory.sol` (NEW)**
- Deploys `ObscuraConfidentialToken` wrappers for any ERC-20.
- `mapping(address => address) public wrapperOf` + `address[] public allWrappers`.
- `deploy(underlying, name, symbol, decimals, faucetAmt)` � deploys token, calls `setUnderlying(underlying)` if non-zero, transfers guardianship to factory owner.
- `AlreadyExists` error guards against duplicate wrappers.
- Events: `WrapperDeployed`, `OwnershipTransferred`.

#### Frontend

**`src/hooks/useShield.ts` (NEW)**
- `claimFaucet()` + `shield(amount)` � no FHE encryption needed (shield takes plain uint256).
- FHE step: IDLE ? SENDING ? SETTLING ? READY.
- Optional `tokenAddress` param, defaults to `CONFIDENTIAL_USDC_ADDRESS`.

**`src/hooks/useUnshield.ts` (NEW)**
- `unshield(amtPlain, to)` � encrypts via `encryptAmount` from `@/lib/fhe`.
- FHE step: IDLE ? ENCRYPTING ? SENDING ? SETTLING ? READY.
- Calls `token.unshield(amtPlain, encAmt, to)`.

**`src/components/credit/OperatorApprovalModal.tsx` (NEW)**
- Plain-language modal for `setOperator(operator, expirySeconds)` � NO FHE encryption (operator approval is plaintext).
- Default expiry 7 days. Props: `open, onClose(approved: bool), tokenAddress?, operatorAddress?, expiryDays?`.
- States: idle / pending / done / error. Uses shadcn Dialog + Button + Badge.
- Shows operator address, expiry, plain-language privacy explanation.

**`docs/credit/PRIVACY_MATRIX.md` (NEW)**
- 10-section document covering public vs encrypted vs never-revealed data.
- Shield/unshield privacy model, score oracle leakage analysis, LLTV boost information leakage, keeper/hook transparency, vault privacy model, WrapperFactory notes, future enhancements.

#### ABIs synced (frontend `src/abis/credit/`)
- `ObscuraCreditMarket.json` � includes `setScoreOracle`, updated `borrow`/`borrowFor` ABI.
- `ObscuraCreditScore.json` � includes `scoreOf`, `allowTransientForMarket`, `userTier`.
- `ObscuraConfidentialWrapperFactory.json` � new.
- `ObscuraCreditInsuranceHook.json` � includes `HookSkipped` + `KeeperTip` events.
- `ObscuraCreditStreamHook.json` � includes `HookSkipped` + `KeeperTip` events.

### Compile result
54 Solidity files compiled successfully (evm target: cancun, viaIR).

### Test result
19/19 passing (813ms) � all existing credit tests pass; no regressions.

### Deploy note
`ObscuraConfidentialWrapperFactory` is new and not yet deployed to Arb Sepolia.
Deploy with: `npx hardhat run scripts/deployWave4v316.ts --network arb-sepolia` (or a new v317 script).
After deploy, add to `.env`:
```
VITE_OBSCURA_WRAPPER_FACTORY_ADDRESS=<deployed address>
```
And add to `src/config/credit.ts`:
```typescript
export const WRAPPER_FACTORY_ADDRESS = import.meta.env.VITE_OBSCURA_WRAPPER_FACTORY_ADDRESS as `0x${string}` | undefined;
export const WRAPPER_FACTORY_ABI = WrapperFactoryAbi as any;
```

### Live v3.16 addresses (unchanged)
| Contract | Address |
|----------|---------|
| ocUSDC (ObscuraConfidentialToken) | `0xf963fD86348813786ed57b8b2778A365C6226E43` |
| ObscuraCreditRouter | `0x46275A34e26C9dBb46fB1716852a5D221564a43F` |
| ObscuraCreditMarket (v3.16, 77% LLTV) | `0x269f59672F3fd7f95bF440941e618b54Ebc5717A` |
| ObscuraCreditVault (v3.16, withdraw-queue) | `0xE0c5323006AEaF09E449f8B85B24C8A50b389C29` |
| ObscuraCreditScore | `0xA83aCeE57af79D77cac6854edf92A63A60c28c18` |
| ObscuraCreditStreamHook | `0x740580C5FF321440C61c6Af667C191Eea2249F96` |
| ObscuraCreditInsuranceHook | `0x55f632401d238dFBEdd63B4adDF5B64DfB178190` |
| ObscuraTreasury | `0x89252ee3f920978EEfDB650760fe56BA1Ede8c08` |

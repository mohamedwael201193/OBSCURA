# MASTER REFACTOR PLAN — Obscura Ecosystem Architecture Audit

**Date**: 2026-05-23
**Author**: Architecture audit pass triggered by user halt-order ("STOP FEATURE DEVELOPMENT IMMEDIATELY").
**Status**: ✅ §10 COMPLETE — all deferred migration items resolved. Feature freeze lifted. Resume from `summary5.md` Phase 12.

> This document is the single source of truth for the current cleanup.
> Every cleanup commit must reference a section here. Once §10 is fully ✅, feature work resumes from `summary5.md` Phase 12.

---

## 0. TL;DR — The 7 real problems

1. **Two governance surfaces** (`/vote` + `/governance`) — I created `/governance` this session even though `VotePage` already has a sidebar with **Proposals / Delegations / Treasury / Participation**. ❌ Duplicate. → **Merge Governor into VotePage as new sidebar item; delete `/governance` route + page + Govern nav entry**.
2. **Credit contract sprawl** — at least **9 distinct market deployments** and **5 vault deployments** exist on Arb Sepolia. Frontend `.env` still points to *old* v3.12/v3.14 addresses for some hooks while the keeper bot reads *v3.19* addresses. The "true production" set is `v2_*` + `v319_*`; everything else is dead weight.
3. **Old V1 Pay contracts still in the env** — `VITE_OBSCURA_PAY_STREAM_ADDRESS` (V1, marked BROKEN in repo memory), `VITE_OBSCURA_PAYROLL_RESOLVER_ADDRESS` (V1) — both have V2 replacements live and used. Frontend should not even know V1 addresses exist.
4. **Reineira leakage** — `VITE_REINEIRA_CUSDC_ADDRESS` and 6 other Reineira env entries are still wired even though we shipped `ocUSDC`/`ocWETH`/`ocOBS` wrappers specifically to remove that dependency. Some hooks (`useCUSDCBalance`, `useCUSDCEscrow`, `useCUSDCTransfer`) still reference cUSDC paths.
5. **Token naming drift** — `cUSDC`, `cOBS`, `cWETH` appear alongside `ocUSDC`, `ocOBS`, `ocWETH` in the same codebase. Plan V2 mandated `oc*` everywhere; old `c*` references are stale.
6. **Orphan contracts in source tree** — `ObscuraEscrow.sol` (V1, replaced by `ObscuraConfidentialEscrow.sol`), `ObscuraPayStream.sol` (V1), `ObscuraPayrollResolver.sol` (V1), `ObscuraCreditScore.sol` (V1, replaced by V2), `TestPushcUSDC.sol`, plus `ObscuraElection` deploy entry (election module was officially removed per WAVE3-VOTE-PROGRESS §13) all still in the repo.
7. **Three deployments JSON keys are missing from the canonical `frontend/.env`** — `VITE_OBSCURA_GOVERNOR_ADDRESS`, `VITE_OBSCURA_TIMELOCK_ADDRESS`, `VITE_OBSCURA_TREASURY_STREAMER_ADDRESS` (Wave 5 Phase 4-5) plus `VITE_OBSCURA_CREDIT_SCORE_V2_ADDRESS` and `VITE_OBSCURA_CHAINLINK_*` (Wave 5 Phase 1-2). My ABI module hardcodes fallbacks, but the env file is the source of truth.

---

## 1. Information Architecture — current vs target

### 1.1 Current routes
| Route | Page | Sidebar? | Notes |
|---|---|---|---|
| `/` | `Index.tsx` | – | landing |
| `/pay` | `PayPage.tsx` | yes (Home/Send/Receive/Streams/Escrow/Insurance/Contacts/Settings/Legacy) | OK |
| `/pay/contacts` | `ContactsPage.tsx` | yes | OK |
| `/pay/settings` | `SettingsPage.tsx` | yes | OK |
| `/vote` | `VotePage.tsx` | yes (Dashboard/Proposals/Delegations/Treasury/Participation/Resources) | **already a full governance surface** |
| `/credit` | `CreditPage.tsx` | yes (Markets/Position/Vaults/Liquidations) | OK |
| `/governance` | `GovernancePage.tsx` | no | ❌ **DELETE — duplicates `/vote`** |
| `/docs` | `DocsPage.tsx` | – | OK |
| `/privacy` | `PrivacyPage.tsx` | – | OK |
| `/pmf` | `PMFPage.tsx` | – | internal metrics — keep but **mark non-shipping** |

### 1.2 Target routes (canonical, post-cleanup)
| Route | Page | Sidebar items |
|---|---|---|
| `/` | Index | – |
| `/pay` (+ `/pay/contacts`, `/pay/settings`) | PayPage | Home, Send, Receive, Streams, Escrow, Insurance, Contacts, Settings |
| `/vote` | VotePage | Dashboard · **Encrypted Polls** · **Executable Proposals** *(new)* · Delegations · Treasury · Participation · Resources |
| `/credit` | CreditPage | Markets · Position · Vaults · Liquidations |
| `/docs` | DocsPage | – |
| `/privacy` | PrivacyPage | – |
| `/pmf` | PMFPage *(internal)* | – |

### 1.3 GooeyNav target
```
Pay · Vote · Credit · Vault (soon) · Trust (soon) · Mind (soon) · Docs
```
Remove the `Govern` chip entirely.

---

## 2. Governance consolidation (executed in this pass)

**Decision**: `ObscuraVote` (FHE sealed ballots) and `ObscuraGovernor` (OZ executable proposals) are different mechanisms, but both are "DAO governance" from the user's perspective. They live under **one** Vote page.

**VotePage sidebar — Modules section gets one new entry**:
- **Encrypted Polls** *(existing — sealed FHE voting on `ObscuraVote`)*
- **Executable Proposals** *(new — OZ Governor → Timelock → execute)*

**Files to change**:
- ✅ Extract `GovernancePage.tsx` body into `components/vote/GovernorPanel.tsx`
- ✅ Mount `<GovernorPanel />` under new VotePage tab key `"governor"`
- ✅ Add sidebar item `{ key: "governor", label: "Executable Proposals", icon: Gavel }`
- ✅ Delete `src/pages/GovernancePage.tsx`
- ✅ Delete `<Route path="/governance">` and `import GovernancePage` from `App.tsx`
- ✅ Remove `/governance` from `DASHBOARD_PATHS`
- ✅ Delete `{ key: "gov", label: "Govern" }` from `GooeyNav.NAV_ITEMS` and `pathToKey`
- ✅ Keep `src/abis/ObscuraGovernor.ts` and `src/hooks/useGovernor.ts` (still used by the merged panel)

This is the **immediate cleanup** executed in this same commit.

---

## 3. Contract inventory — keep / archive / delete

### 3.1 Solidity sources (`contracts-hardhat/contracts/`)

| File | Status | Action |
|---|---|---|
| `ObscuraPay.sol` | ✅ live | keep |
| `ObscuraToken.sol` | ✅ live ($OBS) | keep |
| `ObscuraVote.sol` (V5) | ✅ live | keep |
| `ObscuraTreasury.sol` | ✅ live (Vote treasury) | keep |
| `ObscuraRewards.sol` | ✅ live | keep |
| `ObscuraInvoice.sol` | ✅ live | keep |
| `ObscuraConfidentialEscrow.sol` | ✅ live | keep |
| `ObscuraAddressBook.sol` | ✅ live | keep |
| `ObscuraInboxIndex.sol` | ✅ live | keep |
| `ObscuraInsuranceSubscription.sol` | ✅ live | keep |
| `ObscuraSocialResolver.sol` | ✅ live | keep |
| `ObscuraStealthRegistry.sol` | ✅ live | keep |
| `ObscuraStealthRotation.sol` | ✅ live | keep |
| `ObscuraPayStreamV2.sol` | ✅ live | keep |
| `ObscuraPayrollResolverV2.sol` | ✅ live | keep |
| `ObscuraPayrollUnderwriter.sol` | ✅ live | keep |
| `ObscuraPermissions.sol` | ✅ live | keep |
| `ObscuraConditionResolver.sol` | ✅ live | keep |
| `governance/ObscuraGovernor.sol` | ✅ live (Wave 5 P4) | keep |
| `governance/ObscuraTreasuryStreamer.sol` | ✅ live (Wave 5 P5) | keep |
| `credit/ObscuraCreditMarket.sol` | ✅ live (v2_M86, v319_M70WETH, v319_M50OBS) | keep |
| `credit/ObscuraCreditVault.sol` | ✅ live (v2 Conservative + Balanced) | keep |
| `credit/ObscuraCreditRouter.sol` | ✅ live | keep |
| `credit/ObscuraCreditOracle.sol` | ✅ live | keep |
| `credit/ObscuraCreditIRM.sol` | ✅ live | keep |
| `credit/ObscuraCreditFactory.sol` | ✅ live | keep |
| `credit/ObscuraCreditAuction.sol` | ✅ live | keep |
| `credit/ObscuraCreditScoreV2.sol` | ✅ live (Wave 5 P1) | keep |
| `credit/ObscuraCreditStreamHook.sol` | ✅ live | keep |
| `credit/ObscuraCreditInsuranceHook.sol` | ✅ live | keep |
| `credit/ObscuraCreditGovernanceProxy.sol` | ✅ live | keep |
| `credit/ObscuraConfidentialToken.sol` | ✅ live (oc* wrappers) | keep |
| `credit/ObscuraConfidentialWrapperFactory.sol` | ✅ live | keep |
| `credit/ChainlinkPriceAdapter.sol` | ✅ live (Wave 5 P2) | keep |
| `credit/IEncryptedScore.sol`, `IObscuraCreditIRM.sol`, `IObscuraCreditOracle.sol` | ✅ interfaces | keep |
| `credit/SeedV314Liquidity.sol` | ⚠️ one-shot deploy helper, served its purpose | **archive** |
| `credit/mocks/` | ⚠️ test fixtures | keep but exclude from prod deploy |
| `ObscuraEscrow.sol` | ❌ **V1, replaced by `ObscuraConfidentialEscrow.sol`** | **archive** |
| `ObscuraPayStream.sol` | ❌ **V1, marked BROKEN in repo memory (selector mismatch)** | **archive** |
| `ObscuraPayrollResolver.sol` | ❌ **V1, replaced by V2** | **archive** |
| `credit/ObscuraCreditScore.sol` | ❌ **V1, replaced by `ObscuraCreditScoreV2.sol`** | **archive** |
| `TestPushcUSDC.sol` | ❌ one-off diag contract | **archive** |

**Archive target**: create `contracts-hardhat/contracts/_archive/` and move the 5 archive entries there. Keep their Solidity intact for reproducibility; remove from hardhat compile path via a glob exclude in `hardhat.config.ts` to drop them out of the artifacts bundle.

### 3.2 Deployed addresses — canonical set

Everything below is **live and used**. Anything in `deployments/arb-sepolia.json` not listed here is dead weight and should be moved into a `_archive` block in the same JSON.

**Pay (Wave 3)**:
- ObscuraPay `0x91CdD…47a4`
- ObscuraToken (OBS) `0xf4A1…5ED2`
- ObscuraConfidentialEscrow `0x889D…8D9A`
- ObscuraInvoice `0x62a8…20b7`
- ObscuraPayStreamV2 `0xb2fF…4d2C`
- ObscuraPayrollResolverV2 `0x0f13…7bBF`
- ObscuraPayrollUnderwriter `0x8fA4…088c`
- ObscuraAddressBook `0x4095…74Eef`
- ObscuraInboxIndex `0xDF19…8131`
- ObscuraInsuranceSubscription `0x0CCE…8102`
- ObscuraSocialResolver `0xCe79…7578`
- ObscuraStealthRegistry `0xa36e…917d`
- ObscuraStealthRotation `0x47D4…5289`

**Vote (Wave 3)**:
- ObscuraVote V5 `0xe358…1730`
- ObscuraTreasury `0x8925…8c08`
- ObscuraRewards `0x435e…5BC2`

**Credit (Wave 4 v3.18+ canonical)**:
- ObscuraCreditFactory `0x5aDC…5680`
- ObscuraCreditOracle `0x5F00…23c3`
- ObscuraCreditIRM `0xA072…57Bc`
- ObscuraCreditAuction `0x205F…828F0`
- ObscuraCreditStreamHook `0x7405…9F96`
- ObscuraCreditInsuranceHook `0x55f6…8190`
- ObscuraCreditGovernanceProxy `0x1C68…DA49C`
- ObscuraCreditRouter (v3.16) `0x4627…4a43F`
- M-86 Market (v2 prod) `0xcf98…eC8b`
- M-70-WETH Market (v3.19) `0x0b64…9207B`
- M-50-OBS Market (v3.19) `0x05e5…9035d`
- Conservative Vault V2 `0xCEBb…B898`
- Balanced Vault V2 `0xF508…78Bbc`
- ocUSDC `0xf963…6E43`
- ocWETH (v3.19) `0x1689…BD56e`
- ocOBS (v3.19) `0x2729…00778`
- ObscuraCreditScoreV2 (Wave 5 P1) `0xe5B0…3D4D`
- ChainlinkPriceAdapter ETH/USD `0xe3E3…36B3`
- ChainlinkPriceAdapter USDC/USD `0xc65e…2c4A`

**Governance (Wave 5)**:
- ObscuraTimelock `0x07b7…9E05`
- ObscuraGovernor `0xE480…7186`
- ObscuraTreasuryStreamer `0x4af7…0FeD`

**Archive in deployments JSON** (move into `"_archive": { … }` block, do not delete):
- `ObscuraPayStream` (V1 broken), `ObscuraPayrollResolver` (V1), `ObscuraEscrow` (V1)
- `ObscuraCreditScore` (V1)
- `ObscuraCreditFeedUSDC`, `ObscuraCreditFeedOBS`, `ObscuraCreditFeedWETH` (superseded by ChainlinkPriceAdapter)
- `ObscuraCreditMarket_77` (v3.12 + v3.14 + v3.16 variants — all superseded by v2_M86)
- `ObscuraCreditMarket_86` (v3.12), `ObscuraCreditMarket_cOBS_cUSDC`, `ObscuraCreditMarket_cWETH_cUSDC` (v3.12 — superseded by v319 markets)
- `ObscuraCreditVault_Conservative`, `ObscuraCreditVault_Aggressive` (v3.12 — superseded by v2 vaults)
- `v314_*`, `v316_*` block (all superseded by v2_*)
- `ObscuraElection` (module removed per WAVE3-VOTE-PROGRESS §13)
- The entire `Reineira` block stays in the JSON as external reference but the FE env must drop these
- `InsurancePool`, `SocialResolverEnsVerifier`, `InsuranceSubscriptionConsumer` — verify if still referenced; if not, archive

---

## 4. Frontend cleanup — files to touch

### 4.1 Pages
| File | Status | Action |
|---|---|---|
| `Index.tsx` | ✅ | keep |
| `PayPage.tsx` | ✅ | keep |
| `ContactsPage.tsx` | ✅ | keep |
| `SettingsPage.tsx` | ✅ | keep |
| `VotePage.tsx` | ✅ — gets "Executable Proposals" sidebar item | edit |
| `CreditPage.tsx` | ✅ | keep |
| `GovernancePage.tsx` | ❌ duplicate | **delete** |
| `DocsPage.tsx`, `PrivacyPage.tsx`, `PMFPage.tsx`, `NotFound.tsx` | ✅ | keep |

### 4.2 Hooks — duplicate/legacy review

| Hook | Status |
|---|---|
| `useCUSDCBalance.ts`, `useCUSDCEscrow.ts`, `useCUSDCTransfer.ts` | ⚠️ legacy Reineira cUSDC. Check call sites; if only used in Pay-V1 components, archive. If used in active Pay V2, **rename to use ocUSDC** + remove Reineira fallbacks |
| `useGovernor.ts` | ✅ keep (now consumed by `GovernorPanel` instead of `GovernancePage`) |
| `useProposals.ts` | ✅ keep (different contract — `ObscuraVote`) |
| All other hooks | provisionally ✅ — schedule a follow-up dead-code pass after Phase 12 |

### 4.3 Components — duplicate/legacy review
Folders to spot-check for V1 leftovers:
- `components/pay/` vs `components/pay-v4/` — confirm only `pay-v4/` is imported by the live `PayPage.tsx`; if so, mark `components/pay/` as **archive**.
- `components/vote/AdminControls.tsx` — check if Election admin survives the V3 removal of election module; if Election-only, **archive**.

(Full per-component audit deferred to a follow-up; not a blocker.)

---

## 5. Env audit — canonical `frontend/obscura-os-main/.env`

### 5.1 Remove (legacy / superseded)
```
VITE_OBSCURA_PAY_STREAM_ADDRESS                # V1 BROKEN, V2 lives at VITE_OBSCURA_PAY_STREAM_V2_ADDRESS
VITE_OBSCURA_PAYROLL_RESOLVER_ADDRESS          # V1, V2 lives at VITE_OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS
VITE_REINEIRA_CUSDC_ADDRESS                    # superseded by oc*
VITE_REINEIRA_ESCROW_ADDRESS                   # superseded by ObscuraConfidentialEscrow
VITE_REINEIRA_COVERAGE_MANAGER_ADDRESS         # external, unused in current FE
VITE_REINEIRA_POOL_FACTORY_ADDRESS             # external, unused
VITE_REINEIRA_POLICY_REGISTRY_ADDRESS          # external, unused
VITE_REINEIRA_CCTP_RECEIVER_ADDRESS            # external, unused
VITE_REINEIRA_INSURANCE_POOL_ADDRESS           # external, unused
VITE_OBSCURA_CREDIT_MARKET_77_ADDRESS          # v3.14 dead — production is v2_M86
VITE_OBSCURA_CREDIT_MARKET_86_ADDRESS          # v3.12 dead — production is v2_M86
VITE_OBSCURA_CREDIT_VAULT_CONSERVATIVE_ADDRESS # v3.14 dead
VITE_OBSCURA_CREDIT_VAULT_AGGRESSIVE_ADDRESS   # v3.14 dead
VITE_OBSCURA_CREDIT_SCORE_ADDRESS              # V1 — replaced by V2 (already in env)
VITE_OBSCURA_CREDIT_MARKET_COBS_CUSDC_ADDRESS  # v3.12 dead
VITE_OBSCURA_CREDIT_MARKET_CWETH_CUSDC_ADDRESS # v3.12 dead
```

Each removal must be preceded by a `grep_search` for the variable name; if it still has live consumers, the consumer is patched to use the canonical replacement before the env line is dropped.

### 5.2 Confirm present (Wave 5)
```
VITE_OBSCURA_GOVERNOR_ADDRESS=0xE4807C9F90a0da8F5B5bafa4361B15ff855b7186
VITE_OBSCURA_TIMELOCK_ADDRESS=0x07b7961627f433a1d9001F82Ac4af9F19b9a9E05
VITE_OBSCURA_TREASURY_STREAMER_ADDRESS=0x4af75Ae3B46C34B70d6E85FEcDb71E99EC490FeD
VITE_OBSCURA_CREDIT_SCORE_V2_ADDRESS=0xe5B0c6c06C0B1fd7d7CD5D2e93997693863d3D4D
VITE_OBSCURA_CHAINLINK_ETHUSD_ADAPTER_ADDRESS=0xe3E388b421bfcF558FD46a18eE3b1c27aD1D36B3
VITE_OBSCURA_CHAINLINK_USDCUSD_ADAPTER_ADDRESS=0xc65e85926Cb29aaEC74f99cF1591CBa65daa2c4A
```
*(Already added in prior session per `summary5.md`, just verifying.)*

---

## 6. Keeper & bot envs

### 6.1 `packages/credit-keeper/.env`
**Status: ✅ correctly wired.** Markets array `0xcf98…,0x0b64…,0x05e5…` matches v2_M86 + v319_M70WETH + v319_M50OBS exactly. Auction matches. Chainlink adapters match.

**Only nit**: the comment still says `# Live markets: M-86 ocUSDC | M-70-WETH | M-50-OBS` which is correct but should explicitly note these are the **v2/v3.19 production** addresses, not v3.12.

---

## 7. Token system — single source of truth

| Symbol | Address | Decimals | Notes |
|---|---|---|---|
| OBS | `0xf4A1…5ED2` | 18 | governance token |
| ocUSDC | `0xf963…6E43` | 6 | shielded USDC (Plan V2 canonical) |
| ocWETH (v3.19) | `0x1689…BD56e` | 18 | shielded WETH (Plan V2 canonical) |
| ocOBS (v3.19) | `0x2729…00778` | 8 | shielded OBS (Plan V2 canonical) |
| ~~cUSDC (Reineira)~~ | ~~`0x6b6e…d89f`~~ | 6 | ❌ **deprecate; broken selector** |
| ~~ocWETH (V1)~~ | ~~`0xA377…5518`~~ | 8 | ❌ superseded by v3.19 |
| ~~ocOBS (V1)~~ | ~~`0x68d6…DCbD`~~ | 8 | ❌ superseded by v3.19 |

**Naming rule going forward**: every user-facing string is `ocUSDC` / `ocWETH` / `ocOBS`. No `cUSDC` / `cOBS` / `cWETH` may appear in components, ABIs, env keys, or copy. Setup, faucet, balance tiles, and ticker were already corrected per WAVE4 v3.18.1 — this rule formalizes "no regressions".

---

## 8. Cross-product wiring — verified links

| From | To | Status |
|---|---|---|
| `ObscuraVote.voterParticipation` | `ObscuraGovernor.getVotes` | ✅ wraps participation as voting power (Wave 5 P4) |
| `ObscuraVote.voterParticipation` | `ObscuraCreditScoreV2` | ✅ Wave 5 P1 (docs/credit/SCORE_FEED_FROM_VOTE.md) |
| `ObscuraPayStreamV2.streamsByEmployer` | `ObscuraCreditScoreV2` | ✅ Wave 5 P1 |
| `ObscuraAddressBook.listContactIds` | `ObscuraCreditScoreV2` | ✅ Wave 5 P1 |
| `ObscuraCreditScoreV2` | `ObscuraCreditMarket.scoreOf / userTier` | ✅ wired to M-86, M-70-WETH, M-50-OBS |
| `ChainlinkPriceAdapter` | `ObscuraCreditOracle.setPublicFeed` | ✅ ocWETH + ocUSDC |
| `ObscuraGovernor` proposals | `ObscuraTreasuryStreamer.openStream` | ✅ Streamer is timelock-only, callable only via Governor → Timelock |
| `ObscuraVote` rewards/treasury | `ObscuraRewards` + `ObscuraTreasury` | ✅ Wave 3 |

**Missing/aspirational**: none right now — every documented link is actually deployed.

---

## 9. Frontend dead-code follow-up (deferred, not blocking)

After §10 is green:
1. `npx ts-prune --error` (or equivalent) across `frontend/obscura-os-main/src/`
2. Eyeball `components/pay/` vs `components/pay-v4/` — if `pay/` has zero imports, archive
3. Inventory `components/vote/AdminControls.tsx` — confirm not tied to removed Election
4. Walk `useCUSDC*` hooks; rename + drop Reineira fallbacks

---

## 10. ✅ Acceptance checklist — exit criteria for the refactor pass

Feature work resumes **only when all of these are ticked**.

- [x] `MASTER_REFACTOR_PLAN.md` created (this file)
- [x] `/governance` route deleted from `App.tsx`
- [x] `src/pages/GovernancePage.tsx` deleted
- [x] `Govern` chip removed from `GooeyNav.NAV_ITEMS` and `pathToKey`
- [x] `components/vote/GovernorPanel.tsx` created (extracted from former GovernancePage)
- [x] `VotePage.tsx` gains `governor` sidebar item rendering `<GovernorPanel />`
- [x] `DASHBOARD_PATHS` in `App.tsx` no longer mentions `/governance`
- [x] Frontend builds clean (`npm run build` exit 0)
- [x] `summary5.md` Phase 8 section rewritten to reflect the merge (no more "/governance route")
- [x] `/memories/repo/obscura-deployment.md` updated to reflect the merge
- [x] *(Completed this session)* env cleanup per §5.1 — dead VITE_* keys removed from `.env`, dead exports removed from `credit.ts` + `pay.ts`, dead ABIs removed from `pay.ts`, `envHealth.ts` REQUIRED_KEYS cleaned
- [x] *(Completed this session)* contract archive per §3.1 — `ObscuraEscrow.sol`, `ObscuraPayStream.sol`, `ObscuraPayrollResolver.sol`, `ObscuraCreditScore.sol`, `SeedV314Liquidity.sol` moved to `contracts-hardhat/_archived/`
- [x] *(Completed this session)* `CREDIT_SCORE_V2_ADDRESS` export added to `credit.ts`; `.env` has `VITE_OBSCURA_CREDIT_SCORE_V2_ADDRESS` address confirmed present
- [x] *(Completed — refactor session 2)* deployment JSON archive block per §3.2 — `_archive` block added to `arb-sepolia.json`, all obsolete entries moved; JSON validated
- [x] *(Completed — refactor session 2)* `ObscuraCreditScoreV2.json` ABI created in `src/abis/credit/`; `CREDIT_SCORE_V2_ABI` exported from `credit.ts`
- [x] *(Completed — refactor session 2)* `useCredit.ts` migrated from V1 Score → `CREDIT_SCORE_V2_ADDRESS` + `CREDIT_SCORE_V2_ABI`; `getScore` → `scoreOf`
- [x] *(Completed — refactor session 2)* `useCUSDCBalance.ts` migrated: Reineira cUSDC → ocUSDC (`CONFIDENTIAL_USDC_ADDRESS`), V1 stream → V2 (`OBSCURA_PAY_STREAM_V2_ADDRESS`), `wrap/unwrap` → `shield/unshield`; 403 fallback removed (no longer needed)
- [x] *(Completed — refactor session 2)* `useCreateStream.ts` migrated: now delegates to `usePayStreamV2.createStream`; V1 stream removed
- [x] *(Completed — refactor session 2)* Build verified: `✓ built in 12.33s`, zero TypeScript errors

Once the above are ✅, the next session may resume `summary5.md` Phase 12 (FHE.select audit) and onward.

---

## 11. Decision log (binding)

| # | Decision | Reason |
|---|---|---|
| D1 | Governor merges into VotePage; `/governance` is **deleted**, not renamed | One DAO surface; mismatched route inflates IA |
| D2 | `ObscuraVote` and `ObscuraGovernor` both stay — different products: sealed signaling vs executable proposals + timelock | Real functional difference; deleting either loses value |
| D3 | Credit production set is `v2_*` + `v319_*` + Router `v316_*`. All other `vN_*` keys move to `_archive` JSON block | Reduces ambiguity for FE wiring and audit |
| D4 | V1 Pay contracts (`ObscuraPayStream`, `ObscuraPayrollResolver`, `ObscuraEscrow`) move to `contracts/_archive/` | Confirmed superseded |
| D5 | Reineira env vars removed from FE | We no longer depend on Reineira tokens for the live product |
| D6 | `oc*` is the only valid shielded-token prefix in code + UI | Plan V2 mandate |
| D7 | Feature freeze remains in effect until §10 acceptance ticks ✅ | User halt-order |

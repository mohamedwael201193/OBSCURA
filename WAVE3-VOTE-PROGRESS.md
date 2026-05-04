# Wave 3 — ObscuraVote: Governance Stack Progress

> **Wave 2** delivered the core voting system: ObscuraVote contract, proposal creation,  
> FHE-encrypted ballot casting, tally finalization, and the basic VotePage frontend.
>
> **Wave 3** adds the full DAO governance stack on top: a controlled ETH treasury,  
> voter incentive rewards, on-chain vote delegation, guided onboarding, and  
> a complete UX overhaul with bug fixes discovered through testnet usage.

---

## What Was Already Done in Wave 2

| Item | Status |
|------|--------|
| `ObscuraVote.sol` (multi-option FHE voting) | ✅ |
| `createProposal`, `castVote`, `finalizeVote`, `cancelProposal`, `extendDeadline` | ✅ |
| `VotePage.tsx` with 5 sub-tabs (Create, Proposals, Cast Vote, Results, History) | ✅ |
| `ProposalList`, `CastVoteForm`, `TallyReveal`, `CreateProposalForm`, `AdminControls`, `VotingHistory` | ✅ |
| `useProposals`, `useEncryptedVote`, `useVoteTally` hooks | ✅ |
| $OBS token-gated proposal creation (replaces admin-only in Wave 1) | ✅ |
| Anti-coercion revoting | ✅ |
| FHE.allowPublic tally reveal after finalization | ✅ |

---

## Wave 3 Scope — What Was Built

| # | Item | Status |
|---|------|--------|
| 1 | `ObscuraVote V5` — weighted quorum fix | ✅ |
| 2 | `ObscuraTreasury.sol` — FHE-encrypted ETH vault | ✅ |
| 3 | `ObscuraRewards.sol` — voter incentive pool | ✅ |
| 4 | `DelegationPanel.tsx` + `useDelegation.ts` | ✅ |
| 5 | `TreasuryPanel.tsx` + `useTreasury.ts` | ✅ |
| 6 | `RewardsPanel.tsx` + `useRewards.ts` | ✅ |
| 7 | `VoteSetupGuide.tsx` — 4-step onboarding | ✅ |
| 8 | `ProposalList` — quorum progress bars | ✅ |
| 9 | `VoteDashboard` — FHE banner + Vote Power stat | ✅ |
| 10 | `VotePage` sidebar + tabs restructured | ✅ |
| 11 | All write hooks — standardized gas params | ✅ |
| 12 | Timelock display formatter fix | ✅ |
| 13 | Election module removed entirely | ✅ |
| 14 | `VOTE-APP-DOCS.md` — full technical docs | ✅ |

---

## Deployed Contracts (Arbitrum Sepolia — 421614)

| Contract | Address | Notes |
|----------|---------|-------|
| ObscuraVote V5 | `0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730` | Replaces V4 `0x5d91B5…` |
| ObscuraTreasury | `0x89252ee3f920978EEfDB650760fe56BA1Ede8c08` | New in Wave 3 |
| ObscuraRewards | `0x435ea117404553A6868fbe728A7A284FCEd15BC2` | New in Wave 3 |

---

## Detailed Changelog

---

### [1] ObscuraVote V5 — Weighted Quorum Fix

**Problem:** Wave 2's quorum check used `p.totalVoters++` (headcount). A voter with delegated weight of 10 counted the same as a voter with weight 1 toward quorum.

**Fix:**
```solidity
// Before (Wave 2)
p.totalVoters++;

// After (Wave 3)
p.totalVoters += weight;  // weight = delegationWeight[voter] or 1
```

**Impact:** Quorum now accurately reflects the total vote weight cast, not just number of wallets. A voter with 5 delegators moves the quorum bar by 6, not 1.

**Redeployed to:** `0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730`

---

### [2] ObscuraTreasury.sol — FHE-Encrypted ETH Vault

**Why it exists:** After a governance proposal passes, the DAO needs a way to release ETH to a recipient. The spend amount should be private during voting (to avoid price anchoring), revealed only at execution.

**Design decisions:**
- `attachSpend` stores `amountGwei` in a **private mapping** (not ABI-readable) AND as an FHE ciphertext
- `executeSpend` reads from private storage — no user needs to remember or input the amount
- At execution, `FHE.allowPublic(encAmount)` creates a permanent transparency record on-chain
- Configurable timelock (minimum 60s, default 48h) — admin can set to 5min for testnet

**Key functions added:**
```
attachSpend(proposalId, recipient, amountGwei, encAmountGwei)
recordFinalization(proposalId)     — starts timelock
executeSpend(proposalId)           — single click, reads amount from storage
setTimelockDuration(seconds)       — admin configurable
setVoteContract(address)           — for redeployment without data loss
getSpendRequest(proposalId)        — (recipient, executed, exists, timelockEnds, amountGwei)
```

**First deployment issue:** Treasury was deployed pointing to old ObscuraVote `0x5d91B5…`. When we redeployed Vote to fix weighted quorum, Treasury's `recordFinalization` reverted with "Proposal not finalized" because it was querying the old contract. Fixed by redeploying Treasury with new Vote address.

---

### [3] ObscuraRewards.sol — Voter Incentive Pool

**Why it exists:** Incentivize governance participation with 0.001 ETH per finalized proposal vote.

**FHE layer:** Each voter's balance is an `euint64` ciphertext — no one can read another voter's balance on-chain.

**Plain accounting layer:** `_totalAccruedGwei` and `_totalWithdrawnGwei` (private mappings) drive actual ETH transfers.

**Key functions:**
```
accrueReward(proposalId)    — 0.001 ETH per finalized proposal (FHE.add)
requestWithdrawal()         — step 1: set withdrawal flag
withdraw()                  — step 2: transfer ETH
pendingRewardWei(voter)     — view pending amount
setVoteContract(address)    — for redeployment
```

**Rate limit issues encountered:**
- `FHE.sub(enc, enc)` in `withdraw()` → Fhenix testnet returned HTTP 429 (rate limit on CoFHE operations). Removed FHE.sub; plain accounting drives payouts.
- `FHE.allow(enc, voter)` in `requestWithdrawal()` → same issue under load. Removed.

**First deployment issue:** Rewards deployed pointing to old Vote contract → "Proposal must be finalized" on `accrueReward`. Fixed by redeploying with new Vote address.

---

### [4] DelegationPanel + useDelegation

**UI design:** Inspired by Tally governance dashboards.

**Sections built:**
1. **Profile header** — gradient address avatar generated from address hash, Vote Weight / Delegators / Voting Mode stats
2. **Delegating To** card — shows current delegate's address, Remove button calls `undelegate()`
3. **Set/Change Delegate** form — address input, validation, amber privacy disclosure explaining delegation is public on-chain
4. **Delegated to You** list — built from on-chain event logs (no subgraph needed)
5. **How Delegation Works** — collapsible FAQ section

**`useDelegators(address)` hook:**
- Uses `usePublicClient()` and `publicClient.getLogs()` with `parseAbiItem`
- Fetches all `DelegateSet(delegator, delegatee=address)` events from block 0
- Filters out any delegator that later emitted `DelegateRemoved`
- Result is the current active set of delegators
- Auto-refreshes every 30 seconds

---

### [5] TreasuryPanel + useTreasury

**Badge state machine** (5 distinct states):

| State | Condition | Badge |
|-------|-----------|-------|
| No request | `!req.exists` | — |
| Vote pending | `req.exists && !isFinalized` | "Vote Pending" (gray) |
| Needs finalization recorded | `isFinalized && timelockEnds == 0` | "Start Timelock" button |
| In timelock | `timelockEnds > now` | "Timelock Xm" countdown |
| Ready | `timelockEnds <= now && !executed` | "Ready to Execute" button |
| Done | `executed` | "Executed" (green) |

**Time formatter:**
```ts
// Before (broken — showed "1h" for a 5min timelock)
Math.ceil(seconds / 3600) + "h"

// After (fixed)
seconds < 60   → `${seconds}s`
seconds < 3600 → `${Math.ceil(seconds / 60)}m`
else           → `${Math.ceil(seconds / 3600)}h`
```

**AsyncStepper on Attach Spend:**
```
Step 0: "Encrypting Amount"   → fheInstance.encrypt_uint64(amountGwei)
Step 1: "Submitting TX"       → writeContractAsync(attachSpend)
Step 2: "Spend Attached"      → confirmed
```

**Execute Spend UX:** Button shows actual ETH amount from contract: `"Execute Spend (0.0500 ETH)"`. No manual input needed — amount is read from `getSpendRequest().amountGwei`.

**Settings tab (admin only):** 7 timelock presets — 5min, 10min, 30min, 1h, 6h, 24h, 48h.

---

### [6] RewardsPanel + useRewards

**3 tabs:**
1. **Earn Rewards**: lists every finalized proposal the voter participated in. Per-row "Claim" button calls `accrueReward`. Shows 0.001 ETH reward badge per row.
2. **Withdraw**: Step 1 → "Request Withdrawal", Step 2 → "Withdraw ETH". Displays pending amount. Shows warning if reward pool is insufficient.
3. **Fund Pool**: Anyone can top up with any ETH amount. Shows current pool balance.

**"Your Balance" card renamed:** Was "Your Balance / FHE-encrypted on-chain" which showed 0 ETH on a fresh contract deployment — visually confusing. Renamed to **"Pending Reward / Claimable after accrual"**.

---

### [7] VoteSetupGuide — 4-Step Onboarding

**Problem:** New users arrived on VotePage with no idea what to do first.

**Solution:** A checklist component at the top of the Dashboard tab. Each step has a check (Done/Pending) derived from on-chain state, a description, and an action button.

| Step | On-chain Check | Action |
|------|---------------|--------|
| Get ETH | `useBalance().value > 0` | Faucet link |
| Claim $OBS | `lastClaim(address) > 0` | `scrollIntoView('#obs-claim-banner')` |
| Cast First Vote | `voterParticipation(address) > 0` | Navigate to Proposals tab |
| Set Delegate | `delegateTo(address) !== 0` | Navigate to Delegations tab |

**Why `lastClaim` not `balanceOf` for the OBS check:**  
`ObscuraToken.balanceOf()` returns `euint64` — a ciphertext handle that is always truthy in JavaScript regardless of the actual balance. `lastClaim(address)` returns a plain `uint256` timestamp — `> 0` reliably detects whether the user has ever claimed.

**`#obs-claim-banner` anchor:** Added `id="obs-claim-banner"` to the $OBS claim banner div in VotePage so the guide's action button can `scrollIntoView` directly to it.

---

### [8] ProposalList — Quorum Progress Bars

Added a visual progress bar below each proposal card:
```tsx
width = Math.min(Number((proposal.totalVoters * 100n) / proposal.quorum), 100) + "%"
color = totalVoters >= quorum ? "bg-green-500" : "bg-amber-500"
```
Shows "Quorum Met ✓" or "X / Y votes" depending on state.

---

### [9] VoteDashboard — FHE Banner + Vote Power Stat

- Added violet FHE privacy banner (Lock icon): "Ballots encrypted with FHE — choices never revealed"
- Added violet Vote Power stat card (Shield icon): shows `delegationWeight[address]` (or 1 if not set)

---

### [10] VotePage Sidebar + Tabs Restructure

**Before (Wave 2):**
- Dashboard | Proposals | Cast Vote | Results | Create

**After (Wave 3):**
- Dashboard
- Proposals (with sub-tabs: Create / Proposals / Cast Vote / Results)
- **Delegations** (was "Vote Power")
- **Treasury** (new)
- **Participation** (new — Rewards)

Tab type narrowed to: `"dashboard" | "voting" | "delegate" | "treasury" | "rewards"`  
Elections module removed entirely.

---

### [11] Gas Params Standardized

All `writeContractAsync` calls now include:
```ts
account: address,
chain: arbitrumSepolia,
maxFeePerGas: 200_000_000n,        // prevents "max fee per gas less than block base fee"
maxPriorityFeePerGas: 1_000_000n,
```

**Why this was needed:** Arbitrum Sepolia's base fee fluctuates. Without explicit gas params, wagmi estimates a `maxFeePerGas` that can fall below the network base fee, causing the RPC to reject the transaction.

---

### [12] Election Module Removed

The election feature (separate candidate elections, different from governance proposals) was scaffolded but never deployed or finished. Removed entirely to keep the codebase clean:

**Deleted files:**
```
contracts-hardhat/contracts/ObscuraElection.sol
frontend/src/components/vote/CastElectionVote.tsx
frontend/src/components/vote/CreateElectionForm.tsx
frontend/src/components/vote/ElectionList.tsx
frontend/src/components/vote/ElectionResults.tsx
frontend/src/components/vote/CandidateRegister.tsx
frontend/src/hooks/useElection.ts
```

No deployment address existed (contract was never deployed to testnet).

---

## Bug Fix Log

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| "Start Timelock" reverted with wrong error | Treasury pointed to old Vote contract (0x5d91B5…) | Redeployed Treasury pointing to new Vote address |
| "Proposal must be finalized" on accrueReward | Rewards pointed to old Vote contract | Redeployed Rewards pointing to new Vote address |
| Timelock badge shows "1h" for 5-minute timelock | `Math.ceil(300 / 3600) === 1` — always rounded up | Tiered formatter: `<60s→Xs`, `<3600s→Xm`, `else→Xh` |
| "max fee per gas less than block base fee" | deposit() and executeSpend() missing explicit gas params | Added `maxFeePerGas: 200_000_000n` to all write calls |
| `withdraw()` returns 429 rate limit | `FHE.sub(enc, enc)` hit Fhenix testnet CoFHE rate limit | Removed FHE.sub; plain `_totalWithdrawnGwei` drives payouts |
| `requestWithdrawal()` returns 429 rate limit | `FHE.allow(enc, voter)` hit rate limit | Removed FHE.allow from requestWithdrawal |
| Execute spend needed manual amount input | Encrypted amount was not accessible client-side | `attachSpend` stores `amountGwei` in private mapping; `executeSpend` reads it — no user input |
| "Your Balance 0 ETH / FHE-encrypted on-chain" contradictory | Label shown on fresh contract before any rewards | Renamed card to "Pending Reward / Claimable after accrual" |
| "Claim $OBS" guide action scrolled to wrong place | Was calling `onNavigate("dashboard")` (already on dashboard — no-op) | Changed to `document.getElementById("obs-claim-banner").scrollIntoView()` |
| OBS step never marks Done | `balanceOf()` returns `euint64` — always truthy in JS | Switched to `lastClaim(address) > 0` (plain uint256) |
| Quorum counts headcount not weight | `p.totalVoters++` in castVote | Changed to `p.totalVoters += weight` |

---

## File Summary

### New Files (Wave 3)

```
contracts-hardhat/contracts/ObscuraTreasury.sol
contracts-hardhat/contracts/ObscuraRewards.sol
contracts-hardhat/scripts/deploy-vote-only.ts
contracts-hardhat/scripts/deploy-treasury-only.ts
contracts-hardhat/scripts/deploy-rewards-only.ts
frontend/src/components/vote/DelegationPanel.tsx
frontend/src/components/vote/TreasuryPanel.tsx
frontend/src/components/vote/RewardsPanel.tsx
frontend/src/components/vote/VoteSetupGuide.tsx
frontend/src/hooks/useDelegation.ts
frontend/src/hooks/useTreasury.ts
frontend/src/hooks/useRewards.ts
wave2-vote/VOTE-APP-DOCS.md
wave2-vote/WAVE3-VOTE-PROGRESS.md   (this file)
```

### Modified Files (Wave 3)

```
contracts-hardhat/contracts/ObscuraVote.sol       — weighted quorum, delegation, timelockDuration
contracts-hardhat/deployments/arb-sepolia.json    — new addresses
frontend/src/config/contracts.ts                  — updated ABIs + addresses for all 3 contracts
frontend/src/pages/VotePage.tsx                   — new tabs, VoteSetupGuide, elections removed
frontend/src/components/vote/ProposalList.tsx     — quorum progress bars
frontend/src/components/vote/VoteDashboard.tsx    — FHE banner, Vote Power stat
frontend/src/hooks/useFHEStatus.ts                — FHEStepStatus type used by TreasuryPanel
frontend/src/lib/constants.ts                     — Role enum + contract address constants
frontend/obscura-os-main/.env                     — VITE_OBSCURA_TREASURY_ADDRESS + VITE_OBSCURA_REWARDS_ADDRESS
frontend/src/pages/DocsPage.tsx                   — updated contract addresses + Wave 2 section
wave2-vote/WAVE2-PROGRESS.md                      — updated with Wave 3 additions
```

### Deleted Files (Wave 3)

```
contracts-hardhat/contracts/ObscuraElection.sol
frontend/src/components/vote/CastElectionVote.tsx
frontend/src/components/vote/CreateElectionForm.tsx
frontend/src/components/vote/ElectionList.tsx
frontend/src/components/vote/ElectionResults.tsx
frontend/src/components/vote/CandidateRegister.tsx
frontend/src/hooks/useElection.ts
```

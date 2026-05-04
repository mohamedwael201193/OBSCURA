# ObscuraVote — Full Technical Documentation

> Coercion-resistant, fully encrypted on-chain governance for the OBSCURA protocol.  
> No one — including the contract — can read any individual vote.  
> Only aggregate tallies are revealed after finalization, via FHE threshold decryption.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Smart Contracts](#3-smart-contracts)
   - [ObscuraVote](#31-obscuravote)
   - [ObscuraTreasury](#32-obscuratreasury)
   - [ObscuraRewards](#33-obscurarewards)
4. [FHE Operations Reference](#4-fhe-operations-reference)
5. [Frontend](#5-frontend)
   - [Pages & Tabs](#51-pages--tabs)
   - [Components](#52-components)
   - [Hooks](#53-hooks)
6. [Data Flow: Full Proposal Lifecycle](#6-data-flow-full-proposal-lifecycle)
7. [Delegation System](#7-delegation-system)
8. [Treasury Spend Lifecycle](#8-treasury-spend-lifecycle)
9. [Rewards System](#9-rewards-system)
10. [Access Control](#10-access-control)
11. [Gas Reference](#11-gas-reference)
12. [Deployed Addresses](#12-deployed-addresses)
13. [Environment Variables](#13-environment-variables)
14. [Known Limitations & Testnet Workarounds](#14-known-limitations--testnet-workarounds)

---

## 1. Overview

ObscuraVote is the governance module of the OBSCURA protocol. It lets $OBS token holders create multi-option proposals, cast encrypted ballots, and collectively control an ETH treasury — all without revealing any individual choice on-chain.

**What stays private forever:**
- Which option each voter chose
- A voter's accumulated reward balance
- The requested treasury spend amount (until execution)

**What becomes public after finalization:**
- Aggregate vote count per option (FHE.allowPublic)
- Spend amount upon execution (FHE.allowPublic)
- Who voted on a proposal (hasVoted mapping)

**Key properties:**
- **Coercion resistance**: Voters can change their vote unlimited times before deadline. A coercer can never verify what you ultimately voted.
- **Weighted quorum**: Quorum counts total vote weight (including delegated votes), not just the number of wallets.
- **No admin key for ballots**: Even the contract deployer cannot read votes. FHE ciphertexts are mathematically opaque.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                    VotePage (React)                  │
│  Dashboard │ Proposals │ Delegations │ Treasury │ Rewards  │
└───────────┬─────────────────────────────────────────┘
            │ wagmi hooks (readContract / writeContractAsync)
            ▼
┌─────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│    ObscuraVote.sol   │◄──│ ObscuraTreasury.sol  │   │  ObscuraRewards.sol  │
│  (proposals, votes,  │   │  (ETH vault, spend   │   │  (voter incentives,  │
│   delegation)        │   │   requests, timelock) │   │   FHE balances)      │
└──────────┬──────────┘   └──────────────────────┘   └──────────────────────┘
           │ reads lastClaim / balanceOf
           ▼
┌─────────────────────┐
│  ObscuraToken.sol    │
│  ($OBS FHERC20 token)│
└─────────────────────┘
           │ FHE operations
           ▼
┌─────────────────────┐
│  Fhenix CoFHE        │
│  Threshold Network   │
│  (coprocessor)       │
└─────────────────────┘
```

All three governance contracts extend `ObscuraPermissions.sol` for ADMIN/EMPLOYEE/AUDITOR role management.

---

## 3. Smart Contracts

### 3.1 ObscuraVote

**Address:** `0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730`  
**File:** `contracts-hardhat/contracts/ObscuraVote.sol`  
**Version:** V5 (weighted quorum)

#### State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `obsToken` | `IObscuraToken` | Reference to ObscuraToken for $OBS gating |
| `proposals` | `mapping(uint256 => Proposal)` | All proposals by ID |
| `proposalOptions` | `mapping(uint256 => string[])` | Option labels per proposal |
| `tallies` | `mapping(uint256 => mapping(uint8 => euint64))` | FHE-encrypted vote tally per (proposalId, optionIndex) |
| `voterEncryptedVote` | `mapping(uint256 => mapping(address => euint64))` | Voter's last ballot (FHE handle) — used for revoting |
| `hasVoted` | `mapping(uint256 => mapping(address => bool))` | Whether an address has voted on a proposal (public) |
| `voterParticipation` | `mapping(address => uint256)` | Total proposals a voter has participated in |
| `delegateTo` | `mapping(address => address)` | Who this voter has delegated to |
| `delegationWeight` | `mapping(address => uint256)` | Total vote weight (own + delegated-in) |
| `voterWeightUsed` | `mapping(uint256 => mapping(address => uint256))` | Weight used when casting on proposal (for revote subtraction) |
| `nextProposalId` | `uint256` | Auto-incrementing proposal counter |

#### Proposal Struct

```solidity
struct Proposal {
    string title;
    string description;
    uint8 numOptions;       // 2–10
    uint256 deadline;       // block.timestamp cutoff
    uint256 quorum;         // minimum totalVoters required (0 = no quorum)
    Category category;      // GENERAL | TREASURY | PROTOCOL | GRANTS | SOCIAL | TECHNICAL
    uint256 totalVoters;    // sum of weights of all voters (NOT headcount)
    bool isFinalized;
    bool isCancelled;
    bool exists;
    address creator;
}
```

#### Key Functions

**`createProposal(title, description, options[], deadline, quorum, category)`**
- Gate: `obsToken.lastClaim(msg.sender) > 0` (any $OBS claimer, not admin-only)
- 2–10 options; initialises each `tallies[id][i]` to `FHE.asEuint64(0)`
- Returns `proposalId`

**`castVote(proposalId, InEuint64 encVote)`**
- Gate: $OBS required, deadline not passed, not delegating
- `weight = delegationWeight[msg.sender]` (defaults to 1 if not set)
- First vote: `_addTally`, `p.totalVoters += weight`, `voterParticipation++`
- Revote: `_subtractTally` (old weight) then `_addTally` (new weight) — old ballot swapped out silently
- `FHE.allow(newVote, msg.sender)` — voter retains self-decrypt access

**`_addTally(proposalId, vote, weightEnc, numOpts)`** *(internal)*
```
for each option i:
    isMatch = FHE.eq(vote, asEuint64(i))       // encrypted: is this option the one voted?
    inc     = FHE.select(isMatch, weight, 0)   // encrypted: add weight if match, else 0
    tallies[id][i] += inc                       // FHE.add — tally grows without revealing i
```

**`_subtractTally(proposalId, oldVote, oldWeight, numOpts)`** *(internal)*  
Same loop but uses `FHE.sub` to reverse the previous ballot before applying the new one.

**`finalizeVote(proposalId)`**
- Gate: after deadline, quorum met, not already finalized, caller = creator
- `FHE.allowPublic(tallies[id][i])` for all options → Fhenix threshold network publishes decryptions
- Sets `isFinalized = true`

**`cancelProposal(proposalId)`**
- Creator or admin; allowed if no votes OR (deadline passed AND quorum not met)
- Prevents permanently stuck proposals when nobody votes

**`extendDeadline(proposalId, newDeadline)`**
- Creator or admin; new deadline must be strictly after current

**`delegate(to)`**
- Transfers your weight to `_to`; no chaining (if `_to` has already delegated → revert)
- Weight shifts from previous delegate to new one atomically

**`undelegate()`**
- Removes delegation; weight subtracted from delegatee's `delegationWeight`

#### Events

| Event | When |
|-------|------|
| `ProposalCreated(id, title, numOptions, deadline, category)` | New proposal created |
| `VoteCast(proposalId, voter)` | First-time vote |
| `VoteChanged(proposalId, voter)` | Revote (anti-coercion path) |
| `VoteFinalized(proposalId)` | After `finalizeVote` |
| `ProposalCancelled(proposalId)` | After `cancelProposal` |
| `DeadlineExtended(proposalId, newDeadline)` | After `extendDeadline` |
| `DelegateSet(delegator, delegatee)` | After `delegate` |
| `DelegateRemoved(delegator, formerDelegatee)` | After `undelegate` |

---

### 3.2 ObscuraTreasury

**Address:** `0x89252ee3f920978EEfDB650760fe56BA1Ede8c08`  
**File:** `contracts-hardhat/contracts/ObscuraTreasury.sol`

A governance-controlled ETH vault. Spend requests are attached to proposals before voting, with the amount stored both as plaintext gwei (private storage, not ABI-readable) and as an FHE ciphertext. Only after the proposal passes, the timelock elapses, and execution is triggered does the ETH transfer happen — and at that point `FHE.allowPublic` permanently reveals the amount.

#### State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `voteContract` | `IObscuraVoteForTreasury` | Reads proposal data from ObscuraVote |
| `timelockDuration` | `uint256` | Seconds between finalization and execution (default 48h) |
| `spendRequests` | `mapping(uint256 => SpendRequest)` | Per-proposal spend request |
| `encTotalAllocated` | `euint64` | FHE running total of all allocated amounts (private) |

#### SpendRequest Struct

```solidity
struct SpendRequest {
    address payable recipient;
    euint64 encAmount;    // FHE ciphertext — only creator/recipient can decrypt
    uint256 amountGwei;   // plaintext amount, in private mapping (not ABI-visible)
    uint256 finalizedAt;  // block.timestamp when recordFinalization was called
    bool executed;
    bool exists;
}
```

#### Key Functions

**`attachSpend(proposalId, recipient, amountGwei, InEuint64 encAmountGwei)`**
- Gate: proposal must exist and not be cancelled; caller must be proposal creator; one spend per proposal
- Stores `amountGwei` in private mapping (gwei units, not exposed by ABI)
- Encrypts `encAmountGwei` → `FHE.allow(enc, creator)` + `FHE.allow(enc, recipient)`
- `FHE.add(encTotalAllocated, enc)` — FHE running total updated

**`recordFinalization(proposalId)`**
- Anyone can call once the proposal is finalized
- Records `req.finalizedAt = block.timestamp` → timelock starts

**`executeSpend(proposalId)`**
- Gate: timelock elapsed, not already executed, caller = creator / recipient / admin / owner
- Reads `req.amountGwei` from private storage — **no user input needed**
- `FHE.allowPublic(req.encAmount)` — permanently reveals amount on-chain as transparency record
- Transfers `amountGwei * 1 gwei` wei to `recipient`

**`setTimelockDuration(seconds)`** — admin only, min 60s  
**`setVoteContract(address)`** — admin only, for redeployment  
**`deposit()`** — fund the vault (payable)

**`getSpendRequest(proposalId)`** → `(recipient, executed, exists, timelockEnds, amountGwei)`

#### Events

| Event | When |
|-------|------|
| `FundsReceived(from, amount)` | ETH deposited |
| `SpendAttached(proposalId, recipient)` | attachSpend called |
| `FinalizationRecorded(proposalId, timelockEnds)` | recordFinalization called |
| `SpendExecuted(proposalId, recipient, amountWei)` | ETH transferred |
| `TimelockDurationUpdated(old, new)` | Timelock changed |

#### Timelock Presets (UI)

| Label | Duration |
|-------|----------|
| 5 min | 300s |
| 10 min | 600s |
| 30 min | 1800s |
| 1 hour | 3600s |
| 6 hours | 21600s |
| 24 hours | 86400s |
| 48 hours (default) | 172800s |

---

### 3.3 ObscuraRewards

**Address:** `0x435ea117404553A6868fbe728A7A284FCEd15BC2`  
**File:** `contracts-hardhat/contracts/ObscuraRewards.sol`

Voter incentive pool. Each voter's balance is an FHE euint64 — no one can read another voter's accumulated rewards on-chain. ETH payouts are driven by plain internal accounting (`_totalAccruedGwei`) to avoid Fhenix testnet rate limits on FHE.sub.

#### Constants

```solidity
uint64 public constant REWARD_PER_VOTE_GWEI = 1_000_000; // 0.001 ETH per vote
```

#### State Variables

| Variable | Type | Visibility | Description |
|----------|------|------------|-------------|
| `voteContract` | `IObscuraVoteForRewards` | public | ObscuraVote reference |
| `encRewardBalance` | `mapping(address => euint64)` | private | FHE-encrypted per-voter balance |
| `rewardAccrued` | `mapping(uint256 => mapping(address => bool))` | public | Double-accrual guard |
| `_totalAccruedGwei` | `mapping(address => uint256)` | private | Plain gwei accrued per voter |
| `_totalWithdrawnGwei` | `mapping(address => uint256)` | private | Plain gwei withdrawn per voter |
| `withdrawalRequested` | `mapping(address => bool)` | public | Withdrawal intent flag |

#### Key Functions

**`accrueReward(proposalId)`**
- Gate: proposal finalized, caller voted, not already accrued
- `FHE.add(encRewardBalance[voter], reward)` — encrypted balance grows
- `_totalAccruedGwei[voter] += REWARD_PER_VOTE_GWEI` — plain accounting for payout

**`requestWithdrawal()`**
- Step 1 of 2. Sets `withdrawalRequested[msg.sender] = true`
- (FHE.allow removed — rate limit workaround; FHE balance is stale after withdrawal but voter-only readable)

**`withdraw()`**
- Step 2 of 2. Requires `withdrawalRequested == true`
- `pendingGwei = _totalAccruedGwei - _totalWithdrawnGwei`
- Transfers `pendingGwei * 1 gwei` to caller
- `_totalWithdrawnGwei += pendingGwei` (re-entrancy safe, state updated first)

**`pendingRewardWei(voter)`** → `uint256` — visible to voter / owner / admin  
**`setVoteContract(address)`** — admin only  
**`fundRewards()`** — payable, anyone can top up the pool  

#### Events

| Event | When |
|-------|------|
| `RewardAccrued(proposalId, voter, rewardGwei)` | accrueReward called |
| `WithdrawalRequested(voter)` | requestWithdrawal called |
| `RewardWithdrawn(voter, amountWei)` | withdraw called |
| `RewardsFunded(from, amountWei)` | fundRewards / receive called |

---

## 4. FHE Operations Reference

All FHE operations are performed by the **Fhenix CoFHE coprocessor** on Arbitrum Sepolia. Contracts submit encrypted operands; the coprocessor evaluates and returns verified ciphertexts.

| Operation | Where Used | Purpose |
|-----------|-----------|---------|
| `FHE.asEuint64(InEuint64)` | castVote, attachSpend, accrueReward | Convert client-supplied encrypted input to on-chain handle |
| `FHE.asEuint64(uint256)` | createProposal, _addTally, _subtractTally | Convert plaintext constant to encrypted form |
| `FHE.add(a, b)` | _addTally, encTotalAllocated, accrueReward | Homomorphic addition without revealing operands |
| `FHE.sub(a, b)` | _subtractTally (revote) | Homomorphic subtraction to undo a previous ballot |
| `FHE.eq(a, b)` | _addTally, _subtractTally | Encrypted equality: does this ballot match option i? |
| `FHE.select(cond, a, b)` | _addTally, _subtractTally | Encrypted ternary: if match → weight, else 0 |
| `FHE.allowThis(handle)` | All contracts | Contract retains access to its own ciphertext in future txs |
| `FHE.allow(handle, addr)` | castVote, attachSpend | Grant specific address decrypt permission |
| `FHE.allowPublic(handle)` | finalizeVote, executeSpend | Irreversibly open to anyone — triggers threshold network reveal |

**Client-side (frontend, @cofhe/sdk):**
- `fheInstance.encrypt_uint64(value)` → `InEuint64` tuple `{ctHash, securityZone, utype, signature}`
- `fheInstance.unseal(contractAddress, handle)` → plaintext bigint (requires EIP-712 permit)

---

## 5. Frontend

### 5.1 Pages & Tabs

**Route:** `/vote` → `VotePage.tsx`

| Sidebar Tab | Key | Description |
|-------------|-----|-------------|
| Dashboard | `dashboard` | Setup guide, stats, FHE privacy model, onboarding |
| Proposals | `voting` | Browse/filter proposals + sub-tabs: Create / Proposals / Cast Vote / Results |
| Delegations | `delegate` | Delegate vote weight, view delegators, manage delegation |
| Treasury | `treasury` | Attach spends, start/execute timelocks, fund vault, timelock settings |
| Participation | `rewards` | Claim voter rewards, request withdrawal, withdraw ETH |

**Voting sub-tabs:**

| Key | Component | Description |
|-----|-----------|-------------|
| `create` | `CreateProposalForm` | Token-gated proposal creation |
| `proposals` | `ProposalList` | Search, filter, quorum bars, live countdown |
| `cast` | `CastVoteForm` | Multi-option FHE voting |
| `results` | `TallyReveal` | Per-option colored bars, finalize button, CSV export |

### 5.2 Components

#### `VoteSetupGuide` (`src/components/vote/VoteSetupGuide.tsx`)
4-step onboarding checklist. Each step auto-marks Done from on-chain state.

| Step | Check | Action |
|------|-------|--------|
| 1. Get ETH | `useBalance().value > 0` | Link to Arbitrum Sepolia faucet |
| 2. Claim $OBS | `lastClaim(address) > 0` | `scrollIntoView('#obs-claim-banner')` |
| 3. Cast First Vote | `voterParticipation(address) > 0` | `onNavigate("voting", "proposals")` |
| 4. Set Delegate | `delegateTo(address) !== address(0) && !== self` | `onNavigate("delegate")` |

> **Why `lastClaim` not `balanceOf`?** ObscuraToken.balanceOf() returns an `euint64` handle — always truthy as a JS BigInt even when the balance is 0. `lastClaim > 0` is a reliable plain uint256 check.

---

#### `DelegationPanel` (`src/components/vote/DelegationPanel.tsx`)
Tally-style governance profile.

**Sections:**
- Profile header: gradient address avatar, Vote Weight stat, Delegators count, Voting Mode (Direct / Delegating to `0x…`)
- "Delegating To" card: shows current delegate + Remove button
- "Set/Change Delegate" form: address input + amber privacy disclosure
- "Delegated to You" list: built from on-chain `DelegateSet` / `DelegateRemoved` events
- "How Delegation Works" collapsible

**Privacy note displayed to user:**  
> "Delegation is public on-chain. Your delegate address is visible to anyone. Your vote choice remains private — delegation transfers weight only."

---

#### `TreasuryPanel` (`src/components/vote/TreasuryPanel.tsx`)
4 tabs:

| Tab | Who Sees It | Description |
|-----|-------------|-------------|
| Spend Requests | Everyone | List of all proposals with spend requests + state badges |
| Attach Spend | Everyone | Form: proposalId, recipient, amount → FHE encrypt → attachSpend |
| Fund Treasury | Everyone | Deposit ETH to vault |
| Settings | Admin/owner only | Set timelock duration (7 presets) |

**Spend Request badge state machine:**

```
  [no spend request]    → (none)
  [spend exists, not finalized]    → "Vote Pending"
  [spend exists, finalized, timelockEnds == 0]   → "Start Timelock" button
  [spend exists, finalized, timelockEnds > now]  → "Timelock Xm/Xh" (countdown)
  [spend exists, finalized, timelockEnds <= now, not executed] → "Ready to Execute" button
  [executed]            → "Executed" (green)
```

**Execute button:** Shows actual ETH amount read from `getSpendRequest().amountGwei` — e.g. "Execute Spend (0.0500 ETH)". No user input required.

**AsyncStepper on Attach Spend:**
```
Step 0: "Encrypting Amount"   → @cofhe/sdk encrypts the gwei value
Step 1: "Submitting TX"       → writeContractAsync(attachSpend)
Step 2: "Spend Attached"      → tx confirmed
```

---

#### `RewardsPanel` (`src/components/vote/RewardsPanel.tsx`)
3 tabs:

| Tab | Description |
|-----|-------------|
| Earn Rewards | Lists finalized proposals you voted on with "Claim" button per proposal |
| Withdraw | Step 1: Request Withdrawal → Step 2: Withdraw ETH. Shows pending amount + pool balance. |
| Fund Pool | Anyone can top up with any ETH amount |

---

#### `ProposalList` (`src/components/vote/ProposalList.tsx`)
- Search by title
- Status filters: All / Active / Ended / Finalized / Cancelled
- Per-proposal quorum progress bar: `width = min(totalVoters / quorum * 100, 100)%`
  - Amber (< quorum), green (≥ quorum)
- Live countdown timer

---

#### `CastVoteForm` (`src/components/vote/CastVoteForm.tsx`)
- Multi-option radio buttons (rendered from `proposalOptions`)
- $OBS balance check before enabling submit
- Revote warning shown if `hasVoted[proposalId][address]`
- Encrypts `optionIndex` client-side before TX

---

#### `TallyReveal` (`src/components/vote/TallyReveal.tsx`)
- Per-option colored progress bars
- Winner highlighted with ★
- Quorum status indicator
- "Finalize Vote" button (creator only, post-deadline, quorum met)
- CSV export of results
- Gas: `3_000_000n` for `finalizeVote` (FHE.allowPublic per option is expensive)

---

#### `CreateProposalForm` (`src/components/vote/CreateProposalForm.tsx`)
- Templates: Yes/No, Approve/Reject/Abstain, Custom
- Dynamic option inputs (2–10)
- Description field, category selector, deadline presets, quorum field
- Gas: `2_000_000n` for `createProposal`

---

#### `VoteDashboard` (`src/components/vote/VoteDashboard.tsx`)
- Stats: Total Proposals, Your Votes Cast, connected wallet, governance summary
- FHE privacy banner (violet, Lock icon)
- Vote Power stat card (violet Shield icon)
- Privacy model cards: how FHE.add, FHE.allowPublic, coercion resistance work
- `VoteSetupGuide` rendered at top

---

#### `VotingHistory` (`src/components/vote/VotingHistory.tsx`)
- Per-proposal vote status grid
- "Verify My Vote" — `decryptForView` with EIP-712 permit reveals your own ballot

---

#### `AdminControls` (`src/components/vote/AdminControls.tsx`)
- Per-proposal Cancel and Extend Deadline buttons
- Visible to creator or admin role

---

### 5.3 Hooks

#### Proposal Hooks (`src/hooks/useProposals.ts`)

| Hook | Returns | Description |
|------|---------|-------------|
| `useProposals()` | `Proposal[]` | All proposals from `getProposal(0..nextProposalId-1)` |
| `useProposal(id)` | `Proposal` | Single proposal |
| `useProposalOptions(id)` | `string[]` | Option labels |
| `useVoterParticipation(address)` | `bigint` | Total proposals voted on |
| `useHasVoted(proposalId, address)` | `boolean` | Whether address voted |
| `useVoteOwner()` | `address` | Contract owner |
| `useVoteRole(address)` | `Role` | Role of given address |
| `useNextProposalId()` | `bigint` | Next proposal ID |

---

#### Vote Action Hooks (`src/hooks/useEncryptedVote.ts`)

| Hook | Function | Gas |
|------|----------|-----|
| `useEncryptedVote()` | `castVote(proposalId, optionIndex)` | `3_000_000n` |
| `useCreateProposal()` | `createProposal(...)` | `2_000_000n` |
| `useCancelProposal()` | `cancelProposal(id)` | `300_000n` |
| `useExtendDeadline()` | `extendDeadline(id, newDeadline)` | `200_000n` |
| `useFinalizeVote()` | `finalizeVote(id)` | `3_000_000n` |

---

#### Tally Hook (`src/hooks/useVoteTally.ts`)

| Hook | Description |
|------|-------------|
| `useVoteTally(id, numOptions)` | Decrypts each option's tally sequentially using `decryptForView` |
| `useMyVote(id)` | Self-decrypt your ballot via EIP-712 permit |

---

#### Delegation Hooks (`src/hooks/useDelegation.ts`)

| Hook | Description |
|------|-------------|
| `useDelegateTo(address)` | Current delegate of given address |
| `useDelegationWeight(address)` | Vote weight of given address |
| `useDelegate()` | `delegate(to)` write — `300_000n` gas |
| `useUndelegate()` | `undelegate()` write — `200_000n` gas |
| `useDelegators(address)` | Reads `DelegateSet` / `DelegateRemoved` events via `publicClient.getLogs`. Builds active delegator set. Auto-refreshes every 30s. |

---

#### Treasury Hooks (`src/hooks/useTreasury.ts`)

| Hook | Description |
|------|-------------|
| `useSpendRequest(proposalId)` | `getSpendRequest` → `{recipient, executed, exists, timelockEnds, amountGwei}` |
| `useAttachSpend()` | FHE encrypt then `attachSpend`. Exposes `status: FHEStepStatus`, `stepIndex: number`. Gas `600_000n`. |
| `useRecordFinalization()` | `recordFinalization(proposalId)`. Gas `300_000n`. |
| `useExecuteSpend()` | `executeSpend(proposalId)` — no amount arg. Gas `500_000n`. |
| `useDepositTreasury()` | Deposit ETH to vault. Gas `200_000n`. |
| `useTreasuryBalance()` | `getBalance` of treasury contract address |
| `useTimelockDuration()` | Reads `timelockDuration` |
| `useSetTimelockDuration()` | `setTimelockDuration(seconds)`. Gas `200_000n`. |

---

#### Rewards Hooks (`src/hooks/useRewards.ts`)

| Hook | Description |
|------|-------------|
| `usePendingReward(address)` | `pendingRewardWei(voter)` |
| `useRewardAccrued(proposalId, address)` | Double-accrual check |
| `useAccrueReward()` | `accrueReward(proposalId)`. Gas `300_000n`. |
| `useRequestWithdrawal()` | `requestWithdrawal()`. Gas `200_000n`. |
| `useWithdrawReward()` | `withdraw()`. Gas `200_000n`. |
| `useFundRewards()` | `fundRewards()`. Gas `200_000n`. |
| `useWithdrawalRequested(address)` | Whether address has pending withdrawal request |
| `useRewardsPoolBalance()` | ETH balance of rewards contract |

---

## 6. Data Flow: Full Proposal Lifecycle

```
1. Creator calls createProposal(title, options[], deadline, quorum)
   ├─ Gate: lastClaim(creator) > 0
   ├─ tallies[id][0..n] = FHE.asEuint64(0)
   └─ Emits ProposalCreated

2. (Optional) Creator calls attachSpend(proposalId, recipient, amountGwei, encAmountGwei)
   ├─ Stores amountGwei in private mapping
   ├─ FHE.allow(enc, creator) + FHE.allow(enc, recipient)
   └─ Emits SpendAttached

3. Voters call castVote(proposalId, encVote)
   ├─ Client encrypts: fheInstance.encrypt_uint64(optionIndex) → InEuint64
   ├─ _addTally: FHE.eq + FHE.select + FHE.add per option
   ├─ p.totalVoters += weight
   └─ Emits VoteCast (or VoteChanged if revoting)

4. (Post-deadline) Creator calls finalizeVote(proposalId)
   ├─ Gate: quorum met, after deadline
   ├─ FHE.allowPublic(tallies[id][i]) for all i
   └─ Emits VoteFinalized

5. Frontend decrypts tallies via useVoteTally
   └─ decryptForView(handle) → plaintext bigint per option

6. (If spend attached) Anyone calls recordFinalization(proposalId)
   ├─ req.finalizedAt = block.timestamp
   └─ Timelock starts

7. (After timelock) Creator/recipient/admin calls executeSpend(proposalId)
   ├─ Reads req.amountGwei from private storage
   ├─ FHE.allowPublic(req.encAmount)
   ├─ Transfers amountWei to recipient
   └─ Emits SpendExecuted

8. Voters call accrueReward(proposalId)
   ├─ FHE.add(encRewardBalance, reward)
   └─ _totalAccruedGwei += REWARD_PER_VOTE_GWEI

9. Voter calls requestWithdrawal() then withdraw()
   └─ ETH transferred based on _totalAccruedGwei - _totalWithdrawnGwei
```

---

## 7. Delegation System

Delegation transfers your vote weight to another $OBS holder. When they vote, the tally increases by their accumulated weight (including yours).

**Rules:**
- Requires `lastClaim(msg.sender) > 0`
- Cannot delegate to yourself
- Cannot delegate to someone who has already delegated (no chains)
- Weight atomically moves from old delegate to new on delegate change
- Delegators cannot vote directly — must `undelegate()` first

**Weight calculation:**
```
delegationWeight[voter] = own vote (1) + sum of weights delegated to voter
```

**Privacy of delegation:**  
Delegation addresses are visible on-chain via the `delegateTo` public mapping and events. Vote choices remain encrypted regardless.

**Event-sourced delegator list (frontend):**  
`useDelegators(address)` uses `publicClient.getLogs` to find all `DelegateSet` events where `delegatee = address`, then filters out any address that later emitted `DelegateRemoved`. Refreshes every 30s.

---

## 8. Treasury Spend Lifecycle

```
attachSpend called?
    No  → badge: (none)
    Yes →
        isFinalized?
            No  → badge: "Vote Pending"
            Yes →
                timelockEnds set?
                    No  → button: "Start Timelock"
                    Yes →
                        now < timelockEnds?
                            Yes → badge: "Timelock Xm" (countdown)
                            No  →
                                executed?
                                    No  → button: "Ready to Execute — 0.XXX ETH"
                                    Yes → badge: "Executed" ✓
```

**Timelock display formatter:**
```
seconds < 60  → "Xs"
seconds < 3600 → "Xm"
else           → "Xh"
```

---

## 9. Rewards System

| Action | Details |
|--------|---------|
| Reward rate | 0.001 ETH (1,000,000 gwei) per finalized proposal voted on |
| Accrual | Call `accrueReward(proposalId)` after finalization. One-time per (proposal, voter). |
| FHE balance | `FHE.add()` accumulates encrypted gwei balance. Only voter can decrypt. |
| Plain accounting | `_totalAccruedGwei` and `_totalWithdrawnGwei` (private mappings) drive actual ETH transfers |
| Withdrawal step 1 | `requestWithdrawal()` — sets flag |
| Withdrawal step 2 | `withdraw()` — transfers `(totalAccrued - totalWithdrawn) * 1 gwei` to voter |
| Pool funding | Anyone can call `fundRewards{value: ...}()` to top up the pool |

**Why two layers (FHE + plain)?**  
FHE.sub on Fhenix testnet hits rate limits (429 errors). Plain `_totalAccruedGwei` is stored in private mappings (not publicly readable via ABI) and drives correct ETH payouts. The FHE balance provides cryptographic proof of accumulation without needing FHE subtraction on withdrawal.

---

## 10. Access Control

All three governance contracts extend `ObscuraPermissions.sol`:

| Role | Capabilities |
|------|-------------|
| `owner` | Everything — set during constructor |
| `ADMIN` | Cancel proposals, extend deadlines, set timelock, setVoteContract, view pendingReward |
| `EMPLOYEE` | N/A for vote contracts |
| `AUDITOR` | N/A for vote contracts |
| Any $OBS claimer | Create proposals, cast votes, delegate, attachSpend (own proposals), accrueReward, requestWithdrawal, withdraw |
| Any address | recordFinalization, executeSpend (if creator/recipient/admin), fundRewards, deposit |

---

## 11. Gas Reference

| Operation | Gas Limit | Notes |
|-----------|-----------|-------|
| `createProposal` | `2_000_000n` | FHE.asEuint64 × numOptions |
| `castVote` | `3_000_000n` | FHE.eq + FHE.select + FHE.add × numOptions |
| `finalizeVote` | `3_000_000n` | FHE.allowPublic × numOptions |
| `attachSpend` | `600_000n` | FHE.asEuint64 + FHE.add |
| `recordFinalization` | `300_000n` | Simple storage write |
| `executeSpend` | `500_000n` | FHE.allowPublic + ETH transfer |
| `accrueReward` | `300_000n` | FHE.add |
| `requestWithdrawal` | `200_000n` | Storage flag |
| `withdraw` | `200_000n` | ETH transfer |
| `delegate` | `300_000n` | Storage updates |
| `undelegate` | `200_000n` | Storage updates |

**All write calls use:**
```ts
maxFeePerGas: 200_000_000n,        // 0.2 Gwei
maxPriorityFeePerGas: 1_000_000n,  // 0.001 Gwei
```

---

## 12. Deployed Addresses

**Network:** Arbitrum Sepolia (Chain ID: 421614)

| Contract | Address | Arbiscan |
|----------|---------|---------|
| ObscuraToken | `0xf4A1219b0aaB83f772B240Ed508e3A37d7F55ED2` | [View](https://sepolia.arbiscan.io/address/0xf4A1219b0aaB83f772B240Ed508e3A37d7F55ED2) |
| ObscuraVote V5 | `0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730` | [View](https://sepolia.arbiscan.io/address/0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730) |
| ObscuraTreasury | `0x89252ee3f920978EEfDB650760fe56BA1Ede8c08` | [View](https://sepolia.arbiscan.io/address/0x89252ee3f920978EEfDB650760fe56BA1Ede8c08) |
| ObscuraRewards | `0x435ea117404553A6868fbe728A7A284FCEd15BC2` | [View](https://sepolia.arbiscan.io/address/0x435ea117404553A6868fbe728A7A284FCEd15BC2) |

---

## 13. Environment Variables

```env
VITE_OBSCURA_TOKEN_ADDRESS=0xf4A1219b0aaB83f772B240Ed508e3A37d7F55ED2
VITE_OBSCURA_VOTE_ADDRESS=0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730
VITE_OBSCURA_TREASURY_ADDRESS=0x89252ee3f920978EEfDB650760fe56BA1Ede8c08
VITE_OBSCURA_REWARDS_ADDRESS=0x435ea117404553A6868fbe728A7A284FCEd15BC2
VITE_CHAIN_ID=421614
```

---

## 14. Known Limitations & Testnet Workarounds

| Issue | Root Cause | Workaround Applied |
|-------|-----------|-------------------|
| `FHE.sub` in withdraw() causes 429 rate limit | Fhenix testnet CoFHE rate limits FHE subtraction operations | Removed FHE.sub; plain `_totalWithdrawnGwei` accounting drives payout |
| `FHE.allow` in requestWithdrawal() causes 429 | Same rate limit applies to ACL operations in rapid succession | Removed FHE.allow from requestWithdrawal |
| Delegators cannot vote directly | By design — prevents double-counting. Delegator must undelegate first. | N/A |
| Delegation chains blocked | Prevents cycles (A → B → C is disallowed) | Revert: "Delegatee has already delegated" |
| `FHE balance reads as stale post-withdrawal` | FHE.sub removed; encrypted balance not zeroed on withdraw | Plain accounting is authoritative; FHE balance is informational only |
| Vote contract address changes on redeploy | Hardhat deploys a new address each time | `setVoteContract(address)` admin function on both Treasury and Rewards |
| `ObscuraToken.balanceOf()` returns `euint64` | FHERC20 standard — balance is always encrypted | Use `lastClaim(address) > 0` as a reliable $OBS ownership check in UI |

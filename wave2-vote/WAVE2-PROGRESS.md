# Wave 2 — ObscuraVote: Implementation Progress

> Coercion-resistant governance where votes are encrypted via FHE.  
> No one (including the contract) knows individual vote choices.  
> After the deadline, only the aggregate tally is decrypted publicly.

---

## Scope Overview

| # | Task | Location | Status |
|---|------|----------|--------|
| 1 | Smart Contract — `ObscuraVote.sol` (V5 weighted quorum) | `contracts-hardhat/contracts/ObscuraVote.sol` | ✅ Done |
| 2 | Smart Contract — `ObscuraTreasury.sol` | `contracts-hardhat/contracts/ObscuraTreasury.sol` | ✅ Done |
| 3 | Smart Contract — `ObscuraRewards.sol` | `contracts-hardhat/contracts/ObscuraRewards.sol` | ✅ Done |
| 4 | Deploy Scripts | `contracts-hardhat/scripts/` | ✅ Done |
| 5 | Deployment Record | `contracts-hardhat/deployments/arb-sepolia.json` | ✅ Done |
| 6 | Frontend Config — contracts.ts | `frontend/obscura-os-main/src/config/contracts.ts` | ✅ Done |
| 7 | Hook — `useDelegation.ts` | `frontend/obscura-os-main/src/hooks/useDelegation.ts` | ✅ Done |
| 8 | Hook — `useRewards.ts` | `frontend/obscura-os-main/src/hooks/useRewards.ts` | ✅ Done |
| 9 | Hook — `useTreasury.ts` | `frontend/obscura-os-main/src/hooks/useTreasury.ts` | ✅ Done |
| 10 | Component — `DelegationPanel.tsx` | `frontend/obscura-os-main/src/components/vote/` | ✅ Done |
| 11 | Component — `TreasuryPanel.tsx` | `frontend/obscura-os-main/src/components/vote/` | ✅ Done |
| 12 | Component — `RewardsPanel.tsx` | `frontend/obscura-os-main/src/components/vote/` | ✅ Done |
| 13 | Component — `VoteSetupGuide.tsx` | `frontend/obscura-os-main/src/components/vote/` | ✅ Done |
| 14 | Page — `VotePage.tsx` (sidebar + tabs overhaul) | `frontend/obscura-os-main/src/pages/VotePage.tsx` | ✅ Done |
| 15 | Quorum progress bars — `ProposalList.tsx` | `frontend/obscura-os-main/src/components/vote/` | ✅ Done |
| 16 | FHE banner + Vote Power stat — `VoteDashboard.tsx` | `frontend/obscura-os-main/src/components/vote/` | ✅ Done |
| 17 | Treasury timelock presets — Settings tab | `TreasuryPanel.tsx` | ✅ Done |
| 18 | Election module removed | VotePage + all election files deleted | ✅ Done |

---

## Deployed Contracts (Arbitrum Sepolia — 421614)

| Contract | Address |
|----------|---------|
| ObscuraToken | `0xf4A1219b0aaB83f772B240Ed508e3A37d7F55ED2` |
| ObscuraPay | `0x13e2e3069bF9729C8Cd239F9A5fAAb087c77C33f` |
| ObscuraEscrow | `0x77d6f4B3250Ef6C88EC409d49dcF4e5a4DdF2187` |
| ObscuraConditionResolver | `0x8176549dfbE797b1C77316BFac18DAFCe42bEb8c` |
| **ObscuraVote (V5 weighted quorum)** | **`0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730`** |
| **ObscuraTreasury** | **`0x89252ee3f920978EEfDB650760fe56BA1Ede8c08`** |
| **ObscuraRewards** | **`0x435ea117404553A6868fbe728A7A284FCEd15BC2`** |
| Deployer | `0xD208aC8327e6479967693Af2F2216e1612D0171A` |

---

## Design Constraints

| Constraint | Reason |
|------------|--------|
| Votes encoded as `euint64` (option index 0–9) | Multi-option: `eq + select + add` per option tallies homomorphically |
| Revote = subtract old + add new | `FHE.sub(tally[i], select(eq(oldVote, i), 1, 0))` then add new |
| `FHE.allowPublic()` only after deadline | Makes aggregate decryptable by anyone — irreversible |
| Individual votes: `allowThis` + `allow(voter)` | Contract retains access; voter can self-verify via "Verify My Vote" |
| Proposal creation: token-gated | Any user who has claimed $OBS at least once can create proposals |
| Cancel/Extend: creator or admin | Proposal creator or contract admin can cancel or extend deadline |
| Voting gated to `$OBS` holders | `require(obsToken.lastClaim(msg.sender) > 0)` — must have claimed once |
| Quorum: configurable (0 = none) | Prevents locked proposals; finalization blocked if quorum not met |
| FHE ops per vote: N × 7 | `eq + select` per option + `add/sub` — gas limit 3M |

---

## Contract Features (ObscuraVote V3)

### Proposal Management
- **Multi-option proposals** (2–10 options per proposal)
- **6 Categories**: General, Treasury, Protocol, Grants, Social, Technical
- **Description field** for proposal context
- **Quorum requirement** (min votes; 0 = no minimum)
- **Token-gated creation** — any $OBS holder can create (not admin-only)
- **Cancel proposal** — creator or admin; allowed if zero votes cast, OR if deadline passed and quorum not met (prevents stuck proposals)
- **Extend deadline** — creator or admin, forward-only

### Voting
- **FHE-encrypted votes** — option index encrypted client-side via `@cofhe/sdk`
- **Revote support** — old vote subtracted, new vote added (anti-coercion)
- **Voter participation tracking** — `voterParticipation(address)` counter

### Finalization & Results
- **Post-deadline finalization** — anyone can call `finalizeVote()`
- **Quorum enforcement** — finalization blocked if quorum not reached
- **Public tally** — `FHE.allowPublic()` on each option's tally after finalize
- **Verify My Vote** — `FHE.allow(newVote, msg.sender)` lets voter self-decrypt their ballot

### FHE Operations Used
`asEuint64`, `eq`, `select`, `add`, `sub`, `allowThis`, `allowPublic`, `allow`

---

## Frontend Architecture

### Hooks
| Hook | Purpose |
|------|---------|
| `useProposals.ts` | `useProposalCount`, `useProposal`, `useProposalOptions`, `useHasVoted`, `useVoterParticipation`, `useVoteOwner`, `useVoteRole` |
| `useEncryptedVote.ts` | Encrypts option index, submits `castVote()` with FHE step tracking |
| `useVoteTally.ts` | `useVoteTally(id, numOptions)` — loop decrypt per option; `useMyVote(id)` — self-decrypt ballot with `.withPermit()` |
| `useFHEStatus.ts` | Shared FHE step state: IDLE → ENCRYPTING → COMPUTING → READY / ERROR |

### Components
| Component | Features |
|-----------|----------|
| `CreateProposalForm` | Templates (Yes/No, Approve/Reject/Abstain, Custom), dynamic options (2–10), description, category, duration presets, quorum |
| `CastVoteForm` | Multi-option radio buttons, OBS token check, revote warning, proposal info display |
| `ProposalList` | Search by title, status filters (All/Active/Ended/Finalized/Cancelled), live countdown, category badges |
| `TallyReveal` | Multi-option colored bars, winner highlight (★), quorum indicator, CSV export, finalize button |
| `VoteDashboard` | Stats (Total Proposals, Your Votes Cast, Wallet, Governance), Privacy Model cards, FHE Operations grid |
| `VotingHistory` | Per-proposal vote status, "Verify My Vote" (FHE self-decrypt), cancelled handling |
| `AdminControls` | Per-proposal cancel + extend deadline buttons (creator/admin only enforced on-chain) |

### Pages
| Page | Tabs |
|------|------|
| `VotePage` | Dashboard, Proposals, Cast Vote, Results, Create — plus privacy sidebar |

---

## Changelog

### [2026-04-30] — V5: DAO Governance Full Stack (Treasury, Rewards, Delegation, UX)

#### Contracts

**ObscuraVote V5 — Weighted Quorum Fix**
- `castVote`: changed `p.totalVoters++` → `p.totalVoters += weight` so quorum counts vote weight (delegated votes included), not just head count
- Redeployed to `0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730`

**ObscuraTreasury (new contract)**
- FHE-encrypted DAO vault — encrypted spend requests attached to governance proposals
- `attachSpend(proposalId, recipient, amountGwei, encAmountGwei)` — stores plaintext gwei for execution + FHE ciphertext for privacy attestation
- `recordFinalization(proposalId)` — starts configurable timelock (default 48h, admin-adjustable down to 5min for testnet)
- `executeSpend(proposalId)` — no user input needed; reads `amountGwei` from private storage, transfers to recipient after timelock
- `setTimelockDuration(seconds)` — admin/owner configurable timelock (min 60s)
- `setVoteContract(address)` — admin updatable vote contract reference
- `getSpendRequest` returns `(recipient, executed, exists, timelockEnds, amountGwei)`
- Deployed to `0x89252ee3f920978EEfDB650760fe56BA1Ede8c08`

**ObscuraRewards (new contract)**
- FHE-encrypted voter incentive layer — 0.001 ETH per finalized proposal voted on
- `accrueReward(proposalId)` — adds encrypted reward to voter's `euint64` balance via `FHE.add()`
- `requestWithdrawal()` — marks withdrawal intent (FHE.allow removed to avoid Fhenix testnet rate limits)
- `withdraw()` — transfers pending ETH; uses plain `_totalAccruedGwei` accounting for correctness (FHE.sub removed to avoid rate limit)
- `setVoteContract(address)` — admin updatable
- `pendingRewardWei(voter)` — voter/admin view of pending reward
- Deployed to `0x435ea117404553A6868fbe728A7A284FCEd15BC2`

#### Frontend — New Components

**DelegationPanel.tsx** (Tally-style profile)
- Gradient address avatar, profile header with Vote Weight / Delegators / Voting Mode stats
- "Delegating To" card with remove button + amber privacy disclosure (delegation address is public by design, vote choice stays FHE-private)
- "Set/Change Delegate" form with privacy notice
- "Delegated to You" list from on-chain `DelegateSet` / `DelegateRemoved` events
- Collapsible "How Delegation Works" section

**TreasuryPanel.tsx**
- 4 tabs: Spend Requests, Attach Spend, Fund Treasury, Settings (admin only)
- Spend Requests: per-proposal rows with badge state machine (Vote Pending → Start Timelock → Timelock Xm → Ready to Execute → Executed)
- Execute button shows actual ETH amount from contract storage — no manual input
- AsyncStepper milestones on Attach Spend: Encrypting Amount → Submitting TX → Spend Attached
- Settings: 7 timelock presets (5min/10min/30min/1h/6h/24h/48h)
- Timelock display: smart formatter (Xs / Xm / Xh instead of always rounding to hours)

**RewardsPanel.tsx**
- 3 tabs: Earn Rewards, Withdraw, Fund Pool
- Earn Rewards: per-proposal "Claim" buttons for finalized proposals you voted on
- Withdraw: 2-step (Request Withdrawal → Withdraw ETH), shows pending amount, pool insufficient warning
- Fund Pool: anyone can top up the reward pool

**VoteSetupGuide.tsx**
- 4-step onboarding guide: Get ETH → Claim $OBS → Cast First Vote → Set Delegate
- Step 2 uses `lastClaim(address) > 0` (not `balanceOf` — FHE encrypted, always falsy)
- Step 2 action: `scrollIntoView` on `#obs-claim-banner`
- Steps auto-mark Done from on-chain state

#### Frontend — Modified Components / Pages

**VotePage.tsx**
- Sidebar renamed: "Vote Power" → "Delegations"
- Tab type: `"dashboard" | "voting" | "delegate" | "treasury" | "rewards"` (elections removed)
- `VoteSetupGuide` rendered at top of dashboard
- `id="obs-claim-banner"` added to $OBS claim banner
- `handleGuideNavigate` routes guide step actions

**ProposalList.tsx**
- Quorum progress bar added: amber while < quorum, green when met
- Bar uses weighted `totalVoters` vs `quorum` from contract

**VoteDashboard.tsx**
- FHE privacy banner (violet, Lock icon)
- "Vote Power" stat card (violet Shield icon)

#### Hooks

**useDelegation.ts**
- `useDelegators(address)`: `getLogs` for `DelegateSet(delegatee=address)` + `DelegateRemoved` events, builds active set, 30s refresh

**useTreasury.ts**
- `useAttachSpend`: FHE step state (ENCRYPTING → SENDING → READY), passes both plain `amountGwei` and FHE cipher to contract
- `useExecuteSpend`: takes only `proposalId` (no amount — read from contract)
- `useRecordFinalization`, `useDepositTreasury`, `useExecuteSpend`, `useSetTimelockDuration`: all include `maxFeePerGas: 200_000_000n, maxPriorityFeePerGas: 1_000_000n`
- `useTimelockDuration`, `useSetTimelockDuration`

**useRewards.ts**
- `useAccrueReward`, `useRequestWithdrawal`, `useWithdrawReward`, `useFundRewards`
- `usePendingReward(address)`: reads `pendingRewardWei`
- `useRewardAccrued(proposalId, voter)`: double-accrual check

#### Bug Fixes
- **"Claim $OBS" button scroll**: was calling `onNavigate("dashboard")` while already on dashboard — fixed with `scrollIntoView`
- **OBS step Done state**: `balanceOf()` on FHE token is always encrypted/falsy — switched to `lastClaim(address) > 0`
- **ObscuraRewards "Proposal must be finalized"**: rewards contract pointed to old vote contract after vote redeploy — redeployed rewards with new address
- **ObscuraTreasury "Start Timelock" reverted**: treasury pointed to old vote contract — redeployed treasury
- **Timelock badge "1h" for 5-min timelock**: `Math.ceil(300/3600) = 1` rounding — fixed with tiered formatter (Xs/Xm/Xh)
- **Deposit gas error**: `maxFeePerGas` missing from deposit/executeSpend — fixed
- **Withdraw rate limit**: `FHE.sub(enc,enc)` + `FHE.allow()` in withdrawal path hit Fhenix testnet rate limit — both removed (plain accounting drives ETH transfers)
- **Execute Spend required manual FHE amount**: user had to guess encrypted amount — fixed by storing `amountGwei` in contract private storage and reading it in `executeSpend`
- **"Your Balance 0 ETH / FHE-encrypted"**: contradictory labels — renamed to "Pending Reward / Claimable after accrual"



### [2025-04-19] — V4 Hotfix: Cast Vote Bug + FHE Speed
**Frontend Changes:**
- **CastVoteForm.tsx**: Fixed proposal #0 cast vote doing nothing — `!proposalId` is `true` when `proposalId === 0n` (BigInt zero is falsy in JS). Changed to `proposalId === undefined`.
- **CastVoteForm.tsx**: Added eager FHE pre-init via `useEffect` — SDK initializes when wallet connects, not on first vote click. Eliminates ~5-10s delay before wallet popup.
- **fhe.ts**: Cached last connected account — `connect()` only re-runs on wallet switch, skipping redundant slow calls on repeat votes.
- **TallyReveal.tsx**: Increased `finalizeVote` gas from 1M to 3M — `FHE.allowPublic()` per option requires FHE gas similar to `castVote`.

### [2025-07-24] — V4: Bug Fixes (Stuck Proposals + Frontend)
**Contract Changes:**
- Fixed `cancelProposal` — now allows cancellation when deadline has passed AND quorum was not met (prevents permanently stuck proposals)
- Previous logic: `require(p.totalVoters == 0)` — blocked cancel on any voted proposal even if unfinalizeable
- New logic: `require(noVotes || expiredNoQuorum)` — cancel OK if no votes OR (deadline passed + quorum not met)
- Redeployed as V4 at `0x5d91B5ccb581F543f7399eea1c65Dfa88b3f9B7a`

**Frontend Changes:**
- **useVoteTally.ts / useMyVote**: Added `account: address` param to `readContract` call so `msg.sender` is set correctly on-chain (was zero address, causing "Have not voted" revert)
- **CastVoteForm.tsx**: Fixed proposal data leak — `proposalId` now `undefined` when nothing selected (was `0n`, causing `useProposal(0n)` to fetch proposal #0); added `hasSelection` guard on proposal info and vote option display
- Updated `.env` with new V4 contract address

### [2026-04-19] — V3: Token-Gated Proposal Creation + Full Audit
**Contract Changes:**
- Removed `onlyRole(Role.ADMIN)` from `createProposal` — now requires `obsToken.lastClaim(msg.sender) > 0`
- `cancelProposal` now allows creator OR admin (was admin-only)
- `extendDeadline` now allows creator OR admin (was admin-only)
- Redeployed as V3 at `0xE4Dc299F95f989dD9C6dfAD891E17e9Eb578c070`

**Frontend Changes:**
- Renamed "Admin" tab → "Create" tab in VotePage
- Removed admin-only gate on Create tab — all connected wallets see it
- Updated stale text references ("Admin" → token-gated messaging)
- Created `scripts/deploy-vote.js` for vote-only deployment

**Audit Results (this session):**
- All hooks verified: `useProposals`, `useEncryptedVote`, `useVoteTally`, `useFHEStatus` — all match ABI ✅
- All components verified: correct `functionName`, `args`, gas limits ✅
- `.env` and `arb-sepolia.json` addresses consistent ✅
- TypeScript compiles clean (exit code 0) ✅
- Vite production build succeeds ✅

### [2026-04-19] — V2: Multi-Option Voting + Full Feature Upgrade
**Contract Changes:**
- Rewrote `ObscuraVote.sol` for multi-option voting (2–10 options per proposal)
- Added: Category enum, description field, quorum, cancel, extend, voter participation
- Added: Verify My Vote via `FHE.allow(newVote, msg.sender)`
- FHE voting: `eq + select + add` loop per option
- Pre-computed `one` and `zero` euint64 constants for gas optimization
- Deployed V2 at `0xc123cDAD6a91cDd4f45D67Ec07fecAaEDF4f4b88` (replaced by V3)

**Frontend Changes:**
- Updated all hooks for multi-option: `useProposalOptions`, `useVoterParticipation`, `useMyVote`
- `useEncryptedVote`: encrypts option index instead of boolean, gas 3M
- `useVoteTally`: loop decrypt per option with `decryptForView`
- Rewrote all 5 original components + added `VotingHistory.tsx` and `AdminControls.tsx`
- Updated `VotePage.tsx` sidebar for multi-option FHE model
- Updated `contracts.ts` ABI with all V2 functions
- Updated `create-proposal.ts` hardhat task for V2 signature

### [2026-04-18] — Contracts Deployed to Arbitrum Sepolia
- Deployed all contracts (Token, Pay, Escrow, ConditionResolver, Vote V1)
- Frontend `.env` created with all addresses
- All addresses saved to `contracts-hardhat/deployments/arb-sepolia.json`

### [2026-04-17] — Initial Wave 2 Implementation (V1)
**Smart Contract:**
- Created `ObscuraVote.sol` — Yes/No voting with `euint64 yesVotes/noVotes`
- `createProposal()` — ADMIN-gated
- `castVote()` — any $OBS holder, 1=yes/0=no, revote via sub+add
- `finalizeVote()` — post-deadline, `FHE.allowPublic()`

**Frontend:**
- Full page with 5 tabs, hooks, and components
- Routing and navigation integrated

---

## Notes
- Wave 1 contracts already deployed on Arbitrum Sepolia (chain 421614)
- FHE SDK: `@cofhe/sdk ^0.4.0` (browser: `@cofhe/sdk/web`), `@fhenixprotocol/cofhe-contracts` (on-chain)
- Frontend stack: React 18 + Vite 5 + TypeScript + Tailwind + shadcn/ui + wagmi + viem v2.47.6
- Gas patterns: `baseFee * 3` for maxFeePerGas, `baseFee` for maxPriorityFeePerGas
- InEuint64 tuple: `{ctHash: uint256, securityZone: uint8, utype: uint8, signature: bytes}`

# Wave 2 — ObscuraVote: Implementation Progress

> Coercion-resistant governance where votes are encrypted via FHE.  
> No one (including the contract) knows individual vote choices.  
> After the deadline, only the aggregate tally is decrypted publicly.

---

## Scope Overview

| # | Task | Location | Status |
|---|------|----------|--------|
| 1 | Smart Contract — `ObscuraVote.sol` (V4) | `contracts-hardhat/contracts/ObscuraVote.sol` | ✅ Done |
| 2 | Deploy Task Update | `contracts-hardhat/tasks/deploy.ts` | ✅ Done |
| 3 | Deploy Script (vote-only) | `contracts-hardhat/scripts/deploy-vote.js` | ✅ Done |
| 4 | CLI Task Update | `contracts-hardhat/tasks/create-proposal.ts` | ✅ Done |
| 5 | Deployment Record | `contracts-hardhat/deployments/arb-sepolia.json` | ✅ Done |
| 6 | Frontend Config — contracts.ts | `frontend/obscura-os-main/src/config/contracts.ts` | ✅ Done |
| 7 | Hook — `useEncryptedVote.ts` | `frontend/obscura-os-main/src/hooks/useEncryptedVote.ts` | ✅ Done |
| 8 | Hook — `useVoteTally.ts` | `frontend/obscura-os-main/src/hooks/useVoteTally.ts` | ✅ Done |
| 9 | Hook — `useProposals.ts` | `frontend/obscura-os-main/src/hooks/useProposals.ts` | ✅ Done |
| 10 | Page — `VotePage.tsx` | `frontend/obscura-os-main/src/pages/VotePage.tsx` | ✅ Done |
| 11 | Components — `vote/` folder | `frontend/obscura-os-main/src/components/vote/` | ✅ Done |
|   | — `ProposalList.tsx` | | ✅ Done |
|   | — `CastVoteForm.tsx` | | ✅ Done |
|   | — `TallyReveal.tsx` | | ✅ Done |
|   | — `CreateProposalForm.tsx` | | ✅ Done |
|   | — `VoteDashboard.tsx` | | ✅ Done |
|   | — `VotingHistory.tsx` | | ✅ Done |
|   | — `AdminControls.tsx` | | ✅ Done |
| 12 | Routing — `App.tsx` | `frontend/obscura-os-main/src/App.tsx` | ✅ Done |
| 13 | Navigation — `WaveModules.tsx` | `frontend/obscura-os-main/src/components/WaveModules.tsx` | ✅ Done |
| 14 | Navigation — `ObscuraNav.tsx` | `frontend/obscura-os-main/src/components/ObscuraNav.tsx` | ✅ Done |

---

## Deployed Contracts (Arbitrum Sepolia — 421614)

| Contract | Address |
|----------|---------|
| ObscuraToken | `0xf4A1219b0aaB83f772B240Ed508e3A37d7F55ED2` |
| ObscuraPay | `0x13e2e3069bF9729C8Cd239F9A5fAAb087c77C33f` |
| ObscuraEscrow | `0x77d6f4B3250Ef6C88EC409d49dcF4e5a4DdF2187` |
| ObscuraConditionResolver | `0x8176549dfbE797b1C77316BFac18DAFCe42bEb8c` |
| **ObscuraVote (V4)** | **`0x5d91B5ccb581F543f7399eea1c65Dfa88b3f9B7a`** |
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

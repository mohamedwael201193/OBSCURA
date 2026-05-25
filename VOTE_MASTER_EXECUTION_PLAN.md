# VOTE_MASTER_EXECUTION_PLAN.md

**Owner**: Obscura Protocol — `ObscuraVote` (Wave-5+ governance track)
**Network**: Arbitrum Sepolia (chainId 421614). Mainnet blocked on Fhenix CoFHE GA.
**Status at writing**: V5 weighted-quorum encrypted vote, encrypted treasury,
encrypted rewards, $OBS FHERC20, OZ Timelock, ObscuraGovernor, TreasuryStreamer
— all live. Frontend has Dashboard, Proposals, Delegations, Treasury, Rewards
tabs. Used by Credit V2 score (`voterParticipation`) as a real reputation signal.
**Doctrine**: build *on top of* the live governance system. Two parallel
governance tracks already exist on-chain (legacy creator-driven `ObscuraVote` +
new executable `ObscuraGovernor`) — keep both, present each clearly, never
break either. Every shipped contract is frozen unless an immutable property
forces a redeploy.

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
9. [Phased Execution Roadmap (W5V-0 → W5V-12)](#9-phased-execution-roadmap-w5v-0--w5v-12)
10. [Onboarding Redesign](#10-onboarding-redesign)
11. [Information Architecture & Dashboard Hierarchy](#11-information-architecture--dashboard-hierarchy)
12. [Proposal Lifecycle Redesign](#12-proposal-lifecycle-redesign)
13. [Voting UX (coercion-resistant revote surfaced)](#13-voting-ux-coercion-resistant-revote-surfaced)
14. [Treasury UX](#14-treasury-ux)
15. [Delegation UX](#15-delegation-ux)
16. [Rewards UX](#16-rewards-ux)
17. [Governor + Timelock Track UX](#17-governor--timelock-track-ux)
18. [PAY ↔ CREDIT ↔ VOTE Integration](#18-pay--credit--vote-integration)
19. [OBS Utility Expansion](#19-obs-utility-expansion)
20. [Indexer Architecture](#20-indexer-architecture)
21. [Notification Architecture](#21-notification-architecture)
22. [Mobile + PWA UX](#22-mobile--pwa-ux)
23. [Observability & SLOs](#23-observability--slos)
24. [Security Hardening & Audit Readiness](#24-security-hardening--audit-readiness)
25. [Deployment & Migration Strategy](#25-deployment--migration-strategy)
26. [Technical Debt Cleanup](#26-technical-debt-cleanup)
27. [AI-Agent Execution Rules](#27-ai-agent-execution-rules)
28. [Risks, Blockers, Open Questions](#28-risks-blockers-open-questions)
29. [Closing Notes & Non-Goals](#29-closing-notes--non-goals)

---

## 0. Executive Summary

ObscuraVote is the most contractually-complete confidential governance system
shipped on Fhenix CoFHE:

- **Encrypted multi-option ballots** (`FHE.eq + FHE.select` tally loop).
- **Coercion resistance via unlimited revote** (subtract-old + add-new
  ciphertext rewrites — the only on-chain governance in the Fhenix ecosystem
  that does this).
- **Weighted delegation** with one-hop guarantee.
- **Encrypted treasury spend amounts** (revealed only on execute).
- **Encrypted reward balances** (`euint64` per voter; only the voter can
  decrypt).
- **OBS FHERC20** with confidential balance display and shielded transfers.
- **Two parallel governance tracks**:
  1. *Legacy* `ObscuraVote` (creator-driven, encrypted multi-option, treasury
     timelock) — the user-facing surface today.
  2. *Executable* `ObscuraGovernor` + OZ `ObscuraTimelock` + `TreasuryStreamer`
     (Wave-5 Phase 4/5) — for on-chain executable proposals against treasury
     and Credit governance proxy.
- **Live integration with Credit**: `voterParticipation(address)` is a public
  scalar consumed by `ObscuraCreditScoreV2` → boosts borrow LLTV up to +400 bps.

**The protocol is done. The product needs three things:**

1. **Clarity of the two governance tracks**. Today the frontend renders only
   the legacy `ObscuraVote` tab. The new Governor track ships with no visible
   surface beyond a sidebar mention. Most users don't know it exists.
2. **Coercion resistance as a feature**. The revote primitive is the killer
   feature vs Tally / Snapshot. Today the UI doesn't surface it — change
   that. Make "you can change your vote anytime before deadline, anonymously"
   the headline.
3. **Cross-product reputation visibility**. Voting boosts your Credit score.
   Today the Vote app doesn't say so. Show the loop.

This plan ships those without touching live contract code except where a
demonstrated user-blocking bug forces a redeploy. The Vote architecture
is a strict superset of Tally + Snapshot in privacy properties; we just
need to make it usable and visible.

**Phase order is binding.** Each phase has measurable exit criteria, files
touched, rollback path, and AI-agent autonomy gate.

---

## 1. Reality Snapshot

### 1.1 Live infrastructure

#### Contracts

| Contract | Address | File |
|---|---|---|
| ObscuraVote (V5) | `0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730` | [contracts-hardhat/contracts/ObscuraVote.sol](contracts-hardhat/contracts/ObscuraVote.sol) |
| ObscuraTreasury | `0x89252ee3f920978EEfDB650760fe56BA1Ede8c08` | [contracts-hardhat/contracts/ObscuraTreasury.sol](contracts-hardhat/contracts/ObscuraTreasury.sol) |
| ObscuraRewards | `0x435ea117404553A6868fbe728A7A284FCEd15BC2` | [contracts-hardhat/contracts/ObscuraRewards.sol](contracts-hardhat/contracts/ObscuraRewards.sol) |
| ObscuraToken (OBS) | `0xf4A1219b0aaB83f772B240Ed508e3A37d7F55ED2` | [contracts-hardhat/contracts/ObscuraToken.sol](contracts-hardhat/contracts/ObscuraToken.sol) |
| ObscuraGovernor | `0xE4807C9F90a0da8F5B5bafa4361B15ff855b7186` | [contracts-hardhat/contracts/governance/ObscuraGovernor.sol](contracts-hardhat/contracts/governance/ObscuraGovernor.sol) |
| ObscuraTimelock (OZ) | `0x07b7961627f433a1d9001F82Ac4af9F19b9a9E05` | OpenZeppelin TimelockController · 2 d delay · deployer admin renounced |
| ObscuraTreasuryStreamer | `0x4af75Ae3B46C34B70d6E85FEcDb71E99EC490FeD` | [contracts-hardhat/contracts/governance/ObscuraTreasuryStreamer.sol](contracts-hardhat/contracts/governance/ObscuraTreasuryStreamer.sol) |
| ObscuraCreditGovernanceProxy | `0x1C6892cCF24A6ade21B6778D9B5C288Ab85DA49C` | [contracts-hardhat/contracts/credit/ObscuraCreditGovernanceProxy.sol](contracts-hardhat/contracts/credit/ObscuraCreditGovernanceProxy.sol) |

#### Frontend

**Page**: [VotePage.tsx](frontend/obscura-os-main/src/pages/VotePage.tsx).

**Components** (vote-specific):
- [VoteHarmonyDashboard.tsx](frontend/obscura-os-main/src/components/harmony/VoteHarmonyDashboard.tsx)
- [VoteHarmonyTabShell.tsx](frontend/obscura-os-main/src/components/harmony/VoteHarmonyTabShell.tsx)
- [voteHarmonyUi.tsx](frontend/obscura-os-main/src/components/harmony/voteHarmonyUi.tsx)
- [VoteDashboard.tsx](frontend/obscura-os-main/src/components/vote/VoteDashboard.tsx)
- [VoteSetupGuide.tsx](frontend/obscura-os-main/src/components/vote/VoteSetupGuide.tsx)
- [VoteOnboardingWizard.tsx](frontend/obscura-os-main/src/components/vote/VoteOnboardingWizard.tsx)
- [CastVoteForm.tsx](frontend/obscura-os-main/src/components/vote/CastVoteForm.tsx)

**Hooks**:
- [useEncryptedVote.ts](frontend/obscura-os-main/src/hooks/useEncryptedVote.ts)
- [useVoteTally.ts](frontend/obscura-os-main/src/hooks/useVoteTally.ts)
- [useVoteActivity.ts](frontend/obscura-os-main/src/hooks/useVoteActivity.ts)
- [useProposals.ts](frontend/obscura-os-main/src/hooks/useProposals.ts)
- [useDelegation.ts](frontend/obscura-os-main/src/hooks/useDelegation.ts)
- [useTreasury.ts](frontend/obscura-os-main/src/hooks/useTreasury.ts)
- [useRewards.ts](frontend/obscura-os-main/src/hooks/useRewards.ts)
- [useGovernor.ts](frontend/obscura-os-main/src/hooks/useGovernor.ts) — Wave-5
- [useMintObs.ts](frontend/obscura-os-main/src/hooks/useMintObs.ts)

### 1.2 What is verified working end-to-end

Confirmed live on Arbitrum Sepolia per [VOTE-APP-DOCS.md](VOTE-APP-DOCS.md)
and [summary5.md](summary5.md):

| Path | Status |
|---|---|
| OBS claim → balance accrual | live |
| Proposal creation (2–10 options, deadline, quorum, category) | live |
| First-time encrypted vote (`InEuint64`) → tally update | live |
| Revote (silent swap, old subtracted + new added) | live |
| Quorum check (weighted by delegation) | live |
| Finalize → `FHE.allowPublic` on all option tallies | live |
| Cancel proposal (no votes OR quorum failed) | live |
| Deadline extension | live |
| Delegate / undelegate with weight transfer | live |
| Attach spend (encrypted amount) to proposal | live |
| Record finalization → timelock start | live |
| Execute spend (gwei → ETH transfer + `FHE.allowPublic` amount) | live |
| Reward distribution (encrypted balance) | live |
| Reward claim (decrypt + transfer) | live |
| `voterParticipation(address)` read by `ObscuraCreditScoreV2` | live |
| Governor + Timelock + TreasuryStreamer (executable proposals) | deployed, UI thin |

### 1.3 What is deprecated and must NOT be re-introduced

| Item | Reason |
|---|---|
| Legacy Vote V1 / V2 / V3 / V4 contracts | V5 is canonical (weighted quorum) |
| Single-option Yes/No proposals | V5 supports 2–10 options; never collapse |
| Admin-only proposal creation | V5 gates on any OBS claimer; do not re-gate to admin |
| Plaintext vote events | Events emit voter address + proposalId only, never option index |
| The phrase "CoFHE" / "ctHash" / "euint" / "ACL" / "permit" in user-facing copy | banned (parallel to Credit/Pay rule) |
| KURA or CovertMRV anywhere | banned across all Obscura products |

---

## 2. Strengths to Preserve

These are the moats. Every phase must preserve them.

1. **`FHE.eq + FHE.select` tally loop**. The textbook FHE pattern for
   encrypted multi-option tally: for each option `i`, `isMatch = FHE.eq(vote, asEuint64(i))`,
   `inc = FHE.select(isMatch, weight, 0)`, `tally[i] += inc`. No branching
   on encrypted state. Every new option-style ballot must use this.
2. **Subtract-old + add-new revote pattern**. The coercion-resistance
   primitive. A coercer can never verify what you ultimately voted for —
   you can rewrite your ballot up to the deadline without on-chain trace
   of *which* option moved. This is structurally stronger than Snapshot
   (off-chain signed snapshots, last-write-wins observable) and Tally
   (on-chain Compound-Bravo, vote is permanent).
3. **`FHE.allowPublic` only at finalize**. Tallies stay opaque until the
   proposal closes. No live tallies leak. Never weaken this — no "live
   leaderboard" feature unless cryptographically sound (it isn't, today).
4. **Weighted delegation with one-hop guarantee**. `delegate(_to)` reverts
   if `_to` has already delegated. Prevents recursive weight inflation +
   keeps the delegation graph trivially auditable. Preserve.
5. **Atomic weight transfer on revote / delegation change**. `voterWeightUsed`
   records the weight used per (proposal, voter) so a delegation change
   mid-proposal can be cleanly reversed. Hard problem, solved correctly.
6. **`hasVoted` is public, `vote choice` is private**. The right split:
   participation is verifiable (anti-bribery, sybil mitigation, reputation
   signal), but the choice is unreadable. Tally and Snapshot leak both.
7. **`voterParticipation` is a public counter**. Used by `ObscuraCreditScoreV2`
   as a reputation signal. Cross-product reputation works *only* because
   this field is public. Preserve.
8. **Encrypted treasury spend amount until execute**. `attachSpend` stores
   the amount as `euint64` and a private gwei mapping (no ABI getter).
   `FHE.allowPublic` is only called at `executeSpend`. Voters know what
   they're authorizing (creator-disclosed off-chain), but the chain
   doesn't leak failed-proposal amounts.
9. **Encrypted reward balance per voter**. `euint64 _encBalance[user]`;
   `FHE.allowThis` after every credit; only voter decrypts. Reward stream
   is private — observers can't deduce "user X voted on N proposals" from
   reward inflation.
10. **OZ `TimelockController` with renounced deployer admin**. The Wave-5
    Governor track has no backdoor. Deployer was renounced; only the
    Governor itself can queue/execute via the timelock. Audit-grade.
11. **One-hop guard in `delegate`**. Two-line check, prevents recursion.
    Keep.
12. **`obsToken` is `immutable` on ObscuraVote**. Token can never be
    silently swapped. Voting weight source is fixed forever.
13. **No auto-decrypt on mount**. `useEncryptedVote`, `useRewards`,
    `useTreasury` all gate decryption behind explicit user clicks.
    No MetaMask popup spam at page load.
14. **Public counters serve as scaling rails**. `nextProposalId`,
    `voterParticipation`, `delegationWeight`, `hasVoted` are all public
    scalars — used for indexing, reputation, and pagination. The privacy
    contract is *per-vote-choice is encrypted*; participation aggregates
    are public.
15. **Two-track architecture**. Legacy creator-driven (low friction, broad
    participation) + Governor track (executable, audit-grade). The right
    split. Neither replaces the other.
16. **`extendDeadline` + `cancelProposal`**. Stuck-proposal recovery built
    in from V5. No proposal ever bricks the treasury.
17. **Reward gating on participation count**. `lastClaim(user) > 0` proves
    a user has at least minted OBS once; combined with `voterParticipation`
    forms the basic anti-sybil ladder.
18. **All amount-bearing events emit ctHash handles**. No plaintext leak.
    Verified.

---

## 3. Weaknesses, Gaps, and Real Friction

Ordered by severity.

| # | Gap | Severity | Notes |
|---|---|---|---|
| 1 | **Two governance tracks rendered as one** | 🔴 critical | Frontend conflates legacy ObscuraVote with Governor. Users don't know which to use when. |
| 2 | Coercion-resistant revote is invisible | 🔴 critical | The killer feature isn't surfaced anywhere in the UI. No "change your vote anytime" banner, no revote-history affordance. |
| 3 | First-time voter onboarding = 4+ popups | 🔴 critical | connect → switch network → mint OBS → cast vote. Each step has no signposting. |
| 4 | Every encrypted reveal = 1 MetaMask popup | 🟠 high | Reveal rewards balance → popup. Reveal own vote → popup. Should share Credit/Pay's permit session (W5C-1). |
| 5 | No notification when proposal hits quorum / finalizes / spend executes | 🟠 high | User must manually refresh. Treasury timelock countdown invisible after window close. |
| 6 | Treasury UI doesn't preview the spend before execute | 🟠 high | At execute time, `FHE.allowPublic` reveals the amount — but the UI today doesn't show "you are about to release X ETH to recipient Y, confirm". |
| 7 | Rewards claim flow opaque | 🟠 high | User sees `***` balance; click "Reveal" → number appears; no clear "claim now" or "I claimed X on date Y" history. |
| 8 | Delegation is one-hop only but UI never explains why | 🟠 high | "Delegation failed: delegatee has already delegated" is a generic revert toast. Should pre-check + explain. |
| 9 | $OBS utility is unclear | 🟠 high | UI presents OBS as "vote token", but it also: gates Pay subscription rewards, anchors Credit score signals via `voterParticipation`, will (per Roadmap) gate vault discounts. Never explained in one place. |
| 10 | Mobile broken | 🟠 high | Tab bar wraps; CastVoteForm overflows; delegation graph SVG unreadable < 640 px. |
| 11 | No indexed activity feed | 🟠 high | Per-page-load event reads against ObscuraVote. Slow + brittle. |
| 12 | No proposal preview / draft | 🟡 med | Proposal creation is a single 1-shot form; no preview before broadcast. |
| 13 | No proposal templates | 🟡 med | DAO ops people benefit from templates ("treasury spend", "parameter change", "policy update"). |
| 14 | Quorum threshold legibility low | 🟡 med | Shows "quorum: 1000"; doesn't say "1000 OBS weight, currently 320 cast (32 %)" without manual math. |
| 15 | No proposal categories taxonomy in UI | 🟡 med | `Proposal.category` field exists; UI doesn't filter / color-code. |
| 16 | Encrypted-vote "your choice" recovery missing | 🟡 med | A user who voted then closed tab has no way to see what they voted (the encrypted handle is theirs to decrypt, but UI doesn't expose it). |
| 17 | Treasury balance not displayed prominently | 🟡 med | Treasury page shows allocated but not on-chain ETH balance. |
| 18 | No CSV / PDF export of voting history | 🟡 low | Tax-relevant for rewards; governance-relevant for compliance. |
| 19 | Governor track has no proposal-creation UI surface | 🟠 high | `ObscuraGovernor.propose(targets, values, calldatas, description)` is callable only by RPC; no form. |
| 20 | TreasuryStreamer is "live" with no surface to start / inspect a stream | 🟠 high | Governance can authorize streams; UI doesn't show their state. |
| 21 | No score-feedback loop visible | 🟠 high | Voting boosts Credit score (live, V2). Vote app never says so. |
| 22 | Coercion-resistance footnote: revote leaks timing (block.timestamp) | 🟡 med | The fact a revote occurred (event `VoteChanged`) and its timestamp are public. The choice is private. Acceptable; document. |

---

## 4. Competitive Deep Dive

### 4.1 Tally — non-private, the institutional incumbent

URL: `tally.xyz`. Chain: every major EVM L1/L2. Protocol: OpenZeppelin
Governor / Compound Bravo. Standard-bearer for production DAO UX.

**What they have**:
- Clean proposal lifecycle: Draft → Active → Succeeded → Queued → Executed.
- One-click delegation with search-by-ENS.
- Vote-with-reason — every vote can carry a public comment.
- Detailed token-distribution analytics (top holders, delegation graph).
- Proposal preview before broadcast.
- Integration with multisig signers (Safe).
- Tally-managed off-chain notification (email digest).
- API + GraphQL for ecosystem tooling.
- Mobile-responsive.

**What Obscura has that Tally does not**:
- **Vote choice privacy**. Tally shows every voter's choice. We don't.
- **Coercion resistance**. Tally's Compound-Bravo votes are permanent.
  We allow unlimited revote.
- **Encrypted treasury spend amounts** until execute. Tally shows
  amounts in the proposal calldata at creation.
- **Encrypted reward balances** (Tally has no reward primitive).
- **Cross-product reputation moat** (Pay + Credit integration).

**Adopt**:
- **Proposal lifecycle visualization**. Tally's stepper (Draft / Active /
  Succeeded / Queued / Executed) is the gold standard. Mirror at §12.
- **Vote-with-reason** *publicly* attached to the encrypted ballot.
  Reason is plaintext + signed (proves it's yours); choice stays
  encrypted. The combination is novel: "I support option B because X"
  without revealing B. Wait — for Obscura, since the choice is encrypted,
  the reason can be attached without revealing the choice. Implement
  as an optional public comment per ballot. Lands in W5V-6.
- **Token-distribution analytics**. Public OBS holdings, top delegates,
  delegation graph. All public scalars — no privacy cost.
- **Proposal preview**. Always preview before broadcast.
- **Delegation search**. ENS + AddressBook integration for delegate
  discovery.
- **Email digest** (opt-in). Tally's "weekly digest of all proposals
  you're eligible to vote on" is excellent UX. Mirror in W5V-8.

**Avoid**:
- Public vote choices.
- Per-vote-choice analytics ("80 % of whales voted Yes" — leak vector).
- Compound-Bravo's permanent vote (forces voters to wait until end to
  decide — bad UX even before privacy).

### 4.2 Snapshot — off-chain, broad-adoption

URL: `snapshot.org`. Off-chain signed messages → IPFS → space-level
aggregation. The default for "vibes-check" DAO voting.

**What they have**:
- Massive adoption (50k+ spaces).
- Gas-free voting via off-chain signed messages.
- Multi-strategy weighting (token balance, NFT, ERC-1155, custom).
- Voting types: single-choice, weighted, ranked, quadratic, approval.
- Strategy plugins / oracle adapters.
- Easy proposal-template space configuration.
- Mobile-responsive PWA.
- API + GraphQL.

**What Obscura has that Snapshot does not**:
- **On-chain execution path** (Tally-equivalent via Governor).
- **Vote choice privacy** (Snapshot publishes every signed vote to IPFS).
- **Encrypted treasury** (Snapshot has no treasury).
- **Coercion resistance** (Snapshot's signed messages are observable;
  last-write-wins is visible).
- **Reward primitive**.

**Adopt**:
- **Voting types beyond single-choice**. Snapshot's quadratic + approval
  + ranked options are useful for parameter-tuning votes. Design ScoreV3
  of voting where the option set encodes a budget allocation; the FHE
  tally accumulates per-option weight. Quadratic is the easy add (multiply
  weight by `sqrt(stake)`); ranked requires deeper FHE work. Land
  quadratic-vote in W5V-11 (deferred design).
- **Multi-strategy weighting**. OBS-only today; in W5V-9 add: OBS balance
  + delegationWeight + (optional) Credit-tier multiplier. All values
  available as plaintext scalars.
- **Space configuration as data, not code**. Snapshot proposals are JSON;
  ours are on-chain. Bridge: ship a proposal-template registry — common
  proposal shapes encoded as a JSON template that prefills the form.
- **Easy proposal creation**. Snapshot's 5-field form is the right ergonomic.

**Avoid**:
- Public signed votes. Trade-off the entire privacy thesis.
- Off-chain only (no execution). We are not Snapshot; we have a real treasury.
- IPFS-hosted vote storage. Single point of failure that leaks pinning patterns.

### 4.3 Nouns DAO — radical-transparency baseline

URL: `nouns.wtf`. On-chain everything. Single-NFT-per-voter. Auction-funded
treasury. "Lil Nouns" forked widely.

**What they have**:
- Iconic visual identity. Every proposal page is *beautiful*.
- Tight loop: auction → treasury → proposal → execute. ~24h cycle.
- Snappy mobile experience.
- "Sponsored" proposals: anyone can draft, sponsorship gates broadcast.
- Forking primitive (treasury split as exit valve).

**Adopt**:
- **Sponsored / co-sponsored proposals**. Before a proposal goes live,
  it needs N OBS-weighted endorsements. Filters spam, builds buy-in.
  Land in W5V-5 — optional sponsor flow (toggle in proposal creation).
- **Visual proposal identity**. Each proposal gets a generated visual
  thumbnail (deterministic from id + title hash). Improves scannability
  in lists.
- **Tight feedback loop**. Show "treasury grew/shrank by X this proposal
  cycle".
- **Mobile-first execution**. Lighthouse 90+ on mobile (parallel to Credit §22).

**Avoid**:
- NFT-per-voter (we're token-weighted, correct for our use case).
- Forking primitive — design complexity outweighs benefit for our scale.

### 4.4 Aragon — institutional, modular

URL: `aragon.org`. DAO-as-modules, multi-token, OZ Governor-extended.

**Adopt**:
- **Plugin / module marketplace concept**. We won't ship a marketplace
  but the *idea* of "governance modules" maps onto our two-track
  architecture: Legacy is one module (creator-driven), Governor is another
  (executable on-chain). Future: voting-rule modules (quadratic, ranked).
- **Audit-grade timelock UX**: countdown badges, "queue-only" indicators,
  per-action calldata preview.

**Avoid**:
- Multi-token complexity. OBS is the single token; do not fragment.

### 4.5 Blank Wallet (now BlockWallet) — privacy wallet UX

URL: `blockwallet.io`. Browser-extension wallet with stealth address
defaults.

**Adopt**:
- **Privacy-state indicator** persistent in chrome (a tiny lock badge
  showing "your activity is shielded"). Mirror as a global header chip
  parallel to the permit-session countdown.
- **One-tap private send / receive** — for OBS, "send privately" must
  be a single button using shielded transfer paths from Pay.

**Avoid**:
- Browser-extension-only flow. We are a web dApp.

### 4.6 Fhenix-ecosystem peers

(Lifted from CREDIT_MASTER_EXECUTION_PLAN §4 — the same competitor set
applies; governance is the inverse-asymmetry view of the same protocols.)

| Project | Governance-relevant observation |
|---|---|
| **Walnut** | No governance at all. Deployer-EOA-owned. Our Governor track is a moat. |
| **CipherRoll** | Has admin/employee/auditor roles, no DAO. Their pattern of *aggregate-only* audit review maps onto our finalized-tally view: never expose per-voter, only aggregates. |
| **Blindference** | Role-based portals; no governance. |
| **Prova** | No governance; centralized issuer. |
| **Lendi** | Landing only. |
| **Zalary** | No governance. |
| **Z0tz** | 404. |

**Composite competitive thesis**:

> Tally owns "non-private, executable, institutional".
> Snapshot owns "non-private, off-chain, easy".
> Nouns owns "non-private, radical-transparency, narrative-driven".
> **Obscura is the only stack that is on-chain executable, coercion-resistant,
> private-by-default, and cross-product-reputational.** No competitor has
> all four properties. The wedge is real; we just need to make it *legible*
> and *usable*.

---

## 5. Architectural Constraints (frozen by deployment)

1. **`ObscuraVote.obsToken` is `immutable`**. Voting weight source can never
   change without redeploying ObscuraVote (and migrating proposals — not
   feasible).
2. **`ObscuraVote.proposals` storage layout is frozen**. Adding fields to
   `Proposal` requires a new contract.
3. **`ObscuraTreasury.voteContract` is `immutable`**. Treasury is locked to
   ObscuraVote V5 forever. New Vote → new Treasury.
4. **OZ `TimelockController.minDelay` is mutable** *only* by the timelock
   itself (governance must propose a change to itself). Default 2 days.
5. **Governor `votingDelay`, `votingPeriod`, `proposalThreshold` are
   parameters**. They can be tuned via governance proposals on the Governor.
   Initial values were set at deploy.
6. **`ObscuraCreditGovernanceProxy.governor` is `immutable`**. Cannot
   swap governance contract without redeploying the proxy.
7. **`FHE.allowPublic` is irreversible**. Once a tally is publicized, it's
   public forever. Finalize is a one-way door — UI must say so.
8. **One-hop delegation rule** is enforced in `delegate()` — if `_to` has
   already delegated, revert. Cannot relax to multi-hop without contract
   change (and we don't want to).
9. **`hasVoted` is public by design**. Cannot hide without re-architecting
   the entire reputation / quorum loop. Accept the leak; benefit the
   reputation moat.
10. **`voterParticipation(address)` is public auto-getter**. Used by
    `ObscuraCreditScoreV2`. Must remain public.
11. **`Proposal.totalVoters` is public weight counter**, not unique-voter
    count. Display labels must say "total weight cast", not "voters".
12. **Treasury holds plain ETH**. Spend amounts encrypted; the asset is
    public. We are *not* hiding the treasury balance — the treasury
    holding is a public good for transparency. Don't propose hiding it.
13. **`ObscuraToken` is FHERC20**: balances encrypted on-chain. `lastClaim`
    is public scalar. The `mint` / `claim` path is what gates new voters.
14. **Reward balances stored as `euint64` per user**. Public counter
    `rewardsDistributed` (if exists) is OK; per-user is encrypted.

---

## 6. Privacy Matrix

> **Mandatory deliverable**: ship `docs/vote/PRIVACY_MATRIX.md` in W5V-0.

### 6.1 Private by design (encrypted on-chain)

| Value | Storage | Decrypt path |
|---|---|---|
| Ballot choice | `voterEncryptedVote[proposalId][voter]` (`euint64`) | Only voter; `FHE.allow(handle, voter)` |
| Treasury spend amount (pre-execute) | `SpendRequest.encAmountGwei` (`euint64`) | Creator + recipient; only revealed at execute via `FHE.allowPublic` |
| Reward balance | `ObscuraRewards._encBalance[user]` (`euint64`) | Only voter; reveal triggered by user |
| OBS balance | `ObscuraToken._encBalances[user]` (`euint64`) | Only owner |
| Per-option tally during voting | `tallies[id][i]` (`euint64`) | Nobody until finalize |

### 6.2 Public by design

| Value | Why public |
|---|---|
| Proposal metadata (title, description, options, deadline, quorum, category, creator) | Discovery + civic transparency |
| `hasVoted(proposalId, voter)` | Participation verifiability, sybil mitigation, reputation signal |
| `voterParticipation(voter)` | Cross-product reputation (Credit score input) |
| `delegationWeight(delegate)` | Delegation transparency |
| `delegateTo(delegator)` | One-hop delegation graph audit |
| Aggregate tallies after finalize | `FHE.allowPublic` releases per-option totals |
| Treasury ETH balance | Public good — transparent treasury |
| Spend recipient address | Public from `attachSpend` |
| Spend amount **after execute** | `FHE.allowPublic` |
| `lastClaim(user)` on OBS | Public gating signal |
| Governor proposal `targets`, `values`, `calldatas`, `description` | Executable proposals are fully public by design |
| Timelock queue state | Public for audit |

### 6.3 Inferable

| Inference | Source |
|---|---|
| "User voted on proposal X" | `hasVoted` mapping |
| "User changed their vote on proposal X" | `VoteChanged` event |
| "User holds OBS" | `lastClaim(user) > 0` |
| Voting timing patterns | tx timestamps |
| Delegation history | `DelegateSet` / `DelegateRemoved` events |
| Approximate voter sentiment from proposal pass/fail rate | Public outcomes |

### 6.4 Hard guarantees

- No event leaks a ballot choice. `VoteCast` / `VoteChanged` carry only
  `(proposalId, voter)`. **Verify in tests**.
- No view function returns per-voter `voterEncryptedVote[id][user]` to
  any caller except the user (FHE.allow scope).
- No `if/else` on encrypted state in `_addTally` / `_subtractTally`.
- Treasury `encAmountGwei` is never `FHE.allowPublic`'d until `executeSpend`.
- Rewards balance per user never publicly revealed.
- Coercion-resistant revote: a coercer observing the chain cannot prove
  what a voter ultimately chose.

### 6.5 What we do not hide

- Whether you voted (intentional, drives reputation).
- Whether you revoted (intentional, drives the coercion-resistance UX —
  see §13).
- Your delegation choice (intentional, governance transparency).
- Your reward-claim timing (intentional, public spend gating).
- Your OBS-mint timing.
- Treasury custody (intentional — encrypted treasury balance defeats
  audit assumptions of DAO health).

---

## 7. UX Problems (concrete)

Observed on the live V5 + Governor build:

1. **Two governance tracks rendered as one tab strip.** A user reading the
   sidebar sees "Executable Proposals" next to "Proposals" with no
   explanation. Most click the legacy "Proposals" without realizing the
   executable lane exists.
2. **Coercion-resistant revote is hidden.** A user who votes sees a toast
   "vote cast" — but nothing tells them "you can change your vote anytime
   before the deadline, anonymously, no one will know what you ultimately
   chose."
3. **Onboarding bumps.** A new user must: connect → switch network → mint
   OBS → maybe wait for the OBS to land → cast a vote. Each step has a
   popup; none have signposting.
4. **No notifications.** A user who delegates 1000 OBS and walks away has
   no way to learn that their delegate voted on proposal X. Same for
   "proposal hit quorum", "your spend executed", "your reward credited".
5. **Treasury spend reveal at execute is unceremonious.** When `executeSpend`
   runs, the ETH transfers, the amount becomes public, but the UI shows a
   generic "executed" toast — no "X ETH released to Y" celebration card.
6. **Rewards balance reveal disconnected from claim.** Reveal shows
   `127.50 OBS`. Click "Claim" → MetaMask → done. No history of past
   claims. No "next reward window opens in 3d 14h".
7. **Delegation failures opaque.** Selecting a delegate who has already
   delegated triggers a contract revert; toast shows "execution reverted".
   No pre-check: "this address has delegated to someone else; pick another".
8. **Quorum legibility low.** "Quorum: 1000" shown. Without manual math,
   user can't tell what % they need to push it over. Show "current cast
   weight / quorum threshold" inline.
9. **Proposal creation lacks preview + draft.** One form, one broadcast.
   Misspell the title and it's on-chain forever.
10. **No proposal templates.** "Treasury spend to X", "Adjust Credit market
    liqBonus", "Approve OBS distribution" — these are recurring shapes.
    DAO ops needs templates.
11. **Mobile broken.** CastVoteForm has horizontally-arranged option chips
    that overflow at 375 px. Delegation page renders an SVG graph
    unreadable at < 700 px. Treasury timelock countdown wraps to 4 lines.
12. **OBS utility unstated.** "Mint OBS" with no copy explaining why I
    need it (votes? rewards? Credit boost? all three?).
13. **Score loop invisible.** A user casts their 5th vote. Their Credit
    tier just moved from 1 → 2. The Vote app doesn't acknowledge it.
14. **No proposal categories filtering.** Field exists; no filter chips
    in the list view.
15. **No revote-aware "your vote" surface.** After voting, a user has no
    way to see what they voted (the encrypted handle is allowed to them,
    but the UI never exposes a "show my vote" button).
16. **Treasury ETH balance buried.** Should be the headline of the
    Treasury tab.

---

## 8. Design Principles

The principles all phases below must obey.

1. **Public data auto-loads.** Proposal lists, vote-status counters,
   treasury balance, delegation graph — no wallet popup to view.
2. **Encrypted data only on user click.** Tally reveal at finalize,
   reward reveal, own-vote reveal — all explicit.
3. **One permit session across Pay + Credit + Vote** (parallel to
   CREDIT W5C-1). A 5-minute MetaMask-free reveal window.
4. **Surface coercion resistance as the headline.** Every voting screen
   says: "You can change your vote until <deadline>. Your choice stays
   private."
5. **Distinguish the two governance tracks visually.** Legacy is
   "community proposals" (no execute); Governor is "executable proposals"
   (on-chain action). Both first-class, separately surfaced.
6. **Plain language.** Never "euint", "ctHash", "ACL", "permit",
   "CoFHE", "ciphertext", "FHE.allowPublic". Always: "encrypted",
   "private", "tally is published".
7. **Lifecycle visualization on every proposal.** Stepper showing where
   in the lifecycle the proposal currently sits.
8. **No silent reverts.** Every revert path pre-checked + explained
   before the user signs.
9. **Quorum, timelock, deadline always rendered as countdowns** with
   absolute timestamps on hover.
10. **Reputation feedback loop visible.** Voting → "+1 vote · +8 score
    pts · Credit tier 1→2" toast that links to Credit.
11. **Mobile-first.** Designed at 375 px first.
12. **Composable.** Treasury spend can fund Credit liquidity; Credit
    governance proxy can be moved by Governor; Pay can fund OBS minting
    via treasury — all surfaced cross-product.
13. **No new contracts unless an immutable property blocks a real user
    need.** Hooks, off-chain workers, indexers first.
14. **Honest framing.** Privacy matrix shipped. Mainnet status stated.

---

## 9. Phased Execution Roadmap (W5V-0 → W5V-12)

> Numbering: `W5V-N` = Wave-5 Vote phase N. Independent of Pay (W5P-) and
> Credit (W5C-) numbering. Each phase has: scope, files touched, exit
> criteria, rollback path, AI-agent autonomy gate.

### W5V-0 — Audit & Privacy Matrix (no-code prereq, 1 day)

**Scope**: ratify this document; ship privacy matrix; verify deployment
ledger.

**Tasks**:
- [ ] Ship `docs/vote/PRIVACY_MATRIX.md` (content from §6)
- [ ] Update [README.md](README.md) Vote section with mainnet honesty
      paragraph (lift from summary5.md)
- [ ] Cross-link from [docs/credit/PRIVACY_MATRIX.md](docs/credit/PRIVACY_MATRIX.md)
- [ ] Verify all addresses in [.env](.env) match `deployments/arb-sepolia.json`

**Exit**: privacy matrix merged; deployment ledger verified.
**Rollback**: doc-only.
**AI agent**: full autonomy.

---

### W5V-1 — Two-Track Visibility

**Scope**: make legacy `ObscuraVote` (community proposals) and
`ObscuraGovernor` (executable proposals) two clearly-labeled, equally
first-class surfaces.

**Files**:
- Edit: [VotePage.tsx](frontend/obscura-os-main/src/pages/VotePage.tsx) —
  re-architect tab bar to: Overview · Community Proposals · Executable
  Proposals · Delegation · Treasury · Rewards
- New: `frontend/obscura-os-main/src/components/vote/TrackBadge.tsx` —
  pill badge: "Community" (legacy) vs "Executable" (Governor)
- New: `frontend/obscura-os-main/src/components/vote/TrackExplainer.tsx`
  — collapsible info card at the top of each tab explaining the track
- Edit: [VoteHarmonyTabShell.tsx](frontend/obscura-os-main/src/components/harmony/VoteHarmonyTabShell.tsx)
  to support the new tab schema

**Behavior**:
- First-land users see Overview with both tracks summarized.
- Community Proposals tab: legacy ObscuraVote flow, badge "Community ·
  Privacy-first · Off-chain action".
- Executable Proposals tab: Governor + Timelock track, badge "Executable
  · On-chain · 2-day timelock".
- TrackExplainer copy:
  - Community: "Anyone with OBS can propose. Votes are private. Used for
    polling, sentiment, off-chain coordination. Treasury can be attached
    to fund the outcome."
  - Executable: "Proposals encode on-chain actions (treasury releases,
    parameter changes, contract upgrades). 2-day timelock before
    execute. Same privacy on the ballot itself."

**Exit**: A new user opening `/vote` understands within 10 seconds
which track to use for which need.

**Rollback**: feature flag `VITE_VOTE_TRACKS_V2=false` falls back to
single proposal tab.

**AI agent**: full autonomy.

---

### W5V-2 — Coercion-Resistance UX (the headline feature)

**Scope**: surface the unlimited-revote primitive as Obscura's killer
governance feature.

**Files**:
- Edit: [CastVoteForm.tsx](frontend/obscura-os-main/src/components/vote/CastVoteForm.tsx)
  — add prominent banner above the option chips
- New: `frontend/obscura-os-main/src/components/vote/RevoteAffordance.tsx`
  — post-vote card with "Change your vote" button + revote-history
  badge
- Edit: [useEncryptedVote.ts](frontend/obscura-os-main/src/hooks/useEncryptedVote.ts)
  — expose `revoteCount` (derived from `VoteChanged` events for the
  user) and `lastVoteAt`
- New: `frontend/obscura-os-main/src/components/vote/MyVoteReveal.tsx`
  — gated by permit session, reveals the user's *current* vote choice
  (decrypted from their own encrypted handle)

**Behavior**:
- Pre-vote banner: "Your choice will be encrypted. Only you can decrypt
  it. You can change your vote anytime before <deadline>. No one —
  including the contract — can prove what you ultimately chose."
- Post-vote card replaces the form:
  - "✓ Vote cast (encrypted)"
  - "[ Show what I voted ]" → reveals via permit session
  - "[ Change my vote ]" → re-opens form, pre-selects current choice
  - "Coercion-resistance · You've revoted X times. None of your
    intermediate choices left a trace on-chain."
- If user has revoted ≥ 1 time, show a small "🛡 You exercised your
  coercion-resistance right" badge in their profile.

**Exit**: Demo flow: user votes Option A → screenshot the post-vote
card → user revotes Option B → screenshot the updated card showing
revote count = 1.

**Rollback**: revert to v1 form.

**AI agent**: full autonomy.

---

### W5V-3 — Onboarding Redesign (4+ popups → 2)

**Scope**: collapse the new-voter path.

**Files**:
- Major edit: [VoteOnboardingWizard.tsx](frontend/obscura-os-main/src/components/vote/VoteOnboardingWizard.tsx)
- Edit: [VoteSetupGuide.tsx](frontend/obscura-os-main/src/components/vote/VoteSetupGuide.tsx)
  — sunset; merge into wizard
- New: `frontend/obscura-os-main/src/components/vote/VoteFirstLandHero.tsx`

**Onboarding flow**:
1. **Public Overview** (no wallet) — show live community proposals,
   treasury balance, recent votes count. CTA: "Vote privately".
2. **Connect** (1 popup) — wagmi handles network switch automatically.
3. **Mint OBS** (1 popup) — single tx mints starter OBS via faucet path
   on `ObscuraToken`. Copy: "Mint your starter OBS. This is your voice
   in governance. Voting weight = OBS held + delegated to you."
4. **Done** — user lands on Community Proposals tab with empty-state
   "Cast your first private vote" CTA.

Total: **2 popups** (was 4+).

**Behavior**:
- If wallet already has OBS (`lastClaim > 0`), skip step 3.
- If user holds OBS but never voted, show "Cast your first vote · earns
  +8 Credit score points" callout.
- 30-second tour overlay (once-per-browser via
  `localStorage.obscura_vote_tour_v1`, `prefers-reduced-motion` aware) —
  parallel to Credit tour.

**Exit**: Connect → first cast = 2 popups end-to-end.

**Rollback**: keep v1 wizard behind feature flag.

**AI agent**: full autonomy.

---

### W5V-4 — Shared Permit Session (consume Credit W5C-1)

**Scope**: integrate the shared permit session from Credit W5C-1 into all
Vote reveal flows.

**Prereq**: Credit W5C-1 shipped (`usePermitSession` hook).

**Files**:
- Edit: [useEncryptedVote.ts](frontend/obscura-os-main/src/hooks/useEncryptedVote.ts)
  — route reveal through `usePermitSession`
- Edit: [useRewards.ts](frontend/obscura-os-main/src/hooks/useRewards.ts)
  — same
- Edit: [useTreasury.ts](frontend/obscura-os-main/src/hooks/useTreasury.ts)
  — same for spend amount reveals
- Edit: `MyVoteReveal.tsx` (W5V-2) — same
- Edit: Vote header to mount the `PermitSessionCountdown` chip

**Exit**: Reveal own vote + reveal reward balance + reveal a finalized
tally in the same session = **1 MetaMask popup** (was 3).

**Rollback**: feature flag `VITE_PERMIT_SESSION_ENABLED=false` falls
back to per-reveal sign.

**AI agent**: full autonomy; depends on Credit W5C-1.

---

### W5V-5 — Proposal Lifecycle Visualization + Drafts + Sponsorship

**Scope**: every proposal gets a Tally-grade lifecycle stepper, a draft
mode, and an optional sponsorship gate.

**Files**:
- New: `frontend/obscura-os-main/src/components/vote/ProposalLifecycleStepper.tsx`
- New: `frontend/obscura-os-main/src/components/vote/ProposalDraftPreview.tsx`
- New: `frontend/obscura-os-main/src/components/vote/ProposalSponsorship.tsx`
  (off-chain sponsorship via signed message; on-chain proposal only after
  N sponsors)
- Edit: [useProposals.ts](frontend/obscura-os-main/src/hooks/useProposals.ts)
  — `createDraft`, `loadDrafts` (localStorage-backed), `submitProposal`
- New: small worker route `/api/vote/sponsorship` (optional, deferred to
  W5V-7 indexer)

**Lifecycle states**:
- Community track: `Draft · Sponsored · Active · Finalized · Cancelled · Extended`
- Executable track: `Draft · Pending · Active · Succeeded · Queued · Executed · Defeated · Cancelled · Expired`

**Sponsorship**:
- Optional toggle at draft time.
- Sponsors sign EIP-712 message endorsing the draft.
- Once N signatures collected (default 3), the draft becomes broadcastable.
- Signatures stored in indexer (W5V-7).

**Exit**: Create a draft → preview → toggle sponsorship → collect 3
signatures (test) → broadcast → see lifecycle stepper render through
states.

**Rollback**: feature flag falls back to direct create.

**AI agent**: full autonomy for UI; indexer route requires operator.

---

### W5V-6 — Vote-with-Reason + Categories

**Scope**: optional public reason attached to the encrypted vote;
category filter chips.

**Files**:
- Edit: [CastVoteForm.tsx](frontend/obscura-os-main/src/components/vote/CastVoteForm.tsx)
  — add optional reason textarea
- New: `frontend/obscura-os-main/src/components/vote/ReasonAttribution.tsx`
- Off-chain: reason stored in indexer (signed message) — not on-chain
  to avoid bloat. Signature proves authorship without revealing choice.
- Edit: proposal list — category filter chips (already a field in
  `Proposal.category`)

**Privacy note**:
- Reason is public + signed; choice remains encrypted.
- The combination is novel: "I support option B because of X" without
  saying which is B. Voters can disclose if they want; protocol never
  forces.

**Exit**: Cast vote → optionally attach reason → reason appears in
proposal's "Public reasons" tab; voter address shown, choice not.

**Rollback**: hide reason UI.

**AI agent**: full autonomy.

---

### W5V-7 — Indexer (the platform substrate)

**Scope**: ship a real indexer for the vote subgraph.

**Files**:
- New: `indexer/vote/subgraph.yaml`
- New: `indexer/vote/schema.graphql` — `Proposal`, `Vote`, `Delegation`,
  `SpendRequest`, `RewardClaim`, `GovernorProposal`, `TimelockOperation`,
  `Sponsorship`, `Reason`
- New: `indexer/vote/src/mapping.ts`
- New: hosted endpoint (The Graph hosted / Goldsky)
- New: `frontend/obscura-os-main/src/hooks/useVoteIndexer.ts`
- Edit: [useVoteActivity.ts](frontend/obscura-os-main/src/hooks/useVoteActivity.ts)
  — read from indexer instead of RPC

**Schema highlights**:

```graphql
type Proposal @entity {
  id: ID!
  track: Track!
  title: String!
  description: String!
  options: [String!]!
  deadline: BigInt!
  quorum: BigInt!
  category: String!
  creator: Bytes!
  isFinalized: Boolean!
  finalizedAt: BigInt
  cancelled: Boolean!
  totalWeightCast: BigInt!
  finalTallies: [BigInt!]  # populated only after finalize
  spendRequest: SpendRequest @derivedFrom(field: "proposal")
  votes: [Vote!]! @derivedFrom(field: "proposal")
}

enum Track { Community Executable }

type Vote @entity(immutable: true) {
  id: ID! # txHash-logIndex
  proposal: Proposal!
  voter: Bytes!
  type: VoteType!  # Cast | Changed
  weight: BigInt!
  txHash: Bytes!
  timestamp: BigInt!
  # No choice: never indexed
}

enum VoteType { Cast Changed }

type Delegation @entity {
  id: ID! # delegator
  delegator: Bytes!
  delegatee: Bytes!
  weight: BigInt!
  setAt: BigInt!
}

type SpendRequest @entity {
  id: ID! # proposalId
  proposal: Proposal!
  recipient: Bytes!
  amountCtHash: Bytes!       # encrypted until execute
  publicAmount: BigInt        # populated only after execute
  finalizedAt: BigInt
  executedAt: BigInt
  txHash: Bytes
}

type RewardClaim @entity(immutable: true) {
  id: ID!
  user: Bytes!
  amountCtHash: Bytes!  # only encrypted handle exposed
  timestamp: BigInt!
  txHash: Bytes!
}

type GovernorProposal @entity {
  id: ID! # governor proposalId
  proposer: Bytes!
  targets: [Bytes!]!
  values: [BigInt!]!
  calldatas: [Bytes!]!
  description: String!
  state: GovernorState!
  voteStart: BigInt!
  voteEnd: BigInt!
  queuedAt: BigInt
  executedAt: BigInt
  eta: BigInt
}

enum GovernorState { Pending Active Canceled Defeated Succeeded Queued Expired Executed }

type Sponsorship @entity {
  id: ID! # draftHash + sponsor
  draftHash: Bytes!
  sponsor: Bytes!
  signature: Bytes!
  timestamp: BigInt!
}

type Reason @entity(immutable: true) {
  id: ID! # signatureHash
  proposal: Proposal!
  voter: Bytes!
  text: String!
  signature: Bytes!
  timestamp: BigInt!
}
```

**Privacy rules**: NEVER index vote choices. NEVER index reward amounts.
NEVER index spend amounts until publicly revealed by `executeSpend`.

**Exit**: `useVoteIndexer({ track, status, voter, limit, cursor })` returns
last 50 entries in < 500 ms with cursor pagination.

**Rollback**: `VITE_VOTE_INDEXER_ENABLED=false` falls back to RPC reads.

**AI agent**: subgraph deploy requires operator.

---

### W5V-8 — Notifications

**Scope**: turn the vote indexer into a notification stream. Parallels
Credit W5C-8 — shared worker if possible.

**Files**:
- Reuse: notification worker shipped in Credit W5C-8 (extend with vote
  event handlers)
- New: `frontend/obscura-os-main/src/hooks/useVoteNotifications.ts`
- Edit: [NotificationCenter.tsx](frontend/obscura-os-main/src/components/shared/NotificationCenter.tsx)
  (from Credit W5C-8) — add vote notification types

**Notification types**:
- `proposal_created_in_category` — new proposal in a category you watch
- `proposal_eligible` — you hold OBS / delegation weight on a proposal
- `proposal_quorum_reached` — a proposal you voted on hit quorum
- `proposal_finalized` — tallies are now public (link to results)
- `proposal_about_to_expire` — < 24h to deadline + you haven't voted
- `your_delegate_voted` — the address you delegated to cast a vote on
  proposal X (no choice leaked — just the fact)
- `your_reward_credited` — a new reward chunk was credited
- `spend_executed` — a treasury spend you voted on just executed
- `governor_proposal_queued` — Governor proposal queued at timelock
- `governor_proposal_ready_to_execute` — timelock elapsed
- `score_tier_up_from_vote` — your Credit tier moved up because of
  voting activity

**Privacy**:
- Notifications carry only public chain data.
- Never push the vote choice (never knowable).
- Never push the reward amount.
- Spend amount only pushed *after* execute (where it's already public).

**Exit**: A user subscribes to "your delegate voted"; their delegate
votes; notification fires within 30 s.

**Rollback**: hide vote notifications behind feature flag.

**AI agent**: hook + UI autonomous; worker deploy operator-gated.

---

### W5V-9 — Treasury + Rewards UX

**Scope**: redesign Treasury + Rewards tabs.

**Files**:
- New: `frontend/obscura-os-main/src/components/vote/TreasuryDashboard.tsx`
- New: `frontend/obscura-os-main/src/components/vote/SpendExecutePanel.tsx`
- New: `frontend/obscura-os-main/src/components/vote/RewardsDashboard.tsx`
- New: `frontend/obscura-os-main/src/components/vote/RewardsClaimHistory.tsx`
- Edit: [useTreasury.ts](frontend/obscura-os-main/src/hooks/useTreasury.ts)
- Edit: [useRewards.ts](frontend/obscura-os-main/src/hooks/useRewards.ts)
  — add `claimHistory()` via indexer

**Treasury Dashboard layout** — see §14.

**Rewards Dashboard layout** — see §16.

**Exit**: User can see treasury ETH balance + pending spends + executed
spends in one screen; user can see encrypted balance + claim + history
in one screen.

**Rollback**: keep v1 tabs.

**AI agent**: full autonomy.

---

### W5V-10 — Delegation Redesign

**Scope**: rebuild the Delegations tab with proper graph view, pre-check
guards, and reputation context.

**Files**:
- New: `frontend/obscura-os-main/src/components/vote/DelegationDashboard.tsx`
- New: `frontend/obscura-os-main/src/components/vote/DelegateSearch.tsx`
  — AddressBook + ENS + OBS-weight discovery
- New: `frontend/obscura-os-main/src/components/vote/DelegationGraph.tsx`
  — force-directed graph (D3) of delegation flows; collapses to list at
  < 700 px
- Edit: [useDelegation.ts](frontend/obscura-os-main/src/hooks/useDelegation.ts)
  — add `canDelegateTo(target)` pre-check that returns `{ ok, reason }`

**Pre-check rules**:
- `target == msg.sender` → reason: "You can't delegate to yourself"
- `delegateTo[target] != 0` → reason: "That address has already delegated
  to <X>. Pick another."
- `target.obsBalance == 0` → warning: "That address holds no OBS. Sure?"
- `target == 0x0` → reason: "Address required"

**Exit**: Bad delegation attempt blocked with explanation before MetaMask
opens.

**Rollback**: keep v1 delegation form.

**AI agent**: full autonomy.

---

### W5V-11 — Governor Track UI (executable proposal creation)

**Scope**: ship a real UI surface for `ObscuraGovernor.propose(...)`.
Today it's RPC-only.

**Files**:
- New: `frontend/obscura-os-main/src/components/vote/governor/GovernorProposalForm.tsx`
- New: `frontend/obscura-os-main/src/components/vote/governor/ActionBuilder.tsx`
  — guided builder for common actions: treasury release, parameter
  change, contract role grant, Credit governance proxy call
- New: `frontend/obscura-os-main/src/components/vote/governor/CalldataPreview.tsx`
- Edit: [useGovernor.ts](frontend/obscura-os-main/src/hooks/useGovernor.ts)
  — add `propose`, `queue`, `execute`, `cancel`, `castGovernorVote`

**Action templates**:

| Template | Targets | Description |
|---|---|---|
| Treasury → recipient | `ObscuraTreasuryStreamer.releaseTo(recipient, amount)` | Release ETH from treasury |
| Stream open | `ObscuraTreasuryStreamer.startStream(recipient, rate, duration)` | Open a recurring stream |
| Credit param change | `ObscuraCreditGovernanceProxy.setFoo(market, value)` | Update mutable Credit param |
| Score oracle swap | `ObscuraCreditGovernanceProxy.setScoreOracle(newScore)` | Upgrade score oracle |
| Custom | raw `(target, value, calldata)` | Power-user escape hatch |

**Calldata preview**:
- Decodes targets + values + calldatas with human-readable function
  signatures + arg names.
- Shows total ETH impact, gas estimate, timelock ETA.
- "Simulate" button (Tenderly-style RPC dry-run) before broadcast.

**Lifecycle stepper** (mirrors Tally's):

```
Draft → Pending (votingDelay) → Active (votingPeriod) → Succeeded → Queued → (timelock 2d) → Ready → Executed
```

**Exit**: Operator drafts a "Release 1 ETH from treasury to recipient
0xabc" proposal via UI → broadcasts → community votes → succeeds → queue
→ timelock countdown shown → execute → ETH transferred.

**Rollback**: hide Governor proposal form; keep read-only.

**AI agent**: full autonomy for UI; first live proposal requires operator.

---

### W5V-12 — Polish: Score Feedback Loop, OBS Utility Card, Mobile, Audit-readiness

**Scope**: ship the cross-product reputation visibility, OBS utility
explainer, mobile, and audit checklist.

**Files**:
- New: `frontend/obscura-os-main/src/components/vote/ScoreFeedbackToast.tsx`
  — post-vote, fetch new score from CreditScoreV2, compute delta, show
  toast: "+8 score pts · Tier 1 → 2 · +100 bps LLTV on Credit"
- New: `frontend/obscura-os-main/src/components/vote/ObsUtilityCard.tsx`
  — single card on Overview explaining OBS: voting weight, reward
  eligibility, Credit score signal, future utilities (W5V-deferred)
- Mobile pass: every Vote component verified at 375 px
- PWA: shared with Credit W5C-9; ensure Vote routes work offline-shell
- New: `docs/vote/AUDIT_CHECKLIST.md`
- New: `docs/vote/RUNBOOK.md` (operator runbook: timelock cancellations,
  emergency pause path, parameter change ceremony)
- New: `docs/vote/GOVERNANCE_PLAYBOOK.md` (how to draft an executable
  proposal, sponsorship best practices, timelock etiquette)

**Audit-readiness gate**:
- [ ] ≥ 80 % branch coverage on ObscuraVote, ObscuraTreasury, ObscuraRewards,
      ObscuraToken, ObscuraGovernor, ObscuraTreasuryStreamer
- [ ] Slither + Mythril clean on all governance contracts
- [ ] Invariant tests:
  - sum(tallies[id][i]) == p.totalVoters (after finalize, plain comparison)
  - sum(delegationWeight) == sum(OBS holders' weights)
  - no proposal can be finalized before deadline
  - no spend can execute before timelock
  - no execute path bypasses the timelock
- [ ] Privacy matrix matches contract behavior 1:1
- [ ] External audit booked (parallel to Credit W5C-12)
- [ ] Fhenix CoFHE mainnet GA available

**Exit**: All checklist items either complete or flagged with owner.

**AI agent**: full autonomy except audit booking.

---

## 10. Onboarding Redesign

### 10.1 The 4-popup problem (today)

```
1. connect
2. switch network
3. mint OBS
4. cast first vote
```

(Plus, after each vote, popups for reveal, reward claim, etc.)

### 10.2 The 2-popup target (W5V-3)

```
[unauthenticated, 0 popups, 0 cost]
  visit /vote → Overview shows public proposals + treasury balance

[onboarding, 2 popups]
1. connect (1 popup; network auto-switch)
2. mint OBS (1 popup; faucet) — skipped if already minted

[first action, 1 popup]
3. cast first vote (1 popup with encryption pre-warm running in background)
```

### 10.3 First-land Hero (unauthenticated)

```
┌─────────────────────────────────────────────────────────┐
│  Obscura Governance · vote privately                    │
│                                                          │
│  • Encrypted ballots — only you know what you voted    │
│  • Change your vote anytime — coercion-resistant       │
│  • Two tracks — community polls + executable proposals │
│  • $OBS holders earn private rewards                   │
│                                                          │
│  Live now                                                │
│  • 3 community proposals · 1 executable                 │
│  • Treasury: 12.4 ETH                                   │
│  • 84 OBS holders · 21 delegates                        │
│                                                          │
│  [ Connect wallet → start voting ]                      │
└─────────────────────────────────────────────────────────┘
```

### 10.4 Post-connect Onboarding Wizard

```
┌─────────────────────────────────────────────────────────┐
│  Welcome to Obscura Governance              [Step 1/2] │
│                                                          │
│  Step 1:  Mint your starter OBS                         │
│  ──────────                                              │
│  OBS is your voting weight. You'll receive an initial   │
│  amount via faucet (testnet only).                      │
│                                                          │
│  After minting:                                          │
│  ✓ You can vote on community + executable proposals    │
│  ✓ You can delegate your weight                         │
│  ✓ You earn private rewards for participation          │
│  ✓ Voting boosts your Obscura Credit score (up to     │
│    +400 bps LLTV)                                        │
│                                                          │
│  [ Mint OBS  ➜ ]                       Estimated: 1 tx  │
└─────────────────────────────────────────────────────────┘
```

Step 2 is "You're ready" — auto-transitions to Community Proposals tab.

---

## 11. Information Architecture & Dashboard Hierarchy

### 11.1 Top-level tabs (post W5V-1)

```
Overview · Community Proposals · Executable Proposals · Delegation · Treasury · Rewards
                                                                         [ ⚙ Settings ]
```

### 11.2 Per-tab responsibility

| Tab | Public auto-load | User-triggered |
|---|---|---|
| Overview | track summary, OBS utility card, score-loop card, recent activity | Reveal score, reveal rewards balance |
| Community Proposals | list (public metadata) | Cast vote (encrypted), reveal own vote, change vote |
| Executable Proposals | Governor proposals list + lifecycle stepper | Vote (encrypted), draft, propose, queue, execute |
| Delegation | delegation graph, top delegates | Delegate / undelegate |
| Treasury | ETH balance, pending spends, executed spends, streams | Reveal spend amount (creator/recipient), execute spend |
| Rewards | total distributed, your claim history | Reveal balance, claim |

### 11.3 Global header

```
[OBSCURA · Vote]   Overview  Community  Executable  Delegation  Treasury  Rewards
                   ─────────────────────────────────────────────────────────────
[Your OBS: 1,520 · weight: 1,820 (+300 delegated to you)] [🔓 5:04] [🔔 3] [⚙]
                                                          (shared    (shared
                                                           with C+P) with C+P)
```

The permit-session chip (W5V-4) and notification bell (W5V-8) are shared
across Pay + Credit + Vote.

### 11.4 Overview tab (new)

```
┌─────────────────────────────────────────────────────────┐
│  Welcome back, 0x1ad0…ed91                              │
│                                                          │
│  Your governance footprint                              │
│  • Voted on:        7 proposals       [ Show history ] │
│  • Currently active: 2 (deadlines in 1d, 3d)            │
│  • Delegated to:    nobody             [ Find delegate ]│
│  • OBS rewards:     ████████  [ Reveal · Claim ]        │
│  • Credit signal:   +56 score pts · Tier 1              │
│                                                          │
│  Two governance tracks                                  │
│  ┌─ Community ──────────────────────────────────────┐  │
│  │ Polls, sentiment, off-chain coordination.        │  │
│  │ 3 active. Privacy-first. No on-chain execution.  │  │
│  │ [ Open Community Proposals ]                     │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌─ Executable ─────────────────────────────────────┐  │
│  │ On-chain actions. 2-day timelock. Same privacy   │  │
│  │ on the ballot.                                    │  │
│  │ 1 active.                                          │  │
│  │ [ Open Executable Proposals ]                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Recent activity                                         │
│  • Spend executed: 0.5 ETH → 0xabc… · 2h ago           │
│  • Your delegate voted on #18 · 4h ago                  │
│  • New community proposal #21 · 1d ago                  │
│  [ View all activity → ]                                │
└─────────────────────────────────────────────────────────┘
```

---

## 12. Proposal Lifecycle Redesign

### 12.1 Community track lifecycle

```
Draft → [optional Sponsorship] → Active → Finalized
                  ↘ Cancelled
                  ↘ Extended (loops back to Active)
```

### 12.2 Executable track lifecycle (Governor)

```
Draft → Pending (votingDelay) → Active (votingPeriod)
                                  ↘ Succeeded → Queued (timelock) → Ready → Executed
                                  ↘ Defeated
                                  ↘ Cancelled
                                  ↘ Expired (post-grace)
```

### 12.3 Stepper component

```
┌────────────────────────────────────────────────────────────┐
│  Proposal #18 · "Increase M-86 LLTV to 88%"   [Executable] │
│                                                             │
│  ● Draft ─── ● Pending ─── ● Active ─── ○ Succeeded         │
│                  done          now                          │
│       ─── ○ Queued ─── ○ Ready ─── ○ Executed              │
│                                                             │
│  Voting ends in: 2d 14h 03m                                │
│  Current weight cast: 320 / 1000 (32%)                     │
│  Quorum: 1000 OBS weight                                   │
└────────────────────────────────────────────────────────────┘
```

### 12.4 Proposal detail page layout

```
┌────────────────────────────────────────────────────────────┐
│ #18 · Increase M-86 LLTV to 88%  [Executable] [Treasury]   │
│ Created by 0xabc… · 2d ago                                 │
├────────────────────────────────────────────────────────────┤
│ [ Lifecycle stepper above ]                                │
│                                                             │
│ Description                                                 │
│ ───────────                                                 │
│ Lorem ipsum policy text. Calldata decoded below.            │
│                                                             │
│ Options                                                     │
│  [ For ]   [ Against ]   [ Abstain ]                       │
│  ↑ Tap to vote — encrypted. You can change anytime.        │
│                                                             │
│ Your vote                                                   │
│  ████████   [ Show ]   [ Change my vote ]                  │
│                                                             │
│ Public reasons (3)                                          │
│  • 0x1ad0…: "Risk improved; data supports the bump."       │
│  • 0xabc…: "Wait until ScoreV3 ships."                     │
│  • 0xdef…: "Quorum should be raised first."                │
│                                                             │
│ Calldata (decoded)                                          │
│  ObscuraCreditGovernanceProxy.setLltvBps(M-86, 8800)       │
│  ETH value: 0                                               │
│  Estimated gas: 84,310                                      │
│  Timelock ETA (if pass): May 27, 14:02 UTC                 │
│                                                             │
│ Tally (revealed after finalize)                            │
│  ████ ████ ████                                            │
│                                                             │
│ Sponsorship                                                 │
│  3 / 3 signatures collected · 0xabc, 0xdef, 0xghi          │
└────────────────────────────────────────────────────────────┘
```

---

## 13. Voting UX (coercion-resistant revote surfaced)

### 13.1 CastVoteForm (post-redesign)

```
┌────────────────────────────────────────────────────────────┐
│  Cast your encrypted vote                                  │
│  ────────────────────────────────────                      │
│  🔒 Your choice will be encrypted. Only you can decrypt   │
│      it. You can change it anytime before <deadline>.      │
│      No one — including the contract — can prove what     │
│      you ultimately chose.                                 │
│                                                             │
│  Options                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │   For    │ │ Against  │ │ Abstain  │                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
│                                                             │
│  Reason (optional, public)                                 │
│  [ This proposal improves M-86 utilization without...    ] │
│  ↑ Signed off-chain. Reveals you support *something* —    │
│    not which option. Skippable.                            │
│                                                             │
│  Weight: 1,820 OBS                                          │
│                                                             │
│  [ FHE Stepper ]                                            │
│  IDLE → ENCRYPTING → COMPUTING → SENDING → SETTLING → READY│
│                                                             │
│  [ Submit encrypted vote ]                                  │
└────────────────────────────────────────────────────────────┘
```

### 13.2 Post-vote card (replaces form)

```
┌────────────────────────────────────────────────────────────┐
│  ✓ Vote cast (encrypted)                                    │
│                                                             │
│  Your vote is private. Only you can decrypt it.            │
│                                                             │
│  🛡 Coercion resistance: you can change your vote          │
│     anytime before <deadline>. Revotes leave no trace      │
│     of which option moved.                                 │
│                                                             │
│  Revote count: 0                                            │
│                                                             │
│  [ Show what I voted ]   [ Change my vote ]                │
│                                                             │
│  Credit boost: +8 score pts · Tier 1 → 1 (no tier change) │
│  [ See your Credit score ↗ ]                                │
└────────────────────────────────────────────────────────────┘
```

### 13.3 Revote flow

- "Change my vote" → re-opens CastVoteForm with current choice pre-selected
- Submit: encrypted; contract calls `_subtractTally(oldVote, oldWeight)`
  then `_addTally(newVote, newWeight)`
- Post-revote card updates `revoteCount` and emits `🛡 You exercised
  your coercion-resistance right.`

### 13.4 Reveal own vote

- "Show what I voted" → uses permit session
- Decrypts `voterEncryptedVote[id][me]` → maps integer back to option label
- Displays in line: "You voted: For"
- Hide button collapses back to `████████`
- Auto-hides at permit session expiry

---

## 14. Treasury UX

### 14.1 Treasury Dashboard layout

```
┌────────────────────────────────────────────────────────────┐
│  Treasury                                                   │
│                                                             │
│  Balance                                                    │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  12.4 ETH        $42,876  (public)                    │ │
│  │  Streaming out: 0.001 ETH / day · 2 active streams    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Pending spends (timelock running)                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  #18 → 0xabc…   ████ ETH (encrypted)                  │ │
│  │  Timelock ends in: 1d 14h 02m                          │ │
│  │  [ Reveal amount (if creator/recipient) ]              │ │
│  │  [ Execute · disabled until timelock ]                 │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Executed spends (last 30 days)                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ #16 → 0xdef… · 0.5 ETH · 2d ago · tx ↗                │ │
│  │ #14 → 0xghi… · 1.2 ETH · 7d ago · tx ↗                │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Active streams (from TreasuryStreamer)                     │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Stream #3: → 0xjkl… · 0.0005 ETH/day · 18d left     │ │
│  │  Stream #5: → 0xmno… · 0.0005 ETH/day · 7d left      │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 14.2 Execute spend ceremony

```
┌────────────────────────────────────────────────────────────┐
│  Execute spend #18                                          │
│                                                             │
│  ⚠ This action is irreversible. Amount will become PUBLIC.│
│                                                             │
│  Recipient:    0xabc…                                       │
│  Amount:       █████ ETH (encrypted until you click)        │
│  Timelock:     elapsed ✓                                    │
│                                                             │
│  [ Reveal amount ]                                          │
│                                                             │
│  After execute:                                             │
│  • ETH transferred                                          │
│  • Amount visible on chain forever                          │
│  • Treasury running total updated                           │
│                                                             │
│  [ Cancel ]   [ Reveal + Execute ]                          │
└────────────────────────────────────────────────────────────┘
```

Two-step:
1. Reveal (permit session decrypts the spend amount)
2. Execute (broadcasts; `FHE.allowPublic` makes amount visible to all)

Post-execute celebration:

```
✓ Spend executed
  0.75 ETH → 0xabc…
  tx ↗ · 2 min ago
  Treasury balance: 11.65 ETH
```

---

## 15. Delegation UX

### 15.1 Delegation Dashboard layout

```
┌────────────────────────────────────────────────────────────┐
│  Delegation                                                 │
│                                                             │
│  Your status                                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Own weight:        1,520 OBS                         │ │
│  │  Delegated in:        300 OBS (from 2 addresses)      │ │
│  │  Effective weight:  1,820 OBS                          │ │
│  │  Delegating to:     nobody                             │ │
│  │  [ Find a delegate ] [ View who delegates to me ]     │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Top delegates                                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 0xalice… · 4,200 weight · participation: 87%         │ │
│  │   "Privacy-first governance lead"                     │ │
│  │   [ Delegate ]                                         │ │
│  ├──────────────────────────────────────────────────────┤ │
│  │ 0xbob… · 2,100 weight · participation: 72%           │ │
│  │   [ Delegate ]                                         │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Delegation graph                                           │
│  [ SVG: nodes = addresses, edges = delegation flows;       │
│    collapses to list on mobile ]                            │
└────────────────────────────────────────────────────────────┘
```

### 15.2 Delegate selection with pre-check (W5V-10)

```
┌────────────────────────────────────────────────────────────┐
│  Delegate your voting weight                               │
│                                                             │
│  To:  [ 0xbob…       ]   [ ENS / AddressBook search ]     │
│                                                             │
│  ✓ This address holds 2,100 OBS                            │
│  ✓ Not delegating elsewhere                                │
│  ✓ 72% historical participation                            │
│  ✓ Last vote: 8h ago                                       │
│                                                             │
│  You will delegate: 1,520 OBS (your own weight)            │
│  Your delegate's new effective weight: 3,620 OBS           │
│                                                             │
│  Note: one-hop only — your delegate can't re-delegate.    │
│  You can undelegate anytime.                                │
│                                                             │
│  [ Cancel ]   [ Delegate ]                                  │
└────────────────────────────────────────────────────────────┘
```

If pre-check fails:

```
✗ Delegation blocked
  0xcharlie… has already delegated to 0xalice…
  Pick another delegate, or pick 0xalice… directly.
```

---

## 16. Rewards UX

### 16.1 Rewards Dashboard layout

```
┌────────────────────────────────────────────────────────────┐
│  Rewards                                                    │
│                                                             │
│  Your balance (private)                                     │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  ████████ OBS              [ Reveal ]   🔒            │ │
│  │  Only you can decrypt this balance.                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  After reveal:                                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  127.50 OBS                                            │ │
│  │  Vested · Claimable now                                │ │
│  │  [ Claim ]                                             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  Claim history                                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Claim · ████ OBS · 3d ago · tx ↗                     │ │
│  │  Claim · ████ OBS · 14d ago · tx ↗                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  How rewards work                                           │
│  • You earn OBS for casting votes (per-proposal)           │
│  • Rewards are credited to your encrypted balance           │
│  • Claim any time — balance reveals to you only            │
│  • Claimed OBS becomes part of your regular voting weight  │
│                                                             │
│  Next reward window: opens in 3d 14h                       │
└────────────────────────────────────────────────────────────┘
```

### 16.2 Claim ceremony

```
┌────────────────────────────────────────────────────────────┐
│  Claim 127.50 OBS                                          │
│                                                             │
│  Claiming:                                                  │
│  • Decrypts your reward balance                             │
│  • Transfers OBS to your wallet                             │
│  • Adds to your voting weight                               │
│                                                             │
│  Note: balance value remains private to you. Only the      │
│  fact of the claim (tx hash, timestamp) is public.         │
│                                                             │
│  [ Cancel ]   [ Claim ]                                     │
└────────────────────────────────────────────────────────────┘
```

---

## 17. Governor + Timelock Track UX

### 17.1 Governor proposal lifecycle (Tally-style)

Already shown in §12.2 + 12.3.

### 17.2 Proposal creation form (W5V-11)

```
┌────────────────────────────────────────────────────────────┐
│  New Executable Proposal                                    │
│                                                             │
│  Title       [ Increase M-86 LLTV to 88%               ]   │
│  Description [ Long-form markdown supported.           ]   │
│                                                             │
│  Actions                                          [+ Add]   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Template: Credit param change                  ▾      │ │
│  │ Target:   ObscuraCreditGovernanceProxy                │ │
│  │ Function: setLltvBps(market, value)                   │ │
│  │ Args:     market = M-86 (0xcf98d979…)                │ │
│  │           value = 8800                                 │ │
│  │ ETH value: 0                                           │ │
│  └──────────────────────────────────────────────────────┘ │
│  [ + Add another action ]                                  │
│                                                             │
│  [ Decode preview ] [ Simulate ] [ Save draft ]            │
│                                                             │
│  Sponsorship (optional)                                     │
│  ☐ Require 3 sponsors before broadcast                     │
│                                                             │
│  [ Save Draft ]   [ Broadcast Proposal ]                    │
└────────────────────────────────────────────────────────────┘
```

### 17.3 Action templates (W5V-11)

Listed in §9 W5V-11. Each template is a JSON spec:

```json
{
  "id": "credit-set-lltv",
  "label": "Credit param change → set LLTV",
  "target": "ObscuraCreditGovernanceProxy",
  "function": "setLltvBps(address,uint256)",
  "args": [
    { "name": "market", "type": "address", "picker": "credit-markets" },
    { "name": "value", "type": "uint256", "min": 0, "max": 10000, "unit": "bps" }
  ]
}
```

### 17.4 Timelock queue page

```
┌────────────────────────────────────────────────────────────┐
│  Queued operations                                          │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Op #0xab1c… → Credit setLltvBps(M-86, 8800)          │ │
│  │ Queued: 1d 18h ago                                    │ │
│  │ ETA:    in 5h 02m                                     │ │
│  │ [ Inspect calldata ] [ Cancel · only if veto-power ] │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

After ETA elapses → "Ready" badge + [Execute] button.

---

## 18. PAY ↔ CREDIT ↔ VOTE Integration

### 18.1 The thesis

> **Pay** generates encrypted financial reputation.
> **Vote** generates encrypted civic reputation.
> **Credit** consumes both via `IEncryptedScore`.
> **Vote treasury** funds Pay + Credit ecosystem actions.

Already shipped at contract level. Make the loop visible.

### 18.2 Cross-product CTAs

**From Vote**:
- After every vote cast: toast "+8 Credit score pts · see your Credit
  tier ↗".
- Overview "Credit signal: +56 pts · Tier 1" card with link to Credit.
- Treasury page: "Recently funded: 2 ETH → Credit M-86 seed liquidity"
  with link to Credit.

**From Pay**:
- After 5th stream sent: toast "+8 Credit score pts; you can also vote
  in Governance ↗".
- Subscription view: "Vote with your OBS reward balance" (when rewards
  accrue from Pay activity, future).

**From Credit**:
- Score breakdown card (per Credit W5C-5) links voting signal back to
  Vote: "Votes cast: 4 → +32 pts [ Open Vote ↗ ]".
- "Boost your tier" suggestion: "Cast 2 more votes → Tier 2 (+200 bps
  LLTV)".

### 18.3 Shared infrastructure

| Infrastructure | Sourced from | Shared with |
|---|---|---|
| Permit session (W5V-4) | Credit W5C-1 | Pay, Credit, Vote |
| Notification worker (W5V-8) | Credit W5C-8 | Pay, Credit, Vote |
| Indexer (W5V-7) | independent subgraph | Vote-only (Credit + Pay each have their own) |
| Activity feed UI | composite hook reads all 3 subgraphs | Shared header bell |
| PWA shell + service worker | Credit W5C-9 | All apps |
| Notification center component | Credit W5C-8 | All apps |
| AddressBook | Pay | Vote (delegate search), Credit (recipient picker) |

### 18.4 OBS as ecosystem coordination token (W5V-9 + W5V-12)

OBS already:
- Gates Vote eligibility (`lastClaim > 0`)
- Determines voting weight
- Earns voting rewards (encrypted)
- Boosts Credit score via `voterParticipation` (V2)

Add (W5V deferred items, post-W5V-12):
- **OBS-staked Pay subscription discount**: holding ≥ N OBS reduces
  insurance subscription fee by Y bps (Pay-side change)
- **OBS-staked Credit vault APY boost**: holding ≥ N OBS adds Z bps to
  vault yield (Vault-side change)
- **OBS-paid keeper tips** (Credit W5C-10): keepers earn OBS for
  liquidations

These require Pay/Credit contract changes; design only in W5V-12,
implement in respective product roadmaps post-mainnet.

### 18.5 Treasury → Pay/Credit funding flows

Governor can authorize TreasuryStreamer to:
- Stream ETH to Credit vault for seed liquidity
- Stream ETH to Pay insurance pool
- Stream OBS rewards to high-participation voters

Each is a Governor proposal with calldata `TreasuryStreamer.startStream(target,
rate, duration)`. UI templates in §17.3.

---

## 19. OBS Utility Expansion

### 19.1 Today

| Utility | Source |
|---|---|
| Voting weight | ObscuraVote |
| Reward currency | ObscuraRewards |
| Sybil gate (`lastClaim > 0`) | ObscuraVote.createProposal |
| Credit score signal (`voterParticipation`) | ObscuraCreditScoreV2 |

### 19.2 ObsUtilityCard component (W5V-12)

Single Overview-tab card explaining all utilities:

```
┌────────────────────────────────────────────────────────────┐
│  What does OBS do?                                          │
│                                                             │
│  🗳 Voting weight                                           │
│     1 OBS = 1 weight in community + executable proposals    │
│                                                             │
│  💰 Reward currency                                         │
│     Earn private OBS rewards for participation              │
│                                                             │
│  🛡 Sybil gate                                              │
│     Holding any OBS unlocks proposal creation               │
│                                                             │
│  ⭐ Credit reputation                                       │
│     Each vote you cast boosts your Obscura Credit tier      │
│     (up to +400 bps LLTV on borrows)                        │
│                                                             │
│  Coming soon                                                │
│     • OBS-staked Credit vault APY boost                     │
│     • OBS-staked Pay subscription discount                  │
│     • OBS keeper tips for Credit liquidations               │
└────────────────────────────────────────────────────────────┘
```

### 19.3 Future utilities (design only; do not implement in W5V-1..12)

Tracked for post-mainnet:
- OBS-paid governance bond (sponsor proposals require staked OBS, slashed
  if proposal fails frivolously)
- OBS-denominated treasury accounting alternative (treasury also holds
  ocUSDC; spends can be denominated in either)
- OBS deflation via burn-on-execute (% of treasury releases burns
  matching OBS)
- OBS-locked vote weight boost (veToken pattern, lock OBS for time → weight
  multiplier) — only if community wants it

---

## 20. Indexer Architecture

(Architecture parallels Credit W5C-7; the schema and rules differ.)

### 20.1 Choice: The Graph hosted

Same reasoning as Credit. All vote data is on-chain events; subgraph
syntax handles pagination + filtering; no off-chain orchestration needed.

### 20.2 Schema highlights

See §9 W5V-7. Key entities: `Proposal`, `Vote` (never carrying choice),
`Delegation`, `SpendRequest`, `RewardClaim`, `GovernorProposal`,
`TimelockOperation`, `Sponsorship`, `Reason`.

### 20.3 Privacy rules

- **NEVER** index vote choices. `Vote` entity carries `(proposalId, voter,
  type=Cast|Changed, weight)` only.
- **NEVER** index reward amounts. `RewardClaim` carries `(user, amountCtHash,
  timestamp)` — the ctHash is just a handle for cross-reference, not
  decoded.
- **NEVER** index spend amounts until public. `SpendRequest.publicAmount`
  is populated only after `executeSpend` emits the public amount.
- Aggregates are limited to public scalars: `totalWeightCast`,
  participation rates, delegation graphs.

### 20.4 Endpoints

```
GET /vote/proposals?track=&status=&category=     → list
GET /vote/proposals/:id                          → detail + finalized tally
GET /vote/votes?proposal=&voter=                 → vote history (never choice)
GET /vote/delegations?delegator=                 → delegation history
GET /vote/delegates/top                          → top delegates by weight
GET /vote/treasury/spends?status=                → spend requests
GET /vote/rewards/claims?user=                   → claim history (handles)
GET /vote/governor/proposals?state=              → Governor proposals
GET /vote/timelock/queue                         → pending operations
GET /vote/sponsorships?draftHash=                → sponsor signatures
GET /vote/reasons?proposal=                      → public reasons
```

### 20.5 Frontend wiring

`useVoteIndexer({ resource, params })` — TanStack Query with 30 s stale
time. Reads from indexer; falls back to RPC if `VITE_VOTE_INDEXER_ENABLED=false`.

---

## 21. Notification Architecture

### 21.1 Shared with Credit

The notification worker shipped in Credit W5C-8 extends to handle vote
events. Same DB, same channels (in-app, browser, email, webhook), same
auth (signed challenge).

### 21.2 Vote notification types

See §9 W5V-8 for full list.

### 21.3 Privacy

- Never push the vote choice (never knowable to the worker).
- Never push reward amount (encrypted).
- Spend amount pushed only after execute.
- Delegate-vote notification: "your delegate voted on #X" — never the
  choice they made.

### 21.4 UX

Bell icon in global header (shared with Credit + Pay). Click to expand
notification panel. Subscriptions managed in Settings.

---

## 22. Mobile + PWA UX

### 22.1 Breakpoints

Same as Credit:

```
< 640 px  → mobile (single column, drawer nav, bottom action bar)
640–1023  → tablet (two-column grid)
≥ 1024 px → desktop (current layout)
```

### 22.2 Vote-specific mobile patterns

- **Bottom action bar** on proposal detail page: `[ Vote ]  [ Reveal ]
  [ Reason ]  [ Share ]`
- **Bottom sheet** for CastVoteForm (better thumb reach for options)
- **Delegation graph** collapses to list at < 700 px (D3 → table)
- **Treasury timelock countdown** in single line on mobile (compact
  format: "1d 4h" instead of "1 day 4 hours 12 minutes")
- **Pull-to-refresh** on proposal lists
- **Haptic feedback** on critical actions (vote, claim, execute)

### 22.3 PWA (shared with Credit)

- Cache the shell + public proposal lists.
- Never cache encrypted reads.
- "Install Obscura" prompt covers all apps.

### 22.4 Mobile testing

- Lighthouse mobile ≥ 90 on `/vote`, `/vote/proposals/:id`, `/vote/delegation`.
- Real-device tests on iOS Safari + Android Chrome.

---

## 23. Observability & SLOs

### 23.1 Frontend RUM

Tracked anonymous metrics:
- `vote_page_load_ms{tab}` — histogram
- `vote_cast_attempted_total` — counter
- `vote_cast_succeeded_total` — counter
- `vote_revote_total` — counter (coercion-resistance usage)
- `vote_reveal_latency_ms` — histogram
- `vote_setup_completed_total` — counter
- `vote_setup_abandoned_at_step{step}` — counter
- `vote_delegation_attempted_total` — counter
- `vote_delegation_blocked{reason}` — counter (pre-check fired)

### 23.2 Contract-side observability

- Indexer `/health` with lag
- Notification worker `/health`
- Governor `/proposals` lag (worker)

### 23.3 SLOs

| Service | SLO |
|---|---|
| Overview tab load (public) | p95 < 2 s |
| Reveal latency (post-session) | p95 < 1 s |
| Vote cast end-to-end | p95 < 30 s |
| Indexer lag | p95 < 30 s behind chain head |
| Notification delivery | p95 < 60 s after event |
| Frontend uptime | 99.5 % monthly |

### 23.4 Status page

Shared with Credit / Pay at `/status` showing: chain status, indexer lag,
notification worker status, last incident.

---

## 24. Security Hardening & Audit Readiness

### 24.1 Contract-level hardening (preserve)

Already in place:
- `FHE.eq + FHE.select` tally loop
- No `if/else` on encrypted state
- `FHE.allowThis` after every encrypted state write
- `FHE.allowPublic` only at intentional reveal points (finalize, execute)
- Subtract-then-add revote ordering correct
- One-hop delegation guard
- `obsToken` immutable
- OZ Timelock with renounced admin

### 24.2 Add (W5V-12)

- [ ] Slither static analysis CI gate on all governance contracts
- [ ] Mythril symbolic execution on ObscuraVote, ObscuraTreasury, Governor
- [ ] Branch coverage ≥ 80 %
- [ ] Foundry invariant tests:
  - For every finalized proposal: `sum(tallies[id][i]) == totalVoters`
  - For every delegator: `delegationWeight[delegatee] += stake`
  - No proposal can be finalized before `block.timestamp >= deadline`
  - No spend executes before timelock ETA
  - No Governor execute bypasses the timelock
  - Revote subtraction never underflows
  - One-hop delegation invariant holds
- [ ] Event-payload audit: no event carries plaintext vote / amount /
      reward
- [ ] Replay attack tests on `castVote` with same `InEuint64` input
- [ ] Re-entrancy tests on `executeSpend` (ETH transfer at end)
- [ ] Gas-cost analysis on tally loop with 10 options (max)

### 24.3 Frontend hardening

Shared rules with Credit:
- CSP, permissions-policy, HSTS, X-Frame-Options
- Subresource integrity
- No `eval`
- Wallet-signed challenge for any worker-stored data (notification subs,
  sponsorships, reasons)

### 24.4 Audit gate

Required before mainnet (blocked on Fhenix CoFHE mainnet GA):
- External audit (parallel to Credit + Pay; ideally same auditor for
  cross-protocol review)
- All Critical + High remediated
- Public report
- Bug bounty
- Multisig deployer

---

## 25. Deployment & Migration Strategy

### 25.1 Default posture: in-place fixes only

Same hierarchy as Credit:
1. Frontend fix?
2. Indexer fix?
3. Notification worker fix?
4. Governance parameter change via Governor proposal?
5. Last resort: contract redeploy.

### 25.2 When a vote contract redeploy is required

Triggered only by:
- Bug in immutable `obsToken` reference
- Bug in tally math that no patch can fix
- Storage layout change for new feature

Migration runbook:
1. Pause new proposals (Governor proposal: pause community track via
   admin role grant — requires multisig)
2. Deploy V6 with corrected logic
3. Migrate active proposals (option: archive in V5, restart in V6;
   default: V5 proposals finalize naturally, V6 only accepts new)
4. Update Treasury `voteContract` (note: immutable — would require
   Treasury V2 too)
5. Update CreditScoreV2 vote source if needed
6. Communicate migration window
7. Update `deployments/arb-sepolia.json` + `.env`

### 25.3 Governor parameter changes (preferred)

For `votingDelay`, `votingPeriod`, `proposalThreshold`, `quorum
fraction`, `timelockDuration`:
- Draft Governor proposal calling `setVotingDelay(...)` etc on itself
- Vote on the proposal
- If succeeds, queue + execute
- Parameter updates without redeploy

### 25.4 Frontend deployment

Same as Credit: Vite → Vercel, PR previews, manual production approval,
one-click rollback.

### 25.5 Indexer deployment

The Graph hosted; versioned subgraph (`obscura-vote/v1`).

---

## 26. Technical Debt Cleanup

### 26.1 Code-level debt

| Item | File | Action |
|---|---|---|
| `VoteHarmonyDashboard` vs `VoteDashboard` — duplicate dashboards | components | Consolidate; pick one canonical |
| `voteHarmonyUi.tsx` is a monolith | components | Split into atomic components |
| `useEncryptedVote.ts` mixes encryption + read | hooks | Split: `useVoteCast` + `useVoteReveal` |
| ABI casts via `as any` | hook files | Use wagmi-generated types |
| `useProposals` returns full proposal struct per item | hooks | Paginate via indexer (W5V-7) |
| `useGovernor` is thin | hooks | Expand for W5V-11 |

### 26.2 Contract-level debt

| Item | Action |
|---|---|
| Legacy V1–V4 vote contracts on-chain | Document deprecated; do not touch |
| `ObscuraTreasury` lacks public `treasuryBalance()` view (uses `address(this).balance`) | Acceptable — `address.balance` is RPC-readable |
| `ObscuraRewards` lacks per-user view of `last claim timestamp` | Add via off-chain indexer; do not redeploy |

### 26.3 Doc debt

| Item | Action |
|---|---|
| `VOTE-APP-DOCS.md` is 700+ lines, partly stale on Wave-5 Governor | Snapshot current state into `docs/vote/STATE.md`; archive |
| No `docs/vote/PRIVACY_MATRIX.md` | Ship in W5V-0 |
| No `docs/vote/GOVERNANCE_PLAYBOOK.md` | Ship in W5V-12 |

---

## 27. AI-Agent Execution Rules

### 27.1 Universal rules (binding, same as Credit + Pay)

1. **Read [.github/copilot-instructions.md](.github/copilot-instructions.md)
   + [AGENTS.md](AGENTS.md)** before any FHE edit. Load skills.
2. **Never touch a deployed contract** without explicit operator approval.
3. **Never auto-decrypt** in `useEffect`.
4. **Always `await waitForTransactionReceipt`** before `FHEStepStatus → READY`.
5. **Always include `fhe` in `useCallback` deps**.
6. **Never edit `about.md`, `README.md`, `wave4.md`** unless explicitly
   instructed.
7. **Never introduce KURA / CovertMRV / "MRV"**.
8. **User-facing copy** must avoid: euint, ctHash, ACL, permit, CoFHE,
   coprocessor, ciphertext.
9. **Every encrypted state mutation in Solidity** must `FHE.allowThis(handle)`.
10. **Every FHE comparison** uses `FHE.select`, not `if/else` on `ebool`.
11. **`hasVoted`, `voterParticipation`, `delegationWeight` are public by
    design — never wrap them**.
12. **Vote events never carry choice**. Audit on every PR.
13. **Treasury `attachSpend` amount stays encrypted until `executeSpend`**.
14. **Rewards balance never `FHE.allowPublic`'d**.
15. **One-hop delegation rule is sacred**. Never relax to multi-hop.
16. **Always use `withRateLimitRetry`** on writes; **`batchRead` multicall**
    for public reads; **`estimateCappedFees(publicClient)`** on writes.

### 27.2 Phase autonomy matrix

| Phase | AI autonomy | Operator gate |
|---|---|---|
| W5V-0 (audit + privacy matrix) | full | — |
| W5V-1 (two-track visibility) | full | — |
| W5V-2 (coercion-resistance UX) | full | — |
| W5V-3 (onboarding) | full | — |
| W5V-4 (permit session) | full | depends on Credit W5C-1 |
| W5V-5 (lifecycle + drafts + sponsorship) | full UI | operator for sponsorship indexer |
| W5V-6 (vote-with-reason + categories) | full | — |
| W5V-7 (indexer) | full schema + mapping | operator for subgraph deploy |
| W5V-8 (notifications) | full UI + hook | operator for worker deploy |
| W5V-9 (treasury + rewards UX) | full | — |
| W5V-10 (delegation redesign) | full | — |
| W5V-11 (Governor track UI) | full UI | operator for first live executable proposal |
| W5V-12 (polish + audit-ready) | full docs + UI | operator for audit booking |

### 27.3 Per-PR rules

- Max 400 lines per PR
- CI green
- Type check + lint pass
- Vitest unit tests for every new hook
- PR title: `[vote] W5V-N: <description>`
- PR body: scope, files, exit criterion, rollback, manual test steps
- Never self-merge; require human approval

### 27.4 Forbidden patterns (ESLint-enforced where possible)

- `decryptForView(...)` in `useEffect` — ban
- `getOrCreateSelfPermit(...)` in `useEffect` — ban
- Direct `writeContractAsync` without `estimateCappedFees` — warn
- Any event in vote contracts indexing `choice` / `option` — error in
  Slither pass
- `FHE.allowPublic` called outside `finalizeVote` / `executeSpend` — error
  in CI grep guard

---

## 28. Risks, Blockers, Open Questions

### 28.1 Hard blockers (external)

| Blocker | Impact | Mitigation |
|---|---|---|
| Fhenix CoFHE mainnet not GA | No mainnet deploy | Build mainnet-readiness; broadcast when GA |
| Fhenix decrypt latency variance | Reveal UX can stall | Permit session keeps user's session warm; loading state with cancel |
| `eaddress` not GA on Arb Sepolia | No encrypted-recipient for spends (already public — not relevant for treasury, but blocks any future "stealth-recipient" treasury feature) | Wait for eaddress |
| OZ Governor + Timelock are battle-tested but not FHE-aware | Governor doesn't natively support encrypted ballots — we use our own Vote V5 for ballots; Governor is for executable actions only | Two-track architecture is the correct mitigation |

### 28.2 Soft risks

| Risk | Severity | Mitigation |
|---|---|---|
| Whale capture via OBS concentration | medium | Display top-holder distribution; encourage delegation; future veOBS lock for time-weighted vote |
| Low participation | medium | Notifications (W5V-8), email digest, score-loop visibility |
| Spam proposals | medium | Optional sponsorship (W5V-5); rate limit at indexer |
| Coercion via off-chain side channels | low (out of contract scope) | Document that coercion-resistance is on-chain; off-chain coercion remains the user's responsibility |
| Reason text could be used to signal choice | low | Document; users can self-disclose if they wish |
| Indexer reveals voting patterns | low | Indexer carries only public chain data; same surface as RPC |
| Governor proposal calldata is public | by design | This is correct — executable actions must be auditable pre-execution |

### 28.3 Open product questions

1. **Should we add quadratic voting?** Pro: more democratic.
   Con: requires sqrt(stake) computation; expensive in FHE. Resolution:
   design in W5V-11 (deferred), implement post-mainnet only if community
   asks.
2. **Should we hide the delegate graph?** Probably no. Transparency is
   the entire point of delegation.
3. **Should OBS holders be able to opt out of `voterParticipation` being
   used as a Credit signal?** No — it's a public counter; opt-out
   defeats the cross-product loop. Document in privacy matrix.
4. **Should we add per-proposal NFT badges for participation?** Out of
   thesis; soulbound tokens are a centralization vector.
5. **Should treasury hold ocUSDC in addition to ETH?** Yes long-term;
   defer to W5V-deferred (requires Treasury V2 or extension contract).

### 28.4 Explicitly NOT in this plan

| Item | Reason |
|---|---|
| Quadratic / ranked / approval voting | FHE cost; design only in W5V-11 |
| Multi-token governance | OBS is the single token |
| Liquid democracy (multi-hop delegation) | Increases attack surface; one-hop is correct |
| veToken-locked OBS for time-weighted weight | Defer to post-mainnet community decision |
| Vote-buying markets | Anathema to the privacy thesis |
| Privacy-preserving Snapshot-style off-chain voting | We are on-chain; on-chain is the wedge |
| AI-decided proposals | Out of thesis |
| Cross-chain governance | Blocked on Fhenix multi-chain |
| Mainnet broadcast | Blocked: CoFHE GA + audit + multisig + threshold governance |
| Email-password auth | Wallet-signed challenges only |
| Encrypted treasury balance | Breaks DAO transparency assumption |
| Tokenized vote receipts as NFTs | Privacy thesis incompatible (transferable receipt → identifies voter) |

---

## 29. Closing Notes & Non-Goals

### 29.1 What this plan preserves (non-negotiable)

- `FHE.eq + FHE.select` tally loop
- Subtract-then-add revote pattern (coercion resistance)
- `FHE.allowPublic` only at finalize / execute
- One-hop delegation guard
- `hasVoted` + `voterParticipation` + `delegationWeight` as public scalars
- Encrypted treasury spend amounts until execute
- Encrypted reward balances per voter
- `obsToken` immutable
- `voteContract` immutable on Treasury
- Two-track governance (Community + Executable)
- Renounced timelock admin
- No plaintext in events
- No auto-decrypt on mount
- Public data auto-load, encrypted user-triggered
- Plain-language UX copy
- Testnet honesty + mainnet gate

### 29.2 What this plan rejects (with reason)

| Rejected | Reason |
|---|---|
| Redeploying ObscuraVote without a user-blocking bug | Cost outweighs benefit |
| Hiding `hasVoted` | Breaks reputation loop |
| Multi-hop delegation | Attack-surface explosion |
| Live tally leak ("100 weight so far for option A") | Defeats coercion resistance |
| Tokenized vote NFTs | Privacy thesis incompatible |
| Single tab for both governance tracks | Confusing |
| Snapshot-style off-chain voting | Defeats execution path |
| Removing revote | Removes the killer feature |
| Email-password auth | Wallet-signed challenges only |
| Encrypted treasury balance | Breaks DAO transparency assumption |

### 29.3 Final word

> The product thesis is *"vote privately, change your mind anonymously,
> earn private rewards, and feed your civic reputation into your
> private credit — all on the same chain, all encrypted by default,
> all controllable by the same OBS token, and never with anyone —
> including Obscura — able to prove what you ultimately chose."*

Every phase exists to make that sentence *true and usable*. Phases that
don't serve it were rejected. Phases that serve it but aren't feasible
are explicitly blocked, not silently omitted.

> Build in phase order. Update [summary5.md](summary5.md) at the end of
> each phase. Update `docs/vote/PRIVACY_MATRIX.md` when contract
> behavior changes. Do not skip W5V-1 — until the two governance tracks
> are visually first-class, users can't use Governor. Do not skip W5V-2
> — the coercion-resistance UX is the headline feature that distinguishes
> Obscura from Tally / Snapshot. Do not skip W5V-7 — the indexer unblocks
> notifications, mobile, exports, the activity feed, and the Pay/Credit
> cross-product activity stream in one shipment.

The protocol is done. Finish the product.

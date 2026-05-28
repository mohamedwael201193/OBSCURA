# Obscura Vote App Docs

Status: canonical technical and UX reference  
Product plan: [VOTE_FINAL_PLAN.md](VOTE_FINAL_PLAN.md)  
Execution sequence: [VOTE_MASTER_EXECUTION_PLAN.md](VOTE_MASTER_EXECUTION_PLAN.md)

```text
Private Payments -> Private Credit -> Private Reputation -> Private Governance
```

Obscura Vote is the private governance layer for the Obscura system. It is intentionally smaller than a DAO suite: users create private proposals, cast encrypted votes, change their votes before the deadline, reveal aggregate totals after finalization, and build participation reputation without exposing choices.

Advanced executable governance exists, but it is a secondary operator surface.

## 1. Product Definition

Vote should answer four questions:

1. What proposals need my attention?
2. Can I vote privately?
3. How does my participation affect reputation?
4. Where do advanced protocol actions live?

The final app should not lead with OBS, treasury, token utility, or protocol-operator concepts. OBS is a deployed testnet eligibility dependency, not the north star.

## 2. Final Navigation

Top-level navigation:

| Section | Purpose | Contains |
|---|---|---|
| Overview | Needs-action home. | Active proposals, reveal-ready proposals, participation summary, one privacy promise, primary vote CTA. |
| Proposals | Main private voting workflow. | Browse, create, cast, change vote, verify own vote, reveal aggregate totals. |
| Participation | Reputation and contribution profile. | `voterParticipation`, shared Pay/Credit/Vote reputation summary, delegation, rewards, user activity. |
| Advanced Governance | Protocol-operator lane. | Governor, Timelock, Treasury, Treasury Streamer, executable proposal details. |

Current six-section UI mapping:

| Current section | Final section |
|---|---|
| Overview | Overview, simplified. |
| Proposals | Proposals. |
| Treasury | Advanced Governance. |
| Delegation | Participation. |
| Participation | Participation. |
| Executable | Advanced Governance. |

## 3. Deployed Contracts

Chain: Arbitrum Sepolia, `421614`.

| Contract | Address | Role | Final UX placement |
|---|---|---|---|
| `ObscuraVote` | `0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730` | Encrypted multi-option proposals, revote, tally reveal, participation, delegation. | Proposals and Participation. |
| `ObscuraToken` | `0xf4A1219b0aaB83f772B240Ed508e3A37d7F55ED2` | Deployed testnet eligibility/faucet dependency for Vote. | Onboarding only, not product framing. |
| `ObscuraTreasury` | `0x89252ee3f920978EEfDB650760fe56BA1Ede8c08` | Spend request and timelock helper. | Advanced Governance. |
| `ObscuraRewards` | `0x435ea117404553A6868fbe728A7A284FCEd15BC2` | Participation reward lifecycle. | Participation. |
| `ObscuraGovernor` | `0xE4807C9F90a0da8F5B5bafa4361B15ff855b7186` | OZ Governor adapter using Vote participation as weight. | Advanced Governance. |
| `ObscuraTimelock` | `0x07b7961627f433a1d9001F82Ac4af9F19b9a9E05` | Execution delay and protocol safety gate. | Advanced Governance. |
| `ObscuraTreasuryStreamer` | `0x4af75Ae3B46C34B70d6E85FEcDb71E99EC490FeD` | Governor-controlled stream target. | Advanced Governance. |
| `ObscuraCreditGovernanceProxy` | `0x1C6892cCF24A6ade21B6778D9B5C288Ab85DA49C` | Credit governance adapter/proxy. | Advanced Governance, if surfaced. |

## 4. Core Privacy Model

| Data | Visibility | Notes |
|---|---|---|
| Proposal title/options/deadline/category/quorum | Public | Required for voters to understand proposals. |
| Whether an address voted | Public | `hasVoted` and `voterParticipation` are public. |
| Individual private proposal choice | Encrypted | Stored as encrypted handle. Never shown in activity/notifications. |
| Vote change | Public event that a change occurred | Old and new choices remain private. |
| Aggregate tallies before finalization | Encrypted | Not user-readable before reveal/finalization. |
| Aggregate tallies after finalization | Public/decryptable | Only final totals, never individual choices. |
| Delegation | Public | Delegation target and undelegation are public governance actions. |
| Rewards | Mixed | Participation events public; reward balance reveal should be user-triggered. |
| Treasury spend amount | Encrypted until execution/reveal path | Keep treasury in Advanced Governance. |
| Governor support value | Public | OZ Governor votes are public executable votes, distinct from private proposals. |

Hard rules:

- No auto-decrypt on mount.
- No permit prompt on mount.
- No vote option in activity payloads.
- No vote option in push notifications.
- No success UI before write receipt confirmation.
- No raw Pay/Credit financial history in Vote reputation UI.

## 5. Contract Behavior

### ObscuraVote

Source: [ObscuraVote.sol](contracts-hardhat/contracts/ObscuraVote.sol)

Primary responsibilities:

- create multi-option proposals;
- encrypt and store voter choice;
- support revote before deadline;
- subtract old encrypted contribution and add new encrypted contribution;
- track public participation count;
- support delegation and undelegation;
- finalize proposals;
- allow public aggregate tally reveal after finalization;
- allow self-verification through `getMyVote` and explicit user-triggered decrypt.

Important implementation constraints:

- encrypted state mutations must call `FHE.allowThis` on the new encrypted value;
- encrypted conditionals use `FHE.select`, not Solidity branching on encrypted values;
- tally reveal uses `FHE.allowPublic` at settlement/finalization time;
- proposal creation and voting currently depend on `ObscuraToken.lastClaim(msg.sender) > 0`.

The OBS dependency is a deployed access constraint. It should be presented as beta eligibility, not as the future governance philosophy.

### ObscuraGovernor

Source: [ObscuraGovernor.sol](contracts-hardhat/contracts/governance/ObscuraGovernor.sol)

Primary responsibilities:

- executable proposals;
- public Governor votes;
- queue and execute through Timelock;
- current voting power from `ObscuraVote.voterParticipation(account)`.

Important UX distinction:

Private proposals use encrypted choices. Governor proposals use public support values. These must not be visually merged.

### Treasury and Rewards

Sources:

- Treasury hooks: [useTreasury.ts](frontend/obscura-os-main/src/hooks/useTreasury.ts)
- Rewards hooks: [useRewards.ts](frontend/obscura-os-main/src/hooks/useRewards.ts)

Final placement:

- Treasury: Advanced Governance only.
- Rewards: Participation only.

Treasury should not become a top-level product. Rewards should not make Vote feel like a yield or farming surface.

## 6. Frontend Architecture

Main route:

- [VotePage.tsx](frontend/obscura-os-main/src/pages/VotePage.tsx)

Current major components:

| Component | Current role | Final direction |
|---|---|---|
| [VoteHarmonyDashboard.tsx](frontend/obscura-os-main/src/components/harmony/VoteHarmonyDashboard.tsx) | Polished overview hero/KPI area. | Rewrite copy and reduce density. Remove `Institutional governance` and `OBS - sealed` framing. |
| `VoteDashboard` | Dashboard metrics. | Use only if it supports needs-action overview. |
| `ProposalList` | Proposal list. | Keep as Proposals entry point. |
| `CreateProposalForm` | Proposal creation. | Keep secondary inside Proposals. |
| `CastVoteForm` | Encrypted cast flow. | Keep, but ensure receipt-gated success through hook. |
| `TallyReveal` | Aggregate reveal. | Keep explicit and user-triggered. |
| `DelegationPanel` | Delegation management. | Move under Participation. |
| `RewardsPanel` | Rewards management. | Move under Participation. |
| `TreasuryPanel` | Treasury spend/fund flow. | Move under Advanced Governance. |
| [GovernorPanel.tsx](frontend/obscura-os-main/src/components/vote/GovernorPanel.tsx) | Governor/Timelock UI. | Move under Advanced Governance and label public executable voting clearly. |

Current tab state in [VotePage.tsx](frontend/obscura-os-main/src/pages/VotePage.tsx) should change from:

```ts
type Tab = "dashboard" | "voting" | "governor" | "delegate" | "treasury" | "rewards";
```

to the final product model:

```ts
type VoteSection = "overview" | "proposals" | "participation" | "advanced";
```

Nested proposal tabs can remain internally if helpful, but the user should experience a proposal-detail workflow rather than needing to understand Create/Proposals/Cast/Results tabs.

## 7. Frontend Hooks

| Hook | Role | Required final behavior |
|---|---|---|
| [useEncryptedVote.ts](frontend/obscura-os-main/src/hooks/useEncryptedVote.ts) | Encrypts option index and calls `castVote`. | Wait for receipt before `FHEStepStatus.READY`. Include `fhe` in callback deps if using FHE client objects. |
| [useVoteTally.ts](frontend/obscura-os-main/src/hooks/useVoteTally.ts) | User-triggered tally and own-vote decrypt. | Keep user-triggered. No mount decrypt. |
| [useProposals.ts](frontend/obscura-os-main/src/hooks/useProposals.ts) | Proposal reads and participation reads. | Keep polling reasonable; use in Overview/Proposals/Participation. |
| [useTreasury.ts](frontend/obscura-os-main/src/hooks/useTreasury.ts) | Treasury reads/writes. | `useAttachSpend` must wait for receipt before `READY`. Advanced only. |
| [useRewards.ts](frontend/obscura-os-main/src/hooks/useRewards.ts) | Reward reads/writes. | Keep under Participation. Private reveals user-triggered. |
| [useGovernor.ts](frontend/obscura-os-main/src/hooks/useGovernor.ts) | Governor reads/writes. | Existing writes wait for receipts. Keep advanced-only. |
| [useVoteActivity.ts](frontend/obscura-os-main/src/hooks/useVoteActivity.ts) | Local Vote event watcher. | Keep as fallback until shared activity supports Vote fully. |
| [useActivityFeed.ts](frontend/obscura-os-main/src/hooks/useActivityFeed.ts) | Shared Supabase activity feed. | Add Vote/Governor filters and event labels. |
| [useReputationSummary.ts](frontend/obscura-os-main/src/hooks/useReputationSummary.ts) | Shared reputation summary. | Use in Participation to show coarse Pay/Credit/Vote reputation. |
| [useNotificationPrefs.ts](frontend/obscura-os-main/src/hooks/useNotificationPrefs.ts) | Notification prefs/subscription. | Add Vote event aliases and labels once backend supports them. |

## 8. Primary Flows

### Create Private Proposal

1. User opens Proposals.
2. User opens Create.
3. UI checks wallet, chain, and beta eligibility.
4. User enters title, options, deadline, quorum, category.
5. Write transaction is submitted.
6. UI waits for successful receipt.
7. Proposal appears in list and shared activity feed.

UX rule: create is secondary. The primary path is voting on active proposals.

### Cast Encrypted Vote

1. User opens an active proposal.
2. User chooses an option.
3. UI encrypts the option index.
4. UI calls `ObscuraVote.castVote`.
5. UI waits for successful receipt.
6. UI shows private vote recorded.
7. Activity/notification says only that a vote was cast or updated.

The option label must not appear in notifications, shared activity payloads, or generic toast copy.

### Change Vote

1. User opens the same active proposal before deadline.
2. UI shows current state as `Vote recorded` and offers `Change vote`.
3. User chooses a new option.
4. Contract subtracts old encrypted contribution and adds new encrypted contribution.
5. UI waits for successful receipt.
6. Activity shows vote updated without old/new choice.

### Reveal Aggregate Results

1. Deadline passes.
2. Proposal is finalized.
3. Aggregate tallies are allowed for public reveal.
4. User clicks reveal.
5. UI decrypts/retrieves aggregate totals only.

No individual choice is revealed.

### Verify My Vote

1. User opens a proposal they voted on.
2. User clicks explicit verify/reveal control.
3. UI requests permit/decrypt only because the user acted.
4. UI shows the user's choice locally.

No automatic verification on mount.

### Participation View

1. User opens Participation.
2. UI reads public `voterParticipation`.
3. UI reads shared reputation summary.
4. UI shows Pay, Credit, and Vote contribution categories as coarse tiers/counts.
5. UI shows delegation and reward controls.

Never show raw Pay/Credit amounts, counterparties, salaries, debt, collateral, or vote choices.

### Advanced Governance

1. User opens Advanced Governance.
2. UI shows Governor config, executable proposals, Timelock state, and Treasury actions.
3. UI labels Governor support votes as public executable votes.
4. Queue/execute flows wait for receipts.
5. Raw targets/calldata are available behind advanced details.

## 9. Shared Activity Integration

Backend worker files:

- [events.ts](backend/obscura-worker/src/indexer/events.ts)
- [index.ts](backend/obscura-worker/src/indexer/index.ts)

Current status:

- Vote events are indexed.
- Governor events are indexed.
- Governor activity args are sanitized so `VoteCast` does not push `support` by default.
- Frontend shared activity filtering has no dedicated Vote filter yet.

Final event groups:

| Group | Events |
|---|---|
| Private Vote | `ProposalCreated`, `VoteCast`, `VoteChanged`, `VoteFinalized`, `ProposalCancelled`, delegation events. |
| Advanced Governance | Governor `ProposalCreated`, `VoteCast`, `ProposalQueued`, `ProposalExecuted`, `ProposalCanceled`. |
| Participation | reward accrual, delegation, reputation updates derived from activity. |

Privacy payload rules:

- include proposal id, status, participant address when needed;
- exclude option index;
- exclude option text;
- exclude Governor support in push/UI summaries unless user opens raw advanced details;
- exclude Pay/Credit raw amounts and counterparties.

## 10. Notification Integration

Notification files:

- [notifications.ts](backend/obscura-worker/src/notifications.ts)
- [notifications.ts](backend/obscura-api/src/notifications.ts)
- [useNotificationPrefs.ts](frontend/obscura-os-main/src/hooks/useNotificationPrefs.ts)

Current gap:

- Non-Credit notification URLs fall back to Pay.
- Vote aliases are missing.

Final requirements:

- Vote and Governor notifications route to `/vote`.
- Preferences include readable Vote categories.
- Notification body never includes vote choice, support label, reason text, or private financial details.

Suggested event aliases:

| Alias | Meaning | Route |
|---|---|---|
| `vote.proposal_created` | New private proposal. | `/vote` |
| `vote.cast` | User/delegate participated. | `/vote` |
| `vote.changed` | Vote updated. | `/vote` |
| `vote.finalized` | Aggregate reveal available. | `/vote` |
| `vote.cancelled` | Proposal cancelled. | `/vote` |
| `governor.proposal_created` | Executable proposal created. | `/vote` |
| `governor.queued` | Executable proposal queued. | `/vote` |
| `governor.executed` | Executable proposal executed. | `/vote` |

## 11. Reputation Integration

Worker file:

- [reputation.ts](backend/obscura-worker/src/reputation.ts)

Frontend hook:

- [useReputationSummary.ts](frontend/obscura-os-main/src/hooks/useReputationSummary.ts)

Current status:

- Vote-derived signal types already exist, including vote participation, vote changes, delegation, and Governor participation.

Final Participation UI should show:

- governance participation count;
- Vote contribution tier;
- Pay contribution tier;
- Credit contribution tier;
- delegation state;
- recent private-safe activity.

Do not show:

- payment amount;
- salary or stream amount;
- credit debt;
- collateral amount;
- liquidation details beyond high-level public event facts;
- vote option;
- Governor support label in default activity.

Current Governor power remains `voterParticipation(account)`. Shared reputation is context until a future audited adapter exists.

## 12. UX Findings From Playwright Inspection

Inspected local app: `http://127.0.0.1:5175/vote`.

Findings:

- Desktop and mobile render successfully.
- Mobile at 390px had no horizontal overflow.
- Overview is overloaded and concept-heavy.
- Six top-level nav items make Treasury/Delegation/Rewards/Governor feel equally central.
- Hero language is too institutional and too OBS-led.
- Create proposal flow is functional but over-explained.
- Advanced Governor UI exists and is operationally useful, but it should not define the primary Vote product.

Design changes required:

- reduce nav to four sections;
- make private voting the first-screen action;
- remove large diagrams from first viewport;
- demote treasury/governor to Advanced Governance;
- combine delegation/rewards/reputation into Participation;
- replace OBS-token-centric language with participation/reputation language;
- keep advanced details available without surfacing them by default.

## 13. Copy Guidelines

Preferred product copy:

```text
Obscura Vote
Cast private votes. Change your mind before the deadline. Only final totals are revealed.
```

Use:

- private proposal;
- vote privately;
- change vote;
- final totals;
- participation;
- reputation context;
- advanced governance.

Avoid as primary UI framing:

- institutional governance;
- OBS utility;
- DAO suite;
- token-weighted governance;
- treasury OS;
- governance terminal;
- FHE internals on first screen.

Technical terms can appear in advanced details and documentation.

## 14. Required Code Fixes Before Production-Beta Label

| Priority | Area | File | Fix |
|---|---|---|---|
| P0 | Receipt gating | [useEncryptedVote.ts](frontend/obscura-os-main/src/hooks/useEncryptedVote.ts) | Wait for receipt before `READY` after `castVote`. |
| P0 | Receipt gating | [useTreasury.ts](frontend/obscura-os-main/src/hooks/useTreasury.ts) | Wait for receipt before `READY` in `useAttachSpend`. |
| P0 | Activity | [useActivityFeed.ts](frontend/obscura-os-main/src/hooks/useActivityFeed.ts) | Add Vote/Governor filters and labels. |
| P0 | Notifications | [notifications.ts](backend/obscura-worker/src/notifications.ts), [notifications.ts](backend/obscura-api/src/notifications.ts) | Add Vote aliases and `/vote` routing. |
| P1 | UX IA | [VotePage.tsx](frontend/obscura-os-main/src/pages/VotePage.tsx) | Collapse to four sections. |
| P1 | Overview | [VoteHarmonyDashboard.tsx](frontend/obscura-os-main/src/components/harmony/VoteHarmonyDashboard.tsx) | Rewrite copy and reduce density. |
| P1 | Participation | Vote participation components | Add shared reputation summary and move delegation/rewards here. |
| P1 | Advanced | Governor/Treasury components | Isolate executable actions and label publicness. |

## 15. Testing Requirements

### Frontend

- cast vote success waits for receipt;
- attach spend success waits for receipt;
- no decrypt/permit on mount;
- Vote activity filter works;
- Vote notification preferences render;
- four-section navigation works on desktop and mobile;
- proposal detail supports cast/change/reveal;
- Participation renders reputation without raw Pay/Credit details;
- Advanced Governance labels Governor votes as public.

### Backend

- Vote events index into `obscura_activity`;
- Governor events index into `obscura_activity`;
- Vote reputation events write to `obscura_reputation_events`;
- Vote notifications route to `/vote`;
- payload sanitizers exclude choice/support/amount details.

### Contracts

- create proposal;
- cast encrypted vote;
- revote;
- finalize and reveal aggregate;
- delegation;
- rewards;
- treasury spend lifecycle;
- Governor propose/cast/queue/execute.

### Playwright

- desktop navigation: Overview, Proposals, Participation, Advanced Governance;
- mobile 390px no horizontal overflow;
- first viewport exposes private voting action;
- Advanced Governance remains reachable but secondary;
- no layout overlap in cards, buttons, tabs, or bottom nav.

## 16. Mainnet and Production Notes

Vote can reach private beta on Arbitrum Sepolia after UX, receipt, activity, notification, and privacy-payload issues are fixed.

Mainnet production still requires:

- CoFHE mainnet readiness;
- contract audit;
- worker/API privacy audit;
- notification payload audit;
- runbook for finalization/reveal operations;
- clear migration strategy if replacing `voterParticipation` Governor power with future shared reputation power.

## 17. Final App Definition

The final Vote app is successful when the default path is this simple:

```text
Open Vote.
See active proposals.
Vote privately.
Change vote if needed.
Reveal final totals after close.
Track participation and reputation.
Ignore Advanced Governance unless operating the protocol.
```

Keep the app there.
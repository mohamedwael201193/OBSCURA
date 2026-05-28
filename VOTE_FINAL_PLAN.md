# Obscura Vote Final Execution Plan

Version: final-canonical, 2026-05-28  
Scope: simplify Vote into Obscura's lightweight private governance layer. This plan replaces the older OBS-token-centric and DAO-suite-oriented Vote roadmap.

```text
Private Payments -> Private Credit -> Private Reputation -> Private Governance
```

## 1. Product Philosophy

Vote is the final trust layer of Obscura. It should feel as simple as Pay: a user sees a proposal, understands the choice, votes privately, can change that vote before the deadline, and later sees only the aggregate result.

Vote is not:

- a DAO framework;
- an enterprise governance suite;
- a treasury management app;
- a Tally clone;
- a token-farming product;
- a place to expose payment, debt, payroll, or voting choices.

Vote is:

- encrypted multi-option voting;
- revoting before deadline;
- aggregate reveal after finalization;
- participation and delegation;
- a private reputation input for the Obscura ecosystem;
- an advanced-only executable governance surface for protocol changes.

The product story is no longer "OBS token governance." OBS remains a deployed contract dependency and testnet access gate, but the user-facing direction is participation, reputation, and privacy-preserving governance.

## 2. Evidence From Current App Inspection

This plan was written after reading the existing Vote docs, current frontend hooks/components, deployed contracts, worker indexer, reputation code, notification code, and the running local app at `http://127.0.0.1:5175/vote` using Playwright.

Observed live UI state:

| Area | Current behavior | Product issue |
|---|---|---|
| Overview | Leads with `Institutional governance`, `OBS - sealed`, treasury, setup guide, proposal list, diagrams, and how-it-works blocks. | Too much concept load for first screen. It feels like a governance console, not a simple private voting app. |
| Navigation | Six top-level destinations: Overview, Proposals, Treasury, Delegation, Participation, Executable. | Treasury, rewards, delegation, and executable governance look equally important. They should not be. |
| Proposal flow | Proposals has nested Create, Proposals, Cast Vote, Results. | Functionally complete, but users must understand internal workflow before taking the obvious action. |
| Create proposal | Strong OBS gating copy, templates, categories, quorum, FHE label, OBS distribution diagram. | The form is useful, but the surrounding copy revives token-centric and technical framing. |
| Cast/results | Encrypted voting exists; reveal is user-triggered. | Revote and privacy are present but not the emotional center of the UI. |
| Treasury | Separate top-level tab with spend requests, attach spend, fund treasury. | Too prominent for a lightweight governance layer. Belongs under Advanced Governance. |
| Delegation | Separate top-level tab. | Valuable, but better understood as part of Participation. |
| Participation | Currently reward-focused. | Should become the user's reputation and ecosystem contribution view. |
| Executable | Governor/Timelock UI exists with proposal and new proposal surfaces. | Correctly powerful, but should be advanced-only and visually quieter. |
| Mobile | No horizontal overflow at 390px. | First viewport is still dense: headline, two CTAs, four KPI cards, six bottom nav items. |

Current technical facts that affect the plan:

- [ObscuraVote.sol](contracts-hardhat/contracts/ObscuraVote.sol) preserves encrypted multi-option voting, revote, weighted quorum, public participation, and one-hop delegation.
- [ObscuraGovernor.sol](contracts-hardhat/contracts/governance/ObscuraGovernor.sol) uses `voterParticipation(address)` as current executable voting power.
- [useEncryptedVote.ts](frontend/obscura-os-main/src/hooks/useEncryptedVote.ts) currently sets `READY` after `writeContractAsync` returns a hash. It must wait for a successful receipt before success UI.
- [useTreasury.ts](frontend/obscura-os-main/src/hooks/useTreasury.ts) exposes receipt status for most writes, but `useAttachSpend` sets `READY` immediately after submit. This also needs receipt gating.
- [useVoteTally.ts](frontend/obscura-os-main/src/hooks/useVoteTally.ts) keeps decrypts user-triggered. No auto-decrypt on mount was found.
- [useVoteActivity.ts](frontend/obscura-os-main/src/hooks/useVoteActivity.ts) still has local event watchers.
- [useActivityFeed.ts](frontend/obscura-os-main/src/hooks/useActivityFeed.ts) is the shared Supabase feed, but its filter set has Pay and Credit types, not Vote.
- [events.ts](backend/obscura-worker/src/indexer/events.ts) already includes `VOTE_EVENTS` and `GOVERNOR_EVENTS`.
- [reputation.ts](backend/obscura-worker/src/reputation.ts) already derives Vote reputation signals.
- [notifications.ts](backend/obscura-worker/src/notifications.ts) and [notifications.ts](backend/obscura-api/src/notifications.ts) route non-Credit activity to Pay and only define Credit aliases. Vote notification aliases and `/vote` routing are missing.

## 3. Architecture Direction

Keep the live contracts. Do not redesign the protocol from scratch.

| Layer | Status | Final direction |
|---|---|---|
| `ObscuraVote` | Canonical encrypted poll contract. | Keep. Make it the primary user-facing Vote layer. |
| `ObscuraTreasury` | Legacy encrypted spend/timelock helper. | Keep. Demote to Advanced Governance. Do not grow into treasury software. |
| `ObscuraRewards` | Simple participation reward contract. | Keep. Present as participation feedback, not a financial product. |
| `ObscuraGovernor` | OZ Governor adapter using participation voting power. | Keep. Advanced-only executable governance. |
| `ObscuraTimelock` | Two-day execution delay. | Keep as the production safety gate. |
| `ObscuraTreasuryStreamer` | Governor-controlled stream adapter. | Keep minimal. Do not make Vote a Pay management app. |
| Shared activity worker | Already indexes Vote and Governor events. | Finish frontend filters, notification aliases, and privacy payload tests. |
| Shared reputation | Already derives Vote signals. | Surface coarse tiers in Participation. Do not expose raw Pay/Credit details. |

No new Vote contracts are required for the final beta/product plan. A future reputation-weight adapter can be considered only after Pay, Credit, and shared reputation are stable and audited.

## 4. Governance Model

Vote has two tracks, but only one should feel primary.

### Track A: Private Proposals

Primary product surface.

- Create a simple multi-option proposal.
- Cast an encrypted vote.
- Change the vote before deadline.
- Reveal aggregate tallies after finalization.
- Increment participation without revealing choice.

This is the default Vote experience.

### Track B: Advanced Governance

Advanced product surface.

- Governor proposals.
- Timelock queue and execution.
- Treasury spend lifecycle.
- Treasury streamer actions.
- Raw action details when needed.

This is for protocol operations, not normal voting. It must be visually and navigationally separated from private proposals.

## 5. OBS and Legacy Token-Centric Concepts

OBS is still a deployed dependency:

- `ObscuraVote.createProposal` and `castVote` require `lastClaim(msg.sender) > 0`.
- Delegation weight exists on the Vote contract.
- The testnet faucet still helps users enter the system.

But the product should not frame governance as OBS farming or token-weight maximalism.

Final framing:

| Old framing | New framing |
|---|---|
| Claim OBS to govern. | Join private governance. Testnet OBS unlocks participation. |
| OBS is the core governance story. | Participation and reputation are the governance story. |
| Voting weight equals token identity. | Participation, delegation, and trusted activity create governance context. |
| Expand OBS utilities. | Do not add token utility unless real product demand exists. |
| Build a DAO suite around OBS. | Keep Vote as a lightweight private governance layer. |

Legacy concepts to mark as historical or remove from future plans:

- OBS staking expansions;
- veToken voting;
- sub-DAO factories;
- grant CRM;
- cross-DAO tooling;
- delegate marketplaces;
- analytics-heavy voter profiling;
- tokenized vote receipts;
- token-farming governance loops.

## 6. Shared Reputation Model

Vote should consume and contribute to the same coarse reputation layer used by Credit.

Inputs that may be used:

| Source | Allowed signal | Never expose |
|---|---|---|
| Pay | private payment participation, stream reliability, invoice/escrow completion as counts or tiers | payment amounts, salaries, counterparties, notes |
| Credit | repayment participation, healthy position history, liquidation-free activity, score tier | debt amount, collateral amount, liquidation details tied to identity beyond public event facts |
| Vote | proposal participation, revote participation, delegation, executable participation | vote option, private reward balance, hidden treasury amount before execute |

Near-term rule:

```text
Vote Participation = public proposal participation + delegation activity + shared reputation tier context
```

Executable Governor power remains the deployed `voterParticipation(address)` rule until a new reputation source is audited. The UI may show a broader reputation tier, but it must not pretend that tier is already on-chain voting power.

Future rule, only after audit:

```text
governance weight = min(maxWeight, participationWeight + cappedReputationTierWeight)
```

Constraints for any future rule:

- capped;
- public and auditable;
- privacy-preserving;
- no raw Pay/Credit history;
- no per-proposal vote choice;
- no redeploy unless existing Governor state has a clear migration path.

## 7. Pay and Credit Integration

Vote should complete the Obscura loop, not manage Pay or Credit workflows.

Product message:

```text
Private money in Pay builds private credit behavior.
Private credit behavior builds private reputation.
Private reputation gives context to private governance.
```

In Vote:

- Overview shows a calm reputation summary: Pay, Credit, Governance.
- Participation explains that payment and credit activity can improve ecosystem reputation without showing raw history.
- Proposal pages can label ecosystem-impacting proposals: Pay, Credit, Governance.
- Advanced Governance can execute protocol actions that affect Pay or Credit, but those actions stay in the advanced surface.

From Credit:

- Credit can link to Vote as a way to strengthen governance participation.
- Credit may use Vote participation as one reputation signal.
- Credit must not reveal the user's vote choice or proposal preference.

From Pay:

- Pay can mention that consistent private activity contributes to ecosystem reputation.
- Pay should not send users into complex governance unless there is an active, relevant proposal.

## 8. Activity and Notification Integration

Vote must use the shared activity and notification infrastructure.

Current state:

- Worker ABI includes `ObscuraVote` events.
- Worker ABI includes `ObscuraGovernor` events.
- Reputation worker derives Vote signals.
- Vote page still has local watchers for live Vote activity.
- Shared frontend activity filters do not include Vote.
- Notification routing sends non-Credit events to Pay by default.

Final requirements:

- Add `vote` to shared activity filters in [useActivityFeed.ts](frontend/obscura-os-main/src/hooks/useActivityFeed.ts).
- Replace or demote [useVoteActivity.ts](frontend/obscura-os-main/src/hooks/useVoteActivity.ts) after shared Vote feed is stable.
- Add Vote notification aliases in worker and API notification services.
- Route Vote notifications to `/vote`, not `/pay`.
- Keep notification bodies generic and amount-free.
- Never include vote option in activity or notification payloads.
- Keep sanitized Governor payloads. `support` and `reason` are public in OZ Governor events, but the final UI should avoid pushing support choices as notifications.

Allowed notification examples:

- `New private proposal is open.`
- `Proposal #12 is ready to reveal.`
- `Your vote was updated.`
- `Your delegate voted on proposal #12.`
- `An executable proposal entered the timelock.`

Forbidden notification examples:

- `You voted For.`
- `Your delegate voted Against.`
- `Your Credit repayment amount improved your governance tier.`
- `Your reward balance is 0.05 ETH.`

## 9. Final Navigation

Final top-level navigation:

1. Overview
2. Proposals
3. Participation
4. Advanced Governance

### Overview

Purpose: answer what needs the user's attention now.

Show:

- active proposals needing a vote;
- finalized proposals ready for aggregate reveal;
- user's participation tier;
- one short privacy promise;
- one primary CTA: `Vote privately`;
- one secondary CTA: `View participation`.

Remove or demote:

- giant educational blocks;
- diagrams on first viewport;
- four KPI cards that explain internal concepts;
- `Institutional governance` copy;
- treasury as a first-screen signal;
- OBS distribution diagram.

Preferred first-screen copy:

```text
Obscura Vote
Cast private votes. Change your mind before the deadline. Only final totals are revealed.
```

### Proposals

Purpose: browse, create, cast, change, and reveal private proposals.

Show:

- proposal list;
- simple status filters;
- create proposal as a secondary action;
- proposal detail with options;
- revote affordance;
- aggregate results after finalization.

Simplify:

- replace nested Create/Proposals/Cast/Results mental model with proposal-detail flow;
- show `Create` only as a button or compact mode;
- keep categories but avoid taxonomy-heavy UI;
- keep quorum legible as `current / needed`;
- explain revote once, near the vote button.

### Participation

Purpose: show the user's contribution and reputation context.

Contains:

- governance participation count;
- shared reputation summary by source: Pay, Credit, Vote;
- delegation status and actions;
- rewards status and actions;
- recent user-specific activity from shared feed.

Rules:

- no raw payment amounts;
- no raw debt or collateral amounts;
- no vote choice;
- no reward balance reveal without user action;
- delegation publicness explained in one sentence.

### Advanced Governance

Purpose: isolate powerful protocol operations.

Contains:

- executable Governor proposals;
- timelock queue and execution state;
- treasury spend requests;
- treasury funding;
- treasury streamer actions;
- raw calldata/target details behind disclosure controls.

Rules:

- not shown as a default user path;
- no DAO-suite expansion;
- no grants CRM;
- no forum tooling;
- no general treasury dashboard beyond what protocol operators need.

## 10. UX Simplification Plan

### Copy

Use human language:

- `Private proposal`, not `governance poll` when possible.
- `Your choice stays private`, not `ciphertext`.
- `Final totals are revealed`, not `FHE.allowPublic`.
- `Change your vote before the deadline`, not `anti-coercion primitive`.
- `Participation tier`, not `OBS utility`.

Technical terms are allowed in docs and advanced detail panels, not first-screen copy.

### Visual hierarchy

Overview should have:

- one headline;
- one short paragraph;
- one action cluster;
- one compact `Needs action` list;
- one compact participation tile.

Proposal detail should have:

- title and deadline;
- option buttons;
- current private-vote state;
- revote message;
- result/reveal state;
- activity history.

Participation should feel like a profile, not a finance dashboard.

Advanced Governance should feel intentionally quieter and more operational.

### Mobile

The current mobile page avoids horizontal overflow, but the first screen is still dense. Mobile final target:

- four nav items maximum;
- no four-card KPI stack above core action;
- proposal voting as the first reachable workflow;
- advanced actions below a clear warning/disclosure;
- no diagrams in the default mobile path.

## 11. Privacy Requirements

Hard guarantees to preserve:

- individual vote choice stays private forever unless the voter reveals it to themselves;
- aggregate tallies reveal only after finalization;
- revote does not reveal the old or new option;
- participation is public by design;
- delegation is public by design;
- reward balance reveal is user-triggered;
- treasury spend amount remains private until execution/reveal;
- Governor executable calldata is public by design;
- no auto-decrypt on mount;
- no notification/activity payload leaks vote choice.

Implementation rules:

- `decryptForView` must never run in `useEffect`.
- `getOrCreateSelfPermit` must never run in `useEffect`.
- All encrypted writes must wait for a successful receipt before success UI.
- All `READY` states must follow confirmed receipts for writes.
- All Vote activity rows must exclude option index and choice labels.
- Governor notification rows should avoid pushing `support` even though Governor events expose it.

## 12. Technical Remediation List

P0 fixes before calling Vote production-beta clean:

| Item | File | Required change |
|---|---|---|
| Encrypted cast success timing | [useEncryptedVote.ts](frontend/obscura-os-main/src/hooks/useEncryptedVote.ts) | Wait for `publicClient.waitForTransactionReceipt`, throw on `status !== "success"`, then set `READY`. |
| Attach spend success timing | [useTreasury.ts](frontend/obscura-os-main/src/hooks/useTreasury.ts) | `useAttachSpend` must wait for receipt before `READY`. |
| Shared activity filter | [useActivityFeed.ts](frontend/obscura-os-main/src/hooks/useActivityFeed.ts) | Add `vote` type and Vote/Governor event names. |
| Local watcher migration | [useVoteActivity.ts](frontend/obscura-os-main/src/hooks/useVoteActivity.ts) | Keep only as fallback until shared feed is verified. |
| Notification URL | [notifications.ts](backend/obscura-worker/src/notifications.ts), [notifications.ts](backend/obscura-api/src/notifications.ts) | Route Vote/Governor events to `/vote`. |
| Notification aliases | same notification files | Add `vote.*` aliases and preference labels. |
| Overview density | [VotePage.tsx](frontend/obscura-os-main/src/pages/VotePage.tsx), [VoteHarmonyDashboard.tsx](frontend/obscura-os-main/src/components/harmony/VoteHarmonyDashboard.tsx) | Remove first-screen concept stack; lead with private voting action. |
| Navigation | [VotePage.tsx](frontend/obscura-os-main/src/pages/VotePage.tsx) | Collapse to Overview, Proposals, Participation, Advanced Governance. |
| Reputation surface | Vote Participation components | Show shared reputation summary with coarse Pay/Credit/Vote categories. |

## 13. Implementation Phases

### Phase V0: Documentation Alignment

Status: this plan.

Tasks:

- Replace obsolete OBS-token-centric strategy.
- Mark DAO-suite concepts as legacy.
- Update canonical technical docs.
- Record live app UX findings.

Exit:

- Engineers and designers have one clear source of truth.

### Phase V1: Safety and Shared Infrastructure

Tasks:

- Fix write receipt handling for encrypted vote and attach spend.
- Add Vote filters to shared activity feed.
- Add Vote notification aliases and `/vote` routing.
- Add tests that Vote notifications never include choice/support labels.
- Keep local watchers as fallback.

Exit:

- Vote writes only show success after receipt.
- Vote activity appears in shared feed.
- Push notifications route to Vote without leaking choices.

### Phase V2: Four-Section Navigation

Tasks:

- Collapse six top-level tabs into four.
- Move Treasury and Governor under Advanced Governance.
- Move Delegation and Rewards under Participation.
- Reduce Overview first viewport.
- Remove or demote diagrams and large educational blocks.

Exit:

- A new user can identify the vote action within 10 seconds on desktop and mobile.

### Phase V3: Proposal Flow Simplification

Tasks:

- Make proposal list -> proposal detail -> vote the primary path.
- Keep create proposal secondary.
- Make revote copy visible near the submit button.
- Add post-vote card with `Show my vote` and `Change vote`.
- Keep tally reveal explicit and user-triggered.

Exit:

- User can cast and change a vote without understanding the internal tab model.

### Phase V4: Participation and Reputation

Tasks:

- Build Participation as a profile page.
- Read shared reputation summary.
- Show Pay/Credit/Vote source categories as tiers/counts only.
- Add delegation management in the same page.
- Add rewards in the same page with reveal-on-demand.

Exit:

- User understands how private activity becomes reputation context without seeing raw financial history.

### Phase V5: Advanced Governance Cleanup

Tasks:

- Keep Governor/Timelock behind Advanced Governance.
- Add clearer lifecycle states.
- Keep raw calldata behind details.
- Keep Treasury spend lifecycle here.
- Add irreversible-action warnings before execute.

Exit:

- Protocol operators can act safely; normal users are not overwhelmed.

### Phase V6: Production Hardening

Tasks:

- Playwright coverage for desktop and mobile navigation.
- Privacy payload tests for worker, API, and frontend feed.
- Contract tests for revote, finalize, delegation, treasury, rewards, Governor queue/execute.
- Manual two-wallet vote/revote/reveal test.
- Audit checklist and runbook.

Exit:

- Vote is ready for private beta UX, with mainnet still blocked on CoFHE GA and audit.

## 14. Testing Strategy

### Playwright UX tests

- Desktop: Overview, Proposals, Participation, Advanced Governance.
- Mobile 390px: no horizontal overflow, four nav items, primary vote action visible.
- Proposal flow: browse, open, cast, post-vote state, change vote, reveal aggregate.
- Participation: reputation summary, delegation, rewards reveal/hide.
- Advanced: Governor proposal list, new proposal form, timelock states, treasury spend states.

### Frontend unit/integration tests

- `useEncryptedVote` waits for receipt and rejects failed receipts.
- `useAttachSpend` waits for receipt and rejects failed receipts.
- No `decryptForView` or permit creation in mount effects.
- Activity feed `vote` filter returns only Vote/Governor events.
- Notification preferences include Vote aliases.

### Worker/API tests

- `ObscuraVote.VoteCast` payload contains proposal id and voter only.
- `ObscuraVote.VoteChanged` payload contains proposal id and voter only.
- `ObscuraGovernor.VoteCast` notification does not push support labels.
- Vote notifications route to `/vote`.
- Reputation derivation inserts Vote signals without amounts or vote choices.

### Contract tests

- create proposal;
- cast encrypted vote;
- revote subtracts old contribution and adds new contribution;
- finalize reveals aggregate tallies only;
- delegation and undelegation;
- treasury attach, record finalization, execute after timelock;
- rewards accrue/request/withdraw;
- Governor propose/cast/queue/execute.

### Manual E2E

- two-wallet vote and revote;
- finalization after deadline;
- reveal aggregate tally;
- verify own vote by explicit reveal;
- delegation attempt and undelegation;
- notification subscription and test push;
- shared activity feed refresh;
- mobile hand test.

## 15. Production Blockers

Vote is not production-ready until:

- encrypted Vote writes wait for successful receipts;
- attach-spend write waits for successful receipt;
- shared activity includes Vote filter and UI surface;
- notifications route Vote events to Vote and never leak choices;
- Participation shows reputation tiers without raw financial history;
- Advanced Governance is clearly isolated;
- mobile first viewport is simplified;
- obsolete OBS-token/DAO-suite docs are retired;
- contract, worker, and frontend privacy tests pass;
- external audit is complete;
- Fhenix CoFHE mainnet readiness is confirmed.

## 16. Final North Star

Vote is finished when a non-crypto user can open the app and understand this without reading a manual:

```text
I can vote privately.
I can change my vote before the deadline.
Only final totals are revealed.
My participation strengthens my Obscura reputation.
Protocol actions are available, but kept in Advanced Governance.
```

That is enough. Anything beyond that should wait for real governance demand.
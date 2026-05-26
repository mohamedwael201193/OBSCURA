# Obscura Vote Final Execution Plan

Version: final-focused, 2026-05-26
Scope: keep Vote lightweight, preserve encrypted governance, and integrate it with shared reputation/activity infrastructure without turning it into a DAO megasuite.

Vote is already contractually complete enough. The final plan is not to grow governance. The plan is to make governance useful as the last step in the Obscura thesis.

```text
Private Payments -> Private Reputation -> Private Creditworthiness -> Governance Weight
```

## 1. Product Decision

Vote should remain lightweight.

Vote owns:

- encrypted multi-option polls;
- coercion-resistant revoting;
- delegation;
- participation tracking;
- minimal treasury and reward visibility;
- executable proposal access through the already deployed Governor/Timelock.

Vote should not own:

- a DAO megasuite;
- enterprise roles;
- large treasury operations;
- grants CRM;
- forum tooling;
- full Tally clone;
- Pay or Credit workflow management.

Vote consumes reputation. It does not generate complicated financial products.

## 2. Current Live State

### Stable and Preserve

Current Vote primitives worth preserving:

- `ObscuraVote` V5 encrypted multi-option voting.
- `FHE.eq + FHE.select` tally loops.
- Unlimited revote before deadline.
- `FHE.allowPublic` only on aggregate tallies after finalization.
- Public `hasVoted` and public `voterParticipation` counters.
- Private individual vote choice.
- Delegation with one-hop guard.
- Weighted quorum.
- `ObscuraTreasury` encrypted spend amount until execution.
- `ObscuraRewards` voter reward accounting.
- `ObscuraGovernor` wrapping `voterParticipation` as OZ Governor voting power.
- `ObscuraTimelock` with admin renounced.
- `ObscuraTreasuryStreamer` for DAO-controlled Pay streams.
- VotePage includes Overview, Proposals, Treasury, Delegation, Participation, Executable.
- No auto-decrypt on mount in the intended flows.

### Current Vote Contracts

| Contract | Role | Decision |
|---|---|---|
| `ObscuraVote` | Encrypted polls and participation | Canonical |
| `ObscuraTreasury` | Legacy encrypted treasury spends | Keep, do not expand |
| `ObscuraRewards` | Voter rewards | Keep simple |
| `ObscuraGovernor` | Executable proposal adapter | Keep as advanced/executable surface |
| `ObscuraTimelock` | 2-day execution delay | Canonical for executable changes |
| `ObscuraTreasuryStreamer` | Governance controlled stream adapter | Keep minimal |
| `ObscuraCreditGovernanceProxy` | Credit factory governance bridge | Keep, no UX bloat |

### Current Frontend Reality

Vote UI exists and works, but it is heavier than the final user story needs:

- Dashboard stacks setup, active proposals, all proposals, diagrams, and how-it-works content.
- Proposals have sub-tabs: create, proposals, cast, results.
- GovernorPanel exists under Executable.
- Vote has local event watching through `useVoteActivity`, not the shared Supabase activity system.
- Vote includes reward, delegation, treasury, and governor surfaces that should remain secondary.

The right direction is clarity and integration, not new governance features.

### Known Implementation Gaps Found

These are the concrete Vote fixes implied by the current code:

- `useEncryptedVote.castVote` sets ready after `writeContractAsync` returns a hash. It should wait for transaction receipt and throw on revert before showing success.
- Vote activity currently uses local `watchContractEvent` state. It should migrate to the shared Supabase activity feed after worker indexing is live.
- Vote notifications do not yet use the shared notification preference model.
- The Overview stacks onboarding, proposal lists, diagrams, and educational content. It should be reduced without changing the underlying Harmony shell.
- Executable proposals exist, but users need clearer separation between encrypted polls and Governor/Timelock actions.

## 3. Privacy Reasoning

Vote's privacy contract is:

- Individual vote choice is private forever.
- Aggregate tallies reveal only after finalization.
- The fact that a wallet voted is public.
- Participation count is public and intentionally used as a reputation/governance signal.
- Rewards balance reveal is user-triggered.
- Treasury spend amount is private until execution/reveal.

Vote can consume payment and credit reputation only as capped categories or tiers. It must not show raw payment history, payroll amounts, debt amounts, repayment amounts, or counterparties.

## 4. Governance Model

Vote has two tracks. The final plan should make them explicit and simple.

### Track A: Encrypted Polls

Primary user-facing track.

- Multi-option proposals.
- Encrypted ballots.
- Revote before deadline.
- Final aggregate reveal.
- Participation increments `voterParticipation`.

This is the core Obscura governance product.

### Track B: Executable Proposals

Advanced track.

- OZ Governor.
- Timelock.
- Uses public `voterParticipation` as voting power today.
- Executes protocol changes or treasury stream actions.

This should remain visible but not dominate the app.

### Do Not Add Governance Bloat

Do not add:

- delegate marketplaces;
- governance forums;
- proposal sponsorship markets;
- treasury CRM;
- grants review systems;
- role-based enterprise dashboards;
- multi-DAO support;
- token launchpad tooling;
- analytics-heavy voter surveillance.

## 5. Shared Reputation Architecture

Vote should consume the same shared reputation layer as Credit.

### Inputs Vote May Consume

From Pay:

- private payment participation;
- payroll/stream participation;
- subscription participation;
- escrow completion;
- invoice completion.

From Credit:

- repayment participation;
- position health history as coarse tier only;
- liquidation-free completion;
- score tier changes.

From Vote itself:

- encrypted vote participation;
- delegation participation;
- proposal creation/finalization;
- executable proposal participation.

### How Vote Should Use Reputation

Near term:

- Show a lightweight `Reputation` or `Participation` panel explaining categories.
- Use shared reputation only for contextual UX and eligibility hints.
- Keep Governor voting power as `voterParticipation` until shared reputation is audited.

Later, only after Pay and Credit are stable:

- Consider capped reputation-weighted proposal eligibility or voting weight.
- Any on-chain weight source must be coarse, auditable, and privacy-preserving.
- Do not expose raw payment/credit history to governance voters.

### Recommended Voting Weight Rule

Keep the current Governor weight for now:

```text
executable proposal voting power = voterParticipation
```

Future candidate, after audit:

```text
governance weight = min(maxWeight, voteParticipationWeight + sharedReputationTierWeight)
```

Where `sharedReputationTierWeight` is a public coarse tier and not raw financial history.

## 6. Shared Activity and Notification Integration

Vote should stop being isolated from shared activity infrastructure.

### Activity Indexing

Extend `obscura-worker` to index Vote events into `obscura_activity`.

Initial events:

- `ProposalCreated`
- `VoteCast`
- `VoteChanged`
- `VoteFinalized`
- `ProposalCancelled`
- `DeadlineExtended`
- `DelegateSet`
- `DelegateRemoved`
- Governor `ProposalCreated`
- Governor `VoteCast`
- Governor `ProposalQueued`
- Governor `ProposalExecuted`
- rewards accrued/withdrawn if needed
- treasury spend attached/finalized/executed if needed

Privacy rule: `VoteCast` and `VoteChanged` notifications must not include vote option.

### Notifications

Vote notifications should reuse `obscura_notification_prefs`.

New types:

- `vote.proposal_created`
- `vote.deadline_soon`
- `vote.finalized`
- `vote.changed`
- `vote.reward_available`
- `vote.executable_queued`
- `vote.executable_executed`

Notification bodies:

- good: `Proposal #12 is ready to reveal.`
- good: `Your vote was updated.`
- bad: `You voted for option 2.`

### Replace Local Watchers Carefully

Do not remove `useVoteActivity` until shared indexing is live.

Migration path:

1. Add Vote events to worker indexer.
2. Add Vote filter support to shared activity hook.
3. Add Vote activity panel using shared hook.
4. Keep `useVoteActivity` as local fallback.
5. Remove local watcher only after shared event feed is stable.

## 7. UX Plan

### Keep the App Small

Final Vote should have four primary sections:

| Section | Purpose |
|---|---|
| Overview | current participation, reputation context, next voting action |
| Proposals | browse, create, cast, reveal encrypted polls |
| Participation | reputation, delegation, rewards |
| Executable | advanced governor/timelock actions |

Treasury should live inside Executable or Participation unless there is a specific active treasury proposal.

### Overview

Overview should answer:

- Do I have enough setup to vote?
- Is there something I should vote on now?
- How does voting improve my Obscura reputation?
- Are there finalized proposals to reveal or claim rewards from?

Avoid large educational blocks after onboarding is complete.

### Proposals

Proposals should emphasize:

- encrypted choice;
- revote before deadline;
- aggregate reveal after close;
- quorum and deadline clarity;
- no live tally leak.

The create flow should stay simple. No templates or advanced proposal builder until actual governance volume needs them.

### Participation

Participation should combine:

- vote participation count;
- delegation status;
- reward status;
- shared reputation category summary.

It must not become a financial dossier.

### Executable

Executable proposals are powerful and should stay advanced:

- show Governor config;
- list proposals;
- propose/cast/queue/execute;
- explain timelock succinctly;
- link actions to affected app where possible.

Do not merge encrypted poll voting and executable voting into one confusing form.

## 8. Contract Plan

### No New Vote Contracts First

No new Vote contract is needed for the final plan.

Use existing contracts:

- encrypted polls through `ObscuraVote`;
- executable proposals through `ObscuraGovernor`;
- timelock through `ObscuraTimelock`;
- DAO Pay stream adapter through `ObscuraTreasuryStreamer`.

### Only Justified Future Contract

If governance weight must consume shared Pay/Credit reputation on-chain, add only one minimal adapter or upgrade path after audit.

Possible future adapter:

```text
IObscuraReputationWeight
  function getGovernanceWeight(address user) external view returns (uint256)
```

Constraints:

- no raw financial history;
- capped tier weights;
- governed updater or audited score source;
- compatibility with existing Governor if redeploy is unavoidable;
- migration plan for proposal state.

Do not redeploy Governor just to add speculative weight sources.

## 9. Pay Integration

Vote consumes Pay as reputation context, not as proposal clutter.

Near term:

- Show Pay participation as one category in Participation.
- Notify users when a Pay-related executable proposal exists.
- Keep DAO TreasuryStreamer advanced.

Do not add Pay management into Vote.

## 10. Credit Integration

Vote consumes Credit as reputation context and governance consequence.

Near term:

- Show Credit repayment/health participation as coarse categories.
- Let Credit governance proposals route through Executable when necessary.
- Keep Credit risk controls in Credit, not Vote.

Future:

- Credit score tier may contribute to governance weight only after a shared reputation contract is audited.
- Liquidation or market parameter proposals should be clearly labeled as Credit-impacting.

## 11. Execution Phases

Global order remains:

1. Finish and stabilize Pay.
2. Build and finish Credit.
3. Integrate Pay with Credit.
4. Build lightweight Vote improvements.
5. Integrate Vote with shared reputation.
6. Harden production across all apps.

### V0: Stabilize Existing Vote UX

Tasks:

- Keep all current contract addresses.
- Make the two tracks explicit: Encrypted Polls and Executable Proposals.
- Reduce dashboard stacking where possible without redesigning Harmony.
- Keep user-facing copy plain and privacy-focused.
- Ensure all vote writes wait for receipts before success.
- Confirm reveal/decrypt actions are user-triggered.

Success criteria:

- Existing vote creation, cast, revote, finalize, reveal, delegation, rewards, and governor flows remain available.
- Users understand which track they are using.

### V1: Shared Vote Activity

Tasks:

- Add Vote ABI event fragments to worker indexer.
- Store Vote events in `obscura_activity`.
- Add Vote filters to shared activity hook.
- Add Vote notifications to shared notification prefs.
- Keep local watcher fallback during rollout.

Success criteria:

- New proposal/vote/finalization events appear in shared activity.
- Push notifications work without exposing vote choice.

### V2: Participation and Reputation Panel

Tasks:

- Add a lightweight Participation view that reads shared reputation events.
- Show categories: Payments, Credit, Governance.
- Display capped counts/tiers only.
- Explain that raw financial history is not shown.
- Keep rewards and delegation in the same participation area.

Success criteria:

- User understands how governance participation fits the broader Obscura reputation loop.
- No raw Pay/Credit amounts or counterparties appear.

### V3: Executable Proposal Safety Pass

Tasks:

- Add clearer states for propose, vote, queue, execute.
- Show timelock ETA.
- Show affected target contracts and decoded function labels where already safe.
- Keep raw calldata visible only in advanced/details.
- Add notification hooks for queued/executable/executed states.

Success criteria:

- Executable proposals are understandable without creating a huge DAO app.

### V4: Optional Reputation-Weighted Governance Design Gate

Do not implement until Pay and Credit shared reputation are stable.

Gate questions:

- Is `voterParticipation` insufficient?
- Is shared reputation accurate and privacy-preserving?
- Is there enough governance usage to justify a new weight adapter?
- Can weight be capped and audited?
- Can existing Governor state be preserved or safely migrated?

If any answer is no, do not proceed.

## 12. What Should Be Removed or Demoted

Demote:

- Treasury as a top-level heavy surface if it distracts from proposals.
- Rewards as a finance-like product. It is participation feedback.
- Governor as default path. It is advanced/executable.
- Long how-it-works blocks after setup.

Remove from future scope:

- DAO megasuite features;
- proposal forums;
- grant CRM;
- cross-DAO tooling;
- governance analytics that profile users;
- enterprise roles;
- additional treasury products.

Keep:

- encrypted polls;
- revote story;
- participation counter;
- simple delegation;
- executable proposal access.

## 13. Production Blockers

Vote is not production-ready until:

- shared activity and notifications cover Vote events;
- vote choice never appears in notifications or shared events;
- executable proposal states are clear;
- participation/reputation view avoids raw financial history;
- all writes confirm receipt before success;
- no auto-decrypt on mount;
- docs explain the two governance tracks;
- mainnet remains blocked until CoFHE mainnet GA and audit.

## 14. Testing Strategy

Contract tests:

- create proposal;
- cast encrypted vote;
- revote;
- finalize and reveal aggregate tally;
- delegation and undelegation;
- treasury spend lifecycle;
- rewards lifecycle;
- governor propose/cast/queue/execute.

Frontend tests:

- wrong network banner;
- setup guide;
- create proposal;
- browse proposals;
- cast and revote copy/state;
- reveal results;
- delegation panel;
- participation panel;
- governor panel.

Infra tests:

- index Vote events;
- push proposal/finalization notifications;
- do not include vote option in activity or notification payload;
- shared activity filters do not break Pay/Credit views.

Manual E2E:

- two-wallet vote and revote;
- finalization/reveal after deadline;
- delegation from one wallet to another;
- executable proposal dry path on test target;
- notification test for new proposal and finalized proposal.

## 15. Final Vote North Star

Vote is done when a user can:

1. see a small set of meaningful encrypted proposals;
2. cast or change a vote privately;
3. reveal aggregate results after the deadline;
4. understand that participation strengthens Obscura reputation;
5. use executable proposals only when protocol changes need them;
6. receive useful governance notifications without exposing financial or voting choices.

That is enough. Anything larger should wait for real governance demand.

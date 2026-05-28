# Obscura Vote Master Execution Plan

Status: superseded and simplified  
Canonical product plan: [VOTE_FINAL_PLAN.md](VOTE_FINAL_PLAN.md)  
Canonical technical docs: [VOTE-APP-DOCS.md](VOTE-APP-DOCS.md)

This file replaces the older Wave 5 Vote roadmap that treated Vote like a full DAO platform. The final direction is smaller and clearer:

```text
Private Payments -> Private Credit -> Private Reputation -> Private Governance
```

Vote should feel as simple as Pay. It should not become a governance megasuite, token utility expansion, Tally clone, forum product, grants CRM, or treasury dashboard.

## 1. What Stays

The deployed system already contains enough primitives for the final Vote product.

| Primitive | Decision |
|---|---|
| Encrypted multi-option proposals | Keep as the primary Vote product. |
| Revoting before deadline | Keep and make clearer in UX. |
| Aggregate tally reveal after finalization | Keep as the core privacy promise. |
| Public participation counter | Keep as the first governance/reputation bridge. |
| One-hop delegation | Keep under Participation. |
| Rewards | Keep as participation feedback, not a financial product. |
| Treasury helper contracts | Keep under Advanced Governance. |
| Governor and Timelock | Keep under Advanced Governance only. |
| Shared Supabase activity | Finish Vote integration. |
| Shared reputation | Surface as coarse participation context. |

## 2. What Is Retired

The following older roadmap ideas are no longer execution targets:

- DAO-suite positioning;
- OBS token utility expansion as the core strategy;
- staking, veToken, sub-DAO, or delegate-marketplace work;
- grants CRM and forum-style governance workflow;
- Snapshot/Tally feature parity as a product goal;
- proposal sponsorship systems;
- elaborate proposal-template engines;
- analytics-heavy voter profiles;
- automatic wallet-triggered decrypts;
- activity or notifications that reveal vote choices;
- large governance surfaces before the private voting workflow is clean.

OBS remains a deployed beta access/eligibility dependency through `ObscuraVote`, but it is not the product north star.

## 3. Final Information Architecture

Top-level Vote navigation must become:

1. Overview
2. Proposals
3. Participation
4. Advanced Governance

Mapping from current UI:

| Current top-level area | Final location |
|---|---|
| Overview | Overview, simplified. |
| Proposals | Proposals, with proposal-detail workflow. |
| Treasury | Advanced Governance. |
| Delegation | Participation. |
| Participation / Rewards | Participation. |
| Executable | Advanced Governance. |

## 4. Execution Sequence

### V0. Documentation and Strategy Cleanup

Outcome: one canonical direction.

Tasks:

- Rewrite final plan around private reputation and private governance.
- Supersede the old DAO-suite master plan.
- Update canonical technical docs.
- Rewrite strategy docs to remove OBS-token-centric assumptions.
- Keep historical wave/progress docs as historical references only.

Exit criteria:

- No current planning doc recommends expanding Vote into a DAO megasuite.
- OBS is described as deployed beta eligibility, not the strategic center.

### V1. Safety Fixes Before UX Rewrite

Outcome: Vote can be trusted in private beta flows.

Tasks:

- In [useEncryptedVote.ts](frontend/obscura-os-main/src/hooks/useEncryptedVote.ts), wait for `publicClient.waitForTransactionReceipt` before `FHEStepStatus.READY`.
- In [useTreasury.ts](frontend/obscura-os-main/src/hooks/useTreasury.ts), make `useAttachSpend` wait for receipt before `FHEStepStatus.READY`.
- Confirm no Vote decrypt or permit request runs on mount.
- Add regression tests for receipt-gated success states.

Exit criteria:

- All Vote writes only show success after a confirmed successful receipt.

### V2. Shared Activity and Notifications

Outcome: Vote uses the same infra as Pay and Credit.

Tasks:

- Add Vote/Governor event support to [useActivityFeed.ts](frontend/obscura-os-main/src/hooks/useActivityFeed.ts).
- Add Vote aliases to notification preference code.
- Route Vote notifications to `/vote` in worker/API notification builders.
- Keep [useVoteActivity.ts](frontend/obscura-os-main/src/hooks/useVoteActivity.ts) as fallback until shared feed is verified.
- Add privacy tests: no option index, support label, reason text, amount, or raw Credit/Pay detail in pushed notifications.

Exit criteria:

- Vote activity appears in shared feed.
- Vote notifications open Vote and do not leak choices.

### V3. Four-Section UI Refactor

Outcome: Vote feels simple.

Tasks:

- Collapse [VotePage.tsx](frontend/obscura-os-main/src/pages/VotePage.tsx) tab state to `overview`, `proposals`, `participation`, `advanced`.
- Replace `Institutional governance` and `OBS - sealed` hero framing with simple private-vote copy.
- Move Treasury and Governor surfaces under Advanced Governance.
- Move Delegation and Rewards under Participation.
- Remove first-screen diagrams and repeated educational blocks.
- Keep mobile navigation to four items.

Exit criteria:

- The first viewport points users to private voting, not treasury/governor concepts.

### V4. Proposal Workflow Simplification

Outcome: users can vote without learning internal tabs.

Tasks:

- Make proposal list -> proposal detail -> cast/change/reveal the main path.
- Keep proposal creation available but secondary.
- Show revote affordance after first vote and before deadline.
- Add explicit user-triggered `Verify my vote` and `Reveal aggregate totals` controls.
- Keep proposal categories lightweight.

Exit criteria:

- A user can cast and change a vote in one proposal-detail flow.

### V5. Participation and Reputation

Outcome: participation becomes the reputation bridge.

Tasks:

- Use [useReputationSummary.ts](frontend/obscura-os-main/src/hooks/useReputationSummary.ts) in the Vote Participation surface.
- Show Pay, Credit, and Vote contribution categories as coarse tiers/counts only.
- Show `voterParticipation` and delegation state.
- Include rewards, but require user action for any private reveal.
- Avoid raw financial amounts, counterparties, and vote choices.

Exit criteria:

- Participation explains reputation without exposing private economic history.

### V6. Advanced Governance Containment

Outcome: powerful operations are available, but not distracting.

Tasks:

- Keep [GovernorPanel.tsx](frontend/obscura-os-main/src/components/vote/GovernorPanel.tsx) under Advanced Governance.
- Label Governor votes as public executable votes, distinct from encrypted private proposals.
- Keep Timelock, Treasury, and Streamer lifecycle details here.
- Place raw calldata and target details behind disclosure controls.
- Add irreversible-action confirmations for execute flows.

Exit criteria:

- Protocol operators can run Governor/Timelock actions without making Vote feel like a DAO console.

### V7. Production Hardening

Outcome: private beta quality.

Tasks:

- Playwright desktop and mobile coverage for four final sections.
- Two-wallet manual vote/revote/finalize/reveal runbook.
- Worker and notification privacy tests.
- Frontend receipt-state tests.
- Contract tests for encrypted voting, delegation, rewards, treasury, Governor, Timelock.
- Audit preparation notes.

Exit criteria:

- Vote is coherent enough for private beta, with mainnet launch still blocked by CoFHE mainnet readiness and audit.

## 5. Non-Goals

Do not build these during the final Vote pass:

- new governance contracts;
- new tokenomics;
- staking or locking systems;
- a new DAO home page;
- a forum;
- proposal sponsorship;
- grants management;
- sub-DAO creation;
- delegation marketplace;
- public voter analytics;
- automatic decrypt flows;
- cross-protocol profile pages that reveal Pay/Credit private details.

## 6. Required Acceptance Tests

Before marking the final Vote pass complete:

- desktop and mobile Playwright screenshots show only four top-level Vote sections;
- no horizontal overflow at 390px;
- cast vote waits for transaction receipt before success UI;
- attach spend waits for transaction receipt before success UI;
- no decrypt or permit prompt on page mount;
- Vote activity appears in shared activity feed;
- Vote notifications route to `/vote`;
- notification payloads do not include vote option/support labels;
- Participation shows shared reputation without raw Pay/Credit data;
- Advanced Governance clearly labels public Governor votes and executable actions.

## 7. Final Product Test

The final product passes when a user can say:

```text
I understand what is open for voting.
I can vote privately.
I can change my vote before the deadline.
I can see my participation and reputation context.
I can ignore advanced execution unless I am operating the protocol.
```

Anything that does not serve that outcome belongs outside the final Vote pass.
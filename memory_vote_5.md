# Obscura Vote Phase V0/V1 Implementation Log

Date: 2026-05-28

Scope: execute only Phase V0 documentation alignment and Phase V1 safety/shared infrastructure from `VOTE_FINAL_PLAN.md`.

## Browser-First Inspection

- Existing local app session inspected at `http://127.0.0.1:5175/vote` before implementation.
- Connected wallet: `0xf76e6b0920e9332ff4410f6dd53f01722abc71a3` on Arbitrum Sepolia `421614`.
- Overview still shows OBS-centric and governance-heavy copy; left for V2 because current scope is V0/V1 only.
- No active private proposals were available, so real cast/revote transaction verification is blocked without creating a new proposal.
- Explicit aggregate reveal worked for finalized proposal #1; final totals were shown without exposing individual ballots.
- Mobile 390px had no horizontal overflow, but first viewport density and six-item nav remain V2 issues.
- Browser console showed CORS failures from the Omnia Arbitrum Sepolia RPC endpoint used by frontend wagmi fallback.

## Implementation Decisions

- Keep local `useVoteActivity` watcher as fallback for now.
- Add Vote/Governor to the shared Supabase activity feed instead of creating a new activity system.
- Route Vote/Governor push notifications to `/vote` with generic bodies and preference aliases.
- Keep Governor `support` and `reason` out of notification payloads and rely on existing indexer sanitization.
- Remove only the browser-side Omnia RPC fallback; worker/server fallbacks remain unchanged.
- Add a shared Vote activity card to the existing Participation section without executing the V2 navigation collapse.

## Files Patched

- `frontend/obscura-os-main/src/hooks/useEncryptedVote.ts`: cast vote now waits for a successful receipt before `READY`.
- `frontend/obscura-os-main/src/hooks/useTreasury.ts`: `useAttachSpend` now waits for a successful receipt before `READY`.
- `frontend/obscura-os-main/src/components/vote/CreateProposalForm.tsx`: proposal success waits for confirmed receipt.
- `frontend/obscura-os-main/src/components/vote/TallyReveal.tsx`: finalize flow waits for confirmed receipt before refetching proposal state.
- `frontend/obscura-os-main/src/hooks/useActivityFeed.ts`: added `vote` filter and Vote/Governor event names.
- `frontend/obscura-os-main/src/components/harmony/ActivityFeed.tsx`: added Vote tab, icon, and privacy-safe labels.
- `frontend/obscura-os-main/src/pages/VotePage.tsx`: Participation now includes the shared Vote activity feed.
- `backend/obscura-worker/src/notifications.ts`: added Vote/Governor routing and aliases.
- `backend/obscura-api/src/notifications.ts`: mirrored Vote/Governor routing and aliases.
- `frontend/obscura-os-main/src/config/wagmi.ts`: removed CORS-broken frontend Omnia fallback endpoint.
- `frontend/obscura-os-main/src/test/vote-final-v1.test.ts`: added source regression gates for V1.

## Tx Hashes

- None generated in this implementation pass. Wallet transactions were not forced because no active proposal was available and the current task was V0/V1 infrastructure.

## Verification Log

- Passed: editor diagnostics on all touched frontend and backend files.
- Passed: focused Vitest suite `npm test -- src/test/vote-final-v1.test.ts` (6/6).
- Passed: full frontend Vitest suite `npm test` (26/26).
- Passed: frontend build `npm run build` with only pre-existing Browserslist/Rollup chunk warnings.
- Passed: backend API build `npm run build`.
- Passed: backend worker build `npm run build`.
- Passed: changed-file ESLint check for all V1 touched frontend files.
- Full frontend `npm run lint` remains blocked by existing repo-wide lint debt outside this patch; notable untouched areas include Credit components, UI primitives, old Vote files, and FHE utility types.
- Passed: Playwright existing-session reload at `http://127.0.0.1:5175/vote` showed no Omnia RPC CORS console messages or Omnia failed requests after the frontend wagmi fallback change.
- Passed: Playwright Participation check showed `Recent Vote activity`, `SHARED ACTIVITY`, and the empty shared Vote feed state.
- Passed: Playwright mobile viewport 390px check showed no horizontal overflow (`scrollWidth=380`, `clientWidth=380`).

## Remaining Blockers

- Real encrypted cast/revote cannot be manually verified until an active proposal exists and the connected wallet passes the deployed eligibility gate.
- V2 navigation collapse, first-viewport simplification, and OBS-centric UI copy cleanup are intentionally not executed in this V0/V1 pass.

## V2/V3 Pre-Implementation Live QA Retest

Date: 2026-05-28, after V0/V1 deploy.

- Existing local browser session reused at `http://127.0.0.1:5175/vote` with wallet `0xf76e6b0920e9332ff4410f6dd53f01722abc71a3` on Arbitrum Sepolia.
- Baseline reload showed wallet connected, OBS already claimed, and no Omnia/RPC/CORS failed requests or console errors.
- Normal Playwright/user-like clicks failed on desktop and mobile for key navigation/buttons (`New proposal`, sidebar `Proposals`, mobile proposal controls) because the layout/header/html layer intercepts pointer events; direct DOM clicks were required to continue QA.
- Created real proposal #5 `QA private vote 08:16:58 PM`; UI waited from wallet signing to `Proposal confirmed!`. Tx: `0x468d4e7a6455d7b69bed8470bed06483ef1ecb93c64bd517f9cb09bd24f4f1ff`.
- Encrypted cast/revote could not be fully tested with the single connected wallet: proposal #5 expired quickly and the app correctly blocks creators from voting on their own proposals. A second funded/eligible wallet or active non-self proposal is required.
- Finalized proposal #5 after deadline. The row changed to `Finalized — tally is publicly decryptable`, but the finalize tx link was not retained visibly after the state transition.
- Explicit `Decrypt Public Tally` worked for proposal #5 and showed aggregate-only `Yes 0`, `No 0`, `Total: 0 votes`; no individual ballot/support/reason leak was found.
- Delegation live-tested with temporary delegate `0x1111111111111111111111111111111111111111`; direct voting disabled while delegated. Tx: `0x6fcb89fb198f82f8dbcca9d0da6ec03e7ae16275d676ec4732e2484a7783e42f`.
- Delegation removal live-tested and returned to `Voting directly`. Tx: `0x85eb56d2432bf2d9a5081109b7a33f0838ffdd3a65e0280389ffcdca9eea7955`.
- Shared Vote activity realtime feed showed `Delegate selected` and `Delegation removed` with generic labels and tx links; no vote-choice leak detected.
- Rewards: `Earn rewards` produced no visible feedback when no eligible voted proposals existed. `Withdraw` correctly showed `Request Withdrawal` disabled at `0 ETH`. `Fund pool` succeeded with `0.0001 ETH`; reward pool read updated from `0.0020 ETH` to `0.0021 ETH`. Tx: `0xec6444fce15874fb5f0f066c23344925a4380081b133ca4a5db71b10a53dff0b`.
- Treasury: `Fund treasury` opens a `Deposit` action. Deposit of `0.0001 ETH` succeeded and treasury balance refreshed to `0.0001 ETH`. Tx: `0x949ba6052fbec2f27283cf2f5e6c8b7bff7873e02a55f141ff871a5b5b947891`.
- Treasury attach-spend form opened with proposal ID, recipient, and encrypted amount fields; not submitted because all available proposals were ended/finalized and forcing a spend attachment against finalized proposal state would likely be invalid.
- Notification preferences/test-push controls were not reachable from the Vote page; the global Settings button did not open a visible panel in this session.
- Desktop and mobile still show stale/cluttered copy: `Institutional governance · Confidential`, `OBS · sealed`, `Treasury`, `DAO · Treasury`, `All governance polls`, setup guide, and diagrams.
- Mobile 390px regressed from the earlier V1 check: no broad page scroll overflow, but SVG diagrams render at 640px wide and bottom nav labels overlap (`OvOverview`, `PrProposals`, etc.). First useful proposal workflow remains far below the first viewport.

## V2/V3 Implementation and Retest

Date: 2026-05-28, after V2/V3 patch.

- Scope executed only V2/V3: four-section Vote IA and proposal flow simplification. No duplicate systems were added.
- `VotePage.tsx` now uses four top-level sections: Overview, Proposals, Participation, and Advanced Governance. Treasury and Governor moved under Advanced, while Rewards, Delegation, and shared Vote activity moved under Participation.
- Overview copy simplified to private voting, revote-before-deadline, and aggregate reveal. Removed the default setup guide, diagrams, OBS claim framing, and governance-heavy hero language.
- Proposals now default to the voting path with secondary Create and Results modes. `CastVoteForm`, `CreateProposalForm`, `ProposalList`, and `TallyReveal` copy now emphasizes private choices, encrypted ballots, explicit aggregate reveal, and revote before deadline.
- `TallyReveal` now keeps the finalize transaction link visible outside the `canFinalize` branch after proposal state refresh.
- `RewardsPanel` now gives visible empty-state feedback for `Earn rewards` when no eligible finalized voted proposals exist.
- `TreasuryPanel` and `GovernorPanel` copy now frames those surfaces as advanced/public operator workflows, not primary Vote onboarding.
- `HarmonyAppShell` root/header/main layering was adjusted while debugging pointer interception. Header is now relative instead of sticky, the root uses an isolated stacking context, and main content has explicit local stacking.
- Added `src/test/vote-final-v2-v3.test.ts` source regression gates for four-section IA, removal of stale first-screen copy, proposal modes, and explicit reveal preservation.

## V2/V3 Browser Retest

- Existing local browser session reused at `http://127.0.0.1:5175/vote` with wallet `0xf76e6b0920e9332ff4410f6dd53f01722abc71a3`.
- Desktop reload showed the new four-section IA and simplified first viewport: `Private governance`, `Obscura Vote`, `Vote privately`, `Participation`, and tiles for Vote/Revote/Reveal.
- Stale default-path copy was not present after patch: no `Institutional governance`, `OBS · sealed`, `DAO · Treasury`, `All governance polls`, setup guide, or OBS claim prompt in the checked surfaces.
- Proposal modes verified in-browser: Vote privately, Create, and Results all render the intended focused copy and controls.
- Participation verified in-browser: Rewards, Delegation, and shared Vote activity appear together.
- Advanced Governance verified in-browser: Treasury and Governor appear only in the advanced section.
- Mobile 390x844 reload showed no wide elements or horizontal overflow and the bottom nav reduced cleanly to four readable items: Home, Vote, Profile, Advanced.
- The existing Playwright browser session has a coordinate-scaling issue: a pointer sent to `(1211,217)` arrives in-page near `(2084,373)`, causing raw locator/mouse clicks to hit `<html>`/nearby layers. With compensated coordinates and DOM event checks, the actual target buttons receive click events and route correctly. This appears to be a browser-session/tool coordinate mismatch rather than a React handler or DOM hit-target failure.
- Encrypted cast/revote is still blocked by available test state: the connected wallet created proposal #5 and creators cannot vote on their own proposal; currently there is no active non-self proposal for this wallet.

## V2/V3 Verification Log

- Passed: editor diagnostics on all V2/V3 touched frontend files.
- Passed: changed-file ESLint check for all V2/V3 touched frontend files.
- Passed: focused Vitest suite `npm test -- src/test/vote-final-v1.test.ts src/test/vote-final-v2-v3.test.ts` (9/9).
- Passed: full frontend Vitest suite `npm test` (29/29).
- Passed: frontend build `npm run build` with existing Browserslist/Rollup/chunk-size warnings only.

## V2/V3 Final Polish Pass

Date: 2026-05-29.

- Performed a targeted UI/UX audit only against remaining V2/V3 gaps. Did not re-test completed V0/V1 shared activity, notifications routing, receipt handling, reveal, delegation, rewards funding, or treasury funding transactions.
- Desktop audit confirmed the simplified four-section IA and no stale default-path copy (`Institutional governance`, `OBS · sealed`, `DAO · Treasury`, setup guide, OBS claim framing) in the checked Vote surfaces.
- Fixed primary voting reachability: the Overview `Vote privately` CTA and sidebar/mobile `Proposals` now open the actual `Cast Private Vote` flow instead of stopping at the proposal list. Proposal browsing remains available through `Review proposals` and secondary proposal actions.
- Fixed proposal-list clarity: proposal lists now default to active proposals and show an explicit note when no active proposals are available for the wallet, with `All` preserved for closed history and revealable results.
- Added post-vote UX controls in `CastVoteForm`: a confirmed vote can expose a user-triggered `Show my vote` local display and a `Change vote` path without auto-decrypting or leaking choices by default.
- Improved mobile hierarchy: the explanatory Vote/Revote/Reveal tile stack is hidden on mobile, bringing the privacy note and `Review proposals` action much higher. Mobile 390x844 retest showed no wide elements, no horizontal overflow, and four readable bottom-nav labels.
- Improved Rewards UX: clicking reward tabs now shows clear feedback; empty earn/withdraw states explain why no reward claim or withdrawal is ready instead of silently doing nothing.
- Added Vote notification UX using the existing shared notification hook and aliases: `VoteNotificationsPanel` exposes Enable push, Save Vote alerts, Repair browser, Test push, event categories, and privacy copy. It is visible in Participation and in a Vote settings drawer opened by the shared shell Settings button.
- Fixed Settings reachability for Vote by wiring `HarmonyAppShell` `onSettingsClick` and adding a Vote settings drawer. No new notification system was created.
- Browser verification after the patch confirmed: `Vote privately` renders `Cast Private Vote`, Create renders proposal creation, Results renders explicit aggregate reveal, Participation renders Rewards/Delegation/Activity/Vote notifications, Advanced renders Treasury/Governor only, and Vote settings renders notification controls.
- DOM center hit-tests for desktop buttons (`Vote privately`, `Participation`, `Review proposals`, proposal mode actions) land on the intended button elements; no app overlay or z-index blocker was found.
- The existing VS Code/Playwright browser session still has an external coordinate-scaling issue: a raw pointer sent to `(1211,217)` arrives in-page near `(2084,373)`, so locator clicks report `<html>` interception even when `elementFromPoint` at the real button center is correct. This is not caused by a visible app overlay after the shell layering fixes.
- Live encrypted cast/revote final validation remains blocked by scenario availability: the connected wallet created proposal #5 and creators cannot vote on their own proposals; no active non-self proposal is currently available. A second funded, OBS-eligible wallet or a proposal created by another wallet is required to complete this final transaction path.

## V2/V3 Final Verification Log

- Passed: editor diagnostics on all final V2/V3 touched frontend files.
- Passed: changed-file ESLint check for all final V2/V3 touched frontend files.
- Passed: focused Vitest suite `npm test -- src/test/vote-final-v1.test.ts src/test/vote-final-v2-v3.test.ts` (11/11).
- Passed: full frontend Vitest suite `npm test` (31/31).
- Passed: frontend build `npm run build` with existing Browserslist/Rollup/chunk-size warnings only.
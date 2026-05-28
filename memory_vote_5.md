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
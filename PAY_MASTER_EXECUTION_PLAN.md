# Obscura Pay - Lean Production Roadmap

> Version: v4, 2026-05-26
> Source of truth: [memory_pay_5.md](memory_pay_5.md), through W5P16.
> Scope: remaining work after Phase 4. Obscura Pay is already feature-rich; this roadmap is for production readiness, not expansion.

## Locked Product State

The product already has the core private-payments surface:

- Private Mode: ocUSDC/FHE wallet execution, direct private send, hidden receiving, private inbox, request links, streams, escrow, payroll, subscriptions, automations, activity feed, notifications.
- Public Mode: public USDC, Smart Account, ERC-4337, passkeys, paymaster, gasless send UX.
- Shared product shell: Harmony UX system, existing onboarding, existing routes, settings, activity, notification preferences, browser repair/test controls.
- Backend: `obscura-api`, `obscura-worker`, Supabase activity/push tables, worker-side push dispatch, chunked event indexing, optional credit keeper.
- Deployment targets: Vercel frontend, Render API, Render worker, Supabase project `quoovjkjwgtdqwdofubh`.

Non-negotiable architecture rules:

- Private ocUSDC/FHE writes stay wallet/EOA-executed. Encrypted `InEuint64` must never be forwarded through Smart Account.
- Public Mode is the Smart Account/paymaster lane for normal USDC only.
- No auto-decrypt on mount.
- Notification payloads must not reveal encrypted amounts.
- Worker notification failures must never stop indexing.
- Credit keeper remains opt-in with `KEEPER_ENABLED=true`; Pay indexing owns the default worker RPC budget.

---

## Remaining Essential Phases

| Priority | Phase | Keep | Success Criteria |
|---|---|---|---|
| P0 | Production Deploy And Env Parity | Deploy the W5P14-W5P16 worker/API/frontend changes. Ensure Render has real `RPC_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `INDEXER_DISPATCH_RECOVERED_DUPLICATES=true`, `KEEPER_ENABLED=false`, `KEEPER_DRY_RUN=true`, and <=10-block indexer chunk settings. | Worker health is stable, a new Pay event lands in `obscura_activity`, worker logs show queued/sent notification, browser `Repair browser` then `Test` produces a visible notification. |
| P0 | Indexer And Notification Reliability | Keep only reliability work around event indexing, duplicate catch-up notification dispatch, retry/backoff, stale subscription cleanup, service-worker delivery, and activity freshness. | Indexer survives RPC 429s and bad logs without crash loops; live catch-up works; duplicate rows can still trigger catch-up notification once per worker process; stale push endpoints are removed. |
| P0 | Security And Privacy Regression Gate | Audit existing Pay, Public Mode, Private Mode, API, worker, Supabase RLS, env exposure, push payloads, and FHE lifecycle rules. Fix only critical/high issues. | No Smart Account route can execute encrypted ocUSDC; no decrypt-on-mount; no service-role/VAPID secrets in frontend; private activity remains masked by default; RLS/prefs endpoints are scoped correctly. |
| P0 | End-To-End Test Gate | Add or run focused smoke coverage for the flows that already exist: Private direct send, stealth receive/inbox/sweep, request/invoice, streams, escrow, payroll, subscriptions, Public passkey setup, Public USDC send, paymaster sponsorship, activity feed, push notifications. | One clean checklist covers two-wallet, two-browser, mobile viewport, API health, worker health, Supabase table health, and `/sw.js`. Builds pass for frontend, API, worker, and changed contracts if any. |
| P1 | UX And Mobile Reliability Polish | Preserve Harmony, existing onboarding, existing routing, and current feature surfaces. Only tighten mobile layout, touch targets, empty/error states, notification permission copy, service-worker update behavior, and accessibility. | No IA rewrite, no new product surface, no broken deep links. Users can complete first private payment and notification setup on desktop and mobile without guessing. |
| P1 | Support, Status, And Local Export | Add minimal operator-facing and user-facing support around what already exists: deploy/runbook, visible service health, and user-triggered local activity export. | Support can diagnose API/worker/Supabase/push issues quickly. Export never uploads decrypted data and remains optional. |
| P2 | Mainnet Readiness Documentation | Prepare audit package, threat model, multisig/admin runbook, paymaster funding runbook, incident response, and mainnet deployment checklist. Do not broadcast mainnet until Fhenix CoFHE mainnet GA and audit gates pass. | Mainnet remains blocked by explicit external and security gates; no testnet state migration is promised. |

---

## Removed Scope

| Removed | Why Removed |
|---|---|
| Credit Score V3 / reputation expansion | Score V2 already proves the Pay-Credit-Vote thesis. New score contracts and market oracle/governance changes add risk without fixing production readiness. |
| New primitive contracts: claim links, proof registry, split-pay, disclosure, gift envelopes | The app already has request links, stealth receiving, inbox, escrow, payroll, subscriptions, and auditor UI pieces. New contracts expand attack surface and audit cost. |
| Balance proofs and selective disclosure as product features | Useful later, but not required for payments to work. They introduce legal/compliance and threshold-decrypt complexity before the core product is stable. |
| Vote-quality signals and Treasury Streamer DAO frontend | Governance integration exists. DAO grant tooling is not a blocker for a private payments app. |
| SDK package extraction | Premature without external integrators. Keep typed helpers inside the app until there is real consumer demand. |
| Dual passkey path with passphrase-encrypted P-256 keys | WebAuthn is already the supported passkey route. A second signer/recovery model increases support and security burden. |
| Cross-subdomain shared-storage hub | Not needed while claim/proof subdomains are removed. Avoid iframe storage complexity. |
| Roles and permissions / multi-user business accounts | Enterprise account management is outside the current production-readiness goal. |
| Global search and another IA rewrite | The current routing and Harmony shell are already implemented. More navigation redesign risks breaking working flows. |
| Full mobile PWA expansion: offline shell, camera QR scanner, haptics, native share, Add-to-Home prompts | Keep mobile reliability only. These are nice-to-have polish items, not production blockers. |
| PDF/accountant export and large help portal | Keep a small local export and support runbook. Avoid building a docs product inside the app. |
| Privacy telemetry/product analytics | Operational logs and health checks are enough. Product analytics risk collecting unnecessary behavioral data. |
| Broad UUPS conversion/storage-layout refactor across all contracts | No new contract work is planned. Do targeted security checks only unless an audited production fix requires a contract change. |
| Mainnet migration execution | Mainnet is blocked on Fhenix CoFHE GA plus audit. Keep documentation; do not plan a broadcast phase yet. |

---

## Priority Order

1. Ship the current W5P14-W5P16 deployment/env fixes.
2. Prove worker indexing and visible browser push on a fresh real event.
3. Lock the security/privacy regression gate around dual-mode execution.
4. Run the focused E2E checklist on existing features.
5. Polish mobile and notification UX without changing product shape.
6. Add minimal support/status/export tooling.
7. Prepare mainnet documentation only after the testnet product is stable.

## Hard Nos Until P0 Is Green

- No new contracts.
- No new routes unless required for support/status.
- No Smart Account path for encrypted ocUSDC.
- No decrypt-on-mount.
- No design-system rewrite.
- No Credit/Vote feature expansion.
- No enterprise roles, proof systems, disclosure systems, or new reputation scoring.

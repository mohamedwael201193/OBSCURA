# Obscura Pay Final Execution Plan

Version: final-focused, 2026-05-26
Scope: production readiness for Pay, plus integration with Credit, Vote, and the shared reputation layer.

This plan intentionally does not expand Pay. Pay is already the most complete product surface in Obscura. The remaining work is to make it reliable, understandable, observable, and reusable as the foundation for private reputation and private credit.

## 1. Product Decision

Pay is the anchor app.

Its job is not to become a payment superapp. Its job is to make private financial activity real enough that Credit and Vote can safely build on it.

The product thesis stays:

```text
Private Payments -> Private Reputation -> Private Creditworthiness -> Governance Weight
```

Pay owns the first two raw materials:

- private payment execution
- private receiving
- recurring payment history
- payroll and subscription participation
- escrow and invoice completion
- browser-local receipts
- indexed public event metadata that can become privacy-preserving reputation signals

Pay does not own lending, credit risk, liquidation policy, or governance policy.

## 2. Current Live State

### Stable and Preserve

These systems are already working or architecturally correct and must be preserved:

- Private Mode: wallet-executed encrypted `ocUSDC` flows.
- Stealth receiving through `ObscuraStealthRegistry` and inbox UI.
- Direct private send through canonical Pay `ocUSDC`.
- Request links, invoices, escrow, payroll, streams, subscriptions, and receivables.
- Harmony workspace shell and the six-tab Pay IA: Overview, Pay, Get Paid, Automations, Activity, Settings.
- Public Mode: public USDC, passkeys, ERC-4337 smart accounts, relay, paymaster, and sponsored gas UX.
- Notifications and activity feed backed by Supabase and the Render worker.
- Local receipts stored in the browser and exportable by the user.
- No auto-decrypt on mount.
- FHE client singleton and permit cache flow.
- Explicit Private Mode gate for encrypted workflows.

### Active Pay Contracts

Pay's canonical production contracts are:

| Area | Contract | Current role |
|---|---|---|
| Private stable asset | `OBSCURA_PAY_OCUSDC_ADDRESS` | Canonical Pay `ocUSDC`, backed by Circle USDC, supports `confidentialTransferFromHandle` |
| P2P/payroll base | `ObscuraPay` | Legacy payroll/payment event source, still indexed |
| Streams | `ObscuraPayStreamV3` | Active recurring private payments |
| Payroll resolver | `ObscuraPayrollResolverV3` | Active stream escrow resolver |
| Subscriptions | `ObscuraInsuranceSubscriptionV2` | Active recurring debit primitive |
| Escrow | `ObscuraConfidentialEscrow V2` | Active escrow and stream settlement target |
| Invoice | `ObscuraInvoice` | Active private invoice/request flow |
| Stealth | `ObscuraStealthRegistry` | Active meta-address and announcement registry |
| Address book | `ObscuraAddressBook` | Encrypted contacts, also reputation signal |
| Inbox index | `ObscuraInboxIndex` | Private receive indexing support |

Legacy V1/V2 Pay contracts remain read-only or fallback-only. They should not be used for new primary UX paths.

### Active Frontend Architecture

The current frontend structure is right and should stay:

- `PayPage.tsx` provides the app workspace.
- `PaymentModeContext` is the canonical switch between Public Mode and Private Mode.
- `PaymentModeBar` makes the execution lane visible.
- `PayHarmonyHome` drives onboarding and one primary CTA.
- `UnifiedSendForm`, `OcUSDCPanel`, `StealthInboxV2`, `RegisterMetaAddressForm`, stream, escrow, invoice, payroll, subscription, and activity components are the existing product surface.
- `useReceipts` is the browser-local private receipt ledger.
- `useActivityFeed` is the Supabase-backed indexed activity feed.
- `useNotificationPrefs` is the browser push and preference hook.
- `useSmartAccount`, `userop.ts`, `passkey.ts`, and `smartAccount.ts` are the Public Mode execution stack.

### Active Backend and Infra

The canonical backend topology is now:

| Service | Role | Platform |
|---|---|---|
| `obscura-api` | ERC-4337 relay, Web Push subscription API, notification prefs, debug push test | Render web service |
| `obscura-worker` | Pay event indexer, immediate worker-side Web Push dispatch, optional Credit keeper | Render web service with health endpoint |
| Supabase project `quoovjkjwgtdqwdofubh` | `obscura_activity`, push subscriptions, notification prefs | Supabase |
| Frontend | Vite app under `frontend/obscura-os-main` | Vercel |

The old service split (`obscura-pay-relay`, `obscura-pay-indexer`, `obscura-pay-notifications`) and old Supabase project names should be treated as historical references only.

### Known Implementation Gaps Found

These are not new features; they are cleanup required before Pay can be treated as the stable foundation:

- The frontend env currently points at the newer Paymaster v2 address, while some backend examples and Render config still reference the older paymaster. Align API, Render, frontend env, and docs on the current paymaster before Public Mode testing.
- Some docs still mention old backend roots or service names. The canonical paths are now `backend/obscura-api` and `backend/obscura-worker`.
- The current activity schema is Pay-centered. It should be generalized before Credit and Vote add events.
- Supabase RLS is permissive in places because the client filters by wallet. This is acceptable for testnet only and must be tightened or API-mediated before mainnet.
- API and worker both have notification dispatch paths. Worker dispatch should be the canonical immediate path; API realtime listener can remain redundancy.

## 3. Canonical Token Architecture

### Canonical Stable Assets

| Layer | Asset | Decision |
|---|---|---|
| Public wallet/smart account | Circle USDC on Arbitrum Sepolia | Canonical visible stable asset |
| Private Pay | Pay `ocUSDC` wrapper | Canonical private stable asset |
| Credit today | Credit faucet `ocUSDC` | Testnet continuity only, not final production stable asset |
| Credit final target | Pay-backed `ocUSDC` wrapper, or a single successor wrapper if a redeploy is unavoidable | Canonical private credit stable asset |

Pay must remain the owner of the real USDC-backed `ocUSDC` wrapper. Credit should converge toward that asset instead of creating more stable-token versions.

### Do Not Add More Pay Tokens

No new Pay token should be created unless the current wrapper has a demonstrated production-blocking bug that cannot be fixed in-place. The app already has too many historical `ocUSDC` references. The correct work is consolidation and labeling, not expansion.

### Public Mode vs Private Mode

Public Mode:

- token: public USDC
- execution: smart account/passkey/UserOp/paymaster
- privacy: visible on-chain
- scope: normal USDC sends and passkey setup

Private Mode:

- token: Pay `ocUSDC`
- execution: wallet/EOA
- privacy: encrypted amounts, private receive flows
- scope: send, receive, streams, escrow, payroll, subscriptions, invoices

Critical rule: encrypted `InEuint64` inputs must never be routed through the smart account. This is not a UX preference; it is a CoFHE signer-binding constraint.

## 4. Privacy Reasoning

Pay's privacy contract is:

- Amounts are encrypted before chain submission for private flows.
- Decryption is user-triggered only.
- Notifications never contain decrypted amounts.
- Worker activity rows store event metadata and participants, not decrypted balances.
- Browser receipts may contain human-entered local amounts, but they stay local and export is user-triggered.
- Indexer and notification payloads may include wallet participation because chain events already expose those addresses. They must not add new inference fields such as decrypted values, counterpart labels, notes, emails, or local receipt amounts.
- Stealth announcements are indexed for discoverability, but push messages must remain generic.

The acceptable split is:

| Data | Auto-load | Reason |
|---|---:|---|
| Public contract addresses, rates, network status | Yes | Not user-private |
| Indexed event metadata | Yes, wallet-filtered | Needed for activity and notifications |
| Encrypted balances | No | Requires explicit reveal |
| Local receipt amounts | No server upload | User-controlled local data |
| Reputation aggregates | Yes only as capped counts/tiers | Raw payment history stays hidden |

## 5. Shared System Boundary

Pay should stop being the only owner of infrastructure that all three apps need.

### Pay Owns

- Private and public payment flows.
- Pay `ocUSDC` wrapper UX: shield, unshield, balance reveal, transfer.
- Stealth receive setup and inbox.
- Streams, escrow, payroll, invoices, subscriptions, receivables.
- Browser-local payment receipts.
- Public Mode passkey onboarding UX.

### Shared Infrastructure Owns

- `obscura-api` and `/relay`.
- `obscura-worker` indexer framework.
- Supabase schema for activity, notification preferences, push subscriptions, and reputation-derived event summaries.
- Web Push service worker contract.
- Activity feed hook and event type taxonomy.
- Notification preferences and delivery helpers.
- FHE helpers, permit cache, reveal-on-demand hooks, gas preflight, transaction guard, and rate-limit helpers.
- Harmony app shell primitives.
- Smart account configuration, but only for public/non-FHE execution.

### Credit Owns

- Markets, vaults, collateral policy, repayment, score consumption, liquidation risk, keeper rules.

### Vote Owns

- Lightweight encrypted polls, participation, delegation, and executable proposal surface.

## 6. Remaining Execution Phases

Implementation order is binding:

1. Finish and stabilize Pay.
2. Build and finish Credit.
3. Integrate Pay with Credit.
4. Build lightweight Vote improvements.
5. Integrate Vote with the shared reputation layer.
6. Production hardening across all apps.

### P0.1: Production Deploy and Env Parity

Goal: make the deployed Pay stack match the current repo and memory state.

Tasks:

- Verify Vercel points to `frontend/obscura-os-main` and builds `dist`.
- Verify Render uses the current `backend/obscura-api` and `backend/obscura-worker` roots.
- Ensure Render secrets are set in the dashboard, not committed:
  - `BUNDLER_URL`
  - `BUNDLER_URL_FALLBACK`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `VAPID_PRIVATE_KEY`
  - `RPC_URL`
  - optional `RESEND_API_KEY`
  - optional `KEEPER_PRIVATE_KEY` only when keeper is intentionally enabled
- Ensure Vercel has all `VITE_*` vars from the frontend env structure, especially:
  - Pay contract addresses
  - smart account factory
  - current paymaster
  - relay URL
  - notification URL
  - Supabase URL and anon key
- Remove stale operator runbook references to old backend roots or old service names.

Success criteria:

- `GET /health` on API returns entry point and paymaster.
- `GET /health` on worker returns ok.
- `/sw.js` loads from the frontend origin.
- frontend can read VAPID public key from API.
- frontend activity tab loads without Supabase configuration errors.

### P0.2: Indexer and Notification Reliability

Goal: make indexed Pay activity and push alerts dependable enough that Credit and Vote can reuse the same pipeline.

Tasks:

- Keep `obscura-worker` as the canonical writer to `obscura_activity`.
- Keep block chunks at 10 or lower until RPC budget is upgraded.
- Keep retry/backoff around `getLogs` and log handling failures.
- Keep duplicate-row catch-up notification dispatch, but ensure it dispatches once per process per activity key.
- Add a small `indexer_status` or health summary table only if needed for support. Do not build a dashboard product.
- Ensure all notification bodies stay amount-free.
- Remove stale push subscriptions on 404/410.
- Keep API Realtime listener as optional redundancy; worker-side dispatch is the primary delivery path.

Success criteria:

- A fresh Pay event inserts exactly one `obscura_activity` row.
- The worker logs notification queued and either sent or explicitly skipped with a reason.
- The Settings notification Repair and Test buttons produce visible browser behavior on a subscribed browser.
- RPC 429s do not crash the worker loop.

### P0.3: Smart Account and Paymaster Stabilization

Goal: make Public Mode production-safe without touching Private Mode.

Tasks:

- Confirm the frontend uses the final WebAuthn smart account factory and rejects deprecated factory envs.
- Confirm the paymaster in Render and frontend are the same current address.
- Ensure UserOps wait for `/userop-receipt` and require `success=true` before showing success.
- Keep Public Mode limited to public USDC flows.
- Keep Private Mode encrypted flows wallet-only.
- Add test coverage around the no-fallback rule: Smart Mode must not silently fallback to EOA, and Private Mode must not attempt smart account execution.

Success criteria:

- Passkey setup, public USDC send, and sponsored UserOp succeed on a funded paymaster.
- A reverted UserOp surfaces as failure, not local success.
- Any attempt to send encrypted `ocUSDC` via smart account shows the explicit unsupported message.

### P0.4: Security and Privacy Regression Gate

Goal: freeze the privacy and execution invariants before Credit relies on Pay.

Tasks:

- Audit all Pay FHE writes for wallet execution and `waitForTransactionReceipt` behavior.
- Audit all reveal paths for explicit user action.
- Audit frontend copy for banned implementation jargon in user-facing UI.
- Audit push payloads and email payloads for amount leakage.
- Audit Supabase queries to ensure wallet filtering is always applied in the client query layer.
- Document the current RLS caveat: some policies are permissive because the frontend filters by wallet. Before mainnet, tighten policies with signed-wallet auth or move reads through the API.
- Verify no service role key or private key is present in frontend code or Vercel env.

Success criteria:

- No auto-decrypt on mount.
- No smart-account route for encrypted `ocUSDC`.
- No push/email/private activity payload contains decrypted amounts.
- No frontend bundle contains server-only secrets.

### P0.5: Focused End-to-End Test Gate

Goal: test the existing product, not imaginary new features.

Smoke checklist:

- Private direct send.
- Stealth receive setup.
- Stealth send announcement retry path.
- Inbox detection and sweep.
- Request/invoice create and pay.
- Stream create and tick.
- Escrow create, fund, redeem/cancel.
- Payroll batch creation where supported.
- Subscription create and consume.
- Public passkey setup.
- Public USDC send through UserOp.
- Paymaster sponsorship.
- Activity feed insert and refresh.
- Push notification subscribe, repair, and test.
- Mobile viewport for Pay, Get Paid, Activity, Settings.

Commands:

- Frontend build: `npm run build` in `frontend/obscura-os-main`.
- API build: `npm run build` in `backend/obscura-api`.
- Worker build: `npm run build` in `backend/obscura-worker`.
- Hardhat compile only if contracts change.

### P1.1: Shared Reputation Event Foundation

Goal: let Credit and Vote consume Pay behavior without exposing raw payment history.

Add a derived, shared schema. Do not replace `obscura_activity`.

Suggested table:

```sql
obscura_reputation_events
  id bigserial primary key
  wallet text not null
  source_app text not null check (source_app in ('pay','credit','vote'))
  signal_type text not null
  signal_weight integer not null default 1
  event_ref bigint references obscura_activity(id)
  public_context jsonb not null default '{}'
  created_at timestamptz not null default now()
```

Rules:

- Store capped signals, not amounts.
- Store event categories, not local notes.
- Store counterparties only if they already appear in public event participants.
- Never store decrypted balances.
- Use this table first for UX and analytics. Do not make it govern credit terms until it has stable data.

Initial Pay signals:

| Signal | Source | Meaning |
|---|---|---|
| `private_payment_sent` | `ObscuraPay`, token transfers, stealth announcements | User actively sends private payments |
| `private_payment_received` | stealth announcement/inbox claim | User receives private payments |
| `stream_created` | `ObscuraPayStreamV3.StreamCreated` | User maintains recurring obligations |
| `stream_cycle_settled` | `CycleSettled` | Recurring obligation is being honored |
| `escrow_redeemed` | escrow events | Agreement completed |
| `invoice_paid` | invoice events | Request/payment completed |
| `subscription_consumed` | subscription events | Recurring debit behavior |

### P1.2: Mobile and PWA Polish

Goal: make the existing flows completeable on a phone.

Tasks:

- Verify Pay tabs with the mobile bottom nav.
- Fix overflow in tables, selectors, and action rows.
- Keep touch targets stable.
- Ensure notification permission copy is short and browser-native.
- Ensure service-worker update behavior does not strand old push payload formats.
- Keep onboarding one primary CTA per state.

No new PWA scope such as QR scanner, haptics, camera upload, or offline wallet shell until P0 is green.

### P2: Production Runbook and Mainnet Readiness

Goal: be ready without pretending CoFHE mainnet exists.

Tasks:

- Publish an operator runbook for API, worker, Supabase, Vercel, paymaster, and worker RPC.
- Add incident response for push failures, RPC 429s, paymaster drain, and Supabase downtime.
- Document a privacy matrix for Pay.
- Document mainnet blockers: CoFHE mainnet GA, audit, multisig/admin transfer, paymaster funding, tighter RLS/auth, contract verification.

## 7. Pay to Credit Integration

Pay should feed Credit through shared infrastructure, not bespoke hooks.

Near term:

- Credit reads Pay activity from `obscura_activity` and `obscura_reputation_events`.
- Credit UI explains that Pay activity can improve a reputation tier without showing raw payments.
- Credit continues to use `ObscuraCreditScoreV2` on-chain until a ScoreV3 is truly needed.
- Pay streams and subscriptions are counted as regularity signals, but not as direct collateral.

Later, only after data stabilizes:

- Consider a minimal score oracle upgrade through Credit's existing mutable `scoreOracle` seam.
- The oracle should expose only encrypted score and public tier bucket.
- Raw Pay history must not become public credit underwriting data.

## 8. Pay to Vote Integration

Pay should not become governance software.

Pay contributes to Vote by:

- providing activity signals for reputation-weighted participation;
- routing users to Vote when a governance action matters;
- allowing DAO treasury streams to use Pay infrastructure where already deployed;
- sending notifications for Pay-related governance events only through the shared notification system.

Pay should not add DAO treasury dashboards, proposal builders, role systems, or governance analytics.

## 9. What Becomes Canonical

Canonical now:

- Pay `ocUSDC` wrapper is the private stable asset.
- `PaymentModeContext` is the execution-lane authority.
- `obscura-api` is the relay and notification API.
- `obscura-worker` is the indexer and immediate notification dispatcher.
- Supabase project `quoovjkjwgtdqwdofubh` is the active backend datastore.
- Harmony shell is the shared app shell.
- `useActivityFeed` is the shared activity read model.
- `useNotificationPrefs` is the shared notification preference model.
- `useFHEStatus`, FHE helpers, reveal-on-demand hooks, gas and tx guards are shared FHE infrastructure.

## 10. What Should Be Removed or Archived

Do not delete live contract references required for historical reads. Remove from primary UX and operator docs instead.

Archive/de-emphasize:

- Old Render service names and old package paths.
- Old Supabase project references.
- Old smart account factories and old paymaster address in docs/env examples.
- Legacy PayStream V2 and subscription V1 from default creation flows.
- Stale Settings routes that duplicate PayPage Settings if they are no longer linked.
- Any future-roadmap doc entries that propose claim-link/proof/disclosure/payment feature expansion before P0 hardening.

Keep read-only:

- Legacy contract ABIs needed for old user history.
- Historical activity indexer entries for V2 contracts.
- Local receipts and exports.

## 11. Production Blockers

Pay is not production-ready until these are resolved:

- Render and Vercel env parity is verified.
- Worker can index live events without crash loops.
- Push notifications work from a real event, not only debug push.
- Paymaster address is consistent across frontend, API, and Render.
- UserOp receipt success is enforced in all Public Mode flows.
- Supabase RLS/auth model is tightened or formally accepted for testnet only.
- No server-only secret appears in frontend, docs, or committed env examples.
- A focused E2E checklist is green on desktop and mobile.

## 12. Migration Strategy

### Backend Migration

- Keep the current Supabase project.
- Do not split separate Credit/Vote databases.
- Add shared tables through migrations under `backend/obscura-worker/migrations` or a new shared `backend/migrations` folder.
- Backfill reputation events from `obscura_activity` idempotently.

### Frontend Migration

- Keep Pay IA unchanged.
- Move reusable hooks from Pay naming into shared naming only when multiple apps consume them.
- Keep backwards-compatible exports during the migration.

### Contract Migration

- No new Pay contracts.
- No Pay token redeploy unless the current wrapper has a verified production-blocking bug.

## 13. Testing Strategy

Required tests before handing Pay off as foundation:

- Unit or hook-level tests for payment mode routing.
- Integration tests for smart account gas estimates and receipt success.
- Worker tests for duplicate insert, duplicate catch-up notification, stale subscription deletion, and RPC chunk retry.
- Manual two-wallet test for private send and stealth receive.
- Manual browser-push test on a fresh browser profile.
- Mobile viewport screenshots for Pay primary flows.

## 14. Final Pay North Star

Pay is done when a user can:

1. get public USDC;
2. shield it into Pay `ocUSDC`;
3. send or receive privately;
4. set up recurring private financial activity;
5. receive reliable activity and notification feedback;
6. use that activity as privacy-preserving reputation for Credit;
7. do public, gasless USDC sends through passkeys without ever confusing that with encrypted private finance.

Everything else waits.

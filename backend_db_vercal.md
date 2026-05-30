# Obscura Pay Backend, Database, and Deployment Runbook

This runbook covers the current Pay production topology for P0.1/P0.2. Only the current `obscura-api` and `obscura-worker` services should be used for active deploys.

## Canonical Services

| Layer | Current value |
|---|---|
| Frontend | `https://obscuraos.online` |
| Frontend root | `frontend/obscura-os-main` |
| Frontend build | `npm run build` -> `dist` |
| API | `https://obscura-api-n62v.onrender.com` |
| API root | `backend/obscura-api` |
| Worker | `https://obscura-worker-0ppj.onrender.com` |
| Worker root | `backend/obscura-worker` |
| Supabase project | `quoovjkjwgtdqwdofubh` |
| Supabase URL | `https://quoovjkjwgtdqwdofubh.supabase.co` |
| Chain | Arbitrum Sepolia, chain id `421614` |
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| Smart account factory | `0xFaC683D8AB872cCf5eBfaE1659a9CD44C6FB4feB` |
| Current paymaster | `0x7a8D880D9c5F88Ba8bd4435c450256628F66dd0C` |

## Architecture

The browser talks to the unified API for public UserOps and notification registration. It reads Pay activity directly from Supabase with the anon key and wallet filtering. The worker is the canonical writer to `obscura_activity` and the primary immediate Web Push dispatcher.

```text
Frontend (Vercel)
  | POST /relay, /subscribe, /prefs, /debug/push-test
  v
obscura-api (Render web service)
  | eth_sendUserOperation / eth_getUserOperationReceipt
  v
Bundler -> EntryPoint -> Arbitrum Sepolia

obscura-worker (Render web service)
  | chunked eth_getLogs, retry/backoff
  v
Supabase obscura_activity
  | worker-side push dispatch, API realtime fallback
  v
Browser service worker /sw.js
```

## Render Configuration

Render reads `render.yaml` from the repository root and creates two web services:

| Service | Root | Health |
|---|---|---|
| `obscura-api` | `backend/obscura-api` | `GET /health` returns `status`, `entryPoint`, and `paymaster` |
| `obscura-worker` | `backend/obscura-worker` | `GET /health` returns `status`, indexer health, and keeper enablement |

### API Environment

Non-secret values are committed in `render.yaml`:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `ALLOWED_ORIGINS` | `https://obscuraos.online,https://www.obscuraos.online` |
| `FRONTEND_URL` | `https://obscuraos.online` |
| `PAYMASTER_ADDRESS` | `0x7a8D880D9c5F88Ba8bd4435c450256628F66dd0C` |
| `SUPABASE_URL` | `https://quoovjkjwgtdqwdofubh.supabase.co` |
| `VAPID_CONTACT_EMAIL` | `noreply@obscura.finance` |
| `VAPID_PUBLIC_KEY` | public VAPID key used by the frontend subscription flow |

Set these secrets manually in the Render dashboard:

| Variable | Required | Notes |
|---|---:|---|
| `BUNDLER_URL` | Yes | Primary Arbitrum Sepolia bundler/RPC endpoint |
| `BUNDLER_URL_FALLBACK` | Yes | Fallback bundler endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key for `quoovjkjwgtdqwdofubh` |
| `VAPID_PRIVATE_KEY` | Yes | Must match the committed public VAPID key |
| `RESEND_API_KEY` | Optional | Email notification delivery |

### Worker Environment

Non-secret values are committed in `render.yaml`:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `SUPABASE_URL` | `https://quoovjkjwgtdqwdofubh.supabase.co` |
| `FRONTEND_URL` | `https://obscuraos.online` |
| `VAPID_CONTACT_EMAIL` | `noreply@obscura.finance` |
| `VAPID_PUBLIC_KEY` | public VAPID key used by the API/frontend |
| `INDEXER_GETLOGS_CHUNK_BLOCKS` | `10` |
| `INDEXER_GETLOGS_RETRIES` | `3` |
| `INDEXER_GETLOGS_RETRY_BASE_MS` | `1000` |
| `INDEXER_LIVE_POLL_MS` | `5000` |
| `INDEXER_LIVE_RETRY_MAX_MS` | `30000` |
| `INDEXER_STARTUP_RECENT_BLOCKS` | `5000` |
| `INDEXER_BACKGROUND_BACKFILL_DELAY_MS` | `15000` |
| `INDEXER_DISPATCH_RECOVERED_DUPLICATES` | `true` |
| `REPUTATION_EVENTS_ENABLED` | `true` |
| `REPUTATION_BACKFILL_ON_START` | `true` |
| `REPUTATION_BACKFILL_LIMIT` | `500` |
| `KEEPER_ENABLED` | `false` |
| `KEEPER_DRY_RUN` | `true` |

Set these secrets manually in the Render dashboard:

| Variable | Required | Notes |
|---|---:|---|
| `RPC_URL` | Yes | Arbitrum Sepolia RPC. Current indexer chunks logs at 10 blocks or lower. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key for `quoovjkjwgtdqwdofubh` |
| `VAPID_PRIVATE_KEY` | Yes | Same VAPID private key used by `obscura-api` |
| `KEEPER_PRIVATE_KEY` | Optional | Only set when `KEEPER_ENABLED=true` intentionally shares worker RPC quota |

## Vercel Configuration

The Vercel project must use:

| Setting | Value |
|---|---|
| Root directory | `frontend/obscura-os-main` |
| Install command | `npm install --legacy-peer-deps` |
| Build command | `npm run build` |
| Output directory | `dist` |

Required dashboard variables include every `VITE_*` value from `frontend/obscura-os-main/.env`, especially:

| Variable | Current value |
|---|---|
| `VITE_RELAY_URL` | `https://obscura-api-n62v.onrender.com` |
| `VITE_NOTIFICATIONS_URL` | `https://obscura-api-n62v.onrender.com` |
| `VITE_SUPABASE_URL` | `https://quoovjkjwgtdqwdofubh.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key for `quoovjkjwgtdqwdofubh` |
| `VITE_SMART_ACCOUNT_FACTORY_ADDRESS` | `0xFaC683D8AB872cCf5eBfaE1659a9CD44C6FB4feB` |
| `VITE_PAYMASTER_ADDRESS` | `0x7a8D880D9c5F88Ba8bd4435c450256628F66dd0C` |
| `VITE_OBSCURA_PAY_OCUSDC_ADDRESS` | `0xEd46020Df8abe7BB1E096f27d089F4326D223a53` |

Do not set server-only secrets in Vercel.

## Supabase Tables

The active project contains:

| Table | Role |
|---|---|
| `obscura_activity` | Worker-written indexed Pay events; unique by `(tx_hash, log_index)` |
| `obscura_reputation_events` | Worker-written derived Pay reputation signals; capped categories only, unique by `(wallet, source_app, signal_type, event_ref)` |
| `obscura_push_subscriptions` | Browser Web Push subscriptions keyed by wallet |
| `obscura_notification_prefs` | Per-wallet push/email preferences and event filters |

The testnet RLS model is permissive in places and relies on wallet-filtered frontend reads. Treat that as acceptable for testnet only; tighten wallet-auth policies or API-mediated reads before mainnet.

Reputation rows must not store amounts, notes, labels, decrypted balances, or private counterpart metadata. The public API exposes only aggregate Pay counts, capped score, and tier at `GET /reputation/:wallet`.

## Notification Reliability Contract

- `obscura-worker` is the primary dispatcher immediately after a fresh activity insert.
- `obscura-api` keeps the Supabase Realtime listener as optional redundancy.
- Notification payloads include event metadata, activity id, transaction hash, and wallet participation only.
- Notification and email bodies must not include decrypted amounts, local receipt amounts, notes, labels, or private counterpart metadata.
- Stale Web Push subscriptions are removed on 404/410 from the push service.
- Browser repair/test lives in Pay Settings -> Notifications.

## Local Development

```powershell
# API
Push-Location backend/obscura-api
Copy-Item .env.example .env
npm install
npm run dev
Pop-Location

# Worker
Push-Location backend/obscura-worker
Copy-Item .env.example .env
npm install
npm run dev
Pop-Location
```

For local frontend testing, use `VITE_RELAY_URL=http://localhost:3000` and `VITE_NOTIFICATIONS_URL=http://localhost:3000`.

## Production Smoke Checks

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\test-e2e.ps1
```

Manual checks:

1. `GET https://obscura-api-n62v.onrender.com/health` returns the v0.7 EntryPoint and current paymaster.
2. `GET https://obscura-worker-0ppj.onrender.com/health` returns `status=ok` and `indexer.chunkSize <= 10`.
3. `GET https://obscuraos.online/sw.js` returns HTTP 200.
4. `GET https://obscura-api-n62v.onrender.com/vapid-public-key` returns the public VAPID key.
5. Pay Activity loads for a connected wallet without Supabase configuration errors.
6. Settings -> Notifications -> Repair browser refreshes the current browser subscription.
7. Settings -> Notifications -> Test produces a visible browser notification on a subscribed browser.
8. `GET https://obscura-api-n62v.onrender.com/reputation/0x0000000000000000000000000000000000000001` returns a Pay aggregate response.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| API health paymaster is old | Render `PAYMASTER_ADDRESS` still stale | Update Render env/YAML to current paymaster and redeploy `obscura-api` |
| Public UserOp fails before submission | Bundler env missing or invalid | Check `BUNDLER_URL` and `BUNDLER_URL_FALLBACK` in Render |
| Worker health is down | Missing worker secrets or cold start | Check `RPC_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and Render logs |
| RPC 429s appear | RPC budget exhausted | Keep chunks at 10 or lower, keep keeper disabled unless needed, upgrade RPC if needed |
| Push test sends but no browser notification appears | Browser endpoint stale or OS/browser blocked notifications | Use Repair browser, confirm site/OS notifications, test from the active profile |
| Activity feed is empty | No indexed rows or Supabase env mismatch | Check worker logs and Vercel `VITE_SUPABASE_*` values |
# Obscura — Backend, Database & Vercel Architecture

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                                    │
│  Frontend (Vite + React Router + wagmi v2)                              │
│  https://obscura-os-nine.vercel.app                                     │
└─────────┬──────────────────────┬───────────────────┬────────────────────┘
          │                      │                   │
          │ POST /relay          │ POST /subscribe   │ Supabase JS
          │ GET  /health         │ GET  /vapid-pk    │ Realtime
          ▼                      ▼                   ▼
┌──────────────────────┐   ┌─────────────────────────────────────────────┐
│   obscura-api        │   │          Supabase (woqfefgrkpleedsuxavd)    │
│   Render Web Service │   │  ┌────────────────────────────────────────┐ │
│   apps/obscura-api   │◄──┤  │  obscura_activity (indexed events)     │ │
│                      │   │  │  obscura_push_subscriptions            │ │
│  ┌────────────────┐  │   │  │  obscura_notification_prefs            │ │
│  │  relay.ts      │  │   │  └────────────────────────────────────────┘ │
│  │  POST /relay   │  │   │  RLS: anon can read own wallet rows         │
│  └────────┬───────┘  │   │  service_role: full read/write (backend)    │
│           │           │   └────────────────────┬────────────────────────┘
│  ┌────────▼───────┐  │                         │ Realtime (postgres_changes)
│  │notifications.ts│  │◄────────────────────────┘
│  │ Realtime sub   │  │   INSERT trigger on obscura_activity
│  │ Web Push send  │  │
│  │ Resend email   │  │
│  └────────────────┘  │
└──────────┬───────────┘
           │ eth_sendUserOperation
           ▼
┌──────────────────────────────────────────────────────────┐
│  Alchemy Bundler (primary)                               │
│  https://arb-sepolia.g.alchemy.com/v2/g89_KwJ9...       │
│                                                          │
│  Pimlico Bundler (fallback on primary failure)           │
│  https://api.pimlico.io/v2/421614/rpc?apikey=pim_bXT... │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
          Arbitrum Sepolia (chainId 421614)
          EntryPoint: 0x0000000071727De22E5E9d8BAf0edAc6f37da032
          SmartAccountFactory: 0xbe8dC1d4Dcc368e0dBb6c7A5BDFfac2Fe72AFd05
          Paymaster: 0x9B1F61A65467F11339A8d0834349Be32EB2CF878

┌──────────────────────┐
│  obscura-worker      │
│  Render Worker       │
│  apps/obscura-worker │
│                      │
│  ┌────────────────┐  │
│  │ indexer/       │  │──► eth_getLogs + watchEvent
│  │ Backfill on    │  │    (6 contract addresses)
│  │ start, then    │  │
│  │ live watch     │  │──► INSERT obscura_activity (Supabase)
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │ keeper/        │  │──► readContract (borrowersLength, getPlainBorrow...)
│  │ Scan borrowers │  │    computeHfBps (off-chain, plaintext shadows)
│  │ every 30s      │  │──► writeContract: liquidationOpen(), settle()
│  └────────────────┘  │    (disabled if KEEPER_PRIVATE_KEY not set)
└──────────────────────┘
```

---

## Services

### 1. `obscura-api` — Render Web Service

**Source:** `apps/obscura-api/`  
**URL:** `https://obscura-api.onrender.com`  
**Health:** `GET https://obscura-api.onrender.com/health`

Replaces two old services: `obscura-pay-relay` + `obscura-pay-notifications`

| Route | Method | Description |
|---|---|---|
| `/health` | GET | Healthcheck — returns entryPoint + paymaster addresses |
| `/relay` | POST | Forward ERC-4337 PackedUserOp to Alchemy bundler |
| `/vapid-public-key` | GET | Returns VAPID public key for browser push subscription |
| `/subscribe` | POST | Save a Web Push subscription (wallet + endpoint) |
| `/subscribe` | DELETE | Remove a push subscription |
| `/prefs` | POST | Update notification preferences (web_push, email, email_address) |
| `/prefs/:wallet` | GET | Get notification preferences for a wallet |

**Background:** `startNotificationListener()` subscribes to Supabase Realtime on `obscura_activity` INSERT events. When a new event arrives, it dispatches Web Push to the wallet (if subscribed) and sends a Resend email (if enabled in prefs).

**Environment variables:**

| Variable | Value | Secret |
|---|---|---|
| `NODE_ENV` | `production` | No |
| `PORT` | `3000` | No |
| `ALLOWED_ORIGINS` | `https://obscura-os-nine.vercel.app` | No |
| `PAYMASTER_ADDRESS` | `0x9B1F61A65467F11339A8d0834349Be32EB2CF878` | No |
| `BUNDLER_URL` | `https://arb-sepolia.g.alchemy.com/v2/g89_KwJ9ARUpVNY0upgCk` | No |
| `BUNDLER_URL_FALLBACK` | `https://api.pimlico.io/v2/421614/rpc?apikey=pim_bXTiDpX8oPrJjZ4GY5vAmU` | No |
| `SUPABASE_URL` | `https://woqfefgrkpleedsuxavd.supabase.co` | No |
| `SUPABASE_SERVICE_ROLE_KEY` | *(from Supabase dashboard)* | **YES** |
| `VAPID_CONTACT_EMAIL` | `noreply@obscura.finance` | No |
| `VAPID_PUBLIC_KEY` | `BIgVcwUhCL93WVMnDdRT9KqySwDS4Sm9C-fSLg4dWJRdddSuLbyDv_M9R5FmDi2F8NwDuKuMtvNiZAwZQ0RH86o` | No |
| `VAPID_PRIVATE_KEY` | `WqDC2gqeKfnK0Z-2rD6l1_XR8i05bvKJdQRu04x7gKM` | **YES** |
| `RESEND_API_KEY` | *(from Resend dashboard)* | **YES** |

---

### 2. `obscura-worker` — Render Background Worker

**Source:** `apps/obscura-worker/`

Replaces two old services: `obscura-pay-indexer` + `credit-keeper` (ESM package)

**Indexer contracts watched:**

| Contract | Address |
|---|---|
| ObscuraPay | `0x91CdD9a481C732bEB09Ce039da23DC11e83547a4` |
| ObscuraPayStreamV3 | `0xE4328F139F03138D63f7fdF90A8Ef240e04653fA` |
| ObscuraInvoice | `0x62a86C8d68fF32ea41Faf349db6EF7EF496620b7` |
| ObscuraConfidentialEscrow | `0x293810A2081114CcE0c98A709a0c31aE07c01D75` |
| ObscuraInsuranceSubscriptionV2 | `0xEA9Fc5800F41d090dFB90f9735F4CF3824d6743D` |
| ObscuraStealthRegistry | `0xa36e791a611D36e2C817a7DA0f41547D30D4917d` |
| ObscuraPayStreamV2 *(legacy)* | `0xb2fF39C496131d4AFd01d189569aF6FEBaC54d2C` |
| ObscuraInsuranceSubscription *(legacy)* | `0x0CCE5DA9E447e7B4A400fC53211dd29C51CA8102` |

**Keeper markets:**

| Market | Address |
|---|---|
| CUSDC/CUSDC (M316) | `0x269f59672F3fd7f95bF440941e618b54Ebc5717A` |
| M86 | `0xcf98d97934F37Ac9A05bc037437E43cb6788eC8b` |
| M70 WETH | `0x0b645441D65A0CCb91A82b5a2eE3156C1c89207B` |
| M50 OBS | `0x05e58B8D96Bbd752A72Fa02921A0eE31eCB9035d` |

**Environment variables:**

| Variable | Value | Secret |
|---|---|---|
| `NODE_ENV` | `production` | No |
| `RPC_URL` | `https://arb-sepolia.g.alchemy.com/v2/g89_KwJ9ARUpVNY0upgCk` | No |
| `SUPABASE_URL` | `https://woqfefgrkpleedsuxavd.supabase.co` | No |
| `SUPABASE_SERVICE_ROLE_KEY` | *(from Supabase dashboard)* | **YES** |
| `CHAINLINK_ETHUSD_ADAPTER` | `0xe3E388b421bfcF558FD46a18eE3b1c27aD1D36B3` | No |
| `CHAINLINK_USDCUSD_ADAPTER` | `0xc65e85926Cb29aaEC74f99cF1591CBa65daa2c4A` | No |
| `KEEPER_AUCTION` | `0x205FfC0A3b8207B645c1a6B1b4805eb3FfC828F0` | No |
| `KEEPER_MARKETS` | `0x269f59...,...` | No |
| `KEEPER_DRY_RUN` | `false` | No |
| `KEEPER_POLL_MS` | `30000` | No |
| `KEEPER_HF_THRESHOLD_BPS` | `10000` | No |
| `KEEPER_MAX_GAS_GWEI` | `2` | No |
| `KEEPER_PRIVATE_KEY` | *(keeper EOA private key)* | **YES** |

---

## Database (Supabase)

**Project:** `woqfefgrkpleedsuxavd`  
**URL:** `https://woqfefgrkpleedsuxavd.supabase.co`  
**Region:** us-east-1

### Tables

#### `obscura_activity`
Stores all on-chain events indexed by the worker.

```sql
CREATE TABLE obscura_activity (
  id               BIGSERIAL PRIMARY KEY,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  chain_id         INT NOT NULL,
  block_number     NUMERIC NOT NULL,
  tx_hash          TEXT NOT NULL,
  log_index        INT NOT NULL,
  contract_address TEXT NOT NULL,
  event_name       TEXT NOT NULL,
  wallet           TEXT NOT NULL,          -- primary wallet (lowercase)
  participants     TEXT[] NOT NULL,         -- all addresses in the event
  args             JSONB NOT NULL,          -- raw event args (bigints as strings)
  UNIQUE (tx_hash, log_index)
);

-- Index for wallet activity feed (used by frontend)
CREATE INDEX obscura_activity_wallet_idx ON obscura_activity(wallet);
-- Index for keeper to look up last indexed block per contract
CREATE INDEX obscura_activity_contract_block_idx ON obscura_activity(contract_address, block_number DESC);
```

#### `obscura_push_subscriptions`
Stores browser Web Push subscriptions.

```sql
CREATE TABLE obscura_push_subscriptions (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  wallet     TEXT NOT NULL,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  UNIQUE (wallet, endpoint)
);
```

#### `obscura_notification_prefs`
Per-wallet notification preferences.

```sql
CREATE TABLE obscura_notification_prefs (
  wallet        TEXT PRIMARY KEY,
  web_push      BOOLEAN DEFAULT TRUE,
  email         BOOLEAN DEFAULT FALSE,
  email_address TEXT
);
```

### Row Level Security (RLS)

RLS is enabled on all tables. Key policies:

- **`obscura_activity`**: anon role can `SELECT` rows where `wallet = auth.uid()` or where `auth.uid() = ANY(participants)`. Backend (service_role) bypasses RLS.
- **`obscura_push_subscriptions`**: anon role can SELECT/INSERT/DELETE own wallet rows.
- **`obscura_notification_prefs`**: anon role can SELECT/UPDATE own wallet row.

**Important:** The frontend uses the **anon key** (`VITE_SUPABASE_ANON_KEY`) — safe to expose because RLS limits access.  
The backend uses the **service_role key** (`SUPABASE_SERVICE_ROLE_KEY`) — NEVER expose this in the frontend.

### Realtime

The `obscura-api` service subscribes to Supabase Realtime:
```
postgres_changes → INSERT on obscura_activity
```
When the worker inserts a new event, Supabase broadcasts it to `obscura-api` which dispatches push notifications.

---

## Frontend (Vercel)

**Repository:** `frontend/obscura-os-main/`  
**Framework:** Vite 5 + React Router 6  
**URL:** `https://obscura-os-nine.vercel.app`

### Environment Variables (Vercel Dashboard)

Set all `VITE_*` variables in Vercel → Project → Settings → Environment Variables.

**Critical URLs (updated for v2 architecture):**

| Variable | Value |
|---|---|
| `VITE_RELAY_URL` | `https://obscura-api.onrender.com` |
| `VITE_NOTIFICATIONS_URL` | `https://obscura-api.onrender.com` |
| `VITE_SUPABASE_URL` | `https://woqfefgrkpleedsuxavd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` (full anon key — safe to expose) |

All other contract address variables are in `frontend/obscura-os-main/.env`.

### How Frontend Connects to Each Service

| Frontend action | Endpoint | Service |
|---|---|---|
| Submit a transaction (ERC-4337) | `POST VITE_RELAY_URL/relay` | obscura-api |
| Subscribe to push notifications | `POST VITE_NOTIFICATIONS_URL/subscribe` | obscura-api |
| Get VAPID public key | `GET VITE_NOTIFICATIONS_URL/vapid-public-key` | obscura-api |
| Read activity feed | Supabase JS direct | Supabase (anon key) |
| Live activity updates | Supabase Realtime direct | Supabase (anon key) |
| Read encrypted balances | wagmi + viem direct | Arbitrum Sepolia RPC |

---

## Render Deployment Steps

1. **Connect repository** to Render (GitHub → `OBSCURA` repo → `main` branch).
2. Render auto-detects `render.yaml` — creates `obscura-api` (web) + `obscura-worker` (worker).
3. In Render dashboard, **manually set secrets** for each service:

**obscura-api secrets:**
- `SUPABASE_SERVICE_ROLE_KEY` → Supabase → Project Settings → API → service_role key
- `VAPID_PRIVATE_KEY` → `WqDC2gqeKfnK0Z-2rD6l1_XR8i05bvKJdQRu04x7gKM`
- `RESEND_API_KEY` → Resend dashboard → API Keys

**obscura-worker secrets:**
- `SUPABASE_SERVICE_ROLE_KEY` → same as above
- `KEEPER_PRIVATE_KEY` → keeper EOA private key (fund it with ETH for gas)

4. Click **Deploy**.
5. Verify: `GET https://obscura-api.onrender.com/health` → `{ "status": "ok" }`

**Deploy order:** No strict ordering required. Worker can start indexing before API is up.

---

## Vercel Deployment Steps

1. Go to Vercel → Project → Settings → Environment Variables.
2. Update:
   - `VITE_RELAY_URL` = `https://obscura-api.onrender.com`
   - `VITE_NOTIFICATIONS_URL` = `https://obscura-api.onrender.com`
3. **Redeploy** (Deployments → Redeploy latest).
4. All other `VITE_*` vars are already set. No changes needed.

---

## Secrets Checklist

| Secret | Where to get it | Where to set it |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | Render (both services) |
| `VAPID_PRIVATE_KEY` | Already generated: `WqDC2gqeKfnK0Z-2rD6l1_XR8i05bvKJdQRu04x7gKM` | Render (obscura-api) |
| `RESEND_API_KEY` | resend.com → API Keys | Render (obscura-api) |
| `KEEPER_PRIVATE_KEY` | Generate a new EOA — fund it with 0.01 ETH | Render (obscura-worker) |

---

## Local Development

```powershell
# Start obscura-api locally
cd apps/obscura-api
Copy-Item .env.example .env   # Edit .env with real secrets
npm install
npm run dev   # Starts on http://localhost:3000

# Start obscura-worker locally
cd apps/obscura-worker
Copy-Item .env.example .env   # Edit .env with real secrets
npm install
npm run dev
```

Set `VITE_RELAY_URL=http://localhost:3000` and `VITE_NOTIFICATIONS_URL=http://localhost:3000` in the frontend `.env` for local testing.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `POST /relay` returns 500 | `BUNDLER_URL` wrong or missing | Check Render env → BUNDLER_URL |
| Push not received | `VAPID_PRIVATE_KEY` wrong | Must match the public key |
| Worker not indexing | `SUPABASE_SERVICE_ROLE_KEY` wrong | Copy service_role from Supabase |
| Keeper not liquidating | `KEEPER_DRY_RUN=true` | Set `KEEPER_DRY_RUN=false` in Render |
| Keeper out of gas | Keeper EOA has no ETH | Fund keeper address on Arb Sepolia |
| Frontend 404 on relay | `VITE_RELAY_URL` still points to old URL | Update Vercel env → redeploy |

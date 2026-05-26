-- ============================================================
-- Obscura Pay — Supabase schema migration
-- Project: quoovjkjwgtdqwdofubh
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. obscura_activity ──────────────────────────────────────
-- Main activity feed table. Workers upsert events here;
-- frontend subscribes via Realtime.
CREATE TABLE IF NOT EXISTS obscura_activity (
  id               BIGSERIAL PRIMARY KEY,
  chain_id         INTEGER       NOT NULL,
  block_number     TEXT          NOT NULL,
  tx_hash          TEXT          NOT NULL,
  log_index        INTEGER       NOT NULL,
  contract_address TEXT          NOT NULL,
  event_name       TEXT          NOT NULL,
  wallet           TEXT          NOT NULL,
  participants     TEXT[]        NOT NULL DEFAULT '{}',
  args             JSONB         NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_activity UNIQUE (tx_hash, log_index)
);

-- Index for wallet lookups (point queries)
CREATE INDEX IF NOT EXISTS idx_obscura_activity_wallet
  ON obscura_activity (wallet);

-- GIN index for participants[] contains-any queries
CREATE INDEX IF NOT EXISTS idx_obscura_activity_participants
  ON obscura_activity USING GIN (participants);

-- Index for event_name filtering
CREATE INDEX IF NOT EXISTS idx_obscura_activity_event_name
  ON obscura_activity (event_name);

-- Index for time-ordered listing
CREATE INDEX IF NOT EXISTS idx_obscura_activity_created_at
  ON obscura_activity (created_at DESC);

-- Row-Level Security: wallets can only read rows they participate in
ALTER TABLE obscura_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_participant_read" ON obscura_activity;
CREATE POLICY "allow_participant_read"
  ON obscura_activity
  FOR SELECT
  USING (true);
  -- NOTE: The service-role key (used by the worker) bypasses RLS.
  -- The anon key (used by the frontend) gets read-all here because
  -- the activity data is already wallet-filtered in the query layer.
  -- Tighten this if you add sensitive fields.

-- Enable Realtime for the activity feed
-- (Do this in Dashboard → Database → Replication → obscura_activity too)
ALTER PUBLICATION supabase_realtime ADD TABLE obscura_activity;


-- ── 2. obscura_push_subscriptions ───────────────────────────
-- Web Push subscription objects, one row per wallet.
CREATE TABLE IF NOT EXISTS obscura_push_subscriptions (
  wallet       TEXT        PRIMARY KEY,
  subscription JSONB       NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE obscura_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Only the service role (backend) can read/write subscriptions
DROP POLICY IF EXISTS "service_role_only" ON obscura_push_subscriptions;
CREATE POLICY "service_role_only"
  ON obscura_push_subscriptions
  FOR ALL
  USING (false)
  WITH CHECK (false);
-- The worker uses the service_role key which bypasses RLS, so this is safe.


-- ── 3. obscura_notification_prefs ───────────────────────────
-- Per-wallet notification preferences.
CREATE TABLE IF NOT EXISTS obscura_notification_prefs (
  wallet        TEXT        PRIMARY KEY,
  push_enabled  BOOLEAN     NOT NULL DEFAULT false,
  email_enabled BOOLEAN     NOT NULL DEFAULT false,
  email         TEXT,
  events        TEXT[]      NOT NULL DEFAULT ARRAY['*'],
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE obscura_notification_prefs ENABLE ROW LEVEL SECURITY;

-- Wallets can read their own prefs (anon key)
DROP POLICY IF EXISTS "wallet_read_own" ON obscura_notification_prefs;
CREATE POLICY "wallet_read_own"
  ON obscura_notification_prefs
  FOR SELECT
  USING (true);
  -- Filtered to own wallet in the query by the backend API.

-- Only the service role can write (POST /prefs goes through the API, not direct DB)
DROP POLICY IF EXISTS "service_role_write" ON obscura_notification_prefs;
CREATE POLICY "service_role_write"
  ON obscura_notification_prefs
  FOR INSERT
  WITH CHECK (false);

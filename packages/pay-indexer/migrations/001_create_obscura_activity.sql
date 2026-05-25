-- Obscura Pay Activity Feed — Supabase migration
-- Run via: supabase db push  OR  paste into SQL editor in Supabase dashboard

-- Table: stores all indexed on-chain events
CREATE TABLE IF NOT EXISTS obscura_activity (
  id               BIGSERIAL PRIMARY KEY,
  chain_id         INTEGER       NOT NULL,
  block_number     BIGINT        NOT NULL,
  tx_hash          TEXT          NOT NULL,
  log_index        INTEGER       NOT NULL,
  contract_address TEXT          NOT NULL,
  event_name       TEXT          NOT NULL,
  -- Primary wallet for per-user filtering
  wallet           TEXT          NOT NULL,
  -- All participants (array for OR-filter queries)
  participants     TEXT[]        NOT NULL DEFAULT '{}',
  -- Raw event args as JSONB
  args             JSONB         NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Prevent duplicate events on re-index
  UNIQUE (tx_hash, log_index)
);

-- Index for per-wallet activity feed
CREATE INDEX IF NOT EXISTS idx_obscura_activity_wallet
  ON obscura_activity (wallet, created_at DESC);

-- Index for GIN search on participants array
CREATE INDEX IF NOT EXISTS idx_obscura_activity_participants
  ON obscura_activity USING GIN (participants);

-- Enable Row Level Security
ALTER TABLE obscura_activity ENABLE ROW LEVEL SECURITY;

-- Allow public read (wallets filtered server-side by the frontend hook)
-- Production: tighten with wallet-signed JWT claims
CREATE POLICY "public_read_activity"
  ON obscura_activity
  FOR SELECT
  USING (true);

-- Only service role can insert (indexer uses service role key)
CREATE POLICY "service_role_insert"
  ON obscura_activity
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Enable Realtime for live feed updates
ALTER PUBLICATION supabase_realtime ADD TABLE obscura_activity;

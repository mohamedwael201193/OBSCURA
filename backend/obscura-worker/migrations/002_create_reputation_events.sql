-- ============================================================
-- Obscura Pay - Shared reputation event foundation
-- Project: quoovjkjwgtdqwdofubh
-- Purpose: derived capped signals for Pay/Credit/Vote UX and analytics.
-- ============================================================

CREATE TABLE IF NOT EXISTS obscura_reputation_events (
  id             BIGSERIAL PRIMARY KEY,
  wallet         TEXT        NOT NULL,
  source_app     TEXT        NOT NULL CHECK (source_app IN ('pay', 'credit', 'vote')),
  signal_type    TEXT        NOT NULL,
  signal_weight  INTEGER     NOT NULL DEFAULT 1 CHECK (signal_weight BETWEEN 1 AND 10),
  event_ref      BIGINT      REFERENCES obscura_activity(id) ON DELETE SET NULL,
  public_context JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reputation_event UNIQUE (wallet, source_app, signal_type, event_ref)
);

CREATE INDEX IF NOT EXISTS idx_obscura_reputation_events_wallet
  ON obscura_reputation_events (wallet);

CREATE INDEX IF NOT EXISTS idx_obscura_reputation_events_source_signal
  ON obscura_reputation_events (source_app, signal_type);

CREATE INDEX IF NOT EXISTS idx_obscura_reputation_events_event_ref
  ON obscura_reputation_events (event_ref);

CREATE INDEX IF NOT EXISTS idx_obscura_reputation_events_created_at
  ON obscura_reputation_events (created_at DESC);

ALTER TABLE obscura_reputation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_reputation_read" ON obscura_reputation_events;
CREATE POLICY "allow_reputation_read"
  ON obscura_reputation_events
  FOR SELECT
  USING (true);
  -- TESTNET NOTE: anon reads are allowed, but frontend/API queries must filter
  -- by wallet. Rows store capped categories only: no amounts, notes, labels,
  -- decrypted balances, or private counterpart metadata. Tighten with signed
  -- wallet auth or API-mediated reads before mainnet.

DROP POLICY IF EXISTS "service_role_reputation_insert" ON obscura_reputation_events;
CREATE POLICY "service_role_reputation_insert"
  ON obscura_reputation_events
  FOR INSERT
  WITH CHECK (false);
  -- The worker uses the service_role key, which bypasses RLS.

REVOKE INSERT, UPDATE, DELETE ON obscura_reputation_events FROM anon, authenticated;
GRANT SELECT ON obscura_reputation_events TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'obscura_reputation_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE obscura_reputation_events;
  END IF;
END $$;
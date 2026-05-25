-- Notification subscriptions table
CREATE TABLE IF NOT EXISTS obscura_push_subscriptions (
  id           BIGSERIAL PRIMARY KEY,
  wallet       TEXT          NOT NULL UNIQUE,
  subscription JSONB         NOT NULL,
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS obscura_notification_prefs (
  id            BIGSERIAL PRIMARY KEY,
  wallet        TEXT          NOT NULL UNIQUE,
  push_enabled  BOOLEAN       NOT NULL DEFAULT true,
  email_enabled BOOLEAN       NOT NULL DEFAULT false,
  email         TEXT,
  events        TEXT[]        NOT NULL DEFAULT ARRAY['*'],
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE obscura_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE obscura_notification_prefs ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write subscriptions
CREATE POLICY "service_role_subscriptions"
  ON obscura_push_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read their own prefs (via anon key + RLS wallet claim)
-- Production: use wallet-signed JWT claims
CREATE POLICY "service_role_prefs"
  ON obscura_notification_prefs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

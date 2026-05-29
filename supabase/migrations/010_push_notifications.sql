-- Migration 010: Push subscriptions table
-- Run in Supabase SQL editor after 009_engagement_rpcs.sql.
--
-- After running this migration, you also need to:
--   1. Generate VAPID keys:  npx web-push generate-vapid-keys
--   2. Add VITE_VAPID_PUBLIC_KEY to .env.local
--   3. Add VAPID_PRIVATE_KEY + VAPID_SUBJECT to Supabase project secrets
--   4. Deploy the send-push edge function from supabase/functions/send-push/

-- ─── push_subscriptions ───────────────────────────────────────────────────────
-- Stores Web Push subscription objects per device/browser session.
-- One user can have multiple subscriptions (multiple devices).

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL UNIQUE,
  p256dh      TEXT,
  auth_key    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions (user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs_own_select"
  ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_subs_own_insert"
  ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subs_own_update"
  ON push_subscriptions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "push_subs_own_delete"
  ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Migration 012: Reports table + account deletion RPC
-- Run in Supabase SQL editor after 011_storage_friend_photos.sql.

-- ─── reports ──────────────────────────────────────────────────────────────────
-- Stores user-submitted content reports for moderation.
-- An admin dashboard can be built later on top of this table.

CREATE TABLE IF NOT EXISTS reports (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_content_type   TEXT        NOT NULL CHECK (reported_content_type IN ('game', 'comment', 'user')),
  reported_content_id     TEXT        NOT NULL,
  reason                  TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_reporter_idx  ON reports (reporter_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_content_idx   ON reports (reported_content_type, reported_content_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reports"
  ON reports FOR INSERT WITH CHECK (reporter_user_id = auth.uid());

CREATE POLICY "Users can see their own reports"
  ON reports FOR SELECT USING (reporter_user_id = auth.uid());

-- ─── delete_my_account() ─────────────────────────────────────────────────────
-- Deletes the caller's auth.users row, which cascades:
--   games, user_profiles, friendships, friend_requests, game_tags,
--   game_reactions, game_comments, game_attendance_links, notifications,
--   blocked_users, muted_users, push_subscriptions, reports (SET NULL)
--
-- IMPORTANT: Call from the client AFTER deleting game-photos from storage.
-- Storage files are NOT deleted by this function (requires service role).
-- The client's app-layer storage deletion should run first.

CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS void
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- Grant execute to authenticated users (they can only delete themselves
-- because auth.uid() is hardcoded as the target).
GRANT EXECUTE ON FUNCTION delete_my_account() TO authenticated;

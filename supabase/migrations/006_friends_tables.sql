-- Migration 006: Friends social graph — tables, indexes, and helper functions
-- Run in Supabase SQL editor after 005_add_game_sharing_fields.sql.
-- Assumes set_updated_at() trigger function exists from migration 001.

-- ─── Share-code generator ─────────────────────────────────────────────────────
-- Generates a random 8-character alphanumeric code (no 0/O/1/I to avoid
-- ambiguity when sharing verbally). Called as a column DEFAULT so every new
-- user_profile row gets a unique code without app-layer intervention.
-- Collision probability at 1 million users: ~0.000003%.  The UNIQUE constraint
-- will reject the astronomically unlikely duplicate; the app layer can retry.

CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code  TEXT := '';
  i     INT;
BEGIN
  FOR i IN 1..8 LOOP
    code := code || substr(chars, (floor(random() * length(chars)))::INT + 1, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- ─── user_profiles ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id                        UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username                       TEXT        UNIQUE,
  display_name                   TEXT,
  bio                            TEXT        CHECK (char_length(bio) <= 280),
  profile_photo_url              TEXT,
  share_code                     TEXT        UNIQUE NOT NULL DEFAULT generate_share_code(),
  is_discoverable_by_username    BOOLEAN     NOT NULL DEFAULT true,
  is_discoverable_by_email       BOOLEAN     NOT NULL DEFAULT true,
  is_discoverable_by_share_code  BOOLEAN     NOT NULL DEFAULT true,
  privacy_mode                   BOOLEAN     NOT NULL DEFAULT false,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_profiles_username_idx   ON user_profiles (lower(username)) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_profiles_share_code_idx ON user_profiles (share_code);

CREATE TRIGGER user_profiles_set_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── friendships ─────────────────────────────────────────────────────────────
-- Stored with user_a_id < user_b_id (UUID lexicographic order) to prevent
-- duplicate friendship rows for the same pair in either direction.
-- Inserts must go through the accept_friend_request() RPC (see below) —
-- no direct user INSERT is permitted via RLS.

CREATE TABLE IF NOT EXISTS friendships (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friendships_normalized   CHECK (user_a_id < user_b_id),
  CONSTRAINT friendships_unique_pair  UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS friendships_user_a_idx ON friendships (user_a_id);
CREATE INDEX IF NOT EXISTS friendships_user_b_idx ON friendships (user_b_id);

-- ─── friend_requests ─────────────────────────────────────────────────────────
-- status: 'pending' | 'accepted' | 'denied' | 'cancelled'
-- Partial unique index prevents duplicate pending requests from the same sender.

CREATE TABLE IF NOT EXISTS friend_requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'denied', 'cancelled')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at  TIMESTAMPTZ
);

-- Only one pending request per (sender, recipient) pair at a time.
CREATE UNIQUE INDEX IF NOT EXISTS friend_requests_pending_unique_idx
  ON friend_requests (from_user_id, to_user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS friend_requests_to_user_idx ON friend_requests (to_user_id, status);

-- ─── game_tags ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_tags (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id               UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  tagged_user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tagged_by_user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  removed_by_tagged_user BOOLEAN    NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT game_tags_unique UNIQUE (game_id, tagged_user_id)
);

CREATE INDEX IF NOT EXISTS game_tags_game_id_idx       ON game_tags (game_id);
CREATE INDEX IF NOT EXISTS game_tags_tagged_user_id_idx ON game_tags (tagged_user_id);

-- ─── game_reactions ───────────────────────────────────────────────────────────
-- One reaction per (user, game, emoji) triplet.

CREATE TABLE IF NOT EXISTS game_reactions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji       TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT game_reactions_unique UNIQUE (game_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS game_reactions_game_id_idx ON game_reactions (game_id);

-- ─── game_comments ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_comments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id           UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content           TEXT        NOT NULL CHECK (char_length(content) <= 500),
  parent_comment_id UUID        REFERENCES game_comments(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_comments_game_id_idx ON game_comments (game_id, created_at);

CREATE TRIGGER game_comments_set_updated_at
  BEFORE UPDATE ON game_comments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── game_attendance_links ────────────────────────────────────────────────────
-- Links two games (from different users' diaries) that were the same real game.
-- Stored with game_a_id < game_b_id to avoid duplicates.

CREATE TABLE IF NOT EXISTS game_attendance_links (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_a_id        UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  game_b_id        UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  linked_by_user_id UUID       NOT NULL REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_links_normalized  CHECK (game_a_id < game_b_id),
  CONSTRAINT attendance_links_unique_pair UNIQUE (game_a_id, game_b_id)
);

-- ─── notifications ────────────────────────────────────────────────────────────
-- type values: 'friend_request' | 'friend_accepted' | 'tagged' | 'comment'
--              'reaction' | 'attendance_link' | 'milestone' | 'anniversary'
-- subject_type values: 'game' | 'friend_request' | 'comment' | null

CREATE TABLE IF NOT EXISTS notifications (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL,
  actor_user_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_id     UUID,
  subject_type   TEXT,
  read           BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary inbox query: unread notifications for a user, newest first.
CREATE INDEX IF NOT EXISTS notifications_inbox_idx
  ON notifications (user_id, read, created_at DESC);

-- ─── blocked_users ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blocked_users (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blocked_users_unique UNIQUE (blocker_user_id, blocked_user_id)
);

CREATE INDEX IF NOT EXISTS blocked_users_blocker_idx ON blocked_users (blocker_user_id);

-- ─── muted_users ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS muted_users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  muted_user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT muted_users_unique UNIQUE (muter_user_id, muted_user_id)
);

CREATE INDEX IF NOT EXISTS muted_users_muter_idx ON muted_users (muter_user_id);

-- ─── accept_friend_request() RPC ─────────────────────────────────────────────
-- SECURITY DEFINER: runs as the function owner (bypasses RLS) so it can insert
-- into friendships — a table that has no direct user INSERT policy.
-- This is the ONLY path through which friendship rows are created.

CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  req friend_requests;
BEGIN
  SELECT * INTO req FROM friend_requests WHERE id = request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'friend_request_not_found';
  END IF;

  IF req.to_user_id != auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF req.status != 'pending' THEN
    RAISE EXCEPTION 'request_not_pending';
  END IF;

  -- Create the normalized friendship row.
  INSERT INTO friendships (user_a_id, user_b_id)
  VALUES (LEAST(req.from_user_id, req.to_user_id), GREATEST(req.from_user_id, req.to_user_id))
  ON CONFLICT DO NOTHING;

  -- Mark the request accepted.
  UPDATE friend_requests
  SET status = 'accepted', responded_at = NOW()
  WHERE id = request_id;

  -- Notify the original requester.
  INSERT INTO notifications (user_id, type, actor_user_id, subject_id, subject_type)
  VALUES (req.from_user_id, 'friend_accepted', auth.uid(), request_id, 'friend_request');
END;
$$;

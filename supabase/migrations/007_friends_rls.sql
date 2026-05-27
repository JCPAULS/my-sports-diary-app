-- Migration 007: Row Level Security for social tables + updated games SELECT
-- Run in Supabase SQL editor after 006_friends_tables.sql.
--
-- POLICY DESIGN NOTES:
--
-- Recursion guard: the games SELECT policy now references user_profiles and
-- game_tags.  game_tags SELECT policy uses ONLY the denormalized
-- tagged_by_user_id column (not a games subquery) to identify the game owner.
-- This breaks any potential policy cycle:
--   game_reactions → games → game_tags  (terminal, no games ref in game_tags)
--
-- user_profiles SELECT: intentionally permissive in v1 (any authenticated user
-- can read any profile).  Detailed visibility filtering (e.g. "only friends can
-- see bio") is enforced at the application layer.  We document this trade-off
-- here and will tighten to per-field visibility if abuse warrants it.

-- ─── user_profiles ───────────────────────────────────────────────────────────

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- v1: any authenticated user can read any profile row.
CREATE POLICY "Authenticated users can read any profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE is handled by ON DELETE CASCADE from auth.users; no explicit policy needed.

-- ─── friendships ─────────────────────────────────────────────────────────────

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own friendships"
  ON friendships FOR SELECT
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- No INSERT policy: all inserts go through accept_friend_request() SECURITY DEFINER.

CREATE POLICY "Either friend can remove the friendship"
  ON friendships FOR DELETE
  USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- ─── friend_requests ─────────────────────────────────────────────────────────

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender and recipient can see the request"
  ON friend_requests FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Users can send friend requests as themselves"
  ON friend_requests FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

-- Both parties can update: sender cancels (status → 'cancelled'),
-- recipient accepts or denies (status → 'accepted' / 'denied').
-- Field-level restrictions (who can set which status value) are enforced in
-- the application layer and in accept_friend_request() for the friendship creation path.
CREATE POLICY "Sender or recipient can update a request"
  ON friend_requests FOR UPDATE
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid())
  WITH CHECK (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- ─── games (updated SELECT policy) ───────────────────────────────────────────
-- Drop the existing owner-only SELECT policy and replace with one that also
-- grants access to friends (when the game is shared) and tagged users.
--
-- Privacy cascade:
--   1. Owner always sees their own games.
--   2. Friends see the game if: is_shared_with_friends AND NOT owner privacy_mode AND they are friends.
--   3. Tagged user sees the game (regardless of privacy_mode) — tagging implies explicit consent.

DROP POLICY IF EXISTS "Users can select their own games" ON games;

CREATE POLICY "Users can select their own and shared games"
  ON games FOR SELECT
  USING (
    -- Condition 1: viewer owns the game.
    user_id = auth.uid()

    -- Condition 2: viewer is a friend and the game is shared.
    OR (
      is_shared_with_friends = true
      AND NOT COALESCE(
        (SELECT p.privacy_mode FROM user_profiles p WHERE p.user_id = games.user_id),
        false
      )
      AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.user_a_id = LEAST(auth.uid(), games.user_id)
          AND f.user_b_id = GREATEST(auth.uid(), games.user_id)
      )
    )

    -- Condition 3: viewer is tagged in the game (explicit opt-in).
    OR EXISTS (
      SELECT 1 FROM game_tags gt
      WHERE gt.game_id = games.id
        AND gt.tagged_user_id = auth.uid()
        AND NOT gt.removed_by_tagged_user
    )
  );

-- ─── game_tags ────────────────────────────────────────────────────────────────
-- Uses tagged_by_user_id (the game owner) rather than a games subquery to
-- avoid triggering games RLS recursively.

ALTER TABLE game_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game owner and tagged user can see tags"
  ON game_tags FOR SELECT
  USING (tagged_by_user_id = auth.uid() OR tagged_user_id = auth.uid());

CREATE POLICY "Game owner can create tags on their games"
  ON game_tags FOR INSERT
  WITH CHECK (tagged_by_user_id = auth.uid());

-- Tagged user can remove themselves; game owner can remove any tag.
CREATE POLICY "Tagged user can remove themselves from a tag"
  ON game_tags FOR UPDATE
  USING (tagged_user_id = auth.uid())
  WITH CHECK (tagged_user_id = auth.uid());

CREATE POLICY "Game owner can delete tags on their games"
  ON game_tags FOR DELETE
  USING (tagged_by_user_id = auth.uid());

-- ─── game_reactions ───────────────────────────────────────────────────────────
-- Visibility inherits from the underlying game's RLS.
-- The subquery "SELECT 1 FROM games WHERE id = ..." applies games' policies,
-- so a user only sees reactions on games they are already allowed to see.

ALTER TABLE game_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see reactions on visible games"
  ON game_reactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM games WHERE id = game_reactions.game_id));

CREATE POLICY "Authenticated users can react to visible games"
  ON game_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM games WHERE id = game_reactions.game_id)
  );

CREATE POLICY "Users can remove their own reactions"
  ON game_reactions FOR DELETE
  USING (user_id = auth.uid());

-- ─── game_comments ────────────────────────────────────────────────────────────

ALTER TABLE game_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see comments on visible games"
  ON game_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM games WHERE id = game_comments.game_id));

CREATE POLICY "Authenticated users can comment on visible games"
  ON game_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM games WHERE id = game_comments.game_id)
  );

CREATE POLICY "Commenters can edit their own comments"
  ON game_comments FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Commenter can delete their own comment; game owner can also delete any comment.
CREATE POLICY "Commenter or game owner can delete a comment"
  ON game_comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM games
      WHERE id = game_comments.game_id AND user_id = auth.uid()
    )
  );

-- ─── game_attendance_links ────────────────────────────────────────────────────

ALTER TABLE game_attendance_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Either game owner can see an attendance link"
  ON game_attendance_links FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM games WHERE id = game_a_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM games WHERE id = game_b_id AND user_id = auth.uid())
  );

-- Linker must own at least one of the two games being linked.
CREATE POLICY "Either game owner can create an attendance link"
  ON game_attendance_links FOR INSERT
  WITH CHECK (
    linked_by_user_id = auth.uid()
    AND (
      EXISTS (SELECT 1 FROM games WHERE id = game_a_id AND user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM games WHERE id = game_b_id AND user_id = auth.uid())
    )
  );

CREATE POLICY "Either game owner can remove an attendance link"
  ON game_attendance_links FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM games WHERE id = game_a_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM games WHERE id = game_b_id AND user_id = auth.uid())
  );

-- ─── notifications ────────────────────────────────────────────────────────────

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Any authenticated user can create a notification (the app layer controls
-- what notification types each action generates).
CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can mark their own notifications as read"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- ─── blocked_users ────────────────────────────────────────────────────────────

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blockers can see their own block list"
  ON blocked_users FOR SELECT
  USING (blocker_user_id = auth.uid());

CREATE POLICY "Users can block others as themselves"
  ON blocked_users FOR INSERT
  WITH CHECK (blocker_user_id = auth.uid());

CREATE POLICY "Users can unblock others they blocked"
  ON blocked_users FOR DELETE
  USING (blocker_user_id = auth.uid());

-- ─── muted_users ─────────────────────────────────────────────────────────────

ALTER TABLE muted_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Muters can see their own mute list"
  ON muted_users FOR SELECT
  USING (muter_user_id = auth.uid());

CREATE POLICY "Users can mute others as themselves"
  ON muted_users FOR INSERT
  WITH CHECK (muter_user_id = auth.uid());

CREATE POLICY "Users can unmute others they muted"
  ON muted_users FOR DELETE
  USING (muter_user_id = auth.uid());

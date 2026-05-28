-- Migration 008: SECURITY DEFINER RPC for block-checked game tagging.
-- Run in Supabase SQL editor after 007_friends_rls.sql.
--
-- WHY SECURITY DEFINER:
-- The RLS on blocked_users only exposes the blocker's own rows to the authenticated
-- user.  If user A has blocked user B, user B cannot see that row — so a direct
-- INSERT policy cannot check "has the target blocked me?".  This function runs as
-- the function owner and can query blocked_users in both directions.
--
-- The function also consolidates three safety checks (self-tag, ownership, block)
-- in one atomic step, which keeps the app layer thin.

CREATE OR REPLACE FUNCTION tag_user_with_checks(
  p_game_id        UUID,
  p_tagged_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cannot tag yourself
  IF p_tagged_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot_tag_self';
  END IF;

  -- Caller must own the game
  IF NOT EXISTS (
    SELECT 1 FROM games WHERE id = p_game_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'not_game_owner';
  END IF;

  -- Reject if either party has blocked the other
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_user_id = auth.uid()     AND blocked_user_id = p_tagged_user_id)
       OR (blocker_user_id = p_tagged_user_id AND blocked_user_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'user_blocked';
  END IF;

  -- Insert; silently ignore if tag already exists (idempotent)
  INSERT INTO game_tags (game_id, tagged_user_id, tagged_by_user_id)
  VALUES (p_game_id, p_tagged_user_id, auth.uid())
  ON CONFLICT (game_id, tagged_user_id) DO NOTHING;
END;
$$;

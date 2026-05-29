-- Migration 009: Engagement-driven highlight promotion RPC.
-- Run in Supabase SQL editor after 008_tagging_rpcs.sql.
--
-- WHY SECURITY DEFINER:
-- Viewers (reactor/commenter) cannot UPDATE games they don't own via RLS.
-- This function allows the engagement threshold to promote any game to a
-- highlight from any authenticated user's session, while keeping all business
-- logic server-side and auditable.
--
-- PROMOTION RULES:
-- • Game must have been created within the last 24 hours.
-- • 3+ distinct reactors OR 2+ distinct commenters (from any user, including owner).
-- • Skip if game is already actively highlighted (highlight_pinned_until > NOW()).
-- • Sets highlight_pinned_until = NOW() + 48h.
-- • Returns TRUE if promotion happened, FALSE otherwise.

CREATE OR REPLACE FUNCTION maybe_promote_engagement_highlight(p_game_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created_at     TIMESTAMPTZ;
  v_pinned_until   TIMESTAMPTZ;
  v_reactor_count  INT;
  v_commenter_count INT;
BEGIN
  -- Fetch game metadata
  SELECT created_at, highlight_pinned_until
    INTO v_created_at, v_pinned_until
    FROM games
   WHERE id = p_game_id;

  IF NOT FOUND THEN RETURN false; END IF;

  -- Only consider games posted in the last 24 hours
  IF v_created_at < NOW() - INTERVAL '24 hours' THEN RETURN false; END IF;

  -- Skip if already actively highlighted
  IF v_pinned_until IS NOT NULL AND v_pinned_until > NOW() THEN RETURN false; END IF;

  -- Count distinct reactors
  SELECT COUNT(DISTINCT user_id) INTO v_reactor_count
    FROM game_reactions
   WHERE game_id = p_game_id;

  -- Count distinct commenters
  SELECT COUNT(DISTINCT user_id) INTO v_commenter_count
    FROM game_comments
   WHERE game_id = p_game_id;

  IF v_reactor_count >= 3 OR v_commenter_count >= 2 THEN
    UPDATE games
       SET is_highlight          = true,
           highlight_pinned_until = NOW() + INTERVAL '48 hours'
     WHERE id = p_game_id;

    -- Notify the game owner (engagement-driven highlight)
    INSERT INTO notifications (user_id, type, actor_user_id, subject_id, subject_type)
      SELECT user_id, 'milestone', NULL, p_game_id, 'game'
        FROM games
       WHERE id = p_game_id
         -- avoid duplicate milestone notifications
         AND NOT EXISTS (
           SELECT 1 FROM notifications n
            WHERE n.user_id = games.user_id
              AND n.type = 'milestone'
              AND n.subject_id = p_game_id
         );

    RETURN true;
  END IF;

  RETURN false;
END;
$$;

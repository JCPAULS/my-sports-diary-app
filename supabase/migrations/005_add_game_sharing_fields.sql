-- Migration 005: Add per-game sharing and highlight fields
-- Run in Supabase SQL editor after 004_add_nickname.sql.
-- In PostgreSQL 11+, ADD COLUMN with a DEFAULT applies the value to all
-- existing rows immediately (no rewrite needed), so no UPDATE backfill required.

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS is_shared_with_friends  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_highlight             BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS highlight_pinned_until   TIMESTAMPTZ;

-- Index for feed queries: "all shared games from a given user, newest first"
CREATE INDEX IF NOT EXISTS games_shared_user_created_idx
  ON games (user_id, created_at DESC)
  WHERE is_shared_with_friends = true;

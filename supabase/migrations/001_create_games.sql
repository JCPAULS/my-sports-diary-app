-- Migration 001: Create games table with RLS
-- Run this first in Supabase SQL editor.

-- ─── updated_at trigger function (shared) ────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── games table ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS games (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Sport identity
  sport_id           TEXT NOT NULL,
  college_sport_type TEXT,

  -- Schedule
  date               DATE,
  season             TEXT,
  schedule_label     TEXT,
  week               TEXT,
  season_type        TEXT,

  -- Teams & score
  home_team          TEXT,
  away_team          TEXT,
  home_score         INTEGER,
  away_score         INTEGER,

  -- Venue & seating
  venue              TEXT,
  section            TEXT,
  row                TEXT,
  seat_numbers       TEXT,

  -- Diary fields
  rooting_for        TEXT,
  notes              TEXT,
  who_was_there      TEXT,
  attendees          JSONB,       -- string[]
  mvp                TEXT,
  vibe               TEXT,
  what_you_wore      TEXT,
  what_you_ate       TEXT,
  who_drove          TEXT,
  pregame_ritual     TEXT,

  -- Custom games
  level              TEXT,

  -- Media
  photos             JSONB,       -- string[] of URLs / data-URLs
  outfit_photo       TEXT,

  -- ESPN recap
  summary            TEXT,
  espn_event_id      TEXT
);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE TRIGGER games_set_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own games"
  ON games FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own games"
  ON games FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own games"
  ON games FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own games"
  ON games FOR DELETE
  USING (user_id = auth.uid());

-- ─── Index for common query pattern ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS games_user_id_created_at_idx ON games (user_id, created_at DESC);

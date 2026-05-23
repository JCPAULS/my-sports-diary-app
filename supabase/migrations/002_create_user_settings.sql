-- Migration 002: Create user_settings table with RLS
-- Run this after 001 in Supabase SQL editor.
-- Assumes set_updated_at() function already exists from migration 001.

-- ─── user_settings table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_settings (
  user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_teams        JSONB        NOT NULL DEFAULT '{}',    -- Record<sportId, string[]>
  primary_favorite_team JSONB,                                 -- { sportId: string; teamName: string } | null
  theme_mode            TEXT        NOT NULL DEFAULT 'classic', -- 'classic' | 'team'
  seen_milestones       JSONB        NOT NULL DEFAULT '[]',    -- string[]
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE TRIGGER user_settings_set_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own settings"
  ON user_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own settings"
  ON user_settings FOR DELETE
  USING (user_id = auth.uid());

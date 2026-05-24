-- Migration 004: Add nickname column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS nickname text;

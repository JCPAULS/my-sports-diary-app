-- Migration 003: Create game-photos storage bucket with private per-user access
-- Paste this into Supabase SQL editor AFTER running 001 and 002.

-- Create the bucket (private — no public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-photos', 'game-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Path convention: {user_id}/{game_id}/{photo_id}.jpg
-- All policies gate on the first folder segment matching the authenticated user's ID.

CREATE POLICY "Users can upload to their own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'game-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read their own photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'game-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'game-photos' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

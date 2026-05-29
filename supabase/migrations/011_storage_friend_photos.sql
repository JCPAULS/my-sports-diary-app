-- Migration 011: Allow reading friends' game photos
-- Run in Supabase SQL editor after 010_push_notifications.sql.
--
-- BUG: The original "Users can read their own photos" policy only allows
-- createSignedUrl for the photo owner's own folder. When a friend views
-- a shared game, the signed URL request fails because their user ID doesn't
-- match the owner's folder.
--
-- FIX: Replace the SELECT policy with one that checks whether the requesting
-- user can see the underlying game (via the games table's existing RLS).
-- Since the games SELECT policy already enforces owner/friend/tagged visibility,
-- we just need a sub-select into public.games to piggyback on that logic.
--
-- Path convention: {owner_user_id}/{game_id}/{photo_id}.jpg
--   storage.foldername(name)[1] = owner_user_id
--   storage.foldername(name)[2] = game_id

-- Drop the owner-only read policy
DROP POLICY IF EXISTS "Users can read their own photos" ON storage.objects;

-- New policy: allow reading a photo if you can see the game it belongs to.
-- The sub-select applies the games table's RLS automatically, so this inherits
-- the full visibility model: owner ✓, friends-with-shared ✓, tagged users ✓,
-- everyone else ✗.
CREATE POLICY "Users can read game photos they can see"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'game-photos'
    AND EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id::text        = (storage.foldername(name))[2]
        AND g.user_id::text   = (storage.foldername(name))[1]
    )
  );

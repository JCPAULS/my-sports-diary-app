// tagsStore.ts — Game tagging operations for F5.
// Handles syncing game_tags rows, sending tag notifications, and fetching
// tagged-in games with poster profile data for the timeline.

import { supabase } from '@/lib/supabase'
import { dbGameToGame, dbProfileToProfile, type DbGame, type DbUserProfile } from '@/types/database'
import type { Game } from '@/types/Game'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaggedUserProfile {
  tagId: string
  userId: string
  displayName: string | null
  username: string | null
  avatarUrl: string | null
  removedByTaggedUser: boolean
}

export interface TaggedGame extends Game {
  tagInfo: {
    taggedByUserId: string
    taggedByDisplayName: string | null
  }
}

// ─── Load tags with profiles for edit mode ────────────────────────────────────

export async function getTagsWithProfiles(gameId: string): Promise<TaggedUserProfile[]> {
  const { data: tags, error } = await db
    .from('game_tags')
    .select('id, tagged_user_id, removed_by_tagged_user')
    .eq('game_id', gameId)

  if (error || !tags?.length) return []

  const tagRows = tags as { id: string; tagged_user_id: string; removed_by_tagged_user: boolean }[]
  const userIds = tagRows.map((t) => t.tagged_user_id)

  const { data: profiles } = await db
    .from('user_profiles')
    .select('user_id, display_name, username, profile_photo_url')
    .in('user_id', userIds)

  const profileMap = new Map(
    ((profiles ?? []) as Pick<DbUserProfile, 'user_id' | 'display_name' | 'username' | 'profile_photo_url'>[]).map(
      (p) => [p.user_id, p],
    ),
  )

  return tagRows.map((t) => {
    const p = profileMap.get(t.tagged_user_id)
    return {
      tagId: t.id,
      userId: t.tagged_user_id,
      displayName: p?.display_name ?? null,
      username: p?.username ?? null,
      avatarUrl: p?.profile_photo_url ?? null,
      removedByTaggedUser: t.removed_by_tagged_user,
    }
  })
}

// ─── Sync tags on game save ───────────────────────────────────────────────────
// Computes the diff between the existing tag set and the desired new set, then
// inserts new tags (via the block-checked RPC) and deletes removed ones.
// Returns the count of new tags created (for rate-limit accounting).

export async function syncGameTags(
  gameId: string,
  desiredUserIds: string[],
): Promise<{ tagged: number; blockedSkipped: string[] }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { tagged: 0, blockedSkipped: [] }

  // Fetch current active tags (ignoring removed ones — they stay removed)
  const { data: existing } = await db
    .from('game_tags')
    .select('tagged_user_id, removed_by_tagged_user')
    .eq('game_id', gameId)

  const existingMap = new Map(
    ((existing ?? []) as { tagged_user_id: string; removed_by_tagged_user: boolean }[]).map(
      (t) => [t.tagged_user_id, t.removed_by_tagged_user],
    ),
  )

  const desiredSet = new Set(desiredUserIds)

  // Users to add (not already tagged, not removed-by-self)
  const toAdd = desiredUserIds.filter(
    (id) => !existingMap.has(id) || existingMap.get(id) === true,  // re-tag if self-removed
  )

  // Users to remove (currently tagged, not removed-by-self, not in desired set)
  const toRemove = [...existingMap.entries()]
    .filter(([id, removedBySelf]) => !desiredSet.has(id) && !removedBySelf)
    .map(([id]) => id)

  // Remove tags (owner deletes the row)
  if (toRemove.length > 0) {
    await db
      .from('game_tags')
      .delete()
      .eq('game_id', gameId)
      .in('tagged_user_id', toRemove)
  }

  // Add new tags via block-checked RPC
  const blockedSkipped: string[] = []
  let tagged = 0

  for (const targetId of toAdd) {
    try {
      const { error } = await db.rpc('tag_user_with_checks', {
        p_game_id: gameId,
        p_tagged_user_id: targetId,
      })
      if (error) {
        if (error.message?.includes('user_blocked') || error.message?.includes('cannot_tag_self')) {
          blockedSkipped.push(targetId)
        }
        continue
      }

      tagged++

      // Notify the tagged user
      await db.from('notifications').insert({
        user_id: targetId,
        type: 'tagged',
        actor_user_id: user.id,
        subject_id: gameId,
        subject_type: 'game',
      })
    } catch {
      // Individual tag failure — skip and continue
    }
  }

  return { tagged, blockedSkipped }
}

// ─── Tagged user removes themselves ──────────────────────────────────────────
// Sets removed_by_tagged_user = true. The display name was already written to
// the game's attendees[] on save, so the poster retains a text-name fallback.

export async function removeSelfFromTag(gameId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('[tagsStore] removeSelfFromTag: not authenticated')

  const { error } = await db
    .from('game_tags')
    .update({ removed_by_tagged_user: true })
    .eq('game_id', gameId)
    .eq('tagged_user_id', user.id)

  if (error) throw new Error(`[tagsStore] removeSelfFromTag: ${error.message}`)
}

// ─── Fetch tagged-in games for the timeline ───────────────────────────────────
// Returns games where the current user is tagged (and hasn't removed themselves),
// annotated with the poster's display info for the "TAGGED BY" badge.

export async function getTaggedGames(): Promise<TaggedGame[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // 1. My active tags
  const { data: myTags } = await db
    .from('game_tags')
    .select('game_id, tagged_by_user_id')
    .eq('tagged_user_id', user.id)
    .eq('removed_by_tagged_user', false)

  if (!myTags?.length) return []

  const tagRows = myTags as { game_id: string; tagged_by_user_id: string }[]
  const gameIds = tagRows.map((t) => t.game_id)
  const posterIds = [...new Set(tagRows.map((t) => t.tagged_by_user_id))]

  // 2. Fetch the actual games + poster profiles in parallel
  const [gamesRes, profilesRes] = await Promise.all([
    db.from('games').select('*').in('id', gameIds),
    db
      .from('user_profiles')
      .select('user_id, display_name, username')
      .in('user_id', posterIds),
  ])

  const posterMap = new Map<string, string>(
    ((profilesRes.data ?? []) as Pick<DbUserProfile, 'user_id' | 'display_name' | 'username'>[]).map(
      (p) => [p.user_id, p.display_name || p.username || 'Someone'],
    ),
  )

  const tagMap = new Map<string, string>(tagRows.map((t) => [t.game_id, t.tagged_by_user_id]))

  return ((gamesRes.data ?? []) as DbGame[])
    .filter((row) => row.user_id !== user.id) // exclude own games (can't tag yourself)
    .map((row) => {
      const posterId = tagMap.get(row.id)!
      return {
        ...dbGameToGame(row),
        tagInfo: {
          taggedByUserId: posterId,
          taggedByDisplayName: posterMap.get(posterId) ?? null,
        },
      }
    })
}

// ─── Check if current user is tagged in a game ────────────────────────────────

export async function getMyTagStatus(
  gameId: string,
): Promise<{ isTagged: boolean; taggedByUserId: string | null; taggedByDisplayName: string | null } | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await db
    .from('game_tags')
    .select('tagged_by_user_id, removed_by_tagged_user')
    .eq('game_id', gameId)
    .eq('tagged_user_id', user.id)
    .maybeSingle()

  if (!data) return null

  const row = data as { tagged_by_user_id: string; removed_by_tagged_user: boolean }
  if (row.removed_by_tagged_user) return { isTagged: false, taggedByUserId: null, taggedByDisplayName: null }

  const { data: profile } = await db
    .from('user_profiles')
    .select('display_name, username')
    .eq('user_id', row.tagged_by_user_id)
    .maybeSingle()

  const p = profile as Pick<DbUserProfile, 'display_name' | 'username'> | null
  return {
    isTagged: true,
    taggedByUserId: row.tagged_by_user_id,
    taggedByDisplayName: p?.display_name || p?.username || 'Someone',
  }
}

// Re-export dbProfileToProfile for convenience in components that use this store
export { dbProfileToProfile }

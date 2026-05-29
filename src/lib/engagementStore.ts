// engagementStore.ts — Reactions, comments, attendance links, and engagement highlights.
// Builds on top of the raw operations in friendsStore.ts, adding profile data,
// notification fan-out, and the "I Was There Too!" linking flow.

import { supabase } from '@/lib/supabase'
import {
  addReaction as dbAddReaction,
  removeReaction as dbRemoveReaction,
  listReactions,
  addComment as dbAddComment,
  deleteComment as dbDeleteComment,
  listComments,
} from '@/lib/friendsStore'
import {
  type DbUserProfile,
} from '@/types/database'
import { getAllGames } from '@/lib/gameStore'
import type { Game } from '@/types/Game'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReactionGroup {
  emoji: string
  count: number
  isMine: boolean
  displayNames: string[]
}

export interface CommentWithProfile {
  id: string
  content: string
  userId: string
  displayName: string | null
  username: string | null
  avatarUrl: string | null
  createdAt: string
  updatedAt: string
  isEditable: boolean  // within 5 minutes of posting
  canDelete: boolean   // author — RLS controls actual delete; game owner set by caller
}

export interface AttendanceLinkEntry {
  id: string
  myGameId: string
  linkedGameId: string
  linkedGameOwnerId: string
  linkedGameOwnerDisplayName: string | null
  linkedGameOwnerAvatarUrl: string | null
  linkedGame: Pick<Game, 'homeTeam' | 'awayTeam' | 'date' | 'venue' | 'id'>
  isLinkedByMe: boolean
}

export const REACTION_EMOJIS = ['🔥', '❤️', '🏈', '😭', '😤', '🎉'] as const

// ─── Reactions ────────────────────────────────────────────────────────────────

export async function getReactionGroups(gameId: string): Promise<ReactionGroup[]> {
  const { data: { user } } = await supabase.auth.getUser()

  const reactions = await listReactions(gameId)
  if (reactions.length === 0) return []

  // Fetch reactor display names
  const reactorIds = [...new Set(reactions.map((r) => r.userId))]
  const { data: profiles } = await db
    .from('user_profiles')
    .select('user_id, display_name, username')
    .in('user_id', reactorIds)

  const nameMap = new Map<string, string>(
    ((profiles ?? []) as Pick<DbUserProfile, 'user_id' | 'display_name' | 'username'>[]).map(
      (p) => [p.user_id, p.display_name || p.username || 'Someone'],
    ),
  )

  // Group by emoji
  const groupMap = new Map<string, { userIds: string[] }>()
  for (const r of reactions) {
    if (!groupMap.has(r.emoji)) groupMap.set(r.emoji, { userIds: [] })
    groupMap.get(r.emoji)!.userIds.push(r.userId)
  }

  // Return in fixed-emoji order so display is consistent
  const result: ReactionGroup[] = []
  for (const emoji of REACTION_EMOJIS) {
    const g = groupMap.get(emoji)
    if (!g) continue
    result.push({
      emoji,
      count: g.userIds.length,
      isMine: !!user && g.userIds.includes(user.id),
      displayNames: g.userIds.map((id) => nameMap.get(id) ?? 'Someone'),
    })
  }
  return result
}

// Toggle a reaction (add if not mine, remove if mine). Returns new isMine state.
export async function toggleReaction(
  gameId: string,
  emoji: string,
  gameOwnerId: string,
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('[engagementStore] toggleReaction: not authenticated')

  const existing = await listReactions(gameId)
  const alreadyMine = existing.some((r) => r.userId === user.id && r.emoji === emoji)

  if (alreadyMine) {
    await dbRemoveReaction(gameId, emoji)
    return false
  } else {
    await dbAddReaction(gameId, emoji)

    // Notify the game owner (debounce: one notification per actor per game per hour)
    if (gameOwnerId !== user.id) {
      const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString()
      const { data: recent } = await db
        .from('notifications')
        .select('id')
        .eq('type', 'reaction')
        .eq('actor_user_id', user.id)
        .eq('subject_id', gameId)
        .eq('subject_type', 'game')
        .gte('created_at', oneHourAgo)
        .limit(1)
        .maybeSingle()

      if (!recent) {
        await db.from('notifications').insert({
          user_id: gameOwnerId,
          type: 'reaction',
          actor_user_id: user.id,
          subject_id: gameId,
          subject_type: 'game',
        })
      }
    }

    // Trigger engagement highlight check
    db.rpc('maybe_promote_engagement_highlight', { p_game_id: gameId }).catch(() => {})

    return true
  }
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function getCommentsWithProfiles(gameId: string): Promise<CommentWithProfile[]> {
  const { data: { user } } = await supabase.auth.getUser()

  const comments = await listComments(gameId)
  if (comments.length === 0) return []

  const authorIds = [...new Set(comments.map((c) => c.userId))]
  const { data: profiles } = await db
    .from('user_profiles')
    .select('user_id, display_name, username, profile_photo_url')
    .in('user_id', authorIds)

  const profileMap = new Map(
    ((profiles ?? []) as DbUserProfile[]).map((p) => [p.user_id, p]),
  )

  const now = Date.now()
  return comments.map((c) => {
    const p = profileMap.get(c.userId)
    const ageMs = now - new Date(c.createdAt).getTime()
    return {
      id: c.id,
      content: c.content,
      userId: c.userId,
      displayName: p?.display_name ?? null,
      username: p?.username ?? null,
      avatarUrl: p?.profile_photo_url ?? null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      isEditable: !!user && c.userId === user.id && ageMs < 5 * 60 * 1000,
      canDelete: !!user && c.userId === user.id,
    }
  })
}

export async function submitComment(
  gameId: string,
  content: string,
  gameOwnerId: string,
): Promise<CommentWithProfile> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('[engagementStore] submitComment: not authenticated')

  const comment = await dbAddComment(gameId, content)

  // Fetch caller's profile for immediate display
  const { data: myProfile } = await db
    .from('user_profiles')
    .select('display_name, username, profile_photo_url')
    .eq('user_id', user.id)
    .maybeSingle()

  const p = myProfile as Pick<DbUserProfile, 'display_name' | 'username' | 'profile_photo_url'> | null

  // Notify game owner (one notification per comment, always)
  if (gameOwnerId !== user.id) {
    await db.from('notifications').insert({
      user_id: gameOwnerId,
      type: 'comment',
      actor_user_id: user.id,
      subject_id: gameId,
      subject_type: 'game',
    })
  }

  // Trigger engagement highlight check
  db.rpc('maybe_promote_engagement_highlight', { p_game_id: gameId }).catch(() => {})

  return {
    id: comment.id,
    content: comment.content,
    userId: comment.userId,
    displayName: p?.display_name ?? null,
    username: p?.username ?? null,
    avatarUrl: p?.profile_photo_url ?? null,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    isEditable: true,
    canDelete: true,
  }
}

export async function removeComment(commentId: string): Promise<void> {
  return dbDeleteComment(commentId)
}

// ─── "I Was There Too!" ───────────────────────────────────────────────────────

// Find the current user's own games that are plausibly the same physical event
// as the friend's game: same sport + same date + (same home team OR same venue).
export async function findMatchingGames(friendGame: Game): Promise<Game[]> {
  if (!friendGame.date) return []
  const myGames = await getAllGames()
  return myGames.filter((g) => {
    if (g.date !== friendGame.date) return false
    if ((g.sportId ?? 'nfl') !== (friendGame.sportId ?? 'nfl')) return false
    return (
      g.homeTeam === friendGame.homeTeam ||
      (g.venue && friendGame.venue && g.venue === friendGame.venue)
    )
  })
}

// Create a game_attendance_links row. game_a_id < game_b_id (normalized).
// Returns the new link's id.
export async function createAttendanceLink(
  myGameId: string,
  friendGameId: string,
  friendUserId: string,
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('[engagementStore] createAttendanceLink: not authenticated')

  const [aId, bId] = myGameId < friendGameId
    ? [myGameId, friendGameId]
    : [friendGameId, myGameId]

  const { data, error } = await db
    .from('game_attendance_links')
    .insert({ game_a_id: aId, game_b_id: bId, linked_by_user_id: user.id })
    .select('id')
    .single()

  if (error) throw new Error(`[engagementStore] createAttendanceLink: ${error.message}`)

  // Notify the game owner
  if (friendUserId !== user.id) {
    await db.from('notifications').insert({
      user_id: friendUserId,
      type: 'attendance_link',
      actor_user_id: user.id,
      subject_id: friendGameId,
      subject_type: 'game',
    })
  }

  return (data as { id: string }).id
}

export async function removeAttendanceLink(linkId: string): Promise<void> {
  const { error } = await db.from('game_attendance_links').delete().eq('id', linkId)
  if (error) throw new Error(`[engagementStore] removeAttendanceLink: ${error.message}`)
}

// Get all attendance links for a given game, with the other game's info + owner profile.
export async function getAttendanceLinks(gameId: string): Promise<AttendanceLinkEntry[]> {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: links, error } = await db
    .from('game_attendance_links')
    .select('id, game_a_id, game_b_id, linked_by_user_id')
    .or(`game_a_id.eq.${gameId},game_b_id.eq.${gameId}`)

  if (error || !links?.length) return []

  const linkRows = links as { id: string; game_a_id: string; game_b_id: string; linked_by_user_id: string }[]

  // For each link, the "linked" (other) game is the one that isn't `gameId`
  const linkedGameIds = linkRows.map((l) => (l.game_a_id === gameId ? l.game_b_id : l.game_a_id))

  const gamesRes = await db.from('games').select('id, user_id, home_team, away_team, date, venue').in('id', linkedGameIds)

  // Fetch owner profiles
  const ownerIds = [...new Set(((gamesRes.data ?? []) as { user_id: string }[]).map((g) => g.user_id))]
  const { data: ownerProfiles } = ownerIds.length
    ? await db.from('user_profiles').select('user_id, display_name, username, profile_photo_url').in('user_id', ownerIds)
    : { data: [] }

  const gameMap = new Map(
    ((gamesRes.data ?? []) as { id: string; user_id: string; home_team: string | null; away_team: string | null; date: string | null; venue: string | null }[]).map(
      (g) => [g.id, g],
    ),
  )
  const ownerMap = new Map(
    ((ownerProfiles ?? []) as DbUserProfile[]).map((p) => [p.user_id, p]),
  )

  const result: AttendanceLinkEntry[] = []
  for (const l of linkRows) {
    const linkedId = l.game_a_id === gameId ? l.game_b_id : l.game_a_id
    const g = gameMap.get(linkedId)
    if (!g) continue
    const owner = ownerMap.get(g.user_id)
    result.push({
      id: l.id,
      myGameId: gameId,
      linkedGameId: linkedId,
      linkedGameOwnerId: g.user_id,
      linkedGameOwnerDisplayName: owner?.display_name ?? owner?.username ?? null,
      linkedGameOwnerAvatarUrl: owner?.profile_photo_url ?? null,
      linkedGame: {
        id: linkedId,
        homeTeam: g.home_team ?? '',
        awayTeam: g.away_team ?? '',
        date: g.date ?? undefined,
        venue: g.venue ?? undefined,
      },
      isLinkedByMe: l.linked_by_user_id === user?.id,
    })
  }
  return result
}

// Check if an existing link exists between two games. Returns the link ID or null.
export async function getExistingLink(myGameId: string, friendGameId: string): Promise<string | null> {
  const [aId, bId] = myGameId < friendGameId
    ? [myGameId, friendGameId]
    : [friendGameId, myGameId]

  const { data } = await db
    .from('game_attendance_links')
    .select('id')
    .eq('game_a_id', aId)
    .eq('game_b_id', bId)
    .maybeSingle()

  return data ? (data as { id: string }).id : null
}

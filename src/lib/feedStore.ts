// feedStore.ts — Data access layer for the Friends Feed (F4).
// Fetches friends' shared games, respects mutes/blocks (application-layer),
// and computes anniversary highlights client-side (no DB writes needed).

import { supabase } from '@/lib/supabase'
import { dbGameToGame, dbProfileToProfile, type DbGame, type DbUserProfile, type UserProfile } from '@/types/database'
import type { Game } from '@/types/Game'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FeedItem {
  game: Game
  ownerId: string
  owner: UserProfile
  isAnniversary: boolean
  anniversaryYears: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const FEED_PAGE_SIZE = 20

const ANNIVERSARY_YEARS = [1, 5, 10, 15, 20, 25, 30, 40, 50]

export function computeAnniversary(game: Game): { isAnniversary: boolean; years: number } {
  if (!game.date) return { isAnniversary: false, years: 0 }
  const today = new Date()
  const gameDate = new Date(game.date + 'T00:00:00') // local midnight
  for (const years of ANNIVERSARY_YEARS) {
    if (
      gameDate.getMonth() === today.getMonth() &&
      gameDate.getDate() === today.getDate() &&
      today.getFullYear() - gameDate.getFullYear() === years
    ) {
      return { isAnniversary: true, years }
    }
  }
  return { isAnniversary: false, years: 0 }
}

export function isActiveHighlight(game: Game): boolean {
  return !!(
    game.isHighlight &&
    game.highlightPinnedUntil &&
    new Date(game.highlightPinnedUntil) > new Date()
  )
}

function fallbackProfile(userId: string): UserProfile {
  return {
    userId,
    username: null,
    displayName: 'Unknown',
    bio: null,
    profilePhotoUrl: null,
    shareCode: '',
    isDiscoverableByUsername: false,
    isDiscoverableByEmail: false,
    isDiscoverableByShareCode: false,
    privacyMode: false,
    createdAt: '',
    updatedAt: '',
  }
}

// ─── Feed query ───────────────────────────────────────────────────────────────

export async function getFriendsFeed(
  page = 0,
): Promise<{ items: FeedItem[]; hasMore: boolean; friendCount: number }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { items: [], hasMore: false, friendCount: 0 }

  // 1. My friend IDs
  const { data: friendships } = await db
    .from('friendships')
    .select('user_a_id, user_b_id') as { data: { user_a_id: string; user_b_id: string }[] | null }

  const allFriendIds = (friendships ?? []).map((f) =>
    f.user_a_id === user.id ? f.user_b_id : f.user_a_id,
  )
  if (allFriendIds.length === 0) return { items: [], hasMore: false, friendCount: 0 }

  // 2. Exclude muted and blocked friends
  const [mutedRes, blockedRes] = await Promise.all([
    db.from('muted_users').select('muted_user_id').eq('muter_user_id', user.id),
    db.from('blocked_users').select('blocked_user_id').eq('blocker_user_id', user.id),
  ])
  const excludeIds = new Set<string>([
    ...((mutedRes.data ?? []) as { muted_user_id: string }[]).map((m) => m.muted_user_id),
    ...((blockedRes.data ?? []) as { blocked_user_id: string }[]).map((b) => b.blocked_user_id),
  ])
  const friendIds = allFriendIds.filter((id) => !excludeIds.has(id))
  if (friendIds.length === 0) return { items: [], hasMore: false, friendCount: allFriendIds.length }

  // 3. Fetch PAGE_SIZE+1 games to detect whether more pages exist
  const from = page * FEED_PAGE_SIZE
  const { data: rows } = await db
    .from('games')
    .select('*')
    .in('user_id', friendIds)
    .eq('is_shared_with_friends', true)
    .order('highlight_pinned_until', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, from + FEED_PAGE_SIZE) as { data: DbGame[] | null }

  const dbRows = rows ?? []
  const hasMore = dbRows.length > FEED_PAGE_SIZE
  const pageRows = dbRows.slice(0, FEED_PAGE_SIZE)

  if (pageRows.length === 0) return { items: [], hasMore: false, friendCount: allFriendIds.length }

  // 4. Fetch owner profiles
  const ownerIds = [...new Set(pageRows.map((r) => r.user_id))]
  const { data: profileRows } = await db
    .from('user_profiles')
    .select('*')
    .in('user_id', ownerIds) as { data: DbUserProfile[] | null }

  const profileMap = new Map<string, UserProfile>(
    (profileRows ?? []).map((p) => [p.user_id, dbProfileToProfile(p)]),
  )

  // 5. Map to FeedItem with client-side anniversary detection
  const items: FeedItem[] = pageRows.map((row) => {
    const game = dbGameToGame(row)
    const ann = computeAnniversary(game)
    return {
      game,
      ownerId: row.user_id,
      owner: profileMap.get(row.user_id) ?? fallbackProfile(row.user_id),
      isAnniversary: ann.isAnniversary,
      anniversaryYears: ann.years,
    }
  })

  return { items, hasMore, friendCount: allFriendIds.length }
}

// ─── Single game (for /feed/:gameId) ─────────────────────────────────────────

export async function getFriendGameById(gameId: string): Promise<FeedItem | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch the game — games RLS already enforces friend+shared visibility
  const { data: row } = await db
    .from('games')
    .select('*')
    .eq('id', gameId)
    .eq('is_shared_with_friends', true)
    .maybeSingle() as { data: DbGame | null }

  if (!row || row.user_id === user.id) return null  // own game → use /game/:id instead

  // Must be a friend (redundant with RLS, but guard against privacy_mode edge cases)
  const { data: friendship } = await db
    .from('friendships')
    .select('id')
    .eq('user_a_id', row.user_id < user.id ? row.user_id : user.id)
    .eq('user_b_id', row.user_id < user.id ? user.id : row.user_id)
    .maybeSingle()
  if (!friendship) return null

  // Respect mute/block
  const [mutedCheck, blockedCheck] = await Promise.all([
    db.from('muted_users').select('muted_user_id').eq('muter_user_id', user.id).eq('muted_user_id', row.user_id).maybeSingle(),
    db.from('blocked_users').select('blocked_user_id').eq('blocker_user_id', user.id).eq('blocked_user_id', row.user_id).maybeSingle(),
  ])
  if (mutedCheck.data || blockedCheck.data) return null

  const { data: profileRow } = await db
    .from('user_profiles')
    .select('*')
    .eq('user_id', row.user_id)
    .maybeSingle() as { data: DbUserProfile | null }

  const game = dbGameToGame(row)
  const ann = computeAnniversary(game)
  return {
    game,
    ownerId: row.user_id,
    owner: profileRow ? dbProfileToProfile(profileRow) : fallbackProfile(row.user_id),
    isAnniversary: ann.isAnniversary,
    anniversaryYears: ann.years,
  }
}

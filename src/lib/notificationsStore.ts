// notificationsStore.ts — Rich notification loading with actor profiles,
// formatted text, navigation destinations, and anniversary notification creation.

import { supabase } from '@/lib/supabase'
import {
  dbNotificationToNotification,
  type DiaryNotification,
  type DbNotification,
  type DbUserProfile,
} from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RichNotification extends DiaryNotification {
  actorDisplayName: string | null
  actorAvatarUrl: string | null
  text: string
  destination: string
  emoji: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function notifEmoji(type: DiaryNotification['type']): string {
  switch (type) {
    case 'friend_request':   return '👋'
    case 'friend_accepted':  return '🤝'
    case 'tagged':           return '🏷️'
    case 'comment':          return '💬'
    case 'reaction':         return '🔥'
    case 'attendance_link':  return '🎟️'
    case 'milestone':        return '🏆'
    case 'anniversary':      return '📅'
    default:                 return '🔔'
  }
}

function notifText(type: DiaryNotification['type'], actorName: string | null): string {
  const name = actorName ?? 'Someone'
  switch (type) {
    case 'friend_request':  return `${name} wants to be friends`
    case 'friend_accepted': return `${name} accepted your friend request`
    case 'tagged':          return `${name} tagged you in a game`
    case 'comment':         return `${name} commented on your game`
    case 'reaction':        return `${name} reacted to your game`
    case 'attendance_link': return `${name} was also at your game`
    case 'milestone':       return 'You unlocked a new milestone!'
    case 'anniversary':     return 'A game in your diary has an anniversary today'
    default:                return 'New activity in your diary'
  }
}

function notifDestination(n: DiaryNotification): string {
  switch (n.type) {
    case 'friend_request':  return '/friends?tab=requests'
    case 'friend_accepted': return n.actorUserId ? `/user/${n.actorUserId}` : '/friends'
    case 'tagged':
    case 'comment':
    case 'reaction':
    case 'attendance_link':
    case 'anniversary':     return n.subjectId ? `/game/${n.subjectId}` : '/'
    case 'milestone':       return '/stats'
    default:                return '/'
  }
}

export function formatTimeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getNotifications(page = 0): Promise<{ items: RichNotification[]; hasMore: boolean }> {
  const from = page * PAGE_SIZE
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS).toISOString()

  const { data, error } = await db
    .from('notifications')
    .select('*')
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE) // +1 to detect hasMore

  if (error || !data?.length) return { items: [], hasMore: false }

  const rows = data as DbNotification[]
  const hasMore = rows.length > PAGE_SIZE
  const pageRows = rows.slice(0, PAGE_SIZE)

  const actorIds = [...new Set(
    pageRows.map((r) => r.actor_user_id).filter(Boolean) as string[]
  )]
  const profileMap = new Map<string, DbUserProfile>()

  if (actorIds.length) {
    const { data: profiles } = await db
      .from('user_profiles')
      .select('user_id, display_name, username, profile_photo_url')
      .in('user_id', actorIds)
    for (const p of (profiles ?? []) as DbUserProfile[]) profileMap.set(p.user_id, p)
  }

  const items: RichNotification[] = pageRows.map((row) => {
    const n = dbNotificationToNotification(row)
    const actor = n.actorUserId ? profileMap.get(n.actorUserId) : undefined
    const actorName = actor?.display_name || actor?.username || null
    return {
      ...n,
      actorDisplayName: actorName,
      actorAvatarUrl: actor?.profile_photo_url ?? null,
      text: notifText(n.type, actorName),
      destination: notifDestination(n),
      emoji: notifEmoji(n.type),
    }
  })

  return { items, hasMore }
}

// ─── Mark read ────────────────────────────────────────────────────────────────

export async function markAllRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await db.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
}

export async function markOneRead(notifId: string): Promise<void> {
  await db.from('notifications').update({ read: true }).eq('id', notifId)
}

// ─── Unread count ─────────────────────────────────────────────────────────────

export async function getUnreadCount(): Promise<number> {
  const { count, error } = await db
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false)
  if (error) return 0
  return count ?? 0
}

// ─── Anniversary notifications ────────────────────────────────────────────────
// Called from Home.tsx after own games load. Inserts a notification row once
// per anniversary year per game (deduped via localStorage so it fires at most
// once per day per game+year combination).

export async function maybeFireAnniversaryNotifications(
  anniversaryGames: { gameId: string; years: number }[],
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !anniversaryGames.length) return

  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  for (const { gameId, years } of anniversaryGames) {
    const key = `anniv_notif_${gameId}_${years}`
    if (localStorage.getItem(key) === today) continue

    try {
      await db.from('notifications').insert({
        user_id: user.id,
        type: 'anniversary',
        actor_user_id: null,
        subject_id: gameId,
        subject_type: 'game',
      })
      localStorage.setItem(key, today)
    } catch {
      // network error or duplicate — skip silently
    }
  }
}

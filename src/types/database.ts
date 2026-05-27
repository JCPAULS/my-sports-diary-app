import type { Game } from '@/types/Game'

// ─── Existing table row shapes ────────────────────────────────────────────────

export interface DbGame {
  id: string
  user_id: string
  created_at: string
  updated_at: string

  sport_id: string
  college_sport_type: string | null

  date: string | null
  season: string | null
  schedule_label: string | null
  week: string | null
  season_type: string | null

  home_team: string | null
  away_team: string | null
  home_score: number | null
  away_score: number | null

  venue: string | null
  section: string | null
  row: string | null
  seat_numbers: string | null

  rooting_for: string | null
  notes: string | null
  who_was_there: string | null
  attendees: string[] | null
  mvp: string | null
  vibe: string | null
  what_you_wore: string | null
  what_you_ate: string | null
  who_drove: string | null
  pregame_ritual: string | null

  level: string | null

  photos: string[] | null
  outfit_photo: string | null

  summary: string | null
  espn_event_id: string | null
  nickname: string | null

  // Friends feature (added in migration 005)
  is_shared_with_friends: boolean
  is_highlight: boolean
  highlight_pinned_until: string | null
}

export interface DbUserSettings {
  user_id: string
  followed_teams: Record<string, string[]>
  primary_favorite_team: { sportId: string; teamName: string } | null
  theme_mode: 'classic' | 'team'
  seen_milestones: string[]
  created_at: string
  updated_at: string
}

// ─── Social table row shapes (snake_case, mirrors SQL schema) ─────────────────

export interface DbUserProfile {
  user_id: string
  username: string | null
  display_name: string | null
  bio: string | null
  profile_photo_url: string | null
  share_code: string
  is_discoverable_by_username: boolean
  is_discoverable_by_email: boolean
  is_discoverable_by_share_code: boolean
  privacy_mode: boolean
  created_at: string
  updated_at: string
}

export interface DbFriendship {
  id: string
  user_a_id: string
  user_b_id: string
  created_at: string
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'denied' | 'cancelled'

export interface DbFriendRequest {
  id: string
  from_user_id: string
  to_user_id: string
  status: FriendRequestStatus
  created_at: string
  responded_at: string | null
}

export interface DbGameTag {
  id: string
  game_id: string
  tagged_user_id: string
  tagged_by_user_id: string
  removed_by_tagged_user: boolean
  created_at: string
}

export interface DbGameReaction {
  id: string
  game_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface DbGameComment {
  id: string
  game_id: string
  user_id: string
  content: string
  parent_comment_id: string | null
  created_at: string
  updated_at: string
}

export interface DbAttendanceLink {
  id: string
  game_a_id: string
  game_b_id: string
  linked_by_user_id: string
  created_at: string
}

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'tagged'
  | 'comment'
  | 'reaction'
  | 'attendance_link'
  | 'milestone'
  | 'anniversary'

export type NotificationSubjectType = 'game' | 'friend_request' | 'comment' | null

export interface DbNotification {
  id: string
  user_id: string
  type: NotificationType
  actor_user_id: string | null
  subject_id: string | null
  subject_type: NotificationSubjectType
  read: boolean
  created_at: string
}

export interface DbBlockedUser {
  id: string
  blocker_user_id: string
  blocked_user_id: string
  created_at: string
}

export interface DbMutedUser {
  id: string
  muter_user_id: string
  muted_user_id: string
  created_at: string
}

// ─── App-layer types (camelCase) ──────────────────────────────────────────────

export interface UserProfile {
  userId: string
  username: string | null
  displayName: string | null
  bio: string | null
  profilePhotoUrl: string | null
  shareCode: string
  isDiscoverableByUsername: boolean
  isDiscoverableByEmail: boolean
  isDiscoverableByShareCode: boolean
  privacyMode: boolean
  createdAt: string
  updatedAt: string
}

export interface Friendship {
  id: string
  userAId: string
  userBId: string
  createdAt: string
}

export interface FriendRequest {
  id: string
  fromUserId: string
  toUserId: string
  status: FriendRequestStatus
  createdAt: string
  respondedAt: string | null
}

export interface GameTag {
  id: string
  gameId: string
  taggedUserId: string
  taggedByUserId: string
  removedByTaggedUser: boolean
  createdAt: string
}

export interface GameReaction {
  id: string
  gameId: string
  userId: string
  emoji: string
  createdAt: string
}

export interface GameComment {
  id: string
  gameId: string
  userId: string
  content: string
  parentCommentId: string | null
  createdAt: string
  updatedAt: string
}

export interface AttendanceLink {
  id: string
  gameAId: string
  gameBId: string
  linkedByUserId: string
  createdAt: string
}

export interface DiaryNotification {
  id: string
  userId: string
  type: NotificationType
  actorUserId: string | null
  subjectId: string | null
  subjectType: NotificationSubjectType
  read: boolean
  createdAt: string
}

export interface BlockedUser {
  id: string
  blockerUserId: string
  blockedUserId: string
  createdAt: string
}

export interface MutedUser {
  id: string
  muterUserId: string
  mutedUserId: string
  createdAt: string
}

// ─── Database type (used to type the Supabase client) ────────────────────────

export interface Database {
  public: {
    Tables: {
      games: {
        Row: DbGame
        Insert: Omit<DbGame, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<DbGame, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
      user_settings: {
        Row: DbUserSettings
        Insert: Omit<DbUserSettings, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<DbUserSettings, 'user_id' | 'created_at'>>
        Relationships: []
      }
      user_profiles: {
        Row: DbUserProfile
        Insert: Omit<DbUserProfile, 'created_at' | 'updated_at' | 'share_code'> & {
          share_code?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<DbUserProfile, 'user_id' | 'created_at'>>
        Relationships: []
      }
      friendships: {
        Row: DbFriendship
        Insert: { user_a_id: string; user_b_id: string; id?: string; created_at?: string }
        Update: Record<string, unknown>
        Relationships: []
      }
      friend_requests: {
        Row: DbFriendRequest
        Insert: {
          from_user_id: string
          to_user_id: string
          status?: FriendRequestStatus
          id?: string
          created_at?: string
          responded_at?: string | null
        }
        Update: { status?: FriendRequestStatus; responded_at?: string | null }
        Relationships: []
      }
      game_tags: {
        Row: DbGameTag
        Insert: {
          game_id: string
          tagged_user_id: string
          tagged_by_user_id: string
          removed_by_tagged_user?: boolean
          id?: string
          created_at?: string
        }
        Update: { removed_by_tagged_user?: boolean }
        Relationships: []
      }
      game_reactions: {
        Row: DbGameReaction
        Insert: { game_id: string; user_id: string; emoji: string; id?: string; created_at?: string }
        Update: Record<string, unknown>
        Relationships: []
      }
      game_comments: {
        Row: DbGameComment
        Insert: {
          game_id: string
          user_id: string
          content: string
          parent_comment_id?: string | null
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: { content?: string; updated_at?: string }
        Relationships: []
      }
      game_attendance_links: {
        Row: DbAttendanceLink
        Insert: {
          game_a_id: string
          game_b_id: string
          linked_by_user_id: string
          id?: string
          created_at?: string
        }
        Update: Record<string, unknown>
        Relationships: []
      }
      notifications: {
        Row: DbNotification
        Insert: {
          user_id: string
          type: NotificationType
          actor_user_id?: string | null
          subject_id?: string | null
          subject_type?: NotificationSubjectType
          read?: boolean
          id?: string
          created_at?: string
        }
        Update: { read?: boolean }
        Relationships: []
      }
      blocked_users: {
        Row: DbBlockedUser
        Insert: { blocker_user_id: string; blocked_user_id: string; id?: string; created_at?: string }
        Update: Record<string, unknown>
        Relationships: []
      }
      muted_users: {
        Row: DbMutedUser
        Insert: { muter_user_id: string; muted_user_id: string; id?: string; created_at?: string }
        Update: Record<string, unknown>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      accept_friend_request: {
        Args: { request_id: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

export function dbGameToGame(row: DbGame): Game {
  return {
    id: row.id,
    sportId: row.sport_id,
    collegeSportType: row.college_sport_type ?? undefined,

    date: row.date ?? undefined,
    season: row.season ?? undefined,
    scheduleLabel: row.schedule_label ?? undefined,
    week: row.week ?? undefined,

    homeTeam: row.home_team ?? '',
    awayTeam: row.away_team ?? '',
    homeScore: row.home_score ?? undefined,
    awayScore: row.away_score ?? undefined,

    venue: row.venue ?? undefined,
    section: row.section ?? undefined,
    row: row.row ?? undefined,
    seatNumbers: row.seat_numbers ?? undefined,

    rootingFor: row.rooting_for ?? undefined,
    notes: row.notes ?? undefined,
    whoWasThere: row.who_was_there ?? undefined,
    attendees: row.attendees ?? undefined,
    mvp: row.mvp ?? undefined,
    vibe: row.vibe ?? undefined,
    whatYouWore: row.what_you_wore ?? undefined,
    whatYouAte: row.what_you_ate ?? undefined,
    whoDrove: row.who_drove ?? undefined,
    pregameRitual: row.pregame_ritual ?? undefined,

    level: row.level ?? undefined,

    photos: row.photos ?? undefined,
    outfitPhoto: row.outfit_photo ?? undefined,

    summary: row.summary ?? undefined,
    nickname: row.nickname ?? undefined,

    isSharedWithFriends: row.is_shared_with_friends,
    isHighlight: row.is_highlight,
    highlightPinnedUntil: row.highlight_pinned_until ?? undefined,

    createdAt: row.created_at,
  }
}

export function gameToDbGame(
  game: Game,
  userId: string,
): Omit<DbGame, 'created_at' | 'updated_at'> {
  return {
    id: game.id,
    user_id: userId,

    sport_id: game.sportId ?? 'nfl',
    college_sport_type: game.collegeSportType ?? null,

    date: game.date ?? null,
    season: game.season ?? null,
    schedule_label: game.scheduleLabel ?? null,
    week: game.week ?? null,
    season_type: null,

    home_team: game.homeTeam ?? null,
    away_team: game.awayTeam ?? null,
    home_score: game.homeScore ?? null,
    away_score: game.awayScore ?? null,

    venue: game.venue ?? null,
    section: game.section ?? null,
    row: game.row ?? null,
    seat_numbers: game.seatNumbers ?? null,

    rooting_for: game.rootingFor ?? null,
    notes: game.notes ?? null,
    who_was_there: game.whoWasThere ?? null,
    attendees: game.attendees ?? null,
    mvp: game.mvp ?? null,
    vibe: game.vibe ?? null,
    what_you_wore: game.whatYouWore ?? null,
    what_you_ate: game.whatYouAte ?? null,
    who_drove: game.whoDrove ?? null,
    pregame_ritual: game.pregameRitual ?? null,

    level: game.level ?? null,

    photos: game.photos ?? null,
    outfit_photo: game.outfitPhoto ?? null,

    summary: game.summary ?? null,
    espn_event_id: null,
    nickname: game.nickname ?? null,

    is_shared_with_friends: game.isSharedWithFriends ?? true,
    is_highlight: game.isHighlight ?? false,
    highlight_pinned_until: game.highlightPinnedUntil ?? null,
  }
}

// ─── Social converters ────────────────────────────────────────────────────────

export function dbProfileToProfile(row: DbUserProfile): UserProfile {
  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    profilePhotoUrl: row.profile_photo_url,
    shareCode: row.share_code,
    isDiscoverableByUsername: row.is_discoverable_by_username,
    isDiscoverableByEmail: row.is_discoverable_by_email,
    isDiscoverableByShareCode: row.is_discoverable_by_share_code,
    privacyMode: row.privacy_mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function dbFriendRequestToFriendRequest(row: DbFriendRequest): FriendRequest {
  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  }
}

export function dbNotificationToNotification(row: DbNotification): DiaryNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    actorUserId: row.actor_user_id,
    subjectId: row.subject_id,
    subjectType: row.subject_type,
    read: row.read,
    createdAt: row.created_at,
  }
}

export function dbGameTagToGameTag(row: DbGameTag): GameTag {
  return {
    id: row.id,
    gameId: row.game_id,
    taggedUserId: row.tagged_user_id,
    taggedByUserId: row.tagged_by_user_id,
    removedByTaggedUser: row.removed_by_tagged_user,
    createdAt: row.created_at,
  }
}

export function dbGameReactionToGameReaction(row: DbGameReaction): GameReaction {
  return {
    id: row.id,
    gameId: row.game_id,
    userId: row.user_id,
    emoji: row.emoji,
    createdAt: row.created_at,
  }
}

export function dbGameCommentToGameComment(row: DbGameComment): GameComment {
  return {
    id: row.id,
    gameId: row.game_id,
    userId: row.user_id,
    content: row.content,
    parentCommentId: row.parent_comment_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

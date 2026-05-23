import type { Game } from '@/types/Game'

// ─── Database row shapes (snake_case, mirrors SQL schema) ─────────────────────

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
      }
      user_settings: {
        Row: DbUserSettings
        Insert: Omit<DbUserSettings, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<DbUserSettings, 'user_id' | 'created_at'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

/** Convert a database row to the app's Game type. */
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

    createdAt: row.created_at,
  }
}

/** Convert the app's Game type to a database insert/update payload. */
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
  }
}

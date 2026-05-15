// ─── Generic sport types ──────────────────────────────────────────────────────

export interface Team {
  id: string
  sportId: string
  name: string            // full display name, e.g. "New England Patriots"
  abbreviation: string    // e.g. "NE"
  primaryColor: string    // hex
  textColor: string
}

export interface GameResult {
  id: string
  sportId: string
  date: string
  homeTeam: string
  awayTeam: string
  homeScore?: number
  awayScore?: number
  venue?: string
  season?: string
  seasonType?: 'preseason' | 'regular' | 'postseason'
  week?: string           // "1"–"18", "wild_card", "divisional", "conference", "super_bowl", "pre_N"
  scheduleLabel?: string  // human-readable label, e.g. "WEEK 5 · 2024 SEASON"
  summary?: string        // ESPN article headline, lazily fetched
}

// Backwards-compat aliases
export type NflTeam = Team
export type NflGameResult = GameResult

// ─── Diary entry ─────────────────────────────────────────────────────────────

export interface Game {
  id: string
  sportId?: string        // 'nfl', 'mlb', etc. — undefined for legacy entries (treated as 'nfl')
  sport?: string          // deprecated display string kept for legacy entries, e.g. "NFL"
  week?: string           // "1"–"18", "wild_card", "divisional", etc.
  season?: string         // season start year, e.g. "2024"
  date?: string           // YYYY-MM-DD — optional; auto-filled from schedule lookup
  scheduleLabel?: string  // human-readable week/date label from schedule lookup
  homeTeam: string
  awayTeam: string
  homeScore?: number
  awayScore?: number
  venue?: string
  notes?: string
  whoWasThere?: string
  createdAt: string       // ISO timestamp
  photos?: string[]       // base64 data URLs, capped at 5
  whatYouWore?: string
  whatYouAte?: string
  whoDrove?: string
  pregameRitual?: string
  vibe?: string           // short tag: "electric", "heartbreaker", etc.
  mvp?: string            // player or person who stood out
  summary?: string        // ESPN article headline, auto-filled from API
  level?: string          // custom games only: "Youth", "High School", "College Club", "Recreational", "Other"
  section?: string        // seating: e.g., "220" or "Field Level"
  row?: string            // seating: e.g., "H"
  seatNumbers?: string    // seating: e.g., "12-14" or "8, 9"
  attendees?: string[]    // structured array parsed from whoWasThere
  rootingFor?: string     // team name the user was rooting for
  collegeSportType?: string // college games only: "Football", "Basketball (Men's)", etc.
  outfitPhoto?: string    // single compressed photo of what you wore
}

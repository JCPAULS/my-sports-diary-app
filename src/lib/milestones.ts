import type { Game } from '@/types/Game'

// ─── Type ─────────────────────────────────────────────────────────────────────

export interface Milestone {
  id: string
  category: 'games' | 'teams' | 'stadiums' | 'sports' | 'people' | 'special'
  title: string
  description: string
  icon: string
  threshold: number
  checkUnlocked: (games: Game[]) => boolean
  getProgress: (games: Game[]) => { current: number; target: number }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function countVenues(games: Game[]): number {
  return new Set(games.flatMap((g) => (g.venue ? [g.venue] : []))).size
}

function countSports(games: Game[]): number {
  return new Set(games.map((g) => g.sportId ?? 'nfl')).size
}

function teamCounts(games: Game[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const g of games) {
    m[g.homeTeam] = (m[g.homeTeam] ?? 0) + 1
    m[g.awayTeam] = (m[g.awayTeam] ?? 0) + 1
  }
  return m
}

function personCounts(games: Game[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const g of games) {
    for (const p of g.attendees ?? []) {
      const k = p.toLowerCase().trim()
      if (k) m[k] = (m[k] ?? 0) + 1
    }
  }
  return m
}

function maxPersonCount(games: Game[]): number {
  const vals = Object.values(personCounts(games))
  return vals.length ? Math.max(...vals) : 0
}

function computeMaxStreak(games: Game[], type: 'win' | 'loss'): number {
  // Only dated games with a rootingFor and final score can form streaks
  const qualifying = games
    .filter((g) => g.date && g.homeScore !== undefined && g.awayScore !== undefined && g.rootingFor)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())

  let best = 0
  let run = 0
  for (const g of qualifying) {
    if (g.homeScore === g.awayScore) { run = 0; continue }
    const rootingHome = g.rootingFor === g.homeTeam
    const homeWon = g.homeScore! > g.awayScore!
    const won = (rootingHome && homeWon) || (!rootingHome && !homeWon)
    if ((type === 'win') === won) { run++; best = Math.max(best, run) }
    else run = 0
  }
  return best
}

function isPostseason(g: Game): boolean {
  if (g.week && ['wild_card', 'divisional', 'conference', 'super_bowl'].includes(g.week)) return true
  if (g.scheduleLabel &&
    /POSTSEASON|WILD CARD|DIVISION|CHAMPIONSHIP|FINAL FOUR|ELITE|SEMIFINALS|FINALS|PLAYOFF|BOWL/i
      .test(g.scheduleLabel)) return true
  return false
}

// All tracked sport IDs for the "Completionist" milestone
const ALL_SPORT_IDS = ['nfl', 'mlb', 'nba', 'nhl', 'mls', 'wnba', 'college']

// ─── Builder shorthands ───────────────────────────────────────────────────────

function byCount(
  id: string, category: Milestone['category'],
  title: string, description: string, icon: string, n: number,
  getValue: (games: Game[]) => number,
): Milestone {
  return {
    id, category, title, description, icon, threshold: n,
    checkUnlocked: (g) => getValue(g) >= n,
    getProgress:   (g) => ({ current: Math.min(getValue(g), n), target: n }),
  }
}

// ─── Milestone definitions ────────────────────────────────────────────────────

export const STATIC_MILESTONES: Milestone[] = [

  // GAMES ───────────────────────────────────────────────────────────────────
  byCount('games_1',   'games', 'First Game',      'Logged your first game',   '🎟️',   1, (g) => g.length),
  byCount('games_5',   'games', 'Getting Started', 'Logged 5 games',            '📖',   5, (g) => g.length),
  byCount('games_10',  'games', 'Double Digits',   'Logged 10 games',           '🔟',  10, (g) => g.length),
  byCount('games_25',  'games', 'Quarter Century', 'Logged 25 games',           '🏆',  25, (g) => g.length),
  byCount('games_50',  'games', 'Half Century',    'Logged 50 games',           '⭐',  50, (g) => g.length),
  byCount('games_100', 'games', 'Centurion',       'Logged 100 games',          '💯', 100, (g) => g.length),
  byCount('games_250', 'games', 'Diehard',         'Logged 250 games',          '🔥', 250, (g) => g.length),
  byCount('games_500', 'games', 'Living Legend',   'Logged 500 games',          '👑', 500, (g) => g.length),

  // STADIUMS ────────────────────────────────────────────────────────────────
  byCount('stadiums_1',  'stadiums', 'First Stadium', 'Visited your first venue',    '🏟️',  1, countVenues),
  byCount('stadiums_5',  'stadiums', 'Road Tripper',  'Visited 5 unique venues',     '🚗',  5, countVenues),
  byCount('stadiums_10', 'stadiums', 'Stadium Tour',  'Visited 10 unique venues',    '🗺️', 10, countVenues),
  byCount('stadiums_25', 'stadiums', 'Venue Veteran', 'Visited 25 unique venues',    '🏅', 25, countVenues),

  // SPORTS ──────────────────────────────────────────────────────────────────
  byCount('sports_2', 'sports', 'Multi-Sport Fan', 'Logged games in 2 different sports', '⚾', 2, countSports),
  byCount('sports_3', 'sports', 'Triple Threat',   'Logged games in 3 different sports', '🏀', 3, countSports),
  byCount('sports_5', 'sports', 'All-Arounder',    'Logged games in 5 different sports', '🌟', 5, countSports),
  {
    id: 'sports_all', category: 'sports',
    title: 'Completionist', description: 'Logged games in all 7 major sports',
    icon: '🎯', threshold: ALL_SPORT_IDS.length,
    checkUnlocked: (g) => {
      const s = new Set(g.map((x) => x.sportId ?? 'nfl'))
      return ALL_SPORT_IDS.every((id) => s.has(id))
    },
    getProgress: (g) => {
      const s = new Set(g.map((x) => x.sportId ?? 'nfl'))
      return { current: ALL_SPORT_IDS.filter((id) => s.has(id)).length, target: ALL_SPORT_IDS.length }
    },
  },

  // PEOPLE ──────────────────────────────────────────────────────────────────
  {
    id: 'people_1', category: 'people',
    title: 'Brought a Friend', description: 'Logged a game with someone',
    icon: '👋', threshold: 1,
    checkUnlocked: (g) => g.some((x) => (x.attendees?.length ?? 0) > 0),
    getProgress:   (g) => ({ current: g.some((x) => (x.attendees?.length ?? 0) > 0) ? 1 : 0, target: 1 }),
  },
  byCount('people_crew',      'people', 'Crew Assembled', 'Attended games with 5 different people', '👥',  5, (g) => Object.keys(personCounts(g)).length),
  byCount('people_tradition', 'people', 'Tradition',      'Went to 10 games with the same person',  '🤝', 10, maxPersonCount),
  byCount('people_dynasty',   'people', 'Dynasty',        'Went to 25 games with the same person',  '❤️', 25, maxPersonCount),

  // SPECIAL ─────────────────────────────────────────────────────────────────
  byCount('special_photos', 'special', 'Photographer', 'Added photos to 10 games',     '📸', 10,
    (g) => g.filter((x) => (x.photos?.length ?? 0) > 0).length),
  byCount('special_notes',  'special', 'Storyteller',  'Wrote notes for 10 games',     '✍️', 10,
    (g) => g.filter((x) => !!x.notes?.trim()).length),
  byCount('special_wins',   'special', 'The Lucky One',     'Won 5 consecutive games as a fan',           '🍀', 5, (g) => computeMaxStreak(g, 'win')),
  byCount('special_losses', 'special', 'Heartbreak Kid',    "Endured 5 straight losses — truly dedicated", '💔', 5, (g) => computeMaxStreak(g, 'loss')),
  {
    id: 'special_detail', category: 'special',
    title: 'Detail Oriented', description: 'Filled in all "little things" fields on a single game',
    icon: '🔎', threshold: 1,
    checkUnlocked: (g) => g.some((x) => !!(x.whatYouWore && x.whatYouAte && x.whoDrove && x.pregameRitual)),
    getProgress:   (g) => ({ current: g.some((x) => !!(x.whatYouWore && x.whatYouAte && x.whoDrove && x.pregameRitual)) ? 1 : 0, target: 1 }),
  },
  {
    id: 'special_playoff', category: 'special',
    title: 'Big Game Hunter', description: 'Attended a playoff or postseason game',
    icon: '🏆', threshold: 1,
    checkUnlocked: (g) => g.some(isPostseason),
    getProgress:   (g) => ({ current: g.some(isPostseason) ? 1 : 0, target: 1 }),
  },
]

// ─── Dynamic team milestones ──────────────────────────────────────────────────

const TEAM_TIERS: { suffix: string; threshold: number; label: string; icon: string }[] = [
  { suffix: '1',  threshold: 1,  label: 'First Visit', icon: '⚡' },
  { suffix: '5',  threshold: 5,  label: 'Regular',     icon: '🎽' },
  { suffix: '10', threshold: 10, label: 'Superfan',    icon: '🔥' },
  { suffix: '25', threshold: 25, label: 'Ride or Die', icon: '❤️' },
]

export function getTeamMilestones(games: Game[]): Milestone[] {
  const counts = teamCounts(games)
  const milestones: Milestone[] = []

  for (const team of Object.keys(counts)) {
    const safe = team.toLowerCase().replace(/[^a-z0-9]/g, '_')
    for (const { suffix, threshold, label, icon } of TEAM_TIERS) {
      const t = threshold  // capture for closure
      milestones.push({
        id: `team_${safe}_${suffix}`,
        category: 'teams',
        title: `${team} — ${label}`,
        description: `Attended ${t === 1 ? 'your first' : `${t}`} ${team} game${t === 1 ? '' : 's'}`,
        icon,
        threshold: t,
        checkUnlocked: (g) => (teamCounts(g)[team] ?? 0) >= t,
        getProgress:   (g) => ({ current: Math.min(teamCounts(g)[team] ?? 0, t), target: t }),
      })
    }
  }

  return milestones
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getAllMilestones(games: Game[]): Milestone[] {
  return [...STATIC_MILESTONES, ...getTeamMilestones(games)]
}

// ─── Seen milestone storage ───────────────────────────────────────────────────

const SEEN_KEY = 'sports-diary-seen-milestones'

export function getSeenMilestones(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

export function markMilestonesSeen(ids: string[]): void {
  try {
    const seen = getSeenMilestones()
    ids.forEach((id) => seen.add(id))
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
  } catch {
    // silently skip if storage is unavailable
  }
}

// ─── Newly unlocked detection ─────────────────────────────────────────────────

/**
 * Returns milestones that crossed from locked → unlocked after a save,
 * excluding any already acknowledged (in the seen set).
 */
export function detectNewMilestones(gamesBefore: Game[], gamesAfter: Game[]): Milestone[] {
  const unlockedBefore = new Set(
    getAllMilestones(gamesBefore)
      .filter((m) => m.checkUnlocked(gamesBefore))
      .map((m) => m.id)
  )
  const seen = getSeenMilestones()
  return getAllMilestones(gamesAfter).filter(
    (m) => m.checkUnlocked(gamesAfter) && !unlockedBefore.has(m.id) && !seen.has(m.id)
  )
}

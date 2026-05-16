import type { Team, GameResult } from '@/types/Game'
import { getSport } from '@/lib/sports'
import { hashTeamColor } from '@/lib/teams'

const TIMEOUT_MS = 10_000

const teamsCache = new Map<string, Team[]>()
const summaryCache = new Map<string, string | null>()

// ─── Internal fetch helper ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function espnFetch(url: string): Promise<any> {
  console.log('[espn]', url)
  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  } finally {
    clearTimeout(timerId)
  }
}

function espnBase(sportId: string): string {
  const sport = getSport(sportId)
  if (!sport || !sport.espnSport) throw new Error(`Unknown sport: ${sportId}`)
  return `https://site.api.espn.com/apis/site/v2/sports/${sport.espnSport}/${sport.espnLeague}`
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTeams(comp: any): { home: any; away: any } | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const competitors: any[] = comp?.competitors ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const home = competitors.find((c: any) => c.homeAway === 'home')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const away = competitors.find((c: any) => c.homeAway === 'away')
  return home && away ? { home, away } : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isFinalComp(comp: any): boolean {
  const name = comp?.status?.type?.name ?? ''
  return (
    name === 'STATUS_FINAL' ||
    name === 'STATUS_FINAL_OT' ||
    name === 'STATUS_FINAL_PENALTY' ||
    name === 'STATUS_FULL_TIME' ||       // soccer (MLS)
    name === 'STATUS_FULL_TIME_ET' ||    // soccer extra time
    name === 'STATUS_FULL_TIME_PEN'      // soccer penalty shootout
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCompScore(competitor: any): number | undefined {
  const s = competitor?.score
  if (s == null) return undefined
  if (typeof s === 'string') return s !== '' ? Number(s) : undefined
  if (typeof s === 'object' && s.displayValue !== undefined) return Number(s.displayValue)
  return undefined
}

// ─── NFL-specific parsing ─────────────────────────────────────────────────────

function nflPostseasonWeekKey(weekNum: number): string {
  const map: Record<number, string> = { 1: 'wild_card', 2: 'divisional', 3: 'conference', 5: 'super_bowl' }
  return map[weekNum] ?? `playoff_${weekNum}`
}

function nflScheduleLabel(week: string, season: string, seasonTypeNum: number): string {
  if (seasonTypeNum === 1) return `PRESEASON WEEK ${parseInt(week.replace('pre_', ''))} · ${season}`
  const postLabels: Record<string, string> = {
    wild_card: 'WILD CARD', divisional: 'DIVISIONAL ROUND',
    conference: 'CONFERENCE CHAMPIONSHIP', super_bowl: 'SUPER BOWL',
  }
  if (postLabels[week]) return `${postLabels[week]} · ${season} POSTSEASON`
  return `WEEK ${parseInt(week)} · ${season} SEASON`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseNflEvent(event: any, season: string): GameResult | null {
  try {
    const comp = event.competitions?.[0]
    if (!comp) return null
    const teams = getTeams(comp)
    if (!teams) return null
    const { home, away } = teams

    const isFinal = isFinalComp(comp)
    const seasonTypeNum: number = event.seasonType?.type ?? 2
    const weekNum: number = event.week?.number ?? 0
    const seasonType = seasonTypeNum === 1 ? 'preseason' : seasonTypeNum === 3 ? 'postseason' : 'regular'
    // ESPN numbers preseason starting at week 2 (week 1 = Hall of Fame game, not attended by most teams)
    const week = seasonTypeNum === 3 ? nflPostseasonWeekKey(weekNum)
      : seasonTypeNum === 1 ? `pre_${Math.max(1, weekNum - 1)}` : String(weekNum)
    const homeScore = isFinal ? parseCompScore(home) : undefined
    const awayScore = isFinal ? parseCompScore(away) : undefined
    return {
      id: event.id ?? '', sportId: 'nfl', date: (event.date ?? '').slice(0, 10),
      week, season, homeTeam: home.team?.displayName ?? '', awayTeam: away.team?.displayName ?? '',
      homeScore, awayScore,
      venue: comp.venue?.fullName ?? undefined, seasonType,
      scheduleLabel: nflScheduleLabel(week, season, seasonTypeNum),
    }
  } catch { return null }
}

// ─── MLB ─────────────────────────────────────────────────────────────────────

const MLB_POSTSEASON_ROUNDS: Record<string, string> = {
  'Wild Card Series': 'WILD CARD SERIES', 'Division Series': 'DIVISION SERIES',
  'League Championship Series': 'LEAGUE CHAMPIONSHIP SERIES', 'World Series': 'WORLD SERIES',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMlbEvent(event: any, season: string): GameResult | null {
  try {
    const comp = event.competitions?.[0]
    if (!comp) return null
    const teams = getTeams(comp)
    if (!teams) return null
    const { home, away } = teams
    const isFinal = isFinalComp(comp)
    const seasonTypeNum: number = event.seasonType?.type ?? 2
    const seasonType = seasonTypeNum === 1 ? 'preseason' : seasonTypeNum === 3 ? 'postseason' : 'regular'
    const gameNum: number = event.week?.number ?? 0
    let scheduleLabel: string
    if (seasonType === 'postseason') {
      const roundName = event.seasonType?.name ?? ''
      scheduleLabel = MLB_POSTSEASON_ROUNDS[roundName] ?? `POSTSEASON · ${season}`
    } else if (seasonType === 'preseason') {
      scheduleLabel = `SPRING TRAINING · ${season}`
    } else {
      scheduleLabel = gameNum ? `GAME ${gameNum} · ${season}` : `${season} SEASON`
    }
    return {
      id: event.id ?? '', sportId: 'mlb', date: (event.date ?? '').slice(0, 10),
      season, homeTeam: home.team?.displayName ?? '', awayTeam: away.team?.displayName ?? '',
      homeScore: isFinal ? parseCompScore(home) : undefined,
      awayScore: isFinal ? parseCompScore(away) : undefined,
      venue: comp.venue?.fullName ?? undefined, seasonType, scheduleLabel,
    }
  } catch { return null }
}

// ─── NBA ─────────────────────────────────────────────────────────────────────

const NBA_POSTSEASON_ROUNDS: Record<string, string> = {
  'First Round': 'FIRST ROUND', 'Conference Semifinals': 'CONFERENCE SEMIS',
  'Conference Finals': 'CONFERENCE FINALS', 'NBA Finals': 'NBA FINALS',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseNbaEvent(event: any, season: string): GameResult | null {
  try {
    const comp = event.competitions?.[0]
    if (!comp) return null
    const teams = getTeams(comp)
    if (!teams) return null
    const { home, away } = teams
    const isFinal = isFinalComp(comp)
    const seasonTypeNum: number = event.seasonType?.type ?? 2
    const seasonType = seasonTypeNum === 1 ? 'preseason' : seasonTypeNum === 3 ? 'postseason' : 'regular'
    const gameNum: number = event.week?.number ?? 0
    const displaySeason = `${parseInt(season) - 1}-${season.slice(-2)}`
    let scheduleLabel: string
    if (seasonType === 'postseason') {
      const roundName = event.seasonType?.name ?? ''
      scheduleLabel = NBA_POSTSEASON_ROUNDS[roundName] ?? `PLAYOFFS · ${displaySeason}`
    } else if (seasonType === 'preseason') {
      scheduleLabel = `PRESEASON · ${displaySeason}`
    } else {
      scheduleLabel = gameNum ? `GAME ${gameNum} · ${displaySeason}` : `${displaySeason} SEASON`
    }
    return {
      id: event.id ?? '', sportId: 'nba', date: (event.date ?? '').slice(0, 10),
      season, homeTeam: home.team?.displayName ?? '', awayTeam: away.team?.displayName ?? '',
      homeScore: isFinal ? parseCompScore(home) : undefined,
      awayScore: isFinal ? parseCompScore(away) : undefined,
      venue: comp.venue?.fullName ?? undefined, seasonType, scheduleLabel,
    }
  } catch { return null }
}

// ─── NHL ─────────────────────────────────────────────────────────────────────

const NHL_POSTSEASON_ROUNDS: Record<string, string> = {
  'First Round': 'FIRST ROUND', 'Second Round': 'SECOND ROUND',
  'Conference Finals': 'CONFERENCE FINALS', 'Stanley Cup Finals': 'STANLEY CUP FINALS',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseNhlEvent(event: any, season: string): GameResult | null {
  try {
    const comp = event.competitions?.[0]
    if (!comp) return null
    const teams = getTeams(comp)
    if (!teams) return null
    const { home, away } = teams
    const isFinal = isFinalComp(comp)
    const seasonTypeNum: number = event.seasonType?.type ?? 2
    const seasonType = seasonTypeNum === 1 ? 'preseason' : seasonTypeNum === 3 ? 'postseason' : 'regular'
    const gameNum: number = event.week?.number ?? 0
    const displaySeason = `${parseInt(season) - 1}-${season.slice(-2)}`
    let scheduleLabel: string
    if (seasonType === 'postseason') {
      const roundName = event.seasonType?.name ?? ''
      scheduleLabel = NHL_POSTSEASON_ROUNDS[roundName] ?? `PLAYOFFS · ${displaySeason}`
    } else if (seasonType === 'preseason') {
      scheduleLabel = `PRESEASON · ${displaySeason}`
    } else {
      scheduleLabel = gameNum ? `GAME ${gameNum} · ${displaySeason}` : `${displaySeason} SEASON`
    }
    return {
      id: event.id ?? '', sportId: 'nhl', date: (event.date ?? '').slice(0, 10),
      season, homeTeam: home.team?.displayName ?? '', awayTeam: away.team?.displayName ?? '',
      homeScore: isFinal ? parseCompScore(home) : undefined,
      awayScore: isFinal ? parseCompScore(away) : undefined,
      venue: comp.venue?.fullName ?? undefined, seasonType, scheduleLabel,
    }
  } catch { return null }
}

// ─── MLS ─────────────────────────────────────────────────────────────────────

const MLS_POSTSEASON_ROUNDS: Record<string, string> = {
  'Round of 16': 'ROUND OF 16', 'Conference Semifinals': 'CONFERENCE SEMIS',
  'Conference Finals': 'CONFERENCE FINALS', 'MLS Cup': 'MLS CUP',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMlsEvent(event: any, season: string): GameResult | null {
  try {
    const comp = event.competitions?.[0]
    if (!comp) return null
    const teams = getTeams(comp)
    if (!teams) return null
    const { home, away } = teams
    const isFinal = isFinalComp(comp)
    const seasonTypeNum: number = event.seasonType?.type ?? 2
    const seasonType = seasonTypeNum === 1 ? 'preseason' : seasonTypeNum === 3 ? 'postseason' : 'regular'
    const matchday: number = event.week?.number ?? 0
    let scheduleLabel: string
    if (seasonType === 'postseason') {
      const roundName = event.seasonType?.name ?? ''
      scheduleLabel = MLS_POSTSEASON_ROUNDS[roundName] ?? `PLAYOFFS · ${season}`
    } else if (seasonType === 'preseason') {
      scheduleLabel = `PRESEASON · ${season}`
    } else {
      scheduleLabel = matchday ? `MATCHDAY ${matchday} · ${season}` : `${season} SEASON`
    }
    return {
      id: event.id ?? '', sportId: 'mls', date: (event.date ?? '').slice(0, 10),
      season, homeTeam: home.team?.displayName ?? '', awayTeam: away.team?.displayName ?? '',
      homeScore: isFinal ? parseCompScore(home) : undefined,
      awayScore: isFinal ? parseCompScore(away) : undefined,
      venue: comp.venue?.fullName ?? undefined, seasonType, scheduleLabel,
    }
  } catch { return null }
}

// ─── WNBA ─────────────────────────────────────────────────────────────────────

const WNBA_POSTSEASON_ROUNDS: Record<string, string> = {
  'First Round': 'FIRST ROUND', 'Semifinals': 'SEMIFINALS', 'WNBA Finals': 'WNBA FINALS',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseWnbaEvent(event: any, season: string): GameResult | null {
  try {
    const comp = event.competitions?.[0]
    if (!comp) return null
    const teams = getTeams(comp)
    if (!teams) return null
    const { home, away } = teams
    const isFinal = isFinalComp(comp)
    const seasonTypeNum: number = event.seasonType?.type ?? 2
    const seasonType = seasonTypeNum === 1 ? 'preseason' : seasonTypeNum === 3 ? 'postseason' : 'regular'
    const gameNum: number = event.week?.number ?? 0
    let scheduleLabel: string
    if (seasonType === 'postseason') {
      const roundName = event.seasonType?.name ?? ''
      scheduleLabel = WNBA_POSTSEASON_ROUNDS[roundName] ?? `PLAYOFFS · ${season}`
    } else if (seasonType === 'preseason') {
      scheduleLabel = `PRESEASON · ${season}`
    } else {
      scheduleLabel = gameNum ? `GAME ${gameNum} · ${season}` : `${season} SEASON`
    }
    return {
      id: event.id ?? '', sportId: 'wnba', date: (event.date ?? '').slice(0, 10),
      season, homeTeam: home.team?.displayName ?? '', awayTeam: away.team?.displayName ?? '',
      homeScore: isFinal ? parseCompScore(home) : undefined,
      awayScore: isFinal ? parseCompScore(away) : undefined,
      venue: comp.venue?.fullName ?? undefined, seasonType, scheduleLabel,
    }
  } catch { return null }
}

// ─── Parser dispatch ──────────────────────────────────────────────────────────

type EventParser = (event: unknown, season: string) => GameResult | null

const PARSERS: Record<string, EventParser> = {
  nfl:   parseNflEvent,
  mlb:   parseMlbEvent,
  nba:   parseNbaEvent,
  nhl:   parseNhlEvent,
  mls:   parseMlsEvent,
  wnba:  parseWnbaEvent,
}

function normV(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchGameSummary(sportId: string, eventId: string): Promise<string | null> {
  const cacheKey = `${sportId}:${eventId}`
  if (summaryCache.has(cacheKey)) return summaryCache.get(cacheKey)!
  try {
    const data = await espnFetch(`${espnBase(sportId)}/summary?event=${eventId}`)
    const headline: string | undefined = data?.article?.headline
    const result = headline ?? null
    summaryCache.set(cacheKey, result)
    return result
  } catch (err) {
    console.warn(`[espn] fetchGameSummary(${sportId}, ${eventId}) failed:`, err)
    summaryCache.set(cacheKey, null)
    return null
  }
}

export async function fetchTeams(sportId: string): Promise<Team[]> {
  if (teamsCache.has(sportId)) return teamsCache.get(sportId)!
  const isDynamic = getSport(sportId)?.teamsAreDynamic ?? false

  try {
    const data = await espnFetch(`${espnBase(sportId)}/teams?limit=500`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entries: any[] = data?.sports?.[0]?.leagues?.[0]?.teams ?? []

    const teams: Team[] = entries
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((entry: any) => {
        const name = entry.team.displayName as string
        return {
          id: entry.team.id,
          sportId,
          name,
          abbreviation: (entry.team.abbreviation as string) ?? name.slice(0, 3).toUpperCase(),
          // ESPN teams endpoint doesn't expose colors; use hash for dynamic sports
          primaryColor: isDynamic ? hashTeamColor(name) : '#2a2a2a',
          textColor: 'white' as const,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))

    console.log(`[espn] fetchTeams(${sportId}): ${teams.length} teams`)
    teamsCache.set(sportId, teams)
    return teams
  } catch (err) {
    console.warn(`[espn] fetchTeams(${sportId}) failed:`, err)
    return []
  }
}

// Given a date (YYYY-MM-DD) and venue name, fetch the ESPN scoreboard for that
// sport/date and return the game played at that venue, or null if not found.
export async function fetchGameOnDate(
  sportId: string,
  venueName: string,
  date: string,
): Promise<GameResult | null> {
  try {
    const base = espnBase(sportId)
    const dateStr = date.replace(/-/g, '')
    const data = await espnFetch(`${base}/scoreboard?dates=${dateStr}`)
    const events: unknown[] = data?.events ?? []
    const parse = PARSERS[sportId]
    if (!parse) return null
    const vnorm = normV(venueName)
    for (const event of events) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const comp = (event as any)?.competitions?.[0]
      const evVenue: string = comp?.venue?.fullName ?? ''
      if (evVenue) {
        const evNorm = normV(evVenue)
        if (evNorm === vnorm || evNorm.includes(vnorm) || vnorm.includes(evNorm)) {
          const season = date.slice(0, 4)
          return parse(event, season)
        }
      }
    }
    return null
  } catch {
    return null
  }
}

export async function fetchTeamSchedule(sportId: string, teamId: string, season: string): Promise<GameResult[]> {
  const base = espnBase(sportId)
  const makeUrl = (type: number) => `${base}/teams/${teamId}/schedule?season=${season}&seasontype=${type}`
  const parse = PARSERS[sportId]
  if (!parse) return []

  console.log('[espn] fetchTeamSchedule', { sportId, teamId, season })
  try {
    const [preData, regData, postData] = await Promise.all([
      espnFetch(makeUrl(1)).catch(() => null),
      espnFetch(makeUrl(2)).catch(() => null),
      espnFetch(makeUrl(3)).catch(() => null),
    ])
    const allEvents = [
      ...(preData?.events ?? []),
      ...(regData?.events ?? []),
      ...(postData?.events ?? []),
    ]
    const games = allEvents.map((e) => parse(e, season)).filter((g): g is GameResult => g !== null)
    console.log(`[espn] fetchTeamSchedule: ${games.length} games (${sportId} team=${teamId} season=${season})`)
    return games
  } catch (err) {
    console.warn(`[espn] fetchTeamSchedule(${sportId}) failed:`, err)
    return []
  }
}

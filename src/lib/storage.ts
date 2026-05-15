import type { Game } from '@/types/Game'
import { getWeekLabel } from '@/lib/nflTeams'

const STORAGE_KEY = 'sports-diary-games'

function computeNflScheduleLabel(week: string, season: string): string {
  if (week.startsWith('pre_')) {
    const n = parseInt(week.replace('pre_', ''))
    return `PRESEASON WEEK ${n} · ${season}`
  }
  const postLabels: Record<string, string> = {
    wild_card: 'WILD CARD', divisional: 'DIVISIONAL ROUND',
    conference: 'CONFERENCE CHAMPIONSHIP', super_bowl: 'SUPER BOWL',
  }
  if (postLabels[week]) return `${postLabels[week]} · ${season} POSTSEASON`
  return `${getWeekLabel(week).toUpperCase()} · ${season} SEASON`
}

function migrateGame(game: Game): Game {
  const g = { ...game }
  if (!g.sportId) g.sportId = 'nfl'
  // Migrate old NCAA sport IDs to unified college sport
  if (g.sportId === 'ncaaf') { g.sportId = 'college'; if (!g.collegeSportType) g.collegeSportType = 'Football' }
  if (g.sportId === 'ncaab') { g.sportId = 'college'; if (!g.collegeSportType) g.collegeSportType = "Basketball (Men's)" }
  if (!g.scheduleLabel && g.week && g.season) {
    g.scheduleLabel = computeNflScheduleLabel(g.week, g.season)
  }
  if (!g.attendees && g.whoWasThere) {
    g.attendees = g.whoWasThere
      .split(/[,&]|\band\b/i)
      .map((n) => n.trim())
      .filter((n) => n.length > 0)
  }
  return g
}

export function getAllGames(): Game[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []
  return (JSON.parse(raw) as Game[]).map(migrateGame)
}

export function saveGame(game: Game): void {
  const raw = localStorage.getItem(STORAGE_KEY)
  const games: Game[] = raw ? JSON.parse(raw) : []
  games.push(game)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
}

export function deleteGame(id: string): void {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  const games = (JSON.parse(raw) as Game[]).filter((g) => g.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
}

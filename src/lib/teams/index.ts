import { NFL_TEAMS_LIST } from './nfl'
import { MLB_TEAMS_LIST } from './mlb'
import { NBA_TEAMS_LIST } from './nba'
import { NHL_TEAMS_LIST } from './nhl'
import { MLS_TEAMS_LIST } from './mls'
import { WNBA_TEAMS_LIST } from './wnba'
import type { Team } from '@/types/Game'

// Static team registry — colors and abbreviations; IDs overridden by live ESPN fetch
const REGISTRY: Record<string, Team[]> = {
  nfl:  NFL_TEAMS_LIST,
  mlb:  MLB_TEAMS_LIST,
  nba:  NBA_TEAMS_LIST,
  nhl:  NHL_TEAMS_LIST,
  mls:  MLS_TEAMS_LIST,
  wnba: WNBA_TEAMS_LIST,
  college: [],
}

export function getTeam(sportId: string, name: string): Team | undefined {
  return REGISTRY[sportId]?.find((t) => t.name === name)
}

export function getTeamsBySport(sportId: string): Team[] {
  return REGISTRY[sportId] ?? []
}

// Consistent hash-derived color for teams not in registry (NCAA, custom)
export function hashTeamColor(name: string): string {
  let h = 5381
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h) ^ name.charCodeAt(i)
  const palette = [
    '#1D428A', '#006BB6', '#007A33', '#C8102E', '#552583',
    '#004687', '#CE1141', '#002D62', '#860038', '#00471B',
    '#004C54', '#5A2D81', '#003831', '#B30838', '#006847',
  ]
  return palette[Math.abs(h) % palette.length]
}

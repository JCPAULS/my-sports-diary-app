import { NFL_TEAM_ENTRIES } from '@/lib/nflTeams'
import type { Team } from '@/types/Game'

export const NFL_TEAMS_LIST: Team[] = NFL_TEAM_ENTRIES.map((e) => ({
  id: e.id,
  sportId: 'nfl',
  name: e.name,
  abbreviation: e.abbrev,
  primaryColor: e.primaryColor,
  textColor: e.textColor,
}))

import { WEEK_ORDER } from '@/lib/nflTeams'
import {
  getCurrentNflSeason, getCurrentMlbSeason, getCurrentMlsSeason,
  getCurrentWnbaSeason, getCurrentNbaSeason,
  generateSeasonRange,
} from './seasonHelpers'

export interface SportConfig {
  id: string
  label: string
  enabled: boolean
  hasWeeks: boolean
  espnSport: string
  espnLeague: string
  getSeasonOptions: () => string[]  // dynamic; returns API-year strings newest first
  teamsAreDynamic: boolean         // fetch teams from ESPN rather than hardcoded registry
  isCustom: boolean            // fully manual entry, no API
  placeholders: { homeTeam: string; awayTeam: string; venue: string }
  getScheduleSortOrder: (week: string) => number
  seasonDisplayLabel: (apiSeason: string) => string
}

// Calendar year: "2025" → "2025 Season"
const cal = (s: string) => `${s} Season`
// Split year: "2025" → "2024-25 Season"
const split = (s: string) => `${parseInt(s) - 1}-${s.slice(-2)} Season`

export const SPORTS: SportConfig[] = [
  {
    id: 'nfl',
    label: 'NFL',
    enabled: true,
    hasWeeks: true,
    espnSport: 'football',
    espnLeague: 'nfl',
    getSeasonOptions: () => generateSeasonRange(2010, getCurrentNflSeason()),
    teamsAreDynamic: false,
    isCustom: false,
    placeholders: { homeTeam: 'Buffalo Bills', awayTeam: 'New England Patriots', venue: 'Highmark Stadium' },
    getScheduleSortOrder: (w) => WEEK_ORDER[w] ?? 99,
    seasonDisplayLabel: cal,
  },
  {
    id: 'mlb',
    label: 'MLB',
    enabled: true,
    hasWeeks: false,
    espnSport: 'baseball',
    espnLeague: 'mlb',
    getSeasonOptions: () => generateSeasonRange(2010, getCurrentMlbSeason()),
    teamsAreDynamic: false,
    isCustom: false,
    placeholders: { homeTeam: 'New York Yankees', awayTeam: 'Boston Red Sox', venue: 'Yankee Stadium' },
    getScheduleSortOrder: () => 0,
    seasonDisplayLabel: cal,
  },
  {
    id: 'nba',
    label: 'NBA',
    enabled: true,
    hasWeeks: false,
    espnSport: 'basketball',
    espnLeague: 'nba',
    getSeasonOptions: () => generateSeasonRange(2010, getCurrentNbaSeason()),
    teamsAreDynamic: false,
    isCustom: false,
    placeholders: { homeTeam: 'Los Angeles Lakers', awayTeam: 'Boston Celtics', venue: 'Crypto.com Arena' },
    getScheduleSortOrder: () => 0,
    seasonDisplayLabel: split,
  },
  {
    id: 'nhl',
    label: 'NHL',
    enabled: true,
    hasWeeks: false,
    espnSport: 'hockey',
    espnLeague: 'nhl',
    getSeasonOptions: () => generateSeasonRange(2010, getCurrentNbaSeason()),
    teamsAreDynamic: false,
    isCustom: false,
    placeholders: { homeTeam: 'Toronto Maple Leafs', awayTeam: 'Montreal Canadiens', venue: 'Scotiabank Arena' },
    getScheduleSortOrder: () => 0,
    seasonDisplayLabel: split,
  },
  {
    id: 'mls',
    label: 'MLS',
    enabled: true,
    hasWeeks: false,
    espnSport: 'soccer',
    espnLeague: 'usa.1',
    getSeasonOptions: () => generateSeasonRange(2010, getCurrentMlsSeason()),
    teamsAreDynamic: false,
    isCustom: false,
    placeholders: { homeTeam: 'LA Galaxy', awayTeam: 'LAFC', venue: 'Dignity Health Sports Park' },
    getScheduleSortOrder: () => 0,
    seasonDisplayLabel: cal,
  },
  {
    id: 'wnba',
    label: 'WNBA',
    enabled: true,
    hasWeeks: false,
    espnSport: 'basketball',
    espnLeague: 'wnba',
    getSeasonOptions: () => generateSeasonRange(2010, getCurrentWnbaSeason()),
    teamsAreDynamic: false,
    isCustom: false,
    placeholders: { homeTeam: 'Las Vegas Aces', awayTeam: 'New York Liberty', venue: 'Michelob Ultra Arena' },
    getScheduleSortOrder: () => 0,
    seasonDisplayLabel: cal,
  },
  {
    id: 'college',
    label: 'College Sports',
    enabled: true,
    hasWeeks: false,
    espnSport: '',
    espnLeague: '',
    getSeasonOptions: () => generateSeasonRange(new Date().getFullYear() - 19, new Date().getFullYear()),
    teamsAreDynamic: false,
    isCustom: true,
    placeholders: { homeTeam: 'Ohio State Buckeyes', awayTeam: 'Michigan Wolverines', venue: 'Ohio Stadium' },
    getScheduleSortOrder: () => 0,
    seasonDisplayLabel: cal,
  },
  {
    id: 'custom',
    label: 'Custom / Other',
    enabled: true,
    hasWeeks: false,
    espnSport: '',
    espnLeague: '',
    getSeasonOptions: () => generateSeasonRange(new Date().getFullYear() - 19, new Date().getFullYear()),
    teamsAreDynamic: false,
    isCustom: true,
    placeholders: { homeTeam: 'Lincoln High School', awayTeam: 'Roosevelt High School', venue: 'Lincoln High School Field' },
    getScheduleSortOrder: () => 0,
    seasonDisplayLabel: cal,
  },
]

export function getSport(id: string): SportConfig | undefined {
  return SPORTS.find((s) => s.id === id)
}

export const ENABLED_SPORTS = SPORTS.filter((s) => s.enabled)

export const CUSTOM_LEVELS = ['Youth', 'High School', 'College Club', 'Recreational']

export const COLLEGE_SPORT_TYPES = [
  'Football',
  "Basketball (Men's)",
  "Basketball (Women's)",
  'Baseball',
  'Softball',
  "Soccer (Men's)",
  "Soccer (Women's)",
  'Ice Hockey',
  'Volleyball',
  'Lacrosse',
  'Wrestling',
  'Gymnastics',
  'Track & Field',
  'Swimming & Diving',
  'Tennis',
  'Golf',
  'Field Hockey',
  'Rowing',
  'Water Polo',
  'Other (type your own)',
]

export const CUSTOM_SPORT_TYPES = [
  'Soccer',
  'Baseball',
  'Basketball',
  'Football',
  'Hockey',
  'Volleyball',
  'Softball',
  'Lacrosse',
  'Tennis',
  'Track & Field',
  'Swimming',
  'Wrestling',
  'Gymnastics',
  'Golf',
  'Cross Country',
  'Field Hockey',
  'Rugby',
  'Cricket',
  'Bowling',
  'Cheer / Dance',
  'Other (type your own)',
]

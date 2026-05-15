import type { Team } from '@/types/Game'

// ─── Team roster ──────────────────────────────────────────────────────────────
// IDs: ESPN team IDs (verified against site.api.espn.com/apis/site/v2/sports/football/nfl/teams)
// Colors: official primary team colors (hex)
// textColor: 'black' only when primaryColor is light enough that black has better contrast

export interface NflTeamEntry {
  name: string        // full display name, e.g. "New England Patriots"
  id: string          // ESPN team ID
  abbrev: string      // ESPN abbreviation, e.g. "NE"
  location: string    // e.g. "New England"
  shortName: string   // e.g. "Patriots"
  primaryColor: string         // hex, e.g. "#002244"
  textColor: 'white' | 'black' // contrast color for text on primaryColor
}

export const NFL_TEAM_ENTRIES: NflTeamEntry[] = [
  // AFC East
  { name: 'Buffalo Bills',           id: '2',  abbrev: 'BUF', location: 'Buffalo',       shortName: 'Bills',      primaryColor: '#00338D', textColor: 'white' },
  { name: 'Miami Dolphins',          id: '15', abbrev: 'MIA', location: 'Miami',         shortName: 'Dolphins',   primaryColor: '#008E97', textColor: 'white' },
  { name: 'New England Patriots',    id: '17', abbrev: 'NE',  location: 'New England',   shortName: 'Patriots',   primaryColor: '#002244', textColor: 'white' },
  { name: 'New York Jets',           id: '20', abbrev: 'NYJ', location: 'New York',      shortName: 'Jets',       primaryColor: '#125740', textColor: 'white' },
  // AFC North
  { name: 'Baltimore Ravens',        id: '33', abbrev: 'BAL', location: 'Baltimore',     shortName: 'Ravens',     primaryColor: '#241773', textColor: 'white' },
  { name: 'Cincinnati Bengals',      id: '4',  abbrev: 'CIN', location: 'Cincinnati',    shortName: 'Bengals',    primaryColor: '#FB4F14', textColor: 'white' },
  { name: 'Cleveland Browns',        id: '5',  abbrev: 'CLE', location: 'Cleveland',     shortName: 'Browns',     primaryColor: '#311D00', textColor: 'white' },
  { name: 'Pittsburgh Steelers',     id: '23', abbrev: 'PIT', location: 'Pittsburgh',    shortName: 'Steelers',   primaryColor: '#FFB612', textColor: 'black' },
  // AFC South
  { name: 'Houston Texans',          id: '34', abbrev: 'HOU', location: 'Houston',       shortName: 'Texans',     primaryColor: '#03202F', textColor: 'white' },
  { name: 'Indianapolis Colts',      id: '11', abbrev: 'IND', location: 'Indianapolis',  shortName: 'Colts',      primaryColor: '#002C5F', textColor: 'white' },
  { name: 'Jacksonville Jaguars',    id: '30', abbrev: 'JAX', location: 'Jacksonville',  shortName: 'Jaguars',    primaryColor: '#101820', textColor: 'white' },
  { name: 'Tennessee Titans',        id: '10', abbrev: 'TEN', location: 'Tennessee',     shortName: 'Titans',     primaryColor: '#0C2340', textColor: 'white' },
  // AFC West
  { name: 'Denver Broncos',          id: '7',  abbrev: 'DEN', location: 'Denver',        shortName: 'Broncos',    primaryColor: '#FB4F14', textColor: 'white' },
  { name: 'Kansas City Chiefs',      id: '12', abbrev: 'KC',  location: 'Kansas City',   shortName: 'Chiefs',     primaryColor: '#E31837', textColor: 'white' },
  { name: 'Las Vegas Raiders',       id: '13', abbrev: 'LV',  location: 'Las Vegas',     shortName: 'Raiders',    primaryColor: '#000000', textColor: 'white' },
  { name: 'Los Angeles Chargers',    id: '24', abbrev: 'LAC', location: 'Los Angeles',   shortName: 'Chargers',   primaryColor: '#0080C6', textColor: 'white' },
  // NFC East
  { name: 'Dallas Cowboys',          id: '6',  abbrev: 'DAL', location: 'Dallas',        shortName: 'Cowboys',    primaryColor: '#003594', textColor: 'white' },
  { name: 'New York Giants',         id: '19', abbrev: 'NYG', location: 'New York',      shortName: 'Giants',     primaryColor: '#0B2265', textColor: 'white' },
  { name: 'Philadelphia Eagles',     id: '21', abbrev: 'PHI', location: 'Philadelphia',  shortName: 'Eagles',     primaryColor: '#004C54', textColor: 'white' },
  { name: 'Washington Commanders',   id: '28', abbrev: 'WSH', location: 'Washington',    shortName: 'Commanders', primaryColor: '#5A1414', textColor: 'white' },
  // NFC North
  { name: 'Chicago Bears',           id: '3',  abbrev: 'CHI', location: 'Chicago',       shortName: 'Bears',      primaryColor: '#0B162A', textColor: 'white' },
  { name: 'Detroit Lions',           id: '8',  abbrev: 'DET', location: 'Detroit',       shortName: 'Lions',      primaryColor: '#0076B6', textColor: 'white' },
  { name: 'Green Bay Packers',       id: '9',  abbrev: 'GB',  location: 'Green Bay',     shortName: 'Packers',    primaryColor: '#203731', textColor: 'white' },
  { name: 'Minnesota Vikings',       id: '16', abbrev: 'MIN', location: 'Minnesota',     shortName: 'Vikings',    primaryColor: '#4F2683', textColor: 'white' },
  // NFC South
  { name: 'Atlanta Falcons',         id: '1',  abbrev: 'ATL', location: 'Atlanta',       shortName: 'Falcons',    primaryColor: '#A71930', textColor: 'white' },
  { name: 'Carolina Panthers',       id: '29', abbrev: 'CAR', location: 'Carolina',      shortName: 'Panthers',   primaryColor: '#0085CA', textColor: 'white' },
  { name: 'New Orleans Saints',      id: '18', abbrev: 'NO',  location: 'New Orleans',   shortName: 'Saints',     primaryColor: '#D3BC8D', textColor: 'black' },
  { name: 'Tampa Bay Buccaneers',    id: '27', abbrev: 'TB',  location: 'Tampa Bay',     shortName: 'Buccaneers', primaryColor: '#D50A0A', textColor: 'white' },
  // NFC West
  { name: 'Arizona Cardinals',       id: '22', abbrev: 'ARI', location: 'Arizona',       shortName: 'Cardinals',  primaryColor: '#97233F', textColor: 'white' },
  { name: 'Los Angeles Rams',        id: '14', abbrev: 'LAR', location: 'Los Angeles',   shortName: 'Rams',       primaryColor: '#003594', textColor: 'white' },
  { name: 'San Francisco 49ers',     id: '25', abbrev: 'SF',  location: 'San Francisco', shortName: '49ers',      primaryColor: '#AA0000', textColor: 'white' },
  { name: 'Seattle Seahawks',        id: '26', abbrev: 'SEA', location: 'Seattle',       shortName: 'Seahawks',   primaryColor: '#002244', textColor: 'white' },
]

// Alphabetically sorted string array for the TeamCombobox
export const NFL_TEAMS: string[] = [...NFL_TEAM_ENTRIES]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((t) => t.name)

export function getNflTeamId(name: string): string | undefined {
  return NFL_TEAM_ENTRIES.find((t) => t.name === name)?.id
}

export function getTeamEntry(name: string): NflTeamEntry | undefined {
  return NFL_TEAM_ENTRIES.find((t) => t.name === name)
}

// Typed fallback used when ESPN fetch fails
export const NFL_FALLBACK_TEAMS: Team[] = [...NFL_TEAM_ENTRIES]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((e) => ({
    id: e.id,
    sportId: 'nfl',
    name: e.name,
    abbreviation: e.abbrev,
    primaryColor: e.primaryColor,
    textColor: e.textColor,
  }))

// ─── Week definitions ─────────────────────────────────────────────────────────

export const NFL_WEEKS: { value: string; label: string }[] = [
  { value: 'pre_1',      label: 'Preseason Week 1' },
  { value: 'pre_2',      label: 'Preseason Week 2' },
  { value: 'pre_3',      label: 'Preseason Week 3' },
  { value: '1',          label: 'Week 1' },
  { value: '2',          label: 'Week 2' },
  { value: '3',          label: 'Week 3' },
  { value: '4',          label: 'Week 4' },
  { value: '5',          label: 'Week 5' },
  { value: '6',          label: 'Week 6' },
  { value: '7',          label: 'Week 7' },
  { value: '8',          label: 'Week 8' },
  { value: '9',          label: 'Week 9' },
  { value: '10',         label: 'Week 10' },
  { value: '11',         label: 'Week 11' },
  { value: '12',         label: 'Week 12' },
  { value: '13',         label: 'Week 13' },
  { value: '14',         label: 'Week 14' },
  { value: '15',         label: 'Week 15' },
  { value: '16',         label: 'Week 16' },
  { value: '17',         label: 'Week 17' },
  { value: '18',         label: 'Week 18' },
  { value: 'wild_card',  label: 'Wild Card' },
  { value: 'divisional', label: 'Divisional Round' },
  { value: 'conference', label: 'Conference Championship' },
  { value: 'super_bowl', label: 'Super Bowl' },
]

export const WEEK_ORDER: Record<string, number> = {
  // Preseason (negative so they sort before regular season)
  pre_1: -3, pre_2: -2, pre_3: -1,
  // Regular season
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, '11': 11, '12': 12, '13': 13, '14': 14, '15': 15,
  '16': 16, '17': 17, '18': 18,
  // Postseason
  wild_card: 19, divisional: 20, conference: 21, super_bowl: 22,
}

export function getWeekLabel(week: string): string {
  const found = NFL_WEEKS.find((w) => w.value === week)
  if (found) return found.label
  if (week.startsWith('pre_')) return `Preseason Week ${week.replace('pre_', '')}`
  return `Week ${week}`
}


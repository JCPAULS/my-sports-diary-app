import type { Team } from '@/types/Game'

// ESPN IDs — live API data overrides these on load; colors are authoritative
export const MLB_TEAMS_LIST: Team[] = [
  // AL East
  { id: '1',  sportId: 'mlb', name: 'Baltimore Orioles',       abbreviation: 'BAL', primaryColor: '#DF4601', textColor: 'white' },
  { id: '2',  sportId: 'mlb', name: 'Boston Red Sox',          abbreviation: 'BOS', primaryColor: '#BD3039', textColor: 'white' },
  { id: '10', sportId: 'mlb', name: 'New York Yankees',        abbreviation: 'NYY', primaryColor: '#003087', textColor: 'white' },
  { id: '30', sportId: 'mlb', name: 'Tampa Bay Rays',          abbreviation: 'TB',  primaryColor: '#092C5C', textColor: 'white' },
  { id: '14', sportId: 'mlb', name: 'Toronto Blue Jays',       abbreviation: 'TOR', primaryColor: '#134A8E', textColor: 'white' },
  // AL Central
  { id: '4',  sportId: 'mlb', name: 'Chicago White Sox',       abbreviation: 'CWS', primaryColor: '#27251F', textColor: 'white' },
  { id: '5',  sportId: 'mlb', name: 'Cleveland Guardians',     abbreviation: 'CLE', primaryColor: '#00385D', textColor: 'white' },
  { id: '6',  sportId: 'mlb', name: 'Detroit Tigers',          abbreviation: 'DET', primaryColor: '#0C2340', textColor: 'white' },
  { id: '7',  sportId: 'mlb', name: 'Kansas City Royals',      abbreviation: 'KC',  primaryColor: '#004687', textColor: 'white' },
  { id: '9',  sportId: 'mlb', name: 'Minnesota Twins',         abbreviation: 'MIN', primaryColor: '#002B5C', textColor: 'white' },
  // AL West
  { id: '18', sportId: 'mlb', name: 'Houston Astros',          abbreviation: 'HOU', primaryColor: '#002D62', textColor: 'white' },
  { id: '3',  sportId: 'mlb', name: 'Los Angeles Angels',      abbreviation: 'LAA', primaryColor: '#BA0021', textColor: 'white' },
  { id: '11', sportId: 'mlb', name: 'Sacramento Athletics',    abbreviation: 'ATH', primaryColor: '#003831', textColor: 'white' },
  { id: '12', sportId: 'mlb', name: 'Seattle Mariners',        abbreviation: 'SEA', primaryColor: '#0C2C56', textColor: 'white' },
  { id: '13', sportId: 'mlb', name: 'Texas Rangers',           abbreviation: 'TEX', primaryColor: '#003278', textColor: 'white' },
  // NL East
  { id: '15', sportId: 'mlb', name: 'Atlanta Braves',          abbreviation: 'ATL', primaryColor: '#CE1141', textColor: 'white' },
  { id: '28', sportId: 'mlb', name: 'Miami Marlins',           abbreviation: 'MIA', primaryColor: '#00A3E0', textColor: 'white' },
  { id: '21', sportId: 'mlb', name: 'New York Mets',           abbreviation: 'NYM', primaryColor: '#002D72', textColor: 'white' },
  { id: '22', sportId: 'mlb', name: 'Philadelphia Phillies',   abbreviation: 'PHI', primaryColor: '#E81828', textColor: 'white' },
  { id: '20', sportId: 'mlb', name: 'Washington Nationals',    abbreviation: 'WSH', primaryColor: '#AB0003', textColor: 'white' },
  // NL Central
  { id: '16', sportId: 'mlb', name: 'Chicago Cubs',            abbreviation: 'CHC', primaryColor: '#0E3386', textColor: 'white' },
  { id: '17', sportId: 'mlb', name: 'Cincinnati Reds',         abbreviation: 'CIN', primaryColor: '#C6011F', textColor: 'white' },
  { id: '8',  sportId: 'mlb', name: 'Milwaukee Brewers',       abbreviation: 'MIL', primaryColor: '#12284B', textColor: 'white' },
  { id: '23', sportId: 'mlb', name: 'Pittsburgh Pirates',      abbreviation: 'PIT', primaryColor: '#FDB827', textColor: 'black' },
  { id: '24', sportId: 'mlb', name: 'St. Louis Cardinals',     abbreviation: 'STL', primaryColor: '#C41E3A', textColor: 'white' },
  // NL West
  { id: '29', sportId: 'mlb', name: 'Arizona Diamondbacks',    abbreviation: 'ARI', primaryColor: '#A71930', textColor: 'white' },
  { id: '27', sportId: 'mlb', name: 'Colorado Rockies',        abbreviation: 'COL', primaryColor: '#33006F', textColor: 'white' },
  { id: '19', sportId: 'mlb', name: 'Los Angeles Dodgers',     abbreviation: 'LAD', primaryColor: '#005A9C', textColor: 'white' },
  { id: '25', sportId: 'mlb', name: 'San Diego Padres',        abbreviation: 'SD',  primaryColor: '#2F241D', textColor: 'white' },
  { id: '26', sportId: 'mlb', name: 'San Francisco Giants',    abbreviation: 'SF',  primaryColor: '#FD5A1E', textColor: 'white' },
].sort((a, b) => a.name.localeCompare(b.name))

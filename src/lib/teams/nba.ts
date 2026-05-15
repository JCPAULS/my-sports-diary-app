import type { Team } from '@/types/Game'

export const NBA_TEAMS_LIST: Team[] = [
  // Atlantic
  { id: '2',  sportId: 'nba', name: 'Boston Celtics',          abbreviation: 'BOS', primaryColor: '#007A33', textColor: 'white' },
  { id: '17', sportId: 'nba', name: 'Brooklyn Nets',           abbreviation: 'BKN', primaryColor: '#000000', textColor: 'white' },
  { id: '18', sportId: 'nba', name: 'New York Knicks',         abbreviation: 'NYK', primaryColor: '#006BB6', textColor: 'white' },
  { id: '20', sportId: 'nba', name: 'Philadelphia 76ers',      abbreviation: 'PHI', primaryColor: '#006BB6', textColor: 'white' },
  { id: '28', sportId: 'nba', name: 'Toronto Raptors',         abbreviation: 'TOR', primaryColor: '#CE1141', textColor: 'white' },
  // Central
  { id: '4',  sportId: 'nba', name: 'Chicago Bulls',           abbreviation: 'CHI', primaryColor: '#CE1141', textColor: 'white' },
  { id: '5',  sportId: 'nba', name: 'Cleveland Cavaliers',     abbreviation: 'CLE', primaryColor: '#860038', textColor: 'white' },
  { id: '8',  sportId: 'nba', name: 'Detroit Pistons',         abbreviation: 'DET', primaryColor: '#C8102E', textColor: 'white' },
  { id: '11', sportId: 'nba', name: 'Indiana Pacers',          abbreviation: 'IND', primaryColor: '#002D62', textColor: 'white' },
  { id: '15', sportId: 'nba', name: 'Milwaukee Bucks',         abbreviation: 'MIL', primaryColor: '#00471B', textColor: 'white' },
  // Southeast
  { id: '1',  sportId: 'nba', name: 'Atlanta Hawks',           abbreviation: 'ATL', primaryColor: '#E03A3E', textColor: 'white' },
  { id: '30', sportId: 'nba', name: 'Charlotte Hornets',       abbreviation: 'CHA', primaryColor: '#1D1160', textColor: 'white' },
  { id: '14', sportId: 'nba', name: 'Miami Heat',              abbreviation: 'MIA', primaryColor: '#98002E', textColor: 'white' },
  { id: '19', sportId: 'nba', name: 'Orlando Magic',           abbreviation: 'ORL', primaryColor: '#0077C0', textColor: 'white' },
  { id: '27', sportId: 'nba', name: 'Washington Wizards',      abbreviation: 'WAS', primaryColor: '#002B5C', textColor: 'white' },
  // Northwest
  { id: '7',  sportId: 'nba', name: 'Denver Nuggets',          abbreviation: 'DEN', primaryColor: '#0E2240', textColor: 'white' },
  { id: '16', sportId: 'nba', name: 'Minnesota Timberwolves',  abbreviation: 'MIN', primaryColor: '#0C2340', textColor: 'white' },
  { id: '25', sportId: 'nba', name: 'Oklahoma City Thunder',   abbreviation: 'OKC', primaryColor: '#007AC1', textColor: 'white' },
  { id: '22', sportId: 'nba', name: 'Portland Trail Blazers',  abbreviation: 'POR', primaryColor: '#E03A3E', textColor: 'white' },
  { id: '26', sportId: 'nba', name: 'Utah Jazz',               abbreviation: 'UTA', primaryColor: '#002B5C', textColor: 'white' },
  // Pacific
  { id: '9',  sportId: 'nba', name: 'Golden State Warriors',   abbreviation: 'GSW', primaryColor: '#1D428A', textColor: 'white' },
  { id: '12', sportId: 'nba', name: 'Los Angeles Clippers',    abbreviation: 'LAC', primaryColor: '#C8102E', textColor: 'white' },
  { id: '13', sportId: 'nba', name: 'Los Angeles Lakers',      abbreviation: 'LAL', primaryColor: '#552583', textColor: 'white' },
  { id: '21', sportId: 'nba', name: 'Phoenix Suns',            abbreviation: 'PHX', primaryColor: '#1D1160', textColor: 'white' },
  { id: '23', sportId: 'nba', name: 'Sacramento Kings',        abbreviation: 'SAC', primaryColor: '#5A2D81', textColor: 'white' },
  // Southwest
  { id: '6',  sportId: 'nba', name: 'Dallas Mavericks',        abbreviation: 'DAL', primaryColor: '#00538C', textColor: 'white' },
  { id: '10', sportId: 'nba', name: 'Houston Rockets',         abbreviation: 'HOU', primaryColor: '#CE1141', textColor: 'white' },
  { id: '29', sportId: 'nba', name: 'Memphis Grizzlies',       abbreviation: 'MEM', primaryColor: '#5D76A9', textColor: 'white' },
  { id: '3',  sportId: 'nba', name: 'New Orleans Pelicans',    abbreviation: 'NOP', primaryColor: '#0C2340', textColor: 'white' },
  { id: '24', sportId: 'nba', name: 'San Antonio Spurs',       abbreviation: 'SAS', primaryColor: '#000000', textColor: 'white' },
].sort((a, b) => a.name.localeCompare(b.name))

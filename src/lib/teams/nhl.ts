import type { Team } from '@/types/Game'

export const NHL_TEAMS_LIST: Team[] = [
  // Atlantic
  { id: '1',  sportId: 'nhl', name: 'Boston Bruins',           abbreviation: 'BOS', primaryColor: '#FFB81C', textColor: 'black' },
  { id: '2',  sportId: 'nhl', name: 'Buffalo Sabres',          abbreviation: 'BUF', primaryColor: '#00338D', textColor: 'white' as const },
  { id: '5',  sportId: 'nhl', name: 'Detroit Red Wings',       abbreviation: 'DET', primaryColor: '#CE1126', textColor: 'white' as const },
  { id: '13', sportId: 'nhl', name: 'Florida Panthers',        abbreviation: 'FLA', primaryColor: '#041E42', textColor: 'white' as const },
  { id: '8',  sportId: 'nhl', name: 'Montréal Canadiens',      abbreviation: 'MTL', primaryColor: '#AF1E2D', textColor: 'white' as const },
  { id: '9',  sportId: 'nhl', name: 'Ottawa Senators',         abbreviation: 'OTT', primaryColor: '#C52032', textColor: 'white' as const },
  { id: '14', sportId: 'nhl', name: 'Tampa Bay Lightning',     abbreviation: 'TBL', primaryColor: '#002868', textColor: 'white' as const },
  { id: '15', sportId: 'nhl', name: 'Toronto Maple Leafs',     abbreviation: 'TOR', primaryColor: '#00205B', textColor: 'white' as const },
  // Metropolitan
  { id: '12', sportId: 'nhl', name: 'Carolina Hurricanes',     abbreviation: 'CAR', primaryColor: '#CE1126', textColor: 'white' as const },
  { id: '29', sportId: 'nhl', name: 'Columbus Blue Jackets',   abbreviation: 'CBJ', primaryColor: '#002654', textColor: 'white' as const },
  { id: '1',  sportId: 'nhl', name: 'New Jersey Devils',       abbreviation: 'NJD', primaryColor: '#CE1126', textColor: 'white' as const },
  { id: '16', sportId: 'nhl', name: 'New York Islanders',      abbreviation: 'NYI', primaryColor: '#00539B', textColor: 'white' as const },
  { id: '17', sportId: 'nhl', name: 'New York Rangers',        abbreviation: 'NYR', primaryColor: '#0038A8', textColor: 'white' as const },
  { id: '19', sportId: 'nhl', name: 'Philadelphia Flyers',     abbreviation: 'PHI', primaryColor: '#F74902', textColor: 'white' as const },
  { id: '20', sportId: 'nhl', name: 'Pittsburgh Penguins',     abbreviation: 'PIT', primaryColor: '#FCB514', textColor: 'black' },
  { id: '27', sportId: 'nhl', name: 'Washington Capitals',     abbreviation: 'WSH', primaryColor: '#041E42', textColor: 'white' as const },
  // Central
  { id: '4',  sportId: 'nhl', name: 'Chicago Blackhawks',      abbreviation: 'CHI', primaryColor: '#CF0A2C', textColor: 'white' as const },
  { id: '21', sportId: 'nhl', name: 'Colorado Avalanche',      abbreviation: 'COL', primaryColor: '#6F263D', textColor: 'white' as const },
  { id: '9',  sportId: 'nhl', name: 'Dallas Stars',            abbreviation: 'DAL', primaryColor: '#006847', textColor: 'white' as const },
  { id: '30', sportId: 'nhl', name: 'Minnesota Wild',          abbreviation: 'MIN', primaryColor: '#154734', textColor: 'white' as const },
  { id: '18', sportId: 'nhl', name: 'Nashville Predators',     abbreviation: 'NSH', primaryColor: '#FFB81C', textColor: 'black' },
  { id: '22', sportId: 'nhl', name: 'St. Louis Blues',         abbreviation: 'STL', primaryColor: '#002F87', textColor: 'white' as const },
  { id: '52', sportId: 'nhl', name: 'Utah Hockey Club',        abbreviation: 'UTA', primaryColor: '#010101', textColor: 'white' as const },
  { id: '31', sportId: 'nhl', name: 'Winnipeg Jets',           abbreviation: 'WPG', primaryColor: '#041E42', textColor: 'white' as const },
  // Pacific
  { id: '25', sportId: 'nhl', name: 'Anaheim Ducks',           abbreviation: 'ANA', primaryColor: '#FC4C02', textColor: 'white' as const },
  { id: '20', sportId: 'nhl', name: 'Calgary Flames',          abbreviation: 'CGY', primaryColor: '#C8102E', textColor: 'white' as const },
  { id: '22', sportId: 'nhl', name: 'Edmonton Oilers',         abbreviation: 'EDM', primaryColor: '#041E42', textColor: 'white' as const },
  { id: '26', sportId: 'nhl', name: 'Los Angeles Kings',       abbreviation: 'LAK', primaryColor: '#111111', textColor: 'white' as const },
  { id: '28', sportId: 'nhl', name: 'San Jose Sharks',         abbreviation: 'SJS', primaryColor: '#006D75', textColor: 'white' as const },
  { id: '55', sportId: 'nhl', name: 'Seattle Kraken',          abbreviation: 'SEA', primaryColor: '#001628', textColor: 'white' as const },
  { id: '23', sportId: 'nhl', name: 'Vancouver Canucks',       abbreviation: 'VAN', primaryColor: '#00843D', textColor: 'white' as const },
  { id: '54', sportId: 'nhl', name: 'Vegas Golden Knights',    abbreviation: 'VGK', primaryColor: '#B4975A', textColor: 'black' },
].sort((a, b) => a.name.localeCompare(b.name))

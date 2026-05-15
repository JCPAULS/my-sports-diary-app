import type { Team } from '@/types/Game'

// 30 MLS teams — IDs match ESPN's actual team IDs (used for schedule fetching)
export const MLS_TEAMS_LIST: Team[] = [
  // Eastern Conference
  { id: '18418', sportId: 'mls', name: 'Atlanta United FC',        abbreviation: 'ATL', primaryColor: '#80000A', textColor: 'white' },
  { id: '9720',  sportId: 'mls', name: 'CF Montréal',              abbreviation: 'MTL', primaryColor: '#00B2A9', textColor: 'white' },
  { id: '21300', sportId: 'mls', name: 'Charlotte FC',             abbreviation: 'CLT', primaryColor: '#1A85C8', textColor: 'white' },
  { id: '182',   sportId: 'mls', name: 'Chicago Fire FC',          abbreviation: 'CHI', primaryColor: '#FF0000', textColor: 'white' },
  { id: '18267', sportId: 'mls', name: 'FC Cincinnati',            abbreviation: 'CIN', primaryColor: '#003087', textColor: 'white' },
  { id: '183',   sportId: 'mls', name: 'Columbus Crew',            abbreviation: 'CLB', primaryColor: '#FEDD00', textColor: 'black' },
  { id: '193',   sportId: 'mls', name: 'D.C. United',              abbreviation: 'DC',  primaryColor: '#000000', textColor: 'white' },
  { id: '20232', sportId: 'mls', name: 'Inter Miami CF',           abbreviation: 'MIA', primaryColor: '#F7B5CD', textColor: 'black' },
  { id: '18986', sportId: 'mls', name: 'Nashville SC',             abbreviation: 'NSH', primaryColor: '#C8AB5C', textColor: 'black' },
  { id: '189',   sportId: 'mls', name: 'New England Revolution',   abbreviation: 'NE',  primaryColor: '#0A2240', textColor: 'white' },
  { id: '17606', sportId: 'mls', name: 'New York City FC',         abbreviation: 'NYC', primaryColor: '#041E42', textColor: 'white' },
  { id: '190',   sportId: 'mls', name: 'Red Bull New York',        abbreviation: 'RBY', primaryColor: '#D4002A', textColor: 'white' },
  { id: '12011', sportId: 'mls', name: 'Orlando City SC',          abbreviation: 'ORL', primaryColor: '#633492', textColor: 'white' },
  { id: '10739', sportId: 'mls', name: 'Philadelphia Union',       abbreviation: 'PHI', primaryColor: '#003087', textColor: 'white' },
  { id: '7318',  sportId: 'mls', name: 'Toronto FC',               abbreviation: 'TOR', primaryColor: '#B81137', textColor: 'white' },
  // Western Conference
  { id: '20906', sportId: 'mls', name: 'Austin FC',                abbreviation: 'ATX', primaryColor: '#00B140', textColor: 'white' },
  { id: '184',   sportId: 'mls', name: 'Colorado Rapids',          abbreviation: 'COL', primaryColor: '#960A2C', textColor: 'white' },
  { id: '185',   sportId: 'mls', name: 'FC Dallas',                abbreviation: 'DAL', primaryColor: '#E81F3E', textColor: 'white' },
  { id: '6077',  sportId: 'mls', name: 'Houston Dynamo FC',        abbreviation: 'HOU', primaryColor: '#F9461C', textColor: 'white' },
  { id: '187',   sportId: 'mls', name: 'LA Galaxy',                abbreviation: 'LA',  primaryColor: '#00245D', textColor: 'white' },
  { id: '18966', sportId: 'mls', name: 'LAFC',                     abbreviation: 'LAFC',primaryColor: '#000000', textColor: 'white' },
  { id: '17362', sportId: 'mls', name: 'Minnesota United FC',      abbreviation: 'MIN', primaryColor: '#231F20', textColor: 'white' },
  { id: '9723',  sportId: 'mls', name: 'Portland Timbers',         abbreviation: 'POR', primaryColor: '#004812', textColor: 'white' },
  { id: '4771',  sportId: 'mls', name: 'Real Salt Lake',           abbreviation: 'RSL', primaryColor: '#B30838', textColor: 'white' },
  { id: '22529', sportId: 'mls', name: 'San Diego FC',             abbreviation: 'SDC', primaryColor: '#001D54', textColor: 'white' },
  { id: '191',   sportId: 'mls', name: 'San Jose Earthquakes',     abbreviation: 'SJ',  primaryColor: '#0067B1', textColor: 'white' },
  { id: '9726',  sportId: 'mls', name: 'Seattle Sounders FC',      abbreviation: 'SEA', primaryColor: '#5D9741', textColor: 'white' },
  { id: '186',   sportId: 'mls', name: 'Sporting Kansas City',     abbreviation: 'SKC', primaryColor: '#002F6C', textColor: 'white' },
  { id: '21812', sportId: 'mls', name: 'St. Louis CITY SC',        abbreviation: 'STL', primaryColor: '#BF2039', textColor: 'white' },
  { id: '9727',  sportId: 'mls', name: 'Vancouver Whitecaps',      abbreviation: 'VAN', primaryColor: '#00245D', textColor: 'white' },
].sort((a, b) => a.name.localeCompare(b.name))

import type { Team } from '@/types/Game'

// 13 WNBA teams (2025 — includes Golden State Valkyries expansion)
export const WNBA_TEAMS_LIST: Team[] = [
  { id: '1',  sportId: 'wnba', name: 'Atlanta Dream',           abbreviation: 'ATL', primaryColor: '#C6004E', textColor: 'white' },
  { id: '3',  sportId: 'wnba', name: 'Chicago Sky',             abbreviation: 'CHI', primaryColor: '#418FDE', textColor: 'white' },
  { id: '4',  sportId: 'wnba', name: 'Connecticut Sun',         abbreviation: 'CON', primaryColor: '#F37121', textColor: 'white' },
  { id: '5',  sportId: 'wnba', name: 'Dallas Wings',            abbreviation: 'DAL', primaryColor: '#002F6C', textColor: 'white' },
  { id: '20', sportId: 'wnba', name: 'Golden State Valkyries',  abbreviation: 'GSV', primaryColor: '#1D428A', textColor: 'white' },
  { id: '6',  sportId: 'wnba', name: 'Indiana Fever',           abbreviation: 'IND', primaryColor: '#002D62', textColor: 'white' },
  { id: '8',  sportId: 'wnba', name: 'Las Vegas Aces',          abbreviation: 'LVA', primaryColor: '#A7202F', textColor: 'white' },
  { id: '9',  sportId: 'wnba', name: 'Los Angeles Sparks',      abbreviation: 'LA',  primaryColor: '#702F8A', textColor: 'white' },
  { id: '10', sportId: 'wnba', name: 'Minnesota Lynx',          abbreviation: 'MIN', primaryColor: '#266092', textColor: 'white' },
  { id: '11', sportId: 'wnba', name: 'New York Liberty',        abbreviation: 'NY',  primaryColor: '#000000', textColor: 'white' },
  { id: '14', sportId: 'wnba', name: 'Phoenix Mercury',         abbreviation: 'PHX', primaryColor: '#CB6015', textColor: 'white' },
  { id: '17', sportId: 'wnba', name: 'Seattle Storm',           abbreviation: 'SEA', primaryColor: '#2C5234', textColor: 'white' },
  { id: '18', sportId: 'wnba', name: 'Washington Mystics',      abbreviation: 'WAS', primaryColor: '#C91F32', textColor: 'white' },
].sort((a, b) => a.name.localeCompare(b.name))

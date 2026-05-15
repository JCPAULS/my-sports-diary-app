export interface VenueInfo {
  name: string
  lat: number
  lng: number
  city: string
  state: string
}

export interface MapPin extends VenueInfo {
  gameCount: number
}

// ─── Venue database ───────────────────────────────────────────────────────────

const VENUES: VenueInfo[] = [
  // NFL
  { name: "Allegiant Stadium",           lat: 36.0909, lng: -115.1833, city: "Las Vegas",       state: "NV" },
  { name: "Arrowhead Stadium",           lat: 39.0489, lng: -94.4839,  city: "Kansas City",    state: "MO" },
  { name: "AT&T Stadium",                lat: 32.7480, lng: -97.0933,  city: "Arlington",      state: "TX" },
  { name: "Bank of America Stadium",     lat: 35.2258, lng: -80.8528,  city: "Charlotte",      state: "NC" },
  { name: "Caesars Superdome",           lat: 29.9511, lng: -90.0812,  city: "New Orleans",    state: "LA" },
  { name: "Empower Field at Mile High",  lat: 39.7439, lng: -105.0201, city: "Denver",         state: "CO" },
  { name: "EverBank Stadium",            lat: 30.3240, lng: -81.6373,  city: "Jacksonville",   state: "FL" },
  { name: "FedExField",                  lat: 38.9078, lng: -76.8645,  city: "Landover",       state: "MD" },
  { name: "FirstEnergy Stadium",         lat: 41.5061, lng: -81.6995,  city: "Cleveland",      state: "OH" },
  { name: "Ford Field",                  lat: 42.3400, lng: -83.0456,  city: "Detroit",        state: "MI" },
  { name: "Geodis Park",                 lat: 36.1302, lng: -86.7674,  city: "Nashville",      state: "TN" },
  { name: "Gillette Stadium",            lat: 42.0909, lng: -71.2643,  city: "Foxborough",     state: "MA" },
  { name: "Hard Rock Stadium",           lat: 25.9580, lng: -80.2389,  city: "Miami Gardens",  state: "FL" },
  { name: "Highmark Stadium",            lat: 42.7738, lng: -78.7870,  city: "Orchard Park",   state: "NY" },
  { name: "Huntington Bank Field",       lat: 41.5061, lng: -81.6995,  city: "Cleveland",      state: "OH" },
  { name: "Lambeau Field",               lat: 44.5013, lng: -88.0622,  city: "Green Bay",      state: "WI" },
  { name: "Levis Stadium",               lat: 37.4032, lng: -121.9700, city: "Santa Clara",    state: "CA" },
  { name: "Lincoln Financial Field",     lat: 39.9008, lng: -75.1675,  city: "Philadelphia",   state: "PA" },
  { name: "Lucas Oil Stadium",           lat: 39.7601, lng: -86.1638,  city: "Indianapolis",   state: "IN" },
  { name: "M&T Bank Stadium",            lat: 39.2780, lng: -76.6227,  city: "Baltimore",      state: "MD" },
  { name: "Mercedes-Benz Stadium",       lat: 33.7553, lng: -84.4006,  city: "Atlanta",        state: "GA" },
  { name: "MetLife Stadium",             lat: 40.8135, lng: -74.0745,  city: "East Rutherford", state: "NJ" },
  { name: "NRG Stadium",                 lat: 29.6847, lng: -95.4107,  city: "Houston",        state: "TX" },
  { name: "Paycor Stadium",              lat: 39.0954, lng: -84.5160,  city: "Cincinnati",     state: "OH" },
  { name: "Nissan Stadium",              lat: 36.1665, lng: -86.7713,  city: "Nashville",      state: "TN" },
  { name: "Raymond James Stadium",       lat: 27.9759, lng: -82.5033,  city: "Tampa",          state: "FL" },
  { name: "SoFi Stadium",                lat: 33.9535, lng: -118.3392, city: "Inglewood",      state: "CA" },
  { name: "Soldier Field",               lat: 41.8623, lng: -87.6167,  city: "Chicago",        state: "IL" },
  { name: "State Farm Stadium",          lat: 33.5276, lng: -112.2626, city: "Glendale",       state: "AZ" },
  { name: "Lumen Field",                 lat: 47.5952, lng: -122.3316, city: "Seattle",        state: "WA" },
  { name: "U.S. Bank Stadium",           lat: 44.9736, lng: -93.2575,  city: "Minneapolis",    state: "MN" },
  { name: "Acrisure Stadium",            lat: 40.4468, lng: -80.0158,  city: "Pittsburgh",     state: "PA" },
  { name: "Commanders Field",            lat: 38.9078, lng: -76.8645,  city: "Landover",       state: "MD" },

  // MLB
  { name: "Angel Stadium",               lat: 33.8003, lng: -117.8827, city: "Anaheim",        state: "CA" },
  { name: "Busch Stadium",               lat: 38.6226, lng: -90.1928,  city: "St. Louis",      state: "MO" },
  { name: "Chase Field",                 lat: 33.4455, lng: -112.0667, city: "Phoenix",        state: "AZ" },
  { name: "Citizens Bank Park",          lat: 39.9061, lng: -75.1665,  city: "Philadelphia",   state: "PA" },
  { name: "Citi Field",                  lat: 40.7571, lng: -73.8458,  city: "Flushing",       state: "NY" },
  { name: "Comerica Park",               lat: 42.3390, lng: -83.0485,  city: "Detroit",        state: "MI" },
  { name: "Coors Field",                 lat: 39.7560, lng: -104.9942, city: "Denver",         state: "CO" },
  { name: "Dodger Stadium",              lat: 34.0739, lng: -118.2400, city: "Los Angeles",    state: "CA" },
  { name: "Fenway Park",                 lat: 42.3467, lng: -71.0972,  city: "Boston",         state: "MA" },
  { name: "Globe Life Field",            lat: 32.7473, lng: -97.0845,  city: "Arlington",      state: "TX" },
  { name: "Great American Ball Park",    lat: 39.0975, lng: -84.5076,  city: "Cincinnati",     state: "OH" },
  { name: "Guaranteed Rate Field",       lat: 41.8300, lng: -87.6339,  city: "Chicago",        state: "IL" },
  { name: "Kauffman Stadium",            lat: 39.0517, lng: -94.4803,  city: "Kansas City",    state: "MO" },
  { name: "LoanDepot Park",              lat: 25.7781, lng: -80.2197,  city: "Miami",          state: "FL" },
  { name: "Minute Maid Park",            lat: 29.7573, lng: -95.3555,  city: "Houston",        state: "TX" },
  { name: "Nationals Park",              lat: 38.8730, lng: -77.0074,  city: "Washington",     state: "DC" },
  { name: "Oakland Coliseum",            lat: 37.7516, lng: -122.2005, city: "Oakland",        state: "CA" },
  { name: "Oracle Park",                 lat: 37.7786, lng: -122.3893, city: "San Francisco",  state: "CA" },
  { name: "Oriole Park at Camden Yards", lat: 39.2839, lng: -76.6218,  city: "Baltimore",      state: "MD" },
  { name: "PNC Park",                    lat: 40.4469, lng: -80.0057,  city: "Pittsburgh",     state: "PA" },
  { name: "Petco Park",                  lat: 32.7077, lng: -117.1569, city: "San Diego",      state: "CA" },
  { name: "Progressive Field",           lat: 41.4962, lng: -81.6852,  city: "Cleveland",      state: "OH" },
  { name: "Rogers Centre",               lat: 43.6414, lng: -79.3894,  city: "Toronto",        state: "ON" },
  { name: "T-Mobile Park",               lat: 47.5914, lng: -122.3325, city: "Seattle",        state: "WA" },
  { name: "Target Field",                lat: 44.9817, lng: -93.2783,  city: "Minneapolis",    state: "MN" },
  { name: "Tropicana Field",             lat: 27.7683, lng: -82.6534,  city: "St. Petersburg", state: "FL" },
  { name: "Truist Park",                 lat: 33.8908, lng: -84.4678,  city: "Cumberland",     state: "GA" },
  { name: "Wrigley Field",               lat: 41.9484, lng: -87.6553,  city: "Chicago",        state: "IL" },
  { name: "Yankee Stadium",              lat: 40.8296, lng: -73.9262,  city: "Bronx",          state: "NY" },
  { name: "American Family Field",       lat: 43.0280, lng: -87.9712,  city: "Milwaukee",      state: "WI" },
  { name: "Sahlen Field",                lat: 42.8837, lng: -78.8693,  city: "Buffalo",        state: "NY" },
  { name: "Sutter Health Park",          lat: 38.5802, lng: -121.5001, city: "Sacramento",     state: "CA" },

  // NBA / NHL shared arenas
  { name: "Ball Arena",                  lat: 39.7487, lng: -105.0077, city: "Denver",         state: "CO" },
  { name: "Capital One Arena",           lat: 38.8981, lng: -77.0209,  city: "Washington",     state: "DC" },
  { name: "Chase Center",                lat: 37.7680, lng: -122.3877, city: "San Francisco",  state: "CA" },
  { name: "Crypto.com Arena",            lat: 34.0430, lng: -118.2673, city: "Los Angeles",    state: "CA" },
  { name: "Little Caesars Arena",        lat: 42.3410, lng: -83.0548,  city: "Detroit",        state: "MI" },
  { name: "Madison Square Garden",       lat: 40.7505, lng: -73.9934,  city: "New York",       state: "NY" },
  { name: "PPG Paints Arena",            lat: 40.4396, lng: -79.9891,  city: "Pittsburgh",     state: "PA" },
  { name: "Scotiabank Arena",            lat: 43.6435, lng: -79.3791,  city: "Toronto",        state: "ON" },
  { name: "TD Garden",                   lat: 42.3662, lng: -71.0621,  city: "Boston",         state: "MA" },
  { name: "United Center",               lat: 41.8806, lng: -87.6742,  city: "Chicago",        state: "IL" },
  { name: "Wells Fargo Center",          lat: 39.9012, lng: -75.1720,  city: "Philadelphia",   state: "PA" },
  { name: "Enterprise Center",           lat: 38.6270, lng: -90.2025,  city: "St. Louis",      state: "MO" },
  { name: "Xcel Energy Center",          lat: 44.9448, lng: -93.1010,  city: "Saint Paul",     state: "MN" },

  // NBA-only
  { name: "American Airlines Center",    lat: 32.7905, lng: -96.8103,  city: "Dallas",         state: "TX" },
  { name: "Barclays Center",             lat: 40.6828, lng: -73.9754,  city: "Brooklyn",       state: "NY" },
  { name: "Footprint Center",            lat: 33.4457, lng: -112.0712, city: "Phoenix",        state: "AZ" },
  { name: "FTX Arena",                   lat: 25.7814, lng: -80.1870,  city: "Miami",          state: "FL" },
  { name: "Gainbridge Fieldhouse",       lat: 39.7640, lng: -86.1555,  city: "Indianapolis",   state: "IN" },
  { name: "Golden 1 Center",             lat: 38.5802, lng: -121.4997, city: "Sacramento",     state: "CA" },
  { name: "Kaseya Center",               lat: 25.7814, lng: -80.1870,  city: "Miami",          state: "FL" },
  { name: "Moda Center",                 lat: 45.5316, lng: -122.6668, city: "Portland",       state: "OR" },
  { name: "Moody Center",                lat: 30.2849, lng: -97.7341,  city: "Austin",         state: "TX" },
  { name: "NBA Arena",                   lat: 29.7490, lng: -95.3677,  city: "Houston",        state: "TX" },
  { name: "Paycom Center",               lat: 35.4634, lng: -97.5151,  city: "Oklahoma City",  state: "OK" },
  { name: "Smoothie King Center",        lat: 29.9490, lng: -90.0822,  city: "New Orleans",    state: "LA" },
  { name: "Spectrum Center",             lat: 35.2251, lng: -80.8392,  city: "Charlotte",      state: "NC" },
  { name: "State Farm Arena",            lat: 33.7573, lng: -84.3963,  city: "Atlanta",        state: "GA" },
  { name: "Toyota Center",               lat: 29.7508, lng: -95.3621,  city: "Houston",        state: "TX" },
  { name: "Vivint Arena",                lat: 40.7683, lng: -111.9011, city: "Salt Lake City",  state: "UT" },
  { name: "Delta Center",                lat: 40.7683, lng: -111.9011, city: "Salt Lake City",  state: "UT" },

  // NHL-only
  { name: "Amalie Arena",                lat: 27.9428, lng: -82.4519,  city: "Tampa",          state: "FL" },
  { name: "Bell Centre",                 lat: 45.4961, lng: -73.5693,  city: "Montreal",       state: "QC" },
  { name: "Canada Life Centre",          lat: 49.8929, lng: -97.1436,  city: "Winnipeg",       state: "MB" },
  { name: "Canadian Tire Centre",        lat: 45.2967, lng: -75.9275,  city: "Ottawa",         state: "ON" },
  { name: "CFG Bank Arena",              lat: 39.2876, lng: -76.6206,  city: "Baltimore",      state: "MD" },
  { name: "Climate Pledge Arena",        lat: 47.6219, lng: -122.3540, city: "Seattle",        state: "WA" },
  { name: "FLA Live Arena",              lat: 26.1583, lng: -80.3256,  city: "Sunrise",        state: "FL" },
  { name: "Lenovo Center",               lat: 35.8031, lng: -78.7219,  city: "Raleigh",        state: "NC" },
  { name: "PNC Arena",                   lat: 35.8031, lng: -78.7219,  city: "Raleigh",        state: "NC" },
  { name: "Prudential Center",           lat: 40.7334, lng: -74.1712,  city: "Newark",         state: "NJ" },
  { name: "Rogers Place",                lat: 53.5469, lng: -113.4974, city: "Edmonton",       state: "AB" },
  { name: "Scotiabank Saddledome",       lat: 51.0375, lng: -114.0517, city: "Calgary",        state: "AB" },
  { name: "T-Mobile Arena",              lat: 36.1028, lng: -115.1784, city: "Las Vegas",      state: "NV" },

  // MLS
  { name: "Audi Field",                  lat: 38.8682, lng: -77.0122,  city: "Washington",     state: "DC" },
  { name: "America First Field",         lat: 40.5827, lng: -111.8929, city: "Sandy",          state: "UT" },
  { name: "BMO Field",                   lat: 43.6334, lng: -79.4183,  city: "Toronto",        state: "ON" },
  { name: "BMO Stadium",                 lat: 34.0137, lng: -118.2847, city: "Los Angeles",    state: "CA" },
  { name: "Children's Mercy Park",       lat: 39.1219, lng: -94.8231,  city: "Kansas City",    state: "KS" },
  { name: "Citi Field",                  lat: 40.7571, lng: -73.8458,  city: "Flushing",       state: "NY" },
  { name: "DRV PNK Stadium",             lat: 26.1544, lng: -80.1869,  city: "Fort Lauderdale", state: "FL" },
  { name: "Dick's Sporting Goods Park",  lat: 39.8097, lng: -104.8917, city: "Commerce City",  state: "CO" },
  { name: "Dignity Health Sports Park",  lat: 33.8644, lng: -118.2611, city: "Carson",         state: "CA" },
  { name: "Exploria Stadium",            lat: 28.5411, lng: -81.3894,  city: "Orlando",        state: "FL" },
  { name: "Field",                       lat: 47.5951, lng: -122.3316, city: "Seattle",        state: "WA" },
  { name: "Geodis Park",                 lat: 36.1302, lng: -86.7674,  city: "Nashville",      state: "TN" },
  { name: "Lower.com Field",             lat: 39.9690, lng: -83.0096,  city: "Columbus",       state: "OH" },
  { name: "Gillette Stadium",            lat: 42.0909, lng: -71.2643,  city: "Foxborough",     state: "MA" },
  { name: "Inter&Co Stadium",            lat: 28.5411, lng: -81.3894,  city: "Orlando",        state: "FL" },
  { name: "GEODIS Park",                 lat: 36.1302, lng: -86.7674,  city: "Nashville",      state: "TN" },
  { name: "PayPal Park",                 lat: 37.3516, lng: -121.9264, city: "San Jose",       state: "CA" },
  { name: "Providence Park",             lat: 45.5215, lng: -122.6916, city: "Portland",       state: "OR" },
  { name: "Q2 Stadium",                  lat: 30.3874, lng: -97.7192,  city: "Austin",         state: "TX" },
  { name: "Red Bull Arena",              lat: 40.7369, lng: -74.1502,  city: "Harrison",       state: "NJ" },
  { name: "Saputo Stadium",              lat: 45.5632, lng: -73.5514,  city: "Montreal",       state: "QC" },
  { name: "Shell Energy Stadium",        lat: 29.7524, lng: -95.3524,  city: "Houston",        state: "TX" },
  { name: "Subaru Park",                 lat: 39.9307, lng: -75.3598,  city: "Chester",        state: "PA" },
  { name: "TQL Stadium",                 lat: 39.1127, lng: -84.5200,  city: "Cincinnati",     state: "OH" },
  { name: "Toyota Stadium",              lat: 33.1547, lng: -97.1141,  city: "Frisco",         state: "TX" },

  // College / bowl game venues
  { name: "Michigan Stadium",            lat: 42.2659, lng: -83.7486,  city: "Ann Arbor",      state: "MI" },
  { name: "Ohio Stadium",                lat: 40.0017, lng: -83.0196,  city: "Columbus",       state: "OH" },
  { name: "Penn State Beaver Stadium",   lat: 40.8120, lng: -77.8564,  city: "State College",  state: "PA" },
  { name: "Tiger Stadium",               lat: 30.4120, lng: -91.1835,  city: "Baton Rouge",    state: "LA" },
  { name: "Bryant-Denny Stadium",        lat: 33.2083, lng: -87.5503,  city: "Tuscaloosa",     state: "AL" },
  { name: "Kyle Field",                  lat: 30.6100, lng: -96.3406,  city: "College Station", state: "TX" },
  { name: "Darrell K Royal Stadium",     lat: 30.2838, lng: -97.7327,  city: "Austin",         state: "TX" },
  { name: "Rose Bowl",                   lat: 34.1614, lng: -118.1676, city: "Pasadena",       state: "CA" },
  { name: "Cotton Bowl",                 lat: 32.7794, lng: -96.7606,  city: "Dallas",         state: "TX" },
  { name: "Notre Dame Stadium",          lat: 41.6975, lng: -86.2340,  city: "South Bend",     state: "IN" },
  { name: "Neyland Stadium",             lat: 35.9550, lng: -83.9251,  city: "Knoxville",      state: "TN" },
  { name: "Memorial Stadium",            lat: 40.1011, lng: -88.2342,  city: "Champaign",      state: "IL" },
]

// ─── Sport hints — primary sport for each known venue ────────────────────────

const VENUE_SPORT_HINTS: Record<string, string> = {
  // NFL
  "Allegiant Stadium": "nfl", "Arrowhead Stadium": "nfl", "AT&T Stadium": "nfl",
  "Bank of America Stadium": "nfl", "Caesars Superdome": "nfl",
  "Empower Field at Mile High": "nfl", "EverBank Stadium": "nfl",
  "FedExField": "nfl", "FirstEnergy Stadium": "nfl", "Ford Field": "nfl",
  "Gillette Stadium": "nfl", "Hard Rock Stadium": "nfl", "Highmark Stadium": "nfl",
  "Huntington Bank Field": "nfl", "Lambeau Field": "nfl", "Levis Stadium": "nfl",
  "Lincoln Financial Field": "nfl", "Lucas Oil Stadium": "nfl", "M&T Bank Stadium": "nfl",
  "Mercedes-Benz Stadium": "nfl", "MetLife Stadium": "nfl", "NRG Stadium": "nfl",
  "Paycor Stadium": "nfl", "Nissan Stadium": "nfl", "Raymond James Stadium": "nfl",
  "SoFi Stadium": "nfl", "Soldier Field": "nfl", "State Farm Stadium": "nfl",
  "Lumen Field": "nfl", "U.S. Bank Stadium": "nfl", "Acrisure Stadium": "nfl",
  "Commanders Field": "nfl",
  // MLB
  "Angel Stadium": "mlb", "Busch Stadium": "mlb", "Chase Field": "mlb",
  "Citizens Bank Park": "mlb", "Citi Field": "mlb", "Comerica Park": "mlb",
  "Coors Field": "mlb", "Dodger Stadium": "mlb", "Fenway Park": "mlb",
  "Globe Life Field": "mlb", "Great American Ball Park": "mlb", "Guaranteed Rate Field": "mlb",
  "Kauffman Stadium": "mlb", "LoanDepot Park": "mlb", "Minute Maid Park": "mlb",
  "Nationals Park": "mlb", "Oakland Coliseum": "mlb", "Oracle Park": "mlb",
  "Oriole Park at Camden Yards": "mlb", "PNC Park": "mlb", "Petco Park": "mlb",
  "Progressive Field": "mlb", "Rogers Centre": "mlb", "T-Mobile Park": "mlb",
  "Target Field": "mlb", "Tropicana Field": "mlb", "Truist Park": "mlb",
  "Wrigley Field": "mlb", "Yankee Stadium": "mlb", "American Family Field": "mlb",
  // NBA/NHL shared (defaulting to one — fetchGameOnDate tries both)
  "Ball Arena": "nba", "Capital One Arena": "nba", "Chase Center": "nba",
  "Crypto.com Arena": "nba", "Little Caesars Arena": "nba", "Madison Square Garden": "nba",
  "PPG Paints Arena": "nhl", "Scotiabank Arena": "nba", "TD Garden": "nba",
  "United Center": "nba", "Wells Fargo Center": "nba", "Enterprise Center": "nhl",
  "Xcel Energy Center": "nhl", "American Airlines Center": "nba", "Barclays Center": "nba",
  "Footprint Center": "nba", "Gainbridge Fieldhouse": "nba", "Golden 1 Center": "nba",
  "Kaseya Center": "nba", "Moda Center": "nba", "Paycom Center": "nba",
  "Smoothie King Center": "nba", "Spectrum Center": "nba", "State Farm Arena": "nba",
  "Toyota Center": "nba", "Vivint Arena": "nba", "Delta Center": "nba",
  // NHL-only
  "Amalie Arena": "nhl", "Bell Centre": "nhl", "Canada Life Centre": "nhl",
  "Canadian Tire Centre": "nhl", "Climate Pledge Arena": "nhl", "FLA Live Arena": "nhl",
  "Lenovo Center": "nhl", "PNC Arena": "nhl", "Prudential Center": "nhl",
  "Rogers Place": "nhl", "Scotiabank Saddledome": "nhl", "T-Mobile Arena": "nhl",
  // MLS
  "Audi Field": "mls", "America First Field": "mls", "BMO Field": "mls",
  "BMO Stadium": "mls", "Children's Mercy Park": "mls", "DRV PNK Stadium": "mls",
  "Dick's Sporting Goods Park": "mls", "Dignity Health Sports Park": "mls",
  "Exploria Stadium": "mls", "Geodis Park": "mls", "GEODIS Park": "mls",
  "Lower.com Field": "mls", "Inter&Co Stadium": "mls", "PayPal Park": "mls",
  "Providence Park": "mls", "Q2 Stadium": "mls", "Red Bull Arena": "mls",
  "Shell Energy Stadium": "mls", "Subaru Park": "mls", "TQL Stadium": "mls",
  "Toyota Stadium": "mls",
  // College
  "Michigan Stadium": "college", "Ohio Stadium": "college",
  "Penn State Beaver Stadium": "college", "Tiger Stadium": "college",
  "Bryant-Denny Stadium": "college", "Kyle Field": "college",
  "Darrell K Royal Stadium": "college", "Notre Dame Stadium": "college",
  "Neyland Stadium": "college", "Memorial Stadium": "college",
}

export function getVenueSportHint(venueName: string): string | null {
  return VENUE_SPORT_HINTS[venueName] ?? null
}

// ─── GPS lookup ───────────────────────────────────────────────────────────────

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function findVenueByCoords(lat: number, lng: number, maxMeters = 500): VenueInfo | null {
  let best: VenueInfo | null = null
  let bestDist = Infinity
  for (const v of VENUES) {
    const d = haversineMeters(lat, lng, v.lat, v.lng)
    if (d < maxMeters && d < bestDist) { bestDist = d; best = v }
  }
  return best
}

// ─── Lookup helper ────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Pre-build a normalized lookup map for O(1) access
const _byNorm: Map<string, VenueInfo> = new Map(
  VENUES.map((v) => [normalize(v.name), v])
)

export function getVenueCoordinates(venueName: string): VenueInfo | null {
  if (!venueName) return null
  const key = normalize(venueName)
  if (_byNorm.has(key)) return _byNorm.get(key)!

  // Fuzzy: check if any stored venue name is contained within the input or vice-versa
  for (const [normName, info] of _byNorm) {
    if (key.includes(normName) || normName.includes(key)) return info
  }
  return null
}

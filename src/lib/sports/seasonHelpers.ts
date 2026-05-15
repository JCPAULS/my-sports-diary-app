/**
 * Season calculation helpers — all date-driven, no hardcoded "current year" values.
 * Each function returns the ESPN API-compatible season value (a single year as a number).
 *
 * SPORT CALENDARS:
 *
 *   NFL:
 *     Season year = year it kicks off. "2025 NFL season" runs Sep 2025 – Feb 2026.
 *     Aug–Dec of year Y → current season is Y.
 *     Jan–Jul of year Y → most recent season is Y-1 (still in playoffs/offseason).
 *
 *   MLB:
 *     Calendar-year season. Spring training Mar, regular Apr–Sep, playoffs Oct–Nov.
 *     Mar–Dec → current year. Jan–Feb (winter offseason) → year - 1.
 *
 *   MLS:
 *     Calendar-year season. Kicks off Feb, MLS Cup in Nov/Dec.
 *     Feb–Dec → current year. Jan (true offseason) → year - 1.
 *
 *   WNBA:
 *     Calendar-year season. Regular season May–Sep, playoffs Sep–Oct.
 *     Apr–Dec → current year (one month early to catch season preview/drafts).
 *     Jan–Mar → year - 1.
 *
 *   NBA / NHL:
 *     Split-year season. Runs Oct–Jun. ESPN API year = the year the season ENDS.
 *     "2024-25 season" → ESPN value "2025".
 *     Oct–Dec of year Y → ESPN value Y+1 (new season just started, ends next year).
 *     Jan–Sep of year Y → ESPN value Y (either mid-season or just-ended offseason).
 */

function now(): { month: number; year: number } {
  const d = new Date()
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

/** NFL: season year = year the season kicks off (Aug). */
export function getCurrentNflSeason(): number {
  const { month, year } = now()
  return month >= 8 ? year : year - 1
}

/** MLB: calendar-year season; in season or just ended from Mar onward. */
export function getCurrentMlbSeason(): number {
  const { month, year } = now()
  return month >= 3 ? year : year - 1
}

/** MLS: calendar-year season starting Feb. */
export function getCurrentMlsSeason(): number {
  const { month, year } = now()
  return month >= 2 ? year : year - 1
}

/** WNBA: calendar-year season starting May; include current year from Apr onward. */
export function getCurrentWnbaSeason(): number {
  const { month, year } = now()
  return month >= 4 ? year : year - 1
}

/**
 * NBA / NHL: split-year season Oct–Jun. ESPN API value = year the season ends.
 * Oct–Dec → year + 1 (the new season ends next calendar year).
 * Jan–Sep → year (mid-season or just-ended offseason, both end in this calendar year).
 */
export function getCurrentNbaSeason(): number {
  const { month, year } = now()
  return month >= 10 ? year + 1 : year
}

/**
 * Builds a season list from fromYear to currentSeason, newest first.
 * Values are API-compatible year strings (e.g., "2026").
 * For split-year sports, seasonDisplayLabel converts "2026" → "2025-26 Season" at render time.
 */
export function generateSeasonRange(fromYear: number, currentSeason: number): string[] {
  const out: string[] = []
  for (let y = currentSeason; y >= fromYear; y--) out.push(String(y))
  return out
}

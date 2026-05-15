import { Link, useSearchParams } from 'react-router-dom'
import { getAllGames } from '@/lib/storage'
import { getWeekLabel } from '@/lib/nflTeams'
import { getSport, ENABLED_SPORTS } from '@/lib/sports'
import { getAllMilestones } from '@/lib/milestones'
import Nav from '@/components/Nav'
import TeamBadge from '@/components/TeamBadge'
import type { Game } from '@/types/Game'

// Shared gutter width — keeps the timeline line position consistent
const GUTTER = 'w-[60px] lg:w-[84px]'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeasonGroup {
  season: string   // "2024", or calendar year for legacy date-only games
  games: Game[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGameSeason(game: Game): string {
  return game.season ?? game.date?.slice(0, 4) ?? 'Unknown'
}

function getGameSortKey(game: Game): number {
  if (game.week) {
    const sport = getSport(game.sportId ?? 'nfl')
    return sport ? sport.getScheduleSortOrder(game.week) : 99
  }
  if (game.date) {
    const [, m, d] = game.date.split('-').map(Number)
    return 100 + m + d / 100   // after any week-keyed games, sorted by date
  }
  return 999
}

function groupGames(games: Game[]): SeasonGroup[] {
  const bySeason: Record<string, Game[]> = {}
  for (const game of games) {
    const s = getGameSeason(game)
    if (!bySeason[s]) bySeason[s] = []
    bySeason[s].push(game)
  }
  return Object.entries(bySeason)
    .sort(([a], [b]) => b.localeCompare(a))   // newest season first
    .map(([season, gs]) => ({
      season,
      games: gs.sort((a, b) => getGameSortKey(a) - getGameSortKey(b)),  // week 1 → Super Bowl
    }))
}

function computeStats(games: Game[]) {
  const counts: Record<string, number> = {}
  for (const g of games) {
    counts[g.homeTeam] = (counts[g.homeTeam] ?? 0) + 1
    counts[g.awayTeam] = (counts[g.awayTeam] ?? 0) + 1
  }
  const topTeam = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const uniqueVenues = new Set(games.flatMap((g) => (g.venue ? [g.venue] : []))).size
  return { topTeam, uniqueVenues }
}

function isRecentlyAdded(game: Game): boolean {
  return Date.now() - new Date(game.createdAt).getTime() < 5000
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase()
}

function gameLabel(game: Game): string {
  if (game.scheduleLabel) return game.scheduleLabel
  if (game.week && game.season) {
    return `${getWeekLabel(game.week).toUpperCase()} · ${game.season} SEASON`
  }
  if (game.season) {
    const sport = getSport(game.sportId ?? 'nfl')
    return (sport?.seasonDisplayLabel(game.season) ?? `${game.season} Season`).toUpperCase()
  }
  if (game.date) return formatDate(game.date)
  return ''
}

// ─── Real game card ───────────────────────────────────────────────────────────

const MULTI_SPORT = ENABLED_SPORTS.filter((s) => !s.isCustom).length > 1

function getSportChip(game: Game): string {
  if (game.sportId === 'custom') {
    return game.level ? `CUSTOM · ${game.level.toUpperCase()}` : 'CUSTOM'
  }
  if (game.sportId === 'college') {
    return game.collegeSportType ? `COLLEGE · ${game.collegeSportType.toUpperCase()}` : 'COLLEGE'
  }
  return getSport(game.sportId ?? 'nfl')?.label ?? ''
}

function GameCard({ game, cardIdx }: { game: Game; cardIdx: number }) {
  const hasScore = game.homeScore !== undefined && game.awayScore !== undefined
  const firstPhoto = game.photos?.[0]
  const sportChip = getSportChip(game)
  const showSportChip = MULTI_SPORT || game.sportId === 'custom'

  return (
    <Link
      to={`/game/${game.id}`}
      className="relative block bg-paper-deep border-2 border-ink card-press animate-fade-slide-up w-full max-w-xl"
      style={{ animationDelay: `${cardIdx * 60}ms` }}
    >
      {firstPhoto && (
        <div className="absolute top-3 right-3 w-16 h-16 border-2 border-white overflow-hidden shadow-[2px_2px_0_rgba(0,0,0,0.3)] z-10 rotate-2">
          <img src={firstPhoto} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className={firstPhoto ? 'p-5 pr-20' : 'p-5'}>
        {showSportChip && sportChip && (
          <p className="font-bebas text-[9px] tracking-[0.25em] text-ink/30 mb-0.5">{sportChip}</p>
        )}
        <p className="font-bebas text-xs tracking-[0.2em] text-ink/50 mb-1">
          {gameLabel(game)}
        </p>
        <div className="flex items-center gap-1.5 mb-1">
          <TeamBadge team={game.homeTeam} sportId={game.sportId} size="xs" />
          <span className="font-bebas text-xs text-red">vs</span>
          <TeamBadge team={game.awayTeam} sportId={game.sportId} size="xs" />
        </div>
        <p className="font-bebas text-3xl lg:text-4xl leading-none text-ink">
          {game.homeTeam} <span className="text-red">vs</span> {game.awayTeam}
        </p>
        {hasScore && (
          <div className="inline-block bg-ink text-gold font-bebas text-xl tracking-widest px-3 py-1 mt-3">
            {game.homeScore} – {game.awayScore}
          </div>
        )}
        {game.notes && (
          <p className="font-caveat text-lg text-navy mt-3 leading-snug">
            &ldquo;{game.notes.length > 100 ? game.notes.slice(0, 100) + '…' : game.notes}&rdquo;
          </p>
        )}
      </div>
      <div className="border-t-2 border-dashed border-ink/20 mx-5" />
      <div className="px-5 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {game.venue && <span className="font-bebas text-xs tracking-[0.15em] text-ink/40 truncate">{game.venue}</span>}
          {game.section && <span className="font-bebas text-[10px] tracking-[0.1em] text-ink/25 flex-shrink-0">SEC {game.section}</span>}
        </div>
        <span className="font-bebas text-sm text-ink/30 flex-shrink-0">›</span>
      </div>
    </Link>
  )
}

// ─── Empty-state data ─────────────────────────────────────────────────────────

const ZERO_STATS = [
  { value: '0', label: 'GAMES' },
  { value: '0', label: 'STADIUMS' },
  { value: '0', label: 'TEAMS' },
  { value: '0', label: 'MEMORIES' },
]

const EXAMPLE_ENTRIES = [
  {
    label: 'WEEK 10 · 2025 SEASON',
    matchup: 'BILLS vs PATRIOTS',
    homeScore: 27,
    awayScore: 24,
    note: "Dad's first Bills game. Cold but worth it.",
  },
  {
    label: 'WEEK 6 · 2025 SEASON',
    matchup: 'PATRIOTS vs JETS',
    homeScore: 17,
    awayScore: 21,
    note: 'Sat in the rain for the whole 4th quarter.',
  },
  {
    label: 'WEEK 2 · 2025 SEASON',
    matchup: 'PATRIOTS vs BENGALS',
    homeScore: 28,
    awayScore: 31,
    note: "OT thriller. Best game we've seen all year.",
  },
]

function ExampleCard({ label, matchup, awayScore, homeScore, note }: {
  label: string; matchup: string; awayScore: number; homeScore: number; note: string
}) {
  return (
    <div
      className="relative max-w-xl cursor-default select-none"
      style={{ opacity: 0.38, filter: 'grayscale(35%)' }}
      title="This is an example — log your real games to fill your diary"
    >
      <div className="bg-paper-deep border-2 border-dashed border-ink/60 shadow-[3px_3px_0_rgba(0,0,0,0.25)]">
        <div className="absolute top-3 right-3 bg-ink text-paper font-bebas text-[10px] tracking-[0.2em] px-2 py-0.5 z-10">
          EXAMPLE
        </div>
        <div className="p-5">
          <p className="font-bebas text-xs tracking-[0.2em] text-ink/50 mb-1">{label}</p>
          <p className="font-bebas text-3xl lg:text-4xl leading-none text-ink">{matchup}</p>
          <div className="inline-block bg-ink text-gold font-bebas text-xl tracking-widest px-3 py-1 mt-3">
            {homeScore} – {awayScore}
          </div>
          <p className="font-caveat text-lg text-navy mt-3 leading-snug">&ldquo;{note}&rdquo;</p>
        </div>
        <div className="border-t-2 border-dashed border-ink/20 mx-5" />
        <div className="px-5 py-2">
          <span className="font-bebas text-xs tracking-[0.15em] text-ink/30">PREVIEW ENTRY</span>
        </div>
      </div>
    </div>
  )
}

function EmptyTimeline() {
  return (
    <div>
      <div className="hidden md:grid md:grid-cols-4 gap-3 mb-8">
        {ZERO_STATS.map(({ value, label }) => (
          <div key={label} className="bg-paper-deep border-2 border-ink text-center py-6">
            <p className="font-bebas text-6xl text-red leading-none">{value}</p>
            <p className="font-bebas text-xs tracking-[0.25em] text-ink mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <div className="absolute left-7 lg:left-10 top-0 bottom-0 w-[3px] bg-ink/15" />

        {/* Placeholder card */}
        <div className="flex items-start mb-12">
          <div className={`${GUTTER} flex-shrink-0 pt-5 flex items-start`}>
            <div className="flex items-center w-full">
              <div className="ml-5 lg:ml-8 w-5 h-5 rounded-full border-2 border-dashed border-red/50 bg-paper flex-shrink-0" />
              <div className="flex-1 border-t-2 border-dashed border-ink/20" />
            </div>
          </div>
          <div className="flex-1 min-w-0 max-w-xl mt-3">
            <div className="border-2 border-dashed border-ink/30 p-7 bg-paper-deep/40">
              <p className="font-bebas text-sm tracking-[0.2em] text-ink/40 mb-3">
                YOUR NEXT GAME · {new Date().getFullYear()} SEASON
              </p>
              <p className="font-bebas text-4xl lg:text-5xl text-ink/35 leading-none mb-1">
                HOME TEAM <span className="text-red/35">vs</span> AWAY TEAM
              </p>
              <p className="font-caveat text-xl text-ink/30 mt-4 mb-6">
                What will you remember about this one?
              </p>
              <Link
                to="/add"
                className="inline-block font-bebas text-lg tracking-[0.15em] bg-red text-white border-2 border-ink px-5 py-2.5 btn-press"
              >
                + Add Your First Game
              </Link>
            </div>
          </div>
        </div>

        {/* Example entries label */}
        <div className="flex items-start mb-6">
          <div className={`${GUTTER} flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <p className="font-bebas text-xs tracking-[0.3em] text-ink/35">WHAT YOUR DIARY WILL LOOK LIKE</p>
          </div>
        </div>

        {EXAMPLE_ENTRIES.map((entry) => (
          <div key={entry.label}>
            <div className="flex items-start mb-10">
              <div className={`${GUTTER} flex-shrink-0 pt-5 flex items-start`}>
                <div className="flex items-center w-full">
                  <div className="ml-5 lg:ml-8 w-5 h-5 rounded-full bg-red/50 border-2 border-ink/40 z-10 flex-shrink-0" />
                  <div className="flex-1 border-t-2 border-dashed border-ink/25" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <ExampleCard {...entry} />
              </div>
            </div>
          </div>
        ))}

        {/* Bottom CTA */}
        <div className="flex items-start pb-8 pt-2">
          <div className={`${GUTTER} flex-shrink-0`} />
          <div className="flex-1 min-w-0 max-w-xl">
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 border-t-2 border-dashed border-ink/15" />
              <span className="font-bebas text-ink/20 text-lg">✦</span>
              <div className="flex-1 border-t-2 border-dashed border-ink/15" />
            </div>
            <p className="font-caveat text-2xl lg:text-3xl text-navy text-center">
              Tap '+ Add Game' to start your diary.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Home ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams()
  const teamFilter     = searchParams.get('team')
  const attendeeFilter = searchParams.get('attendee')

  const allGames = getAllGames()
  const games = teamFilter
    ? allGames.filter((g) => g.homeTeam === teamFilter || g.awayTeam === teamFilter)
    : attendeeFilter
    ? allGames.filter((g) => {
        const lc = attendeeFilter.toLowerCase()
        return g.attendees?.some((a) => a.toLowerCase() === lc)
      })
    : allGames

  const seasonGroups = groupGames(games)
  const stats = computeStats(allGames)

  // Closest locked milestone — shown as a subtle motivational strip
  const nextMilestone = (() => {
    if (allGames.length === 0) return null
    let best: { icon: string; title: string; current: number; target: number; pct: number } | null = null
    for (const m of getAllMilestones(allGames)) {
      if (m.checkUnlocked(allGames)) continue
      const { current, target } = m.getProgress(allGames)
      const pct = target > 0 ? current / target : 0
      if (!best || pct > best.pct) best = { icon: m.icon, title: m.title, current, target, pct }
    }
    return best
  })()

  let cardCounter = 0

  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      {/* ── Header ── */}
      <header className="bg-hero-blue border-b-4 border-ink">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h1 className="font-bebas text-6xl lg:text-8xl text-ink tracking-wide leading-none">
                My Sports Diary
              </h1>
              <p className="font-caveat text-2xl lg:text-3xl text-navy mt-1">
                The games. The people. The stories.
              </p>
            </div>
            <Link
              to="/add"
              className="hidden lg:block font-bebas text-xl tracking-[0.15em] bg-red text-white border-2 border-ink px-6 py-3 btn-press flex-shrink-0 self-center"
            >
              + Add Game
            </Link>
          </div>

          {games.length > 0 && (
            <div className="hidden md:flex items-center gap-6 mt-5 pt-4 border-t-2 border-ink/20 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-bebas text-xs tracking-[0.2em] text-ink/50">Games Logged</span>
                <span className="font-bebas text-base bg-red text-white px-2 py-0.5">{games.length}</span>
              </div>
              {stats.topTeam && (
                <div className="flex items-center gap-2">
                  <span className="font-bebas text-xs tracking-[0.2em] text-ink/50">Most Seen</span>
                  <span className="font-bebas text-base bg-ink text-gold px-2 py-0.5">{stats.topTeam}</span>
                </div>
              )}
              {stats.uniqueVenues > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-bebas text-xs tracking-[0.2em] text-ink/50">Venues</span>
                  <span className="font-bebas text-base border-2 border-ink px-2 py-0.5">{stats.uniqueVenues}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">

        <div className="flex justify-end mb-6 lg:hidden">
          <Link to="/add" className="font-bebas text-xl tracking-[0.15em] bg-red text-white border-2 border-ink px-6 py-3 btn-press">
            + Add Game
          </Link>
        </div>

        {/* Team filter banner */}
        {teamFilter && (
          <div className="flex items-center gap-3 mb-6 bg-ink text-white px-4 py-2.5 border-2 border-ink shadow-[3px_3px_0_var(--color-red)]">
            <TeamBadge team={teamFilter} size="xs" sportId="nfl" />
            <span className="font-bebas text-sm tracking-[0.2em] flex-1">FILTERED: {teamFilter}</span>
            <button
              onClick={() => setSearchParams({})}
              className="font-bebas text-xl text-red leading-none hover:text-gold transition-colors"
              aria-label="Clear filter"
            >
              ×
            </button>
          </div>
        )}

        {/* Attendee filter banner */}
        {attendeeFilter && (
          <div className="flex items-center gap-3 mb-6 bg-navy text-white px-4 py-2.5 border-2 border-ink shadow-[3px_3px_0_#d4a017]">
            <span className="font-bebas text-sm tracking-[0.2em] flex-1">GAMES WITH {attendeeFilter.toUpperCase()}</span>
            <button
              onClick={() => setSearchParams({})}
              className="font-bebas text-xl text-gold leading-none hover:text-white transition-colors"
              aria-label="Clear filter"
            >
              ×
            </button>
          </div>
        )}

        {/* Next milestone strip — only when no active filter */}
        {nextMilestone && !teamFilter && !attendeeFilter && (
          <Link
            to="/stats"
            className="flex items-center gap-3 mb-6 bg-paper-deep border-2 border-ink/20 px-4 py-3 hover:border-ink transition-colors"
          >
            <span className="text-xl flex-shrink-0">{nextMilestone.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bebas text-[9px] tracking-[0.25em] text-ink/35">NEXT MILESTONE</p>
              <p className="font-bebas text-sm text-ink leading-none">{nextMilestone.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-ink/10 h-1 max-w-24">
                  <div className="bg-red h-full" style={{ width: `${nextMilestone.pct * 100}%` }} />
                </div>
                <span className="font-bebas text-[10px] text-ink/40">{nextMilestone.current} / {nextMilestone.target}</span>
              </div>
            </div>
            <span className="font-bebas text-sm text-ink/30 flex-shrink-0">›</span>
          </Link>
        )}

        {(teamFilter || attendeeFilter) && games.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-caveat text-xl text-ink/40">
              {teamFilter ? `No logged games with ${teamFilter} yet.` : `No logged games with ${attendeeFilter} yet.`}
            </p>
            <Link to="/" className="font-caveat text-base text-navy underline mt-2 block">← Show all games</Link>
          </div>
        ) : allGames.length === 0 ? <EmptyTimeline /> : (
          <div className="relative">
            <div className="absolute left-7 lg:left-10 top-0 bottom-0 w-[3px] bg-ink" />

            {seasonGroups.map((group, gi) => (
              <div key={group.season} className={gi > 0 ? 'mt-10' : ''}>

                {/* Season chapter header */}
                <div className="flex items-start">
                  <div className={`${GUTTER} flex-shrink-0 flex justify-center pt-3`}>
                    <div className="w-6 h-6 bg-gold border-2 border-ink rotate-45 relative z-10" />
                  </div>
                  <div className="flex-1 min-w-0 pb-4 pt-1">
                    <div className="border-b-2 border-ink pb-1">
                      <h2 className="font-bebas text-7xl lg:text-[110px] text-red leading-none">
                        {group.season}
                      </h2>
                    </div>
                  </div>
                </div>

                {/* Games in week order — no month subheaders */}
                <div className="flex flex-col gap-5 pb-2 pt-4">
                  {group.games.map((game) => {
                    const myIdx = cardCounter++
                    const isNew = isRecentlyAdded(game)
                    return (
                      <div key={game.id} className="flex items-start">
                        <div className={`${GUTTER} flex-shrink-0 pt-5 flex items-start`}>
                          <div className="flex items-center w-full">
                            <div
                              className={`ml-5 lg:ml-8 w-5 h-5 rounded-full bg-red border-2 border-ink z-10 flex-shrink-0${isNew ? ' animate-pulse-node' : ''}`}
                            />
                            <div className="flex-1 border-t-2 border-dashed border-ink/40" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <GameCard game={game} cardIdx={myIdx} />
                        </div>
                      </div>
                    )
                  })}
                </div>

              </div>
            ))}

          </div>
        )}
        </main>
    </div>
  )
}

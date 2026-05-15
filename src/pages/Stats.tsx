import { lazy, Suspense, Component, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAllGames } from '@/lib/storage'
import { getWeekLabel } from '@/lib/nflTeams'
import { getSport } from '@/lib/sports'
import { getAllMilestones, type Milestone } from '@/lib/milestones'
import { getVenueCoordinates, type MapPin } from '@/lib/venues'
import { getSettings } from '@/lib/settings'
import Nav from '@/components/Nav'
import TeamBadge from '@/components/TeamBadge'
import type { Game } from '@/types/Game'

const StadiumMap = lazy(() => import('@/components/StadiumMap'))

// ─── Map error boundary ───────────────────────────────────────────────────────

class MapErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean; key: number }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: false, key: 0 }
  }
  static getDerivedStateFromError() { return { error: true } }
  retry = () => this.setState((s) => ({ error: false, key: s.key + 1 }))
  render() {
    if (this.state.error) {
      return (
        <div className="w-full h-64 lg:h-80 border-2 border-ink/20 bg-paper-deep flex flex-col items-center justify-center gap-3">
          <p className="font-bebas text-xl text-ink/40 tracking-[0.2em]">MAP COULDN'T LOAD</p>
          <button
            onClick={this.retry}
            className="font-bebas text-sm tracking-[0.15em] bg-ink text-gold px-4 py-2 border border-ink/30 hover:opacity-80 transition-opacity"
          >
            TRY AGAIN
          </button>
        </div>
      )
    }
    return <div key={this.state.key}>{this.props.children}</div>
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface TeamStat { team: string; sportId: string; total: number; home: number; away: number }

function computeTeamStats(games: Game[]): TeamStat[] {
  const map: Record<string, TeamStat> = {}
  const ensure = (name: string, sid: string) => {
    if (!map[name]) map[name] = { team: name, sportId: sid, total: 0, home: 0, away: 0 }
  }
  for (const g of games) {
    const sid = g.sportId ?? 'nfl'
    ensure(g.homeTeam, sid); map[g.homeTeam].total++; map[g.homeTeam].home++
    ensure(g.awayTeam, sid); map[g.awayTeam].total++; map[g.awayTeam].away++
  }
  return Object.values(map).sort((a, b) => b.total - a.total)
}

interface PersonStat {
  name: string
  totalGames: number
  wins: number
  losses: number
  ties: number
  qualifyingGames: number
}

function computeRecord(games: Game[]): { wins: number; losses: number; ties: number } {
  let wins = 0, losses = 0, ties = 0
  for (const g of games) {
    if (g.homeScore === undefined || g.awayScore === undefined || !g.rootingFor) continue
    if (g.homeScore === g.awayScore) { ties++; continue }
    const rootingHome = g.rootingFor === g.homeTeam
    const homeWon = g.homeScore > g.awayScore
    if ((rootingHome && homeWon) || (!rootingHome && !homeWon)) wins++
    else losses++
  }
  return { wins, losses, ties }
}

function computePersonStats(games: Game[]): PersonStat[] {
  const byName: Record<string, { displayName: string; games: Game[] }> = {}
  for (const g of games) {
    for (const person of (g.attendees ?? [])) {
      const key = person.toLowerCase().trim()
      if (!key) continue
      if (!byName[key]) byName[key] = { displayName: person, games: [] }
      byName[key].games.push(g)
    }
  }
  return Object.values(byName)
    .map(({ displayName, games: pg }) => {
      const { wins, losses, ties } = computeRecord(pg)
      return { name: displayName, totalGames: pg.length, wins, losses, ties, qualifyingGames: wins + losses + ties }
    })
    .sort((a, b) => b.totalGames - a.totalGames)
}

function parseVibes(games: Game[]): { vibe: string; count: number }[] {
  const counts: Record<string, number> = {}
  for (const g of games) {
    const key = g.vibe?.trim().toLowerCase()
    if (key) counts[key] = (counts[key] ?? 0) + 1
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([vibe, count]) => ({ vibe, count }))
}

function sortableKey(g: Game): number {
  if (g.date) return new Date(g.date).getTime()
  if (g.season) return parseInt(g.season) * 1_000_000 + (g.week ? parseInt(g.week) || 0 : 0)
  return 0
}

function gameDateLabel(g: Game): string {
  if (g.date) {
    const [y, m, d] = g.date.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (g.week && g.season) return `${getWeekLabel(g.week)} · ${g.season}`
  return ''
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SHADOWS = [
  'shadow-[3px_3px_0_var(--color-red)]',  // red
  'shadow-[3px_3px_0_#d4a017]',  // gold
  'shadow-[3px_3px_0_#1a2c4e]',  // navy
]

function StatCard({ children, v = 0, className = '' }: { children: React.ReactNode; v?: number; className?: string }) {
  return (
    <div className={`bg-paper-deep border-2 border-ink p-5 animate-fade-slide-up ${SHADOWS[v % 3]} ${className}`}>
      {children}
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <h2 className="font-bebas text-2xl tracking-[0.2em] text-ink flex-shrink-0">{title}</h2>
      <div className="flex-1 h-[2px] bg-ink" />
    </div>
  )
}

function MilestoneCard({ m, unlocked, current, target, v }: {
  m: Milestone; unlocked: boolean; current: number; target: number; v: number
}) {
  const pct = target > 0 ? Math.min(1, current / target) : 1

  if (unlocked) {
    return (
      <div className={`relative bg-paper-deep border-2 border-ink p-4 flex flex-col gap-1.5 animate-fade-slide-up ${SHADOWS[v % 3]}`}>
        <span className="absolute top-2 right-2 font-bebas text-[8px] tracking-[0.15em] bg-gold text-ink px-1.5 py-0.5">
          UNLOCKED
        </span>
        <span className="text-2xl">{m.icon}</span>
        <p className="font-bebas text-sm text-ink leading-tight pr-12">{m.title}</p>
        <p className="font-caveat text-xs text-ink/60 leading-snug">{m.description}</p>
      </div>
    )
  }

  return (
    <div className="bg-paper-deep border-2 border-ink/20 p-4 flex flex-col gap-1.5 opacity-50 animate-fade-slide-up">
      <span className="text-2xl" style={{ filter: 'grayscale(0.9)' }}>{m.icon}</span>
      <p className="font-bebas text-sm text-ink/60 leading-tight">{m.title}</p>
      <p className="font-caveat text-xs text-ink/40 leading-snug">{m.description}</p>
      <div className="mt-auto pt-2">
        <p className="font-bebas text-[10px] tracking-[0.1em] text-ink/35 mb-1">{current} / {target}</p>
        <div className="w-full bg-ink/10 h-1.5">
          <div className="bg-red h-full" style={{ width: `${pct * 100}%` }} />
        </div>
      </div>
    </div>
  )
}

const MILESTONE_CATEGORIES: { id: Milestone['category']; label: string }[] = [
  { id: 'games',    label: 'GAMES'    },
  { id: 'stadiums', label: 'STADIUMS' },
  { id: 'sports',   label: 'SPORTS'   },
  { id: 'people',   label: 'PEOPLE'   },
  { id: 'special',  label: 'SPECIAL'  },
  { id: 'teams',    label: 'TEAMS'    },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Stats() {
  const navigate = useNavigate()
  const games = getAllGames()

  const header = (
    <header className="bg-hero-blue border-b-4 border-ink">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <h1 className="font-bebas text-6xl lg:text-8xl text-ink tracking-wide leading-none">
          YOUR DIARY · BY THE NUMBERS
        </h1>
        <p className="font-caveat text-2xl lg:text-3xl text-navy mt-1">every game tells a story</p>
      </div>
    </header>
  )

  if (games.length === 0) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        {header}
        <main className="max-w-7xl mx-auto px-4 lg:px-8 py-20 text-center">
          <p className="font-caveat text-2xl text-ink/40 mb-6">
            No stats yet — log your first game to see your story unfold.
          </p>
          <Link
            to="/add"
            className="inline-block font-bebas text-lg tracking-[0.15em] bg-red text-white border-2 border-ink px-6 py-3 btn-press"
          >
            + Add Your First Game
          </Link>
        </main>
      </div>
    )
  }

  const teamStats     = computeTeamStats(games)
  const personStats   = computePersonStats(games)
  const userRecord    = computeRecord(games)
  const vibes         = parseVibes(games)

  const milestoneStates = getAllMilestones(games).map((m) => {
    const { current, target } = m.getProgress(games)
    return { m, unlocked: m.checkUnlocked(games), current, target }
  })
  const sorted        = [...games].sort((a, b) => sortableKey(a) - sortableKey(b))
  const firstGame     = sorted[0]
  const lastGame      = sorted[sorted.length - 1]
  const uniqueVenues  = new Set(games.flatMap((g) => (g.venue ? [g.venue] : []))).size
  const topTeam       = teamStats[0]
  const seasons       = new Set(games.map((g) => g.season ?? g.date?.slice(0, 4)).filter(Boolean)).size
  const sportsCount   = new Set(games.map((g) => g.sportId ?? 'nfl')).size
  const maxVibeCount  = vibes[0]?.count ?? 1

  // Stadium map: count games per venue, deduplicate, resolve coordinates
  const venueGameCounts: Record<string, number> = {}
  for (const g of games) {
    if (g.venue) venueGameCounts[g.venue] = (venueGameCounts[g.venue] ?? 0) + 1
  }
  const uniqueVenueNames = Object.keys(venueGameCounts)
  const mapPins: MapPin[] = []
  const seenPinKeys = new Set<string>()
  const unmappedVenues: string[] = []
  for (const vn of uniqueVenueNames) {
    const info = getVenueCoordinates(vn)
    if (info) {
      const key = `${info.lat},${info.lng}`
      if (!seenPinKeys.has(key)) {
        seenPinKeys.add(key)
        mapPins.push({ ...info, gameCount: venueGameCounts[vn] })
      }
    } else {
      unmappedVenues.push(vn)
    }
  }
  const uniqueStates = new Set(mapPins.map((p) => p.state)).size

  // Favorite teams
  const favoriteTeams = getSettings().favoriteTeams

  // Sport breakdown: count games per sport
  const sportBreakdown: { id: string; label: string; count: number }[] = []
  const sportCounts: Record<string, number> = {}
  for (const g of games) { const id = g.sportId ?? 'nfl'; sportCounts[id] = (sportCounts[id] ?? 0) + 1 }
  for (const [id, count] of Object.entries(sportCounts).sort((a, b) => b[1] - a[1])) {
    sportBreakdown.push({ id, label: getSport(id)?.label ?? id.toUpperCase(), count })
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      {header}

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">

        {/* ── TEAMS YOU'VE SEEN ── */}
        <div className="mb-14">
          <SectionHeader title="TEAMS YOU'VE SEEN" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {teamStats.map((ts, i) => {
              const isFav = favoriteTeams[ts.sportId] === ts.team
              return (
                <button
                  key={ts.team}
                  type="button"
                  onClick={() => navigate(`/?team=${encodeURIComponent(ts.team)}`)}
                  className={`relative bg-paper-deep border-2 p-4 flex flex-col items-center gap-1.5 hover:-translate-y-0.5 transition-all animate-fade-slide-up ${
                    isFav
                      ? 'border-red shadow-[3px_3px_0_var(--color-red)]'
                      : `border-ink ${SHADOWS[i % 3]}`
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {isFav && (
                    <span className="absolute top-1.5 right-2 font-bebas text-[9px] tracking-[0.1em] text-red leading-none">
                      ★ FAV
                    </span>
                  )}
                  <TeamBadge team={ts.team} sportId={ts.sportId} size="lg" />
                  <p className="font-bebas text-sm text-ink text-center leading-tight mt-1">{ts.team}</p>
                  <p className="font-bebas text-4xl text-red leading-none">{ts.total}</p>
                  <p className="font-caveat text-sm text-ink/50">games seen</p>
                  <p className="font-bebas text-[10px] tracking-[0.1em] text-ink/35">{ts.home}H · {ts.away}A</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── AT-A-GLANCE NUMBERS ── */}
        <div className="mb-14">
          <SectionHeader title="AT A GLANCE" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard v={0}>
              <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-1">TOTAL GAMES</p>
              <p className="font-bebas text-7xl text-red leading-none">{games.length}</p>
              <p className="font-caveat text-sm text-ink/50 mt-1">games in the diary</p>
            </StatCard>

            <StatCard v={1}>
              <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-1">STADIUMS VISITED</p>
              <p className="font-bebas text-7xl text-ink leading-none">{uniqueVenues || '—'}</p>
              <p className="font-caveat text-sm text-ink/50 mt-1">stadiums on the map</p>
            </StatCard>

            {topTeam && (
              <StatCard v={2}>
                <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-2">MOST-ATTENDED TEAM</p>
                <TeamBadge team={topTeam.team} sportId={topTeam.sportId} size="md" className="mb-2" />
                <p className="font-bebas text-sm text-ink leading-tight">{topTeam.team}</p>
                <p className="font-bebas text-3xl text-gold leading-none">{topTeam.total} games</p>
              </StatCard>
            )}

            <StatCard v={0}>
              <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-1">SEASONS COVERED</p>
              <p className="font-bebas text-7xl text-navy leading-none">{seasons}</p>
              <p className="font-caveat text-sm text-ink/50 mt-1">different seasons</p>
            </StatCard>

            <StatCard v={1}>
              <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-1">SPORTS</p>
              <p className="font-bebas text-7xl text-ink leading-none">{sportsCount}</p>
              <p className="font-caveat text-sm text-ink/50 mt-1">sports followed</p>
            </StatCard>
          </div>
        </div>

        {/* ── FIRST & MOST RECENT ── */}
        <div className="mb-14">
          <SectionHeader title="BOOKMARKS" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard v={1}>
              <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-3">FIRST GAME LOGGED</p>
              <div className="flex items-center gap-3 mb-2">
                <TeamBadge team={firstGame.homeTeam} sportId={firstGame.sportId} size="sm" />
                <TeamBadge team={firstGame.awayTeam} sportId={firstGame.sportId} size="sm" />
              </div>
              <p className="font-bebas text-xl text-ink leading-tight">
                {firstGame.homeTeam} vs {firstGame.awayTeam}
              </p>
              <p className="font-caveat text-lg text-navy mt-0.5">{gameDateLabel(firstGame)}</p>
              {firstGame.notes && (
                <p className="font-caveat text-sm text-ink/40 mt-1 italic line-clamp-2">"{firstGame.notes}"</p>
              )}
            </StatCard>

            <StatCard v={2}>
              <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-3">MOST RECENT GAME</p>
              <div className="flex items-center gap-3 mb-2">
                <TeamBadge team={lastGame.homeTeam} sportId={lastGame.sportId} size="sm" />
                <TeamBadge team={lastGame.awayTeam} sportId={lastGame.sportId} size="sm" />
              </div>
              <p className="font-bebas text-xl text-ink leading-tight">
                {lastGame.homeTeam} vs {lastGame.awayTeam}
              </p>
              <p className="font-caveat text-lg text-navy mt-0.5">{gameDateLabel(lastGame)}</p>
              {lastGame.notes && (
                <p className="font-caveat text-sm text-ink/40 mt-1 italic line-clamp-2">"{lastGame.notes}"</p>
              )}
            </StatCard>
          </div>
        </div>

        {/* ── SPORTS BREAKDOWN ── */}
        {sportBreakdown.length > 1 && (
          <div className="mb-14">
            <SectionHeader title="SPORTS YOU FOLLOW" />
            <div className="flex flex-wrap gap-3">
              {sportBreakdown.map(({ id, label, count }, i) => (
                <div
                  key={id}
                  className={`bg-paper-deep border-2 border-ink px-5 py-3 animate-fade-slide-up ${SHADOWS[i % 3]}`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <p className="font-bebas text-xl text-ink">{label}</p>
                  <p className="font-bebas text-xs tracking-[0.15em] text-ink/40">
                    {count} {count === 1 ? 'game' : 'games'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WHO YOU'VE GONE WITH ── */}
        {personStats.length > 0 && (
          <div className="mb-14">
            <SectionHeader title="WHO YOU'VE GONE WITH" />

            {/* User's own overall record */}
            {(userRecord.wins + userRecord.losses + userRecord.ties) > 0 && (
              <div className="mb-6 inline-flex items-baseline gap-3 bg-ink px-5 py-3 border-2 border-ink shadow-[3px_3px_0_#d4a017]">
                <span className="font-bebas text-xs tracking-[0.2em] text-gold/70">YOUR RECORD</span>
                <span className="font-bebas text-4xl leading-none">
                  <span className="text-red">{userRecord.wins}</span>
                  <span className="text-gold/60">–{userRecord.losses}</span>
                  {userRecord.ties > 0 && <span className="text-gold/60">–{userRecord.ties}</span>}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {personStats.map((ps, i) => (
                <button
                  key={ps.name}
                  type="button"
                  onClick={() => navigate(`/?attendee=${encodeURIComponent(ps.name)}`)}
                  className={`bg-paper-deep border-2 border-ink p-4 flex flex-col items-start gap-1 hover:border-red hover:-translate-y-0.5 transition-all animate-fade-slide-up text-left ${SHADOWS[i % 3]}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <p className="font-caveat text-xl text-navy leading-tight">{ps.name}</p>
                  <p className="font-bebas text-4xl text-ink leading-none">{ps.totalGames}</p>
                  <p className="font-bebas text-[10px] tracking-[0.1em] text-ink/40">
                    {ps.totalGames === 1 ? 'game together' : 'games together'}
                  </p>
                  {ps.qualifyingGames > 0 && (
                    <>
                      <div className="font-bebas text-lg leading-none mt-1">
                        <span className="text-red">{ps.wins}</span>
                        <span className="text-ink/40">–{ps.losses}</span>
                        {ps.ties > 0 && <span className="text-ink/40">–{ps.ties}</span>}
                      </div>
                      <p className="font-bebas text-[9px] tracking-[0.1em] text-ink/30">record when here</p>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── YOUR VIBES ── */}
        {vibes.length > 0 && (
          <div className="mb-14">
            <SectionHeader title="YOUR VIBES" />
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              {vibes.map(({ vibe, count }) => {
                const ratio = count / maxVibeCount
                const cls   = ratio >= 0.75 ? 'text-5xl lg:text-6xl' : ratio >= 0.4 ? 'text-3xl lg:text-4xl' : 'text-xl'
                return (
                  <span key={vibe} className={`font-bebas ${cls} text-ink uppercase leading-tight`}>
                    {vibe}
                    {count > 1 && (
                      <sup className="font-archivo text-xs text-ink/30 ml-0.5 not-italic">{count}</sup>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* ── YOUR STADIUM MAP ── */}
        {uniqueVenueNames.length > 0 && (
          <div className="mb-14">
            <SectionHeader title="YOUR STADIUM MAP" />
            {mapPins.length > 0 ? (
              <MapErrorBoundary>
                <Suspense fallback={
                  <div className="w-full h-64 lg:h-80 border-2 border-ink bg-paper-deep flex items-center justify-center">
                    <p className="font-bebas text-xl text-ink/40 tracking-[0.2em]">LOADING MAP…</p>
                  </div>
                }>
                  <StadiumMap pins={mapPins} />
                </Suspense>
              </MapErrorBoundary>
            ) : (
              <div className="w-full h-32 border-2 border-ink/20 bg-paper-deep flex items-center justify-center">
                <p className="font-caveat text-lg text-ink/40">None of your venues are in our database yet — they'll appear above as we add more.</p>
              </div>
            )}

            {/* Quick stats row */}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="bg-paper-deep border-2 border-ink px-5 py-3 shadow-[3px_3px_0_#d4a017]">
                <p className="font-bebas text-xs tracking-[0.2em] text-ink/40">STADIUMS ON MAP</p>
                <p className="font-bebas text-4xl text-red leading-none">{mapPins.length}</p>
              </div>
              {uniqueStates > 0 && (
                <div className="bg-paper-deep border-2 border-ink px-5 py-3 shadow-[3px_3px_0_#1a2c4e]">
                  <p className="font-bebas text-xs tracking-[0.2em] text-ink/40">STATES / PROVINCES</p>
                  <p className="font-bebas text-4xl text-navy leading-none">{uniqueStates}</p>
                </div>
              )}
              {unmappedVenues.length > 0 && (
                <div className="bg-paper-deep border-2 border-ink/30 px-5 py-3">
                  <p className="font-bebas text-xs tracking-[0.2em] text-ink/40">NOT YET MAPPED</p>
                  <p className="font-bebas text-4xl text-ink/30 leading-none">{unmappedVenues.length}</p>
                </div>
              )}
            </div>

            {/* Unmapped venues list */}
            {unmappedVenues.length > 0 && (
              <div className="mt-4 bg-paper-deep border-2 border-ink/20 px-4 py-3">
                <p className="font-bebas text-[10px] tracking-[0.25em] text-ink/40 mb-2">VENUES NOT YET IN OUR DATABASE</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {unmappedVenues.map((v) => (
                    <span key={v} className="font-caveat text-base text-ink/50">{v}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MILESTONES & ACHIEVEMENTS ── */}
        <div className="mb-14">
          <SectionHeader title="MILESTONES & ACHIEVEMENTS" />
          {MILESTONE_CATEGORIES.map(({ id, label }) => {
            const group = milestoneStates.filter((ms) => ms.m.category === id)
            if (group.length === 0) return null
            // Sort: unlocked first, then by progress % descending
            const sorted = [...group].sort((a, b) => {
              if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1
              return (b.current / b.target) - (a.current / a.target)
            })
            return (
              <div key={id} className="mb-8">
                <p className="font-bebas text-xs tracking-[0.25em] text-ink/40 mb-3 pb-1 border-b border-ink/10">
                  {label}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {sorted.map((ms, i) => (
                    <MilestoneCard
                      key={ms.m.id}
                      m={ms.m}
                      unlocked={ms.unlocked}
                      current={ms.current}
                      target={ms.target}
                      v={i}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

      </main>
    </div>
  )
}

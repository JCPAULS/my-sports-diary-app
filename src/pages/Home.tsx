import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useGames } from '@/lib/useGames'
import { useTaggedGames } from '@/lib/useTaggedGames'
import { getWeekLabel } from '@/lib/nflTeams'
import { getSport, ENABLED_SPORTS } from '@/lib/sports'
import { getAllMilestones } from '@/lib/milestones'
import { getSettings } from '@/lib/settings'
import { getTeam, hashTeamColor } from '@/lib/teams'
import Nav from '@/components/Nav'
import { useProfileContext } from '@/lib/ProfileContext'
import TeamBadge from '@/components/TeamBadge'
import PhotoImg from '@/components/PhotoImg'
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
  // Use the actual game date's year so a 2018 game logged today appears in 2018
  if (game.date) return game.date.slice(0, 4)
  return game.season ?? 'Unknown'
}

function getGameSortKey(game: Game): number {
  // Descending within each group: most recent first
  if (game.date) {
    const [y, m, d] = game.date.split('-').map(Number)
    return -(y * 10000 + m * 100 + d)
  }
  if (game.week) {
    const sport = getSport(game.sportId ?? 'nfl')
    return -(sport ? sport.getScheduleSortOrder(game.week) : 99)
  }
  return -new Date(game.createdAt).getTime() / 1_000_000_000
}

function groupGames(games: Game[]): SeasonGroup[] {
  const bySeason: Record<string, Game[]> = {}
  for (const game of games) {
    const s = getGameSeason(game)
    if (!bySeason[s]) bySeason[s] = []
    bySeason[s].push(game)
  }
  return Object.entries(bySeason)
    .sort(([a], [b]) => (parseInt(b) || 0) - (parseInt(a) || 0))   // newest year first
    .map(([season, gs]) => ({
      season,
      games: gs.sort((a, b) => getGameSortKey(a) - getGameSortKey(b)),
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
    if (game.customSportType) return `CUSTOM · ${game.customSportType.toUpperCase()}`
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
          <PhotoImg src={firstPhoto} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className={firstPhoto ? 'p-5 pr-20' : 'p-5'}>
        {showSportChip && sportChip && (
          <p className="font-bebas text-[9px] tracking-[0.25em] text-ink/30 mb-0.5">{sportChip}</p>
        )}
        {game.nickname && (
          <p className="font-caveat text-base text-navy mb-0.5 leading-tight">{game.nickname}</p>
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

// Tagged-in game card — same layout but with a "TAGGED BY" banner and link to
// the poster's game (via /game/:id since RLS grants tagged-user visibility).
function TaggedGameCard({ game, cardIdx }: { game: Game; cardIdx: number }) {
  const hasScore = game.homeScore !== undefined && game.awayScore !== undefined
  const firstPhoto = game.photos?.[0]
  const taggerName = game.tagInfo?.taggedByDisplayName ?? 'Someone'

  return (
    <Link
      to={`/game/${game.id}`}
      className="relative block bg-paper-deep border-2 border-ink/40 card-press animate-fade-slide-up w-full max-w-xl"
      style={{ animationDelay: `${cardIdx * 60}ms` }}
    >
      {/* TAGGED BY banner */}
      <div className="bg-navy/10 border-b border-ink/15 px-4 py-1.5 flex items-center gap-2">
        <span className="font-bebas text-[10px] tracking-[0.25em] text-navy/70">TAGGED BY</span>
        <span className="font-bebas text-xs text-navy">{taggerName}</span>
      </div>

      {firstPhoto && (
        <div className="absolute top-9 right-3 w-14 h-14 border-2 border-white overflow-hidden shadow-[2px_2px_0_rgba(0,0,0,0.3)] z-10 rotate-2">
          <PhotoImg src={firstPhoto} alt="" className="w-full h-full object-cover" />
        </div>
      )}
      <div className={firstPhoto ? 'p-4 pr-20' : 'p-4'}>
        <p className="font-bebas text-xs tracking-[0.2em] text-ink/50 mb-1">
          {gameLabel(game)}
        </p>
        <p className="font-bebas text-2xl lg:text-3xl leading-none text-ink">
          {game.homeTeam} <span className="text-red">vs</span> {game.awayTeam}
        </p>
        {hasScore && (
          <div className="inline-block bg-ink text-gold font-bebas text-lg tracking-widest px-2.5 py-0.5 mt-2">
            {game.homeScore} – {game.awayScore}
          </div>
        )}
      </div>
      <div className="border-t-2 border-dashed border-ink/20 mx-4" />
      <div className="px-4 py-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {game.venue && <span className="font-bebas text-xs tracking-[0.15em] text-ink/40 truncate">{game.venue}</span>}
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

// ─── Team stats banner (shown when filtering by team) ─────────────────────────

function teamGameSortKey(g: Game): number {
  if (g.date) return new Date(g.date).getTime()
  const year = parseInt(g.season ?? '2000')
  const week = parseInt(g.week ?? '0') || 0
  return new Date(`${year}-09-01`).getTime() + week * 7 * 24 * 60 * 60 * 1000
}

function shortLabel(g: Game): string {
  if (g.date) {
    const [y, m, d] = g.date.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  if (g.week && g.season) return `${getWeekLabel(g.week)} · ${g.season}`
  if (g.season) return g.season
  return '—'
}

function StatCard({ label, value, sub, compact }: { label: string; value: string; sub?: string; compact?: boolean }) {
  return (
    <div className="bg-paper border-2 border-ink/20 px-4 py-3 flex-1 min-w-[80px]">
      <p className="font-bebas text-[9px] tracking-[0.25em] text-ink/40 mb-0.5">{label}</p>
      <p className={`font-bebas leading-none text-ink ${compact ? 'text-base' : 'text-2xl'}`}>{value}</p>
      {sub && <p className="font-bebas text-[10px] tracking-[0.08em] text-ink/40 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

function TeamStatsBanner({ teamName, games }: { teamName: string; games: Game[] }) {
  const sportId = games[0]?.sportId ?? 'nfl'
  const teamEntry = getTeam(sportId, teamName)
  const accentColor = teamEntry?.primaryColor ?? hashTeamColor(teamName)
  const isFollowed = Object.values(getSettings().followedTeams ?? {}).some((names) => names.includes(teamName))

  const sorted = [...games].sort((a, b) => teamGameSortKey(a) - teamGameSortKey(b))

  let homeCount = 0, awayCount = 0
  for (const g of games) { g.homeTeam === teamName ? homeCount++ : awayCount++ }

  const venueSet = new Set(games.map((g) => g.venue).filter(Boolean))

  let wins = 0, losses = 0
  let bestWin: Game | null = null, bestWinMargin = 0
  let worstLoss: Game | null = null, worstLossMargin = 0
  const qualGames: Array<{ game: Game; won: boolean; margin: number }> = []

  for (const g of sorted) {
    if (g.rootingFor !== teamName || g.homeScore === undefined || g.awayScore === undefined) continue
    const isHome = g.homeTeam === teamName
    const teamScore = isHome ? g.homeScore : g.awayScore
    const oppScore = isHome ? g.awayScore : g.homeScore
    if (teamScore === oppScore) continue
    const won = teamScore > oppScore
    const margin = Math.abs(teamScore - oppScore)
    qualGames.push({ game: g, won, margin })
    if (won) {
      wins++
      if (margin > bestWinMargin) { bestWinMargin = margin; bestWin = g }
    } else {
      losses++
      if (margin > worstLossMargin) { worstLossMargin = margin; worstLoss = g }
    }
  }

  let streak = 0
  let streakIsWin: boolean | null = null
  for (let i = qualGames.length - 1; i >= 0; i--) {
    const { won } = qualGames[i]
    if (streakIsWin === null) { streakIsWin = won; streak = 1 }
    else if (won === streakIsWin) streak++
    else break
  }

  const attendeeCounts: Record<string, { displayName: string; count: number }> = {}
  for (const g of games) {
    for (const person of (g.attendees ?? [])) {
      const key = person.toLowerCase().trim()
      if (!key) continue
      if (!attendeeCounts[key]) attendeeCounts[key] = { displayName: person.trim(), count: 0 }
      attendeeCounts[key].count++
    }
  }
  const topPeople = Object.values(attendeeCounts).sort((a, b) => b.count - a.count).slice(0, 3)

  const firstGame = sorted[0]
  const lastGame = sorted[sorted.length - 1]
  const gameOpp = (g: Game) => g.homeTeam === teamName ? g.awayTeam : g.homeTeam
  const scoreDisplay = (g: Game) => {
    if (g.homeScore === undefined || g.awayScore === undefined) return ''
    const isHome = g.homeTeam === teamName
    const ts = isHome ? g.homeScore : g.awayScore
    const os = isHome ? g.awayScore : g.homeScore
    return `${ts}–${os}`
  }

  const showRecord = qualGames.length >= 1
  const showHomeAway = games.length >= 2
  const showLastGame = sorted.length >= 2
  const showStreaks = qualGames.length >= 2 && streak >= 2
  const showHighlights = qualGames.length >= 2 && (bestWin || worstLoss)
  const showPeople = topPeople.length > 0

  return (
    <div className="mb-8 border-2 border-ink bg-paper-deep card-stamp">
      <div style={{ background: accentColor, height: 4 }} />

      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <TeamBadge team={teamName} sportId={sportId} size="lg" />
          <div>
            <p className="font-bebas text-4xl lg:text-5xl text-ink leading-none">{teamName}</p>
            {isFollowed && (
              <span className="inline-block font-bebas text-[9px] tracking-[0.2em] bg-gold text-ink px-1.5 py-0.5 mt-1">
                MY TEAM
              </span>
            )}
          </div>
        </div>
        <Link
          to="/stats"
          className="font-bebas text-xs tracking-[0.15em] text-ink/50 hover:text-ink border-b border-ink/20 hover:border-ink transition-colors flex-shrink-0 mt-1"
        >
          VIEW IN STATS ›
        </Link>
      </div>

      <div className="border-t-2 border-dashed border-ink/20 mx-5" />

      {/* Stat cards */}
      <div className="px-4 py-4 flex flex-wrap gap-3">
        <StatCard label="GAMES SEEN" value={String(games.length)} />
        {showRecord && <StatCard label="YOUR RECORD" value={`${wins}–${losses}`} />}
        {showHomeAway && <StatCard label="HOME / AWAY" value={`${homeCount} / ${awayCount}`} />}
        {venueSet.size > 0 && <StatCard label="VENUES" value={String(venueSet.size)} />}
        {firstGame && (
          <StatCard
            label="FIRST SEEN"
            value={shortLabel(firstGame)}
            sub={gameOpp(firstGame) ? `vs ${gameOpp(firstGame)}` : undefined}
            compact
          />
        )}
        {showLastGame && lastGame && (
          <StatCard
            label="MOST RECENT"
            value={shortLabel(lastGame)}
            sub={gameOpp(lastGame) ? `vs ${gameOpp(lastGame)}` : undefined}
            compact
          />
        )}
      </div>

      {/* Streaks + highlights */}
      {(showStreaks || showHighlights) && (
        <>
          <div className="border-t-2 border-dashed border-ink/20 mx-5" />
          <div className="px-4 py-3 flex flex-wrap gap-x-6 gap-y-1">
            {showStreaks && streakIsWin !== null && (
              <span className="font-bebas text-sm tracking-[0.08em]">
                <span className="text-ink/40">STREAK </span>
                <span className={streakIsWin ? 'text-red' : 'text-navy'}>
                  {streak}{streakIsWin ? 'W' : 'L'}
                </span>
              </span>
            )}
            {showHighlights && bestWin && (
              <span className="font-bebas text-sm tracking-[0.08em]">
                <span className="text-ink/40">BEST WIN </span>
                <span className="text-red">{scoreDisplay(bestWin)} vs {gameOpp(bestWin)}</span>
              </span>
            )}
            {showHighlights && worstLoss && (
              <span className="font-bebas text-sm tracking-[0.08em]">
                <span className="text-ink/40">TOUGHEST L </span>
                <span className="text-navy">{scoreDisplay(worstLoss)} vs {gameOpp(worstLoss)}</span>
              </span>
            )}
          </div>
        </>
      )}

      {/* People */}
      {showPeople && (
        <>
          <div className="border-t-2 border-dashed border-ink/20 mx-5" />
          <div className="px-4 py-3 flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
            <span className="font-bebas text-[10px] tracking-[0.2em] text-ink/40">MOST OFTEN WITH</span>
            {topPeople.map((p, i) => (
              <span key={p.displayName} className="font-caveat text-base text-ink">
                {p.displayName}
                <span className="font-bebas text-[10px] text-ink/30 ml-0.5">({p.count})</span>
                {i < topPeople.length - 1 && <span className="text-ink/25 mx-0.5">·</span>}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Home ─────────────────────────────────────────────────────────────────────

// ─── Filter input styles ──────────────────────────────────────────────────────

const filterInputCls = 'w-full min-w-0 max-w-full bg-white border-2 border-ink px-3 py-2 font-archivo text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-red transition-colors'
const filterSelectCls = `${filterInputCls} cursor-pointer`

// ─── Home ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const attendeeFilter = searchParams.get('attendee')
  const { myProfile } = useProfileContext()

  const { games: ownedGames, loading: ownedLoading } = useGames()
  const { taggedGames, loading: taggedLoading } = useTaggedGames()
  const loading = ownedLoading || taggedLoading

  // Merge owned + tagged games, deduplicating by id (shouldn't overlap, but guard)
  const ownedIds = new Set(ownedGames.map((g) => g.id))
  const allGames = [
    ...ownedGames,
    ...taggedGames.filter((g) => !ownedIds.has(g.id)),
  ]

  // Filter panel state — team and sport can be pre-set from URL params
  const [filtersOpen, setFiltersOpen] = useState(() => !!(searchParams.get('team') || searchParams.get('sport')))
  const [filterYear, setFilterYear] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterSport, setFilterSport] = useState(() => searchParams.get('sport') ?? '')
  const [filterTeam, setFilterTeam] = useState(() => searchParams.get('team') ?? '')

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div
            className="w-8 h-8 border-[3px] border-ink/15 border-t-ink rounded-full"
            style={{ animation: 'spin 0.65s linear infinite' }}
          />
        </div>
      </div>
    )
  }

  // Derived values for filter dropdowns (from all games)
  const availableYears = [...new Set(
    allGames.map((g) => g.season ?? g.date?.slice(0, 4)).filter(Boolean) as string[]
  )].sort().reverse()
  const sportsInGames = [...new Set(allGames.map((g) => g.sportId ?? 'nfl'))]
  const availableTeams = [...new Set(
    allGames.flatMap((g) => [g.homeTeam, g.awayTeam].filter(Boolean))
  )].sort()

  // Only apply team filter if the typed value is a real team in this diary
  const validFilterTeam = availableTeams.includes(filterTeam) ? filterTeam : ''

  const hasDateFilter = !!(filterDateFrom || filterDateTo)
  const activeFilterCount = [filterYear, hasDateFilter, filterSport, validFilterTeam].filter(Boolean).length
  const hasActiveFilter = activeFilterCount > 0

  function clearFilters() {
    setFilterYear(''); setFilterDateFrom(''); setFilterDateTo('')
    setFilterSport(''); setFilterTeam(''); setSearchParams({})
  }

  const games = allGames.filter((g) => {
    if (attendeeFilter) {
      const lc = attendeeFilter.toLowerCase()
      if (!g.attendees?.some((a) => a.toLowerCase() === lc)) return false
    }
    if (filterYear) {
      const gameSeason = g.season ?? g.date?.slice(0, 4)
      if (gameSeason !== filterYear) return false
    }
    if (filterDateFrom && (!g.date || g.date < filterDateFrom)) return false
    if (filterDateTo && (!g.date || g.date > filterDateTo)) return false
    if (filterSport && (g.sportId ?? 'nfl') !== filterSport) return false
    if (validFilterTeam && g.homeTeam !== validFilterTeam && g.awayTeam !== validFilterTeam) return false
    return true
  })

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
      {myProfile?.privacyMode && (
        <div className="bg-ink/8 border-b-2 border-ink/15 px-4 py-2 text-center">
          <p className="font-bebas text-xs tracking-[0.2em] text-ink/50">
            🔒 PRIVACY MODE ON — NEW GAMES DEFAULT TO PRIVATE
          </p>
        </div>
      )}

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

        {/* ── FILTERS + IMPORT buttons ── */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`font-bebas text-sm tracking-[0.15em] border-2 border-ink px-4 py-2 flex items-center gap-2 transition-colors ${
              filtersOpen ? 'bg-red text-white' : 'bg-paper text-ink hover:bg-paper-deep'
            }`}
          >
            FILTERS
            {hasActiveFilter && <span className="w-2 h-2 rounded-full bg-red flex-shrink-0" />}
          </button>
          {hasActiveFilter && (
            <span className="font-bebas text-xs tracking-[0.15em] text-red">
              {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'} active
            </span>
          )}
          <button
            type="button"
            onClick={() => navigate('/import')}
            className="ml-auto font-bebas text-sm tracking-[0.15em] border-2 border-ink px-4 py-2 bg-paper text-ink hover:bg-paper-deep transition-colors flex items-center gap-1.5"
          >
            📷 IMPORT FROM PHOTOS
          </button>
        </div>

        {/* ── Filter panel ── */}
        {filtersOpen && (
          <div className="mb-6 border-2 border-ink bg-paper-deep p-4 shadow-[4px_4px_0_#000]">
            <div className="flex flex-col gap-3 mb-4 sm:grid sm:grid-cols-2 lg:grid-cols-4">

              {/* Year */}
              <div>
                <label className="font-bebas text-[10px] tracking-[0.25em] text-ink/50 block mb-1.5">YEAR</label>
                <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className={filterSelectCls}>
                  <option value="">All Years</option>
                  {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Date from */}
              <div>
                <label className="font-bebas text-[10px] tracking-[0.25em] text-ink/50 block mb-1.5">FROM</label>
                <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={filterInputCls} />
              </div>

              {/* Date to */}
              <div>
                <label className="font-bebas text-[10px] tracking-[0.25em] text-ink/50 block mb-1.5">TO</label>
                <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={filterInputCls} />
              </div>

              {/* Team combobox */}
              <div>
                <label className="font-bebas text-[10px] tracking-[0.25em] text-ink/50 block mb-1.5">TEAM</label>
                <input
                  type="text"
                  list="home-filter-team-list"
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                  placeholder="All Teams"
                  className={filterInputCls}
                />
                <datalist id="home-filter-team-list">
                  {availableTeams.map((t) => <option key={t} value={t} />)}
                </datalist>
              </div>
            </div>

            {/* Sport buttons (only when 2+ sports) */}
            {sportsInGames.length > 1 && (
              <div className="mb-4">
                <label className="font-bebas text-[10px] tracking-[0.25em] text-ink/50 block mb-1.5">SPORT</label>
                <div className="flex flex-wrap gap-2">
                  {(['', ...sportsInGames]).map((sid) => {
                    const label = sid === '' ? 'ALL' : (ENABLED_SPORTS.find((s) => s.id === sid)?.label ?? sid.toUpperCase())
                    const active = filterSport === sid
                    return (
                      <button
                        key={sid}
                        type="button"
                        onClick={() => setFilterSport(sid)}
                        className={`font-bebas text-sm tracking-[0.15em] px-3 py-2 min-h-[44px] border-2 border-ink transition-all ${
                          active ? 'bg-red text-white shadow-[2px_2px_0_#000]' : 'bg-paper text-ink/60 hover:text-ink hover:bg-paper-deep'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end border-t border-ink/10 pt-3">
              <button
                type="button"
                onClick={clearFilters}
                className="font-bebas text-sm tracking-[0.15em] text-ink/50 border border-ink/30 px-4 py-2 min-h-[44px] hover:text-ink hover:border-ink transition-colors"
              >
                CLEAR FILTERS
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end mb-6 lg:hidden">
          <Link to="/add" className="font-bebas text-xl tracking-[0.15em] bg-red text-white border-2 border-ink px-6 py-3 btn-press">
            + Add Game
          </Link>
        </div>

        {/* Team stats banner */}
        {validFilterTeam && games.length > 0 && (
          <TeamStatsBanner teamName={validFilterTeam} games={games} />
        )}

        {/* Attendee filter banner */}
        {attendeeFilter && (
          <div className="flex items-center gap-3 mb-6 bg-navy text-white px-4 py-2.5 border-2 border-ink shadow-[3px_3px_0_var(--color-gold)]">
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
        {nextMilestone && !hasActiveFilter && !attendeeFilter && (
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

        {(hasActiveFilter || attendeeFilter) && games.length === 0 ? (
          <div className="py-16 text-center">
            {hasActiveFilter ? (
              <>
                <p className="font-caveat text-xl text-ink/40">No games match those filters. Try widening your search.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="font-caveat text-base text-navy underline mt-2 block mx-auto"
                >
                  Clear all filters
                </button>
              </>
            ) : (
              <>
                <p className="font-caveat text-xl text-ink/40">No logged games with {attendeeFilter} yet.</p>
                <Link to="/" className="font-caveat text-base text-navy underline mt-2 block">← Show all games</Link>
              </>
            )}
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
                    const isTagged = !!game.tagInfo
                    return (
                      <div key={game.id} className="flex items-start">
                        <div className={`${GUTTER} flex-shrink-0 pt-5 flex items-start`}>
                          <div className="flex items-center w-full">
                            <div
                              className={`ml-5 lg:ml-8 w-5 h-5 rounded-full border-2 border-ink z-10 flex-shrink-0${isTagged ? ' bg-navy/40' : ' bg-red'}${isNew ? ' animate-pulse-node' : ''}`}
                            />
                            <div className="flex-1 border-t-2 border-dashed border-ink/40" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          {isTagged
                            ? <TaggedGameCard game={game} cardIdx={myIdx} />
                            : <GameCard game={game} cardIdx={myIdx} />
                          }
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

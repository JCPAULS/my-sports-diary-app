import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveGame, updateGame, getAllGames } from '@/lib/storage'
import { fetchTeams, fetchTeamSchedule, fetchGameSummary } from '@/lib/sportsApi'
import { NFL_WEEKS, WEEK_ORDER, getWeekLabel, NFL_FALLBACK_TEAMS } from '@/lib/nflTeams'
import { ENABLED_SPORTS, getSport, CUSTOM_LEVELS, COLLEGE_SPORT_TYPES } from '@/lib/sports'
import { getTeamsBySport } from '@/lib/teams'
import Nav from '@/components/Nav'
import TeamBadge from '@/components/TeamBadge'
import type { Game, GameResult, Team } from '@/types/Game'
import { detectNewMilestones, markMilestonesSeen, type Milestone } from '@/lib/milestones'
import { getSettings } from '@/lib/settings'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  sport: string
  week: string
  year: string
  date: string
  homeTeam: string
  awayTeam: string
  homeScore: string
  awayScore: string
  venue: string
  section: string
  row: string
  seatNumbers: string
  notes: string
  whoWasThere: string
  mvp: string
  vibe: string
  rootingFor: string
  whatYouWore: string
  whatYouAte: string
  whoDrove: string
  pregameRitual: string
  level: string          // custom sport only
  collegeSportType: string  // college sport only
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputClass =
  'w-full bg-white border-2 border-ink px-3 py-2.5 font-archivo text-base text-ink placeholder-ink/30 focus:outline-none focus:border-red transition-colors'
const selectClass = `${inputClass} cursor-pointer`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function gameWeekLabel(game: GameResult): string {
  if (!game.week) return ''
  if (game.seasonType === 'preseason') {
    const n = parseInt(game.week.replace('pre_', ''))
    return `Preseason Wk ${n}`
  }
  return getWeekLabel(game.week)
}

interface SeasonTypeGroup { label: string; type: string; games: GameResult[] }

function groupResultsBySeason(results: GameResult[]): SeasonTypeGroup[] {
  const sortKey = (g: GameResult): number => {
    if (!g.week) {
      if (g.date) return new Date(g.date).getTime() / 1_000_000
      return 99
    }
    if (WEEK_ORDER[g.week] !== undefined) return WEEK_ORDER[g.week]
    if (g.week.startsWith('pre_')) return -4 + parseInt(g.week.replace('pre_', ''))
    return parseInt(g.week) ?? 99
  }
  const sort = (arr: GameResult[]) => [...arr].sort((a, b) => sortKey(a) - sortKey(b))
  const pre = sort(results.filter((g) => g.seasonType === 'preseason'))
  const reg = sort(results.filter((g) => g.seasonType === 'regular'))
  const post = sort(results.filter((g) => g.seasonType === 'postseason'))
  return [
    ...(pre.length ? [{ label: 'PRESEASON', type: 'preseason', games: pre }] : []),
    ...(reg.length ? [{ label: 'REGULAR SEASON', type: 'regular', games: reg }] : []),
    ...(post.length ? [{ label: 'POSTSEASON', type: 'postseason', games: post }] : []),
  ]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children, isAutoFilled }: { label: string; children: React.ReactNode; isAutoFilled?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-bebas text-xs tracking-[0.2em] text-ink flex items-center gap-2">
        {label}
        {isAutoFilled && <span className="w-2 h-2 rounded-full bg-gold inline-block flex-shrink-0" title="Auto-filled" />}
      </label>
      {children}
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="font-bebas text-xl tracking-[0.2em] text-ink flex-shrink-0">{title}</h2>
      <div className="flex-1 h-[2px] bg-ink" />
    </div>
  )
}

// Searchable team combobox — works for both team name inputs and Find Your Game (large lists)
function TeamCombobox({
  value, onChange, options, sportId, placeholder, disabled,
}: {
  value: string; onChange: (val: string) => void; options: string[]
  sportId: string; placeholder?: string; disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const filtered = !value ? options : options.filter((t) => t.toLowerCase().includes(value.toLowerCase()))
  return (
    <div className="relative">
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder} autoComplete="off" disabled={disabled}
        className={`${inputClass} disabled:opacity-50 disabled:cursor-not-allowed`}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 bg-white border-2 border-ink border-t-0 max-h-80 overflow-y-auto shadow-[2px_2px_0_#000]">
          {filtered.map((name) => (
            <button key={name} type="button"
              onMouseDown={() => { onChange(name); setOpen(false) }}
              className="w-full text-left px-3 py-2 font-archivo text-sm text-ink hover:bg-paper-deep border-b border-ink/10 last:border-0 flex items-center gap-2"
            >
              <TeamBadge team={name} sportId={sportId} size="xs" />
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Comma-aware attendee input with autocomplete from previous games
function AttendeeInput({ value, onChange, existingAttendees }: {
  value: string; onChange: (v: string) => void; existingAttendees: string[]
}) {
  const [open, setOpen] = useState(false)

  const parts = value.split(',')
  const currentPart = parts[parts.length - 1].trimStart()
  const prevNames = parts.slice(0, -1).map((p) => p.trim().toLowerCase())

  const suggestions = currentPart.length >= 1
    ? existingAttendees.filter(
        (n) => n.toLowerCase().startsWith(currentPart.toLowerCase()) && !prevNames.includes(n.toLowerCase())
      )
    : []

  function apply(name: string) {
    const prefix = parts.slice(0, -1)
    onChange([...prefix, name].join(', '))
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        type="text" value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="e.g. Dad, Sarah, Uncle Mike"
        className={inputClass}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 bg-white border-2 border-ink border-t-0 max-h-40 overflow-y-auto shadow-[2px_2px_0_#000]">
          {suggestions.map((name) => (
            <li key={name}>
              <button type="button" onMouseDown={() => apply(name)}
                className="w-full text-left px-3 py-2 font-archivo text-sm text-ink hover:bg-paper-deep border-b border-ink/10 last:border-0">
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const MAX_PHOTOS = 10
const STORAGE_WARN_CHARS = 4 * 1024 * 1024  // warn at ~4 MB used

const COMPRESS_MAX_DIM = 1600
const COMPRESS_QUALITY = 0.75

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img
      if (width > COMPRESS_MAX_DIM || height > COMPRESS_MAX_DIM) {
        if (width >= height) { height = Math.round(height * COMPRESS_MAX_DIM / width); width = COMPRESS_MAX_DIM }
        else { width = Math.round(width * COMPRESS_MAX_DIM / height); height = COMPRESS_MAX_DIM }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', COMPRESS_QUALITY))
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      console.warn('Image load failed, falling back to FileReader')
      const reader = new FileReader()
      reader.onload = (ev) => resolve(ev.target!.result as string)
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    }
    img.src = objectUrl
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AddGame({ initialGame }: { initialGame?: Game } = {}) {
  const navigate = useNavigate()
  const basicsRef = useRef<HTMLDivElement>(null)
  const [newMilestones, setNewMilestones] = useState<Milestone[]>([])
  const isEditMode = !!initialGame

  const defaultSport = initialGame?.sportId ?? ENABLED_SPORTS[0]?.id ?? 'nfl'
  const defaultSeason = getSport(defaultSport)?.getSeasonOptions()[0] ?? String(new Date().getFullYear())

  const [form, setForm] = useState<FormState>(() => initialGame ? {
    sport: initialGame.sportId ?? 'nfl',
    week: initialGame.week ?? '',
    year: initialGame.season ?? defaultSeason,
    date: initialGame.date ?? '',
    homeTeam: initialGame.homeTeam,
    awayTeam: initialGame.awayTeam,
    homeScore: initialGame.homeScore !== undefined ? String(initialGame.homeScore) : '',
    awayScore: initialGame.awayScore !== undefined ? String(initialGame.awayScore) : '',
    venue: initialGame.venue ?? '',
    section: initialGame.section ?? '',
    row: initialGame.row ?? '',
    seatNumbers: initialGame.seatNumbers ?? '',
    notes: initialGame.notes ?? '',
    whoWasThere: initialGame.whoWasThere ?? '',
    mvp: initialGame.mvp ?? '',
    vibe: initialGame.vibe ?? '',
    rootingFor: initialGame.rootingFor ?? '',
    whatYouWore: initialGame.whatYouWore ?? '',
    whatYouAte: initialGame.whatYouAte ?? '',
    whoDrove: initialGame.whoDrove ?? '',
    pregameRitual: initialGame.pregameRitual ?? '',
    level: initialGame.level ?? '',
    collegeSportType: initialGame.collegeSportType ?? '',
  } : {
    sport: defaultSport, week: '', year: defaultSeason, date: '',
    homeTeam: '', awayTeam: '', homeScore: '', awayScore: '',
    venue: '', section: '', row: '', seatNumbers: '',
    notes: '', whoWasThere: '', mvp: '', vibe: '', rootingFor: '',
    whatYouWore: '', whatYouAte: '', whoDrove: '', pregameRitual: '',
    level: '', collegeSportType: '',
  })

  // Existing attendees from diary — seeded once at mount for autocomplete
  const [existingAttendees] = useState<string[]>(() => {
    const names = new Set<string>()
    getAllGames().forEach((g) => g.attendees?.forEach((n) => names.add(n)))
    return [...names].sort()
  })
  const [photos, setPhotos] = useState<string[]>(initialGame?.photos ?? [])
  const [outfitPhoto, setOutfitPhoto] = useState<string | null>(initialGame?.outfitPhoto ?? null)
  const [processingCount, setProcessingCount] = useState(0)
  const [storageWarn, setStorageWarn] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showLittleThings, setShowLittleThings] = useState(true)
  const [autoFilled, setAutoFilled] = useState<Partial<Record<keyof FormState, boolean>>>({})

  // Teams state — static fallback + ESPN live data
  const [teams, setTeams] = useState<Team[]>(NFL_FALLBACK_TEAMS)
  const [isLoadingTeams, setIsLoadingTeams] = useState(false)

  useEffect(() => {
    const staticTeams = getTeamsBySport(form.sport)
    if (staticTeams.length > 0) {
      // Static teams already have correct ESPN IDs — use them directly
      setTeams(staticTeams)
    } else {
      setTeams([])
      setIsLoadingTeams(true)
      fetchTeams(form.sport)
        .then((fetched) => setTeams(fetched))
        .finally(() => setIsLoadingTeams(false))
    }
    // Reset find-game state when sport changes
    setFindTeamName('')
    setFindSeason(getSport(form.sport)?.getSeasonOptions()[0] ?? defaultSeason)
    setScheduleResults([])
    setScheduleError(null)
  }, [form.sport]) // eslint-disable-line react-hooks/exhaustive-deps

  const [appliedSummary, setAppliedSummary] = useState<string | null>(initialGame?.summary ?? null)
  const [appliedScheduleLabel, setAppliedScheduleLabel] = useState<string | null>(initialGame?.scheduleLabel ?? null)

  // Find Your Game state — uses team NAME for searchable combobox, derives ID from teams list
  const [findTeamName, setFindTeamName] = useState('')
  const [findSeason, setFindSeason] = useState(defaultSeason)
  const [scheduleResults, setScheduleResults] = useState<GameResult[]>([])
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  // Schedule filter state
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterMonth, setFilterMonth] = useState<string | null>(null)
  const [filterHomeAway, setFilterHomeAway] = useState<'all' | 'home' | 'away'>('all')
  const [filterOpponent, setFilterOpponent] = useState('')

  // Reset filters when a new schedule loads
  useEffect(() => {
    setFilterMonth(null); setFilterHomeAway('all'); setFilterOpponent('')
  }, [scheduleResults])

  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  const availableMonths = useMemo(() =>
    [...new Set(scheduleResults.filter((g) => g.date).map((g) => g.date!.slice(5, 7)))].sort()
  , [scheduleResults])

  const availableOpponents = useMemo(() =>
    [...new Set(scheduleResults.map((g) =>
      g.homeTeam === findTeamName ? g.awayTeam : g.homeTeam
    ))].sort()
  , [scheduleResults, findTeamName])

  const filteredResults = useMemo(() => {
    if (!filterMonth && filterHomeAway === 'all' && !filterOpponent) return scheduleResults
    return scheduleResults.filter((g) => {
      if (filterMonth && g.date?.slice(5, 7) !== filterMonth) return false
      if (filterHomeAway === 'home' && g.homeTeam !== findTeamName) return false
      if (filterHomeAway === 'away' && g.awayTeam !== findTeamName) return false
      if (filterOpponent) {
        const opp = g.homeTeam === findTeamName ? g.awayTeam : g.homeTeam
        if (opp !== filterOpponent) return false
      }
      return true
    })
  }, [scheduleResults, filterMonth, filterHomeAway, filterOpponent, findTeamName])

  const hasActiveFilter = filterMonth !== null || filterHomeAway !== 'all' || filterOpponent !== ''

  const currentSport = getSport(form.sport)
  const isCustom = currentSport?.isCustom ?? false
  const isCollege = form.sport === 'college'
  const needsWeek = (currentSport?.hasWeeks ?? false) && !isCustom

  const findTeam = teams.find((t) => t.name === findTeamName)
  const findTeamId = findTeam?.id ?? ''

  function set(field: keyof FormState, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'homeTeam' || field === 'awayTeam') {
        const newHome = field === 'homeTeam' ? value : prev.homeTeam
        const newAway = field === 'awayTeam' ? value : prev.awayTeam
        // Clear rootingFor if it no longer matches either team
        if (prev.rootingFor && prev.rootingFor !== newHome && prev.rootingFor !== newAway) {
          next.rootingFor = ''
        }
        // Auto-default rootingFor to a followed team if it's playing and not yet set
        if (!next.rootingFor && newHome && newAway) {
          const { followedTeams, primaryFavoriteTeam } = getSettings()
          const primary = primaryFavoriteTeam?.sportId === prev.sport ? primaryFavoriteTeam?.teamName : null
          if (primary && (primary === newHome || primary === newAway)) {
            next.rootingFor = primary
          } else {
            const followed = followedTeams[prev.sport] ?? []
            const match = followed.find((f) => f === newHome || f === newAway)
            if (match) next.rootingFor = match
          }
        }
      }
      return next
    })
    setAutoFilled((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }; delete next[field]; return next
    })
  }

  async function handleFindGames() {
    if (!findTeamId || !findSeason) return
    setIsLoadingSchedule(true); setScheduleError(null); setScheduleResults([])
    try {
      const games = await fetchTeamSchedule(form.sport, findTeamId, findSeason)
      if (games.length === 0) setScheduleError("No games found. Try a different team or season.")
      setScheduleResults(games)
    } catch {
      setScheduleError("Couldn't load the schedule — check your connection or try again.")
    } finally {
      setIsLoadingSchedule(false)
    }
  }

  function applyGame(game: GameResult) {
    const isPreseason = game.seasonType === 'preseason'
    const { followedTeams, primaryFavoriteTeam } = getSettings()
    const primary = primaryFavoriteTeam?.sportId === game.sportId ? primaryFavoriteTeam?.teamName : null
    const followed = followedTeams[game.sportId] ?? []
    const rootingFor =
      (primary && (primary === game.homeTeam || primary === game.awayTeam))
        ? primary
        : (followed.find((f) => f === game.homeTeam || f === game.awayTeam) ?? '')
    setForm((prev) => ({
      ...prev,
      sport: game.sportId,
      year: game.season ?? findSeason,
      week: !isPreseason ? (game.week ?? prev.week) : prev.week,
      date: game.date,
      awayTeam: game.awayTeam, homeTeam: game.homeTeam,
      awayScore: game.awayScore != null ? String(game.awayScore) : prev.awayScore,
      homeScore: game.homeScore != null ? String(game.homeScore) : prev.homeScore,
      venue: game.venue ?? prev.venue,
      rootingFor,
    }))
    setAutoFilled({
      year: true, date: true, awayTeam: true, homeTeam: true,
      ...(!isPreseason && game.week && { week: true }),
      ...(game.awayScore != null && { awayScore: true }),
      ...(game.homeScore != null && { homeScore: true }),
      ...(game.venue && { venue: true }),
    })
    setScheduleResults([])
    setAppliedSummary(null)
    setAppliedScheduleLabel(game.scheduleLabel ?? null)
    fetchGameSummary(game.sportId, game.id).then(setAppliedSummary)
    setTimeout(() => basicsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const remaining = MAX_PHOTOS - photos.length
    const toProcess = files.slice(0, remaining)
    e.target.value = ''  // reset before async so the same file can be re-selected
    if (!toProcess.length) return
    setProcessingCount(toProcess.length)
    try {
      const compressed = await Promise.all(toProcess.map(compressImage))
      setPhotos((prev) => [...prev, ...compressed.filter(Boolean)].slice(0, MAX_PHOTOS))
    } catch (err) {
      console.warn('Photo processing error:', err)
    } finally {
      setProcessingCount(0)
    }
  }

  async function handleOutfitPhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setProcessingCount((c) => c + 1)
    try {
      const compressed = await compressImage(file)
      if (compressed) setOutfitPhoto(compressed)
    } catch (err) {
      console.warn('Outfit photo processing error:', err)
    } finally {
      setProcessingCount((c) => c - 1)
    }
  }

  function removePhoto(idx: number) { setPhotos((prev) => prev.filter((_, i) => i !== idx)) }

  function commitSave() {
    setSaveError(null)
    setStorageWarn(false)

    let scheduleLabel = appliedScheduleLabel
    if (!scheduleLabel && isCollege) {
      const sportPart = form.collegeSportType ? form.collegeSportType.toUpperCase() : 'COLLEGE SPORTS'
      const datePart = form.date ? formatDate(form.date).toUpperCase() : ''
      scheduleLabel = datePart ? `COLLEGE · ${sportPart} · ${datePart}` : `COLLEGE · ${sportPart}`
    } else if (!scheduleLabel && isCustom) {
      const levelPart = form.level ? form.level.toUpperCase() : 'CUSTOM'
      const datePart = form.date ? formatDate(form.date).toUpperCase() : ''
      scheduleLabel = datePart ? `${levelPart} · ${datePart}` : levelPart
    }

    const rawAttendees = form.whoWasThere.trim()
      ? form.whoWasThere.split(/[,&]|\band\b/i).map((n) => n.trim()).filter((n) => n.length > 0)
      : undefined
    const validRootingFor = form.rootingFor &&
      (form.rootingFor === form.homeTeam.trim() || form.rootingFor === form.awayTeam.trim())
      ? form.rootingFor : undefined

    const game: Game = {
      id: initialGame?.id ?? crypto.randomUUID(),
      sportId: form.sport,
      sport: currentSport?.label ?? form.sport.toUpperCase(),
      week: form.week || undefined,
      season: form.year || undefined,
      date: form.date || undefined,
      scheduleLabel: scheduleLabel ?? undefined,
      level: isCustom && !isCollege && form.level ? form.level : undefined,
      collegeSportType: isCollege && form.collegeSportType ? form.collegeSportType : undefined,
      homeTeam: form.homeTeam.trim(),
      awayTeam: form.awayTeam.trim(),
      homeScore: form.homeScore !== '' ? Number(form.homeScore) : undefined,
      awayScore: form.awayScore !== '' ? Number(form.awayScore) : undefined,
      venue: form.venue.trim() || undefined,
      section: form.section.trim() || undefined,
      row: form.row.trim() || undefined,
      seatNumbers: form.seatNumbers.trim() || undefined,
      notes: form.notes.trim() || undefined,
      whoWasThere: form.whoWasThere.trim() || undefined,
      attendees: rawAttendees,
      mvp: form.mvp.trim() || undefined,
      vibe: form.vibe.trim() || undefined,
      rootingFor: validRootingFor,
      whatYouWore: form.whatYouWore.trim() || undefined,
      whatYouAte: form.whatYouAte.trim() || undefined,
      whoDrove: form.whoDrove.trim() || undefined,
      pregameRitual: form.pregameRitual.trim() || undefined,
      photos: photos.length > 0 ? photos : undefined,
      outfitPhoto: outfitPhoto ?? undefined,
      summary: appliedSummary ?? undefined,
      createdAt: initialGame?.createdAt ?? new Date().toISOString(),
    }

    if (isEditMode) {
      try {
        updateGame(game)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
          setSaveError("Your device's storage is full and the game couldn't be saved. Try removing a photo from this game, or delete some older games.")
        } else {
          setSaveError("Something went wrong saving your game. Please try again.")
        }
        return
      }
      navigate(`/game/${initialGame!.id}`)
      return
    }

    const gamesBefore = getAllGames()
    try {
      saveGame(game)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        setSaveError("Your device's storage is full and the game couldn't be saved. Try removing a photo from this game, or delete some older games.")
      } else {
        setSaveError("Something went wrong saving your game. Please try again.")
      }
      return
    }
    const fresh = detectNewMilestones(gamesBefore, getAllGames())
    if (fresh.length > 0) {
      setNewMilestones(fresh)
    } else {
      navigate('/')
    }
  }

  function handleSave() {
    if ((needsWeek && !form.week) || !form.homeTeam.trim() || !form.awayTeam.trim()) return
    if (isCustom && !form.date) return
    const allPhotos = [...photos, ...(outfitPhoto ? [outfitPhoto] : [])]
    if (allPhotos.length > 0) {
      const newChars = allPhotos.reduce((sum, p) => sum + p.length, 0)
      if ((localStorage.getItem('sports-diary-games') ?? '').length + newChars > STORAGE_WARN_CHARS) {
        setStorageWarn(true)
        return
      }
    }
    commitSave()
  }

  const canSave = (!needsWeek || form.week) &&
    form.homeTeam.trim() && form.awayTeam.trim() &&
    (!isCustom || form.date)

  const teamNames = teams.map((t) => t.name)
  const seasonGroups = groupResultsBySeason(filteredResults)
  const seasonYears = currentSport?.getSeasonOptions() ?? []

  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      {/* ── Milestone celebration modal ── */}
      {newMilestones.length > 0 && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-paper border-4 border-ink shadow-[8px_8px_0_#d4a017] max-w-sm w-full animate-fade-slide-up">
            <div className="bg-ink px-6 py-4 text-center">
              <p className="font-bebas text-3xl text-gold tracking-[0.2em]">MILESTONE UNLOCKED!</p>
            </div>
            <div className="p-6 flex flex-col gap-3">
              {newMilestones.map((m) => (
                <div key={m.id} className="bg-paper-deep border-2 border-ink px-4 py-3 flex items-center gap-4">
                  <span className="text-4xl flex-shrink-0">{m.icon}</span>
                  <div>
                    <p className="font-bebas text-xl text-ink leading-tight">{m.title}</p>
                    <p className="font-caveat text-sm text-ink/60">{m.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <button
                type="button"
                onClick={() => {
                  markMilestonesSeen(newMilestones.map((m) => m.id))
                  setNewMilestones([])
                  navigate('/')
                }}
                className="w-full font-bebas text-2xl tracking-[0.15em] bg-gold text-ink border-2 border-ink py-3 btn-press"
              >
                NICE!
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-hero-blue border-b-4 border-ink">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(isEditMode ? `/game/${initialGame!.id}` : '/')}
              className="font-bebas text-xl tracking-wider text-ink hover:text-red transition-colors">
              ← Back
            </button>
            <h1 className="font-bebas text-4xl text-ink leading-none">
              {isEditMode ? 'Edit Game' : 'Add Game'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Ticket stub decoration */}
        <div className="hidden md:flex items-center gap-3 mb-8">
          <div className="bg-ink text-gold font-bebas text-xs tracking-[0.25em] px-3 py-1.5">
            {isEditMode ? 'EDIT ENTRY' : 'NEW ENTRY'}
          </div>
          <div className="flex-1 border-t-2 border-dashed border-ink/20" />
          <div className="font-bebas text-xs tracking-[0.2em] text-ink/30">
            {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
          </div>
        </div>

        {/* ── FIND YOUR GAME — hidden for Custom sport and in edit mode ── */}
        {!isCustom && !isEditMode && (
          <div className="mb-10 border-2 border-ink/20 bg-paper-deep/40 p-5">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="font-bebas text-xl tracking-[0.2em] text-ink flex-shrink-0">FIND YOUR GAME</h2>
              <div className="flex-1 h-[2px] bg-ink/20" />
            </div>
            <p className="font-caveat text-base text-ink/50 mb-4">
              Pick a team and season to auto-fill from that schedule. Or skip and fill in manually below.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-bebas text-xs tracking-[0.2em] text-ink">TEAM</label>
                {isLoadingTeams ? (
                  <div className={`${inputClass} flex items-center gap-2 opacity-60`}>
                    <div className="w-3.5 h-3.5 border-2 border-ink/20 border-t-ink/60 rounded-full animate-spin flex-shrink-0" />
                    <span className="font-bebas text-xs tracking-[0.1em] text-ink/50">LOADING TEAMS…</span>
                  </div>
                ) : (
                  <TeamCombobox
                    value={findTeamName}
                    onChange={setFindTeamName}
                    options={teamNames}
                    sportId={form.sport}
                    placeholder="Search team…"
                  />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-bebas text-xs tracking-[0.2em] text-ink">SEASON</label>
                <select value={findSeason} onChange={(e) => setFindSeason(e.target.value)} className={selectClass}>
                  {seasonYears.map((y) => (
                    <option key={y} value={y}>{currentSport?.seasonDisplayLabel(y) ?? y}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="button" onClick={handleFindGames}
              disabled={!findTeamId || isLoadingSchedule || isLoadingTeams}
              className="font-bebas text-lg tracking-[0.15em] bg-ink text-gold border-2 border-ink px-5 py-2 btn-press disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isLoadingSchedule ? 'SEARCHING…' : 'FIND GAMES'}
            </button>

            {isLoadingSchedule && (
              <div className="flex items-center gap-2 mt-3">
                <div className="w-3.5 h-3.5 border-2 border-ink/20 border-t-ink/60 rounded-full animate-spin" />
                <span className="font-bebas text-xs tracking-[0.15em] text-ink/40">LOADING {findSeason} SCHEDULE…</span>
              </div>
            )}
            {scheduleError && <p className="font-caveat text-base text-ink/50 mt-3">{scheduleError}</p>}

            {scheduleResults.length > 0 && (
              <div className="mt-4">
                {/* ── Filter bar ── */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => setFilterOpen((o) => !o)}
                      className={`font-bebas text-xs tracking-[0.2em] px-3 py-1.5 border-2 border-ink transition-colors ${
                        filterOpen || hasActiveFilter ? 'bg-ink text-gold' : 'bg-paper text-ink hover:bg-paper-deep'
                      }`}
                    >
                      {filterOpen ? '▾ FILTER' : '▸ FILTER'}
                      {hasActiveFilter && ' •'}
                    </button>
                    <span className="font-bebas text-xs tracking-[0.1em] text-ink/40">
                      {filteredResults.length === scheduleResults.length
                        ? `${scheduleResults.length} games`
                        : `${filteredResults.length} of ${scheduleResults.length} games`}
                    </span>
                  </div>

                  {filterOpen && (
                    <div className="bg-paper-deep border border-ink/20 p-3 flex flex-col gap-3">
                      {/* Month tabs */}
                      {availableMonths.length > 0 && (
                        <div>
                          <p className="font-bebas text-[10px] tracking-[0.2em] text-ink/40 mb-1.5">MONTH</p>
                          <div className="flex flex-wrap gap-1.5">
                            {availableMonths.map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setFilterMonth(filterMonth === m ? null : m)}
                                className={`font-bebas text-xs tracking-[0.1em] px-2.5 py-1 border border-ink transition-colors ${
                                  filterMonth === m
                                    ? 'bg-red text-white border-red'
                                    : 'bg-paper text-ink hover:bg-paper-deep'
                                }`}
                              >
                                {MONTH_LABELS[parseInt(m, 10) - 1]}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Home / Away */}
                      <div>
                        <p className="font-bebas text-[10px] tracking-[0.2em] text-ink/40 mb-1.5">HOME / AWAY</p>
                        <div className="flex gap-1.5">
                          {(['all', 'home', 'away'] as const).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setFilterHomeAway(opt)}
                              className={`font-bebas text-xs tracking-[0.1em] px-3 py-1 border border-ink transition-colors ${
                                filterHomeAway === opt
                                  ? 'bg-red text-white border-red'
                                  : 'bg-paper text-ink hover:bg-paper-deep'
                              }`}
                            >
                              {opt.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Opponent */}
                      {availableOpponents.length > 1 && (
                        <div>
                          <p className="font-bebas text-[10px] tracking-[0.2em] text-ink/40 mb-1.5">OPPONENT</p>
                          <select
                            value={filterOpponent}
                            onChange={(e) => setFilterOpponent(e.target.value)}
                            className="bg-white border border-ink/30 px-2 py-1.5 font-archivo text-sm text-ink focus:outline-none w-full"
                          >
                            <option value="">All opponents</option>
                            {availableOpponents.map((opp) => (
                              <option key={opp} value={opp}>{opp}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Clear */}
                      {hasActiveFilter && (
                        <button
                          type="button"
                          onClick={() => { setFilterMonth(null); setFilterHomeAway('all'); setFilterOpponent('') }}
                          className="font-bebas text-xs tracking-[0.15em] text-ink/50 hover:text-ink underline text-left transition-colors"
                        >
                          CLEAR FILTERS
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Results ── */}
                <div className="flex flex-col gap-6">
                  {seasonGroups.length > 0 ? seasonGroups.map(({ label, type, games }) => (
                    <div key={type}>
                      <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-1.5 border-b border-ink/10 pb-1">{label}</p>
                      <div className="flex flex-col gap-1.5">
                        {games.map((g) => (
                          <button key={g.id} type="button" onClick={() => applyGame(g)}
                            className="text-left border border-ink/30 bg-paper px-3 py-2.5 hover:bg-paper-deep hover:border-ink transition-colors"
                          >
                            <div className="flex items-baseline gap-2">
                              <span className="font-bebas text-xs tracking-[0.1em] text-ink/40">
                                {g.scheduleLabel ?? gameWeekLabel(g).toUpperCase()}
                              </span>
                              <span className="font-bebas text-xs text-ink/30">{g.date}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <TeamBadge team={g.homeTeam} sportId={g.sportId} size="xs" />
                              <span className="font-bebas text-base text-ink">{g.homeTeam}</span>
                              <span className="font-bebas text-base text-red">vs</span>
                              <span className="font-bebas text-base text-ink">{g.awayTeam}</span>
                              <TeamBadge team={g.awayTeam} sportId={g.sportId} size="xs" />
                            </div>
                            <div className="flex gap-3 mt-0.5">
                              {g.awayScore != null && g.homeScore != null ? (
                                <span className="font-bebas text-sm text-ink/50">Final: {g.homeScore}–{g.awayScore}</span>
                              ) : (
                                <span className="font-bebas text-sm text-ink/35">Upcoming</span>
                              )}
                              {g.venue && <span className="font-archivo text-xs text-ink/30 truncate">{g.venue}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <p className="font-caveat text-base text-ink/40 text-center py-4">No games match your filters.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── THE BASICS ── */}
        <div ref={basicsRef}><SectionHeader title="THE BASICS" /></div>
        <div className="flex flex-col gap-5 mb-10">

          <Field label="Sport">
            {isEditMode ? (
              <div className={`${inputClass} bg-paper-deep text-ink/60 select-none cursor-default`}>
                {currentSport?.label ?? form.sport}
              </div>
            ) : (
              <select value={form.sport} onChange={(e) => set('sport', e.target.value)} className={selectClass}>
                {ENABLED_SPORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            )}
          </Field>

          {/* College: two-box sport selector + required date */}
          {isCollege && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Level">
                  <div className={`${inputClass} bg-paper-deep text-ink/50 select-none cursor-default`}>College</div>
                </Field>
                <Field label="Sport">
                  <select value={form.collegeSportType} onChange={(e) => set('collegeSportType', e.target.value)} className={selectClass}>
                    <option value="">Select sport…</option>
                    {COLLEGE_SPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Date *">
                <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputClass} />
              </Field>
            </>
          )}

          {/* Custom / Other: level + date (required) */}
          {isCustom && !isCollege && (
            <>
              <Field label="Level">
                <select value={form.level} onChange={(e) => set('level', e.target.value)} className={selectClass}>
                  <option value="">Select level…</option>
                  {CUSTOM_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
              <Field label="Date *">
                <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputClass} />
              </Field>
            </>
          )}

          {/* Week/Season — only for sports with weeks (NFL) */}
          {needsWeek && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Week *" isAutoFilled={autoFilled.week}>
                <select value={form.week} onChange={(e) => set('week', e.target.value)} className={selectClass}>
                  <option value="">Select week…</option>
                  {NFL_WEEKS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </Field>
              <Field label="Season *" isAutoFilled={autoFilled.year}>
                <select value={form.year} onChange={(e) => set('year', e.target.value)} className={selectClass}>
                  {seasonYears.map((y) => <option key={y} value={y}>{currentSport?.seasonDisplayLabel(y) ?? `${y} Season`}</option>)}
                </select>
              </Field>
            </div>
          )}

          {/* Season only — for non-week sports (not Custom) */}
          {!needsWeek && !isCustom && (
            <Field label="Season" isAutoFilled={autoFilled.year}>
              <select value={form.year} onChange={(e) => set('year', e.target.value)} className={selectClass}>
                {seasonYears.map((y) => <option key={y} value={y}>{currentSport?.seasonDisplayLabel(y) ?? `${y} Season`}</option>)}
              </select>
            </Field>
          )}

          {/* Auto-filled date indicator (non-Custom) */}
          {!isCustom && form.date && (
            <p className="font-caveat text-sm text-navy/70 -mt-2 ml-0.5">
              {autoFilled.date ? '● ' : ''}{formatDate(form.date)}
            </p>
          )}

          <Field label="Venue" isAutoFilled={autoFilled.venue}>
            <input type="text" value={form.venue} onChange={(e) => set('venue', e.target.value)}
              placeholder={currentSport?.placeholders.venue} className={inputClass} />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Section">
              <input type="text" value={form.section} onChange={(e) => set('section', e.target.value)}
                placeholder="220" className={inputClass} />
            </Field>
            <Field label="Row">
              <input type="text" value={form.row} onChange={(e) => set('row', e.target.value)}
                placeholder="H" className={inputClass} />
            </Field>
            <Field label="Seat(s)">
              <input type="text" value={form.seatNumbers} onChange={(e) => set('seatNumbers', e.target.value)}
                placeholder="12-14" className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Home Team *" isAutoFilled={autoFilled.homeTeam}>
              {isCustom ? (
                <input type="text" value={form.homeTeam} onChange={(e) => set('homeTeam', e.target.value)}
                  placeholder={currentSport?.placeholders.homeTeam} className={inputClass} />
              ) : (
                <TeamCombobox value={form.homeTeam} onChange={(val) => set('homeTeam', val)}
                  options={teamNames.filter((t) => t !== form.awayTeam)}
                  sportId={form.sport} placeholder={currentSport?.placeholders.homeTeam}
                  disabled={isLoadingTeams} />
              )}
            </Field>
            <Field label="Away Team *" isAutoFilled={autoFilled.awayTeam}>
              {isCustom ? (
                <input type="text" value={form.awayTeam} onChange={(e) => set('awayTeam', e.target.value)}
                  placeholder={currentSport?.placeholders.awayTeam} className={inputClass} />
              ) : (
                <TeamCombobox value={form.awayTeam} onChange={(val) => set('awayTeam', val)}
                  options={teamNames.filter((t) => t !== form.homeTeam)}
                  sportId={form.sport} placeholder={currentSport?.placeholders.awayTeam}
                  disabled={isLoadingTeams} />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Home Score" isAutoFilled={autoFilled.homeScore}>
              <input type="number" min="0" value={form.homeScore} onChange={(e) => set('homeScore', e.target.value)}
                placeholder="—" className={inputClass} />
            </Field>
            <Field label="Away Score" isAutoFilled={autoFilled.awayScore}>
              <input type="number" min="0" value={form.awayScore} onChange={(e) => set('awayScore', e.target.value)}
                placeholder="—" className={inputClass} />
            </Field>
          </div>

          {form.homeTeam && form.awayTeam && (
            <Field label="Who Were You Rooting For?">
              <select value={form.rootingFor} onChange={(e) => set('rootingFor', e.target.value)} className={selectClass}>
                <option value="">— optional —</option>
                <option value={form.homeTeam}>{form.homeTeam}</option>
                <option value={form.awayTeam}>{form.awayTeam}</option>
              </select>
            </Field>
          )}
        </div>

        {/* ── THE STORY ── */}
        <SectionHeader title="THE STORY" />
        <div className="flex flex-col gap-5 mb-10">
          {appliedSummary && (
            <div className="bg-paper border border-ink/20 px-3 py-2.5">
              <p className="font-bebas text-[10px] tracking-[0.25em] text-ink/35 mb-1">ESPN RECAP</p>
              <p className="font-archivo text-sm text-ink/55 italic leading-snug">{appliedSummary}</p>
            </div>
          )}
          <Field label="Notes">
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="What do you remember about this game?"
              rows={6} className={`${inputClass} resize-none font-caveat text-lg`} />
          </Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Who Was There">
              <AttendeeInput
                value={form.whoWasThere}
                onChange={(v) => set('whoWasThere', v)}
                existingAttendees={existingAttendees}
              />
              <p className="font-caveat text-sm text-ink/40 mt-1">Separate names with commas</p>
            </Field>
            <Field label="MVP">
              <input type="text" value={form.mvp} onChange={(e) => set('mvp', e.target.value)}
                placeholder="Who was the MVP of the day?" className={inputClass} />
            </Field>
          </div>
          <Field label="Vibe">
            <input type="text" value={form.vibe} onChange={(e) => set('vibe', e.target.value)}
              placeholder="electric, freezing, heartbreaker…" className={inputClass} />
          </Field>
        </div>

        {/* ── THE LITTLE THINGS ── */}
        <div className="mb-10">
          <button type="button" onClick={() => setShowLittleThings(!showLittleThings)}
            className="flex items-center gap-3 w-full hover:opacity-70 transition-opacity">
            <span className="font-bebas text-xl tracking-[0.2em] text-ink flex-shrink-0">THE LITTLE THINGS</span>
            <div className="flex-1 h-[2px] bg-ink" />
            <span className="font-bebas text-2xl text-red flex-shrink-0 ml-1 leading-none">
              {showLittleThings ? '−' : '+'}
            </span>
          </button>
          {showLittleThings && (
            <div className="flex flex-col gap-5 mt-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* What You Wore — with outfit photo thumbnail */}
                <Field label="What You Wore">
                  <div className="flex gap-2 items-start">
                    <input type="text" value={form.whatYouWore} onChange={(e) => set('whatYouWore', e.target.value)}
                      placeholder="e.g. Lucky jersey, winter coat" className={`${inputClass} flex-1`} />
                    <div className="flex-shrink-0">
                      {outfitPhoto ? (
                        <div className="relative w-[46px] h-[46px] border-2 border-ink shadow-[2px_2px_0_#000]">
                          <img src={outfitPhoto} alt="Outfit" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setOutfitPhoto(null)}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red border-2 border-ink text-white font-bebas text-xs flex items-center justify-center leading-none hover:bg-red-deep transition-colors"
                            aria-label="Remove outfit photo">×</button>
                        </div>
                      ) : (
                        <label htmlFor="outfit-photo-upload"
                          className="flex flex-col items-center justify-center w-[46px] h-[46px] border-2 border-dashed border-ink/40 cursor-pointer hover:border-red transition-colors"
                          title="Add outfit photo">
                          <span className="font-bebas text-[9px] tracking-[0.05em] text-ink/40 text-center leading-tight">ADD<br/>PHOTO</span>
                        </label>
                      )}
                      <input id="outfit-photo-upload" type="file" accept="image/*" className="sr-only"
                        onChange={handleOutfitPhotoUpload} />
                    </div>
                  </div>
                </Field>
                <Field label="What You Ate">
                  <input type="text" value={form.whatYouAte} onChange={(e) => set('whatYouAte', e.target.value)}
                    placeholder="e.g. Nachos, hot chocolate" className={inputClass} />
                </Field>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Who Drove">
                  <input type="text" value={form.whoDrove} onChange={(e) => set('whoDrove', e.target.value)}
                    placeholder="e.g. Dad drove, Mike's truck" className={inputClass} />
                </Field>
                <Field label="Pregame Ritual">
                  <input type="text" value={form.pregameRitual} onChange={(e) => set('pregameRitual', e.target.value)}
                    placeholder="e.g. Tailgate, Anchor Bar" className={inputClass} />
                </Field>
              </div>
            </div>
          )}
        </div>

        {/* ── PHOTOS ── */}
        <SectionHeader title="PHOTOS" />
        <div className="mb-10">
          <label htmlFor="photo-upload"
            className={`flex flex-col items-center justify-center border-2 border-dashed border-ink/40 p-8 transition-colors ${
              photos.length >= MAX_PHOTOS || processingCount > 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:border-red hover:bg-paper-deep/40'
            }`}>
            <p className="font-bebas text-2xl tracking-[0.15em] text-ink/50">
              {photos.length >= MAX_PHOTOS ? 'MAX PHOTOS REACHED' : processingCount > 0 ? 'PROCESSING…' : '+ ADD PHOTOS'}
            </p>
            <p className="font-caveat text-sm text-ink/30 mt-1">
              {photos.length >= MAX_PHOTOS
                ? `${MAX_PHOTOS} photos maximum per game`
                : processingCount > 0
                ? `Compressing photos…`
                : `Tap to browse · ${photos.length} / ${MAX_PHOTOS} added`}
            </p>
          </label>
          <input id="photo-upload" type="file" accept="image/*" multiple className="sr-only"
            onChange={handlePhotoUpload} disabled={photos.length >= MAX_PHOTOS || processingCount > 0} />
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-5">
              {photos.map((photo, i) => (
                <div key={i} className="relative w-24 h-24 border-2 border-ink shadow-[3px_3px_0_#000]">
                  <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)}
                    className="absolute -top-2.5 -right-2.5 w-6 h-6 bg-red border-2 border-ink text-white font-bebas text-base flex items-center justify-center leading-none hover:bg-red-deep transition-colors"
                    aria-label="Remove photo">×</button>
                </div>
              ))}
            </div>
          )}
          {/* Storage usage indicator */}
          {(photos.length > 0 || outfitPhoto) && (() => {
            const outfitLen = outfitPhoto?.length ?? 0
            const usedMB = ((localStorage.getItem('sports-diary-games') ?? '').length + photos.reduce((s, p) => s + p.length, 0) + outfitLen) / (1024 * 1024)
            const color = usedMB > 4 ? 'text-red' : usedMB > 3 ? 'text-gold' : 'text-ink/30'
            return (
              <p className={`font-bebas text-[10px] tracking-[0.15em] mt-2 ${color}`}>
                STORAGE USED: ~{usedMB.toFixed(1)} MB / 5 MB
              </p>
            )
          })()}
        </div>

        {/* ── Storage warning ── */}
        {storageWarn && (
          <div className="mb-6 border-2 border-gold bg-paper-deep p-4">
            <p className="font-bebas text-sm tracking-[0.1em] text-ink mb-1">RUNNING LOW ON STORAGE</p>
            <p className="font-caveat text-base text-ink/70 mb-4 leading-snug">
              You're using a lot of storage. Consider removing a photo from this game, or your photos may not save.<br />
              <span className="text-ink/40 text-sm">(Full photo storage coming when we add accounts.)</span>
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={commitSave}
                className="font-bebas text-lg tracking-[0.15em] bg-ink text-gold border-2 border-ink px-5 py-2 btn-press">
                Save anyway
              </button>
              <button type="button" onClick={() => setStorageWarn(false)}
                className="font-bebas text-lg tracking-[0.15em] text-ink border-2 border-ink px-5 py-2 hover:bg-paper-deep transition-colors">
                Go back
              </button>
            </div>
          </div>
        )}

        {/* ── Save error ── */}
        {saveError && (
          <div className="mb-6 border-2 border-red bg-paper-deep p-4">
            <p className="font-bebas text-sm tracking-[0.1em] text-red mb-1">COULDN'T SAVE</p>
            <p className="font-caveat text-base text-ink/70">{saveError}</p>
          </div>
        )}

        {/* ── Buttons ── */}
        <div className="border-b-4 border-ink mb-6" />
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={!canSave || processingCount > 0}
            className="flex-1 font-bebas text-2xl tracking-[0.15em] bg-red text-white border-2 border-ink py-4 btn-press disabled:opacity-40 disabled:cursor-not-allowed">
            {isEditMode ? 'Save Changes' : 'Save Game'}
          </button>
          <button onClick={() => navigate(isEditMode ? `/game/${initialGame!.id}` : '/')}
            className="font-bebas text-2xl tracking-[0.15em] text-ink border-2 border-ink px-6 py-4 hover:bg-paper-deep transition-colors">
            Cancel
          </button>
        </div>
      </main>
    </div>
  )
}

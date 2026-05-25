import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '@/components/Nav'
import { processPhotoFile, groupPhotos } from '@/lib/importUtils'
import type { ImportGroup, ProcessedPhoto } from '@/lib/importUtils'
import { saveGame, getAllGames } from '@/lib/gameStore'
import { fetchGameOnDate } from '@/lib/sportsApi'
import { detectNewMilestones, markMilestonesSeen } from '@/lib/milestones'
import type { Milestone } from '@/lib/milestones'
import { ENABLED_SPORTS } from '@/lib/sports'
import type { Game, GameResult } from '@/types/Game'

const MAX_IMPORT = 50
const BATCH_SIZE = 10

const inputCls =
  'w-full bg-white border-2 border-ink px-3 py-2.5 font-archivo text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-red transition-colors'
const selectCls = `${inputCls} cursor-pointer`
const labelCls = 'font-bebas text-xs tracking-[0.2em] text-ink block mb-1'
const primaryBtnCls =
  'font-bebas tracking-[0.15em] text-sm bg-ink text-paper px-5 py-2.5 hover:bg-ink/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
const outlineBtnCls =
  'font-bebas tracking-[0.15em] text-sm border-2 border-ink text-ink px-5 py-2.5 hover:bg-paper-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

type Step = 'upload' | 'processing' | 'review' | 'done'

interface ReviewForm {
  sport: string
  date: string
  venue: string
  homeTeam: string
  awayTeam: string
  homeScore: string
  awayScore: string
  nickname: string
  notes: string
  includedPhotos: boolean[]
  coverIdx: number
}

interface GroupReview {
  form: ReviewForm
  status: 'pending' | 'saved' | 'skipped'
}

function initForm(g: ImportGroup): ReviewForm {
  return {
    sport: g.suggestedSportId ?? '',
    date: g.suggestedDate ?? '',
    venue: g.suggestedVenue?.name ?? '',
    homeTeam: '',
    awayTeam: '',
    homeScore: '',
    awayScore: '',
    nickname: '',
    notes: '',
    includedPhotos: g.photos.map(() => true),
    coverIdx: 0,
  }
}

export default function ImportGames() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cancelledRef = useRef(false)
  const initialGamesRef = useRef<Game[]>([])

  const [step, setStep] = useState<Step>('upload')
  const [files, setFiles] = useState<File[]>([])
  const [overLimit, setOverLimit] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)

  const [groups, setGroups] = useState<ImportGroup[]>([])
  const [reviews, setReviews] = useState<GroupReview[]>([])
  const [idx, setIdx] = useState(0)
  const [espnResult, setEspnResult] = useState<GameResult | null>(null)
  const [espnLoading, setEspnLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [savedCount, setSavedCount] = useState(0)
  const [newMilestones, setNewMilestones] = useState<Milestone[]>([])

  // ── File handling ─────────────────────────────────────────────────────────────

  function acceptFiles(raw: File[]) {
    const images = raw.filter((f) => f.type.startsWith('image/'))
    if (images.length > MAX_IMPORT) {
      setFiles(images.slice(0, MAX_IMPORT))
      setOverLimit(true)
    } else {
      setFiles(images)
      setOverLimit(false)
    }
  }

  // ── Processing ────────────────────────────────────────────────────────────────

  async function startProcessing() {
    cancelledRef.current = false
    setTotal(files.length)
    setProgress(0)
    setStep('processing')

    try {
      initialGamesRef.current = await getAllGames()
    } catch {
      initialGamesRef.current = []
    }

    const all: ProcessedPhoto[] = []
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      if (cancelledRef.current) return
      const batch = files.slice(i, i + BATCH_SIZE)
      const results = await Promise.all(batch.map((f) => processPhotoFile(f)))
      all.push(...results)
      setProgress(all.length)
    }

    if (cancelledRef.current) return

    const grouped = groupPhotos(all)
    if (grouped.length === 0) {
      setStep('done')
      return
    }

    setGroups(grouped)
    setReviews(grouped.map((g) => ({ form: initForm(g), status: 'pending' })))
    setIdx(0)
    setSaveError(null)
    setEspnResult(null)
    setStep('review')
  }

  // ── ESPN lookup on group entry ─────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 'review' || groups.length === 0) return
    const group = groups[idx]
    if (!group || group.isUnmatched) {
      setEspnResult(null)
      return
    }

    const sportId = group.suggestedSportId
    const venue = group.suggestedVenue?.name
    const date = group.suggestedDate

    if (!sportId || !venue || !date) {
      setEspnResult(null)
      return
    }

    let cancelled = false
    setEspnLoading(true)
    setEspnResult(null)

    fetchGameOnDate(sportId, venue, date)
      .then((result) => {
        if (cancelled) return
        setEspnResult(result)
        if (result) {
          setReviews((prev) => {
            const next = [...prev]
            const r = next[idx]
            if (!r || r.status === 'saved') return prev
            const f = { ...r.form }
            if (!f.homeTeam) f.homeTeam = result.homeTeam
            if (!f.awayTeam) f.awayTeam = result.awayTeam
            if (f.homeScore === '' && result.homeScore !== undefined) f.homeScore = String(result.homeScore)
            if (f.awayScore === '' && result.awayScore !== undefined) f.awayScore = String(result.awayScore)
            if (!f.venue && result.venue) f.venue = result.venue
            next[idx] = { ...r, form: f }
            return next
          })
        }
      })
      .finally(() => {
        if (!cancelled) setEspnLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [step, idx, groups])

  // ── Form helpers ──────────────────────────────────────────────────────────────

  function updateForm(patch: Partial<ReviewForm>) {
    setReviews((prev) => {
      const next = [...prev]
      if (!next[idx]) return prev
      next[idx] = { ...next[idx], form: { ...next[idx].form, ...patch } }
      return next
    })
  }

  // ── Save ──────────────────────────────────────────────────────────────────────

  async function saveGroup(): Promise<boolean> {
    const group = groups[idx]
    const review = reviews[idx]
    if (!group || !review) return false

    setSaveError(null)
    setIsSaving(true)

    try {
      const f = review.form

      const photoPairs = group.photos.map((p, i) => ({ dataUrl: p.dataUrl, orig: i }))
      const included = photoPairs.filter((_, i) => f.includedPhotos[i])

      const coverPos = included.findIndex((p) => p.orig === f.coverIdx)
      if (coverPos > 0) {
        const [cover] = included.splice(coverPos, 1)
        included.unshift(cover)
      }

      const photos = included.map((p) => p.dataUrl).filter(Boolean).slice(0, 5)

      const game: Game = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        sportId: f.sport || 'custom',
        date: f.date || undefined,
        venue: f.venue || undefined,
        homeTeam: f.homeTeam.trim() || 'Home Team',
        awayTeam: f.awayTeam.trim() || 'Away Team',
        homeScore: f.homeScore !== '' ? Number(f.homeScore) : undefined,
        awayScore: f.awayScore !== '' ? Number(f.awayScore) : undefined,
        nickname: f.nickname.trim() || undefined,
        notes: f.notes.trim() || undefined,
        photos: photos.length > 0 ? photos : undefined,
      }

      await saveGame(game)

      setReviews((prev) => {
        const next = [...prev]
        next[idx] = { ...next[idx], status: 'saved' }
        return next
      })
      setSavedCount((c) => c + 1)
      return true
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed. Please try again.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function finishAll() {
    try {
      const gamesAfter = await getAllGames()
      const ms = detectNewMilestones(initialGamesRef.current, gamesAfter)
      if (ms.length > 0) {
        markMilestonesSeen(ms.map((m) => m.id))
        setNewMilestones(ms)
      }
    } catch {
      // milestone detection is non-critical
    }
    setStep('done')
  }

  function advance() {
    const next = idx + 1
    if (next >= groups.length) {
      finishAll()
    } else {
      setIdx(next)
      setSaveError(null)
      setEspnResult(null)
    }
  }

  async function handleSaveNext() {
    const ok = await saveGroup()
    if (ok) advance()
  }

  async function handleSaveFinish() {
    const ok = await saveGroup()
    if (ok) finishAll()
  }

  function handleSkip() {
    setReviews((prev) => {
      const next = [...prev]
      if (next[idx]) next[idx] = { ...next[idx], status: 'skipped' }
      return next
    })
    advance()
  }

  function goBack() {
    setIdx((i) => i - 1)
    setSaveError(null)
    setEspnResult(null)
  }

  function resetForNewImport() {
    setStep('upload')
    setFiles([])
    setOverLimit(false)
    setGroups([])
    setReviews([])
    setIdx(0)
    setSavedCount(0)
    setNewMilestones([])
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const group = groups[idx]
  const review = reviews[idx]
  const form = review?.form

  return (
    <div className="min-h-screen bg-paper text-ink pb-20">
      <Nav />

      {/* ── Upload ── */}
      {step === 'upload' && (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate('/')}
              className="font-bebas text-sm tracking-[0.15em] text-ink/50 hover:text-ink transition-colors"
            >
              ← BACK
            </button>
            <h1 className="font-bebas text-3xl tracking-[0.1em]">IMPORT FROM PHOTOS</h1>
          </div>

          <p className="font-archivo text-sm text-ink/60 mb-6 leading-relaxed">
            Select photos from games you've attended. The app reads the date and location from each photo,
            groups them into potential games, and walks you through confirming the details — one game at a time.
          </p>

          <div
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              acceptFiles(Array.from(e.dataTransfer.files))
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed cursor-pointer transition-colors py-12 px-6 text-center ${
              dragOver ? 'border-ink bg-paper-deep' : 'border-ink/30 hover:border-ink/60'
            }`}
          >
            <div className="text-4xl mb-3">📷</div>
            <p className="font-bebas text-xl tracking-[0.1em] mb-1">DROP PHOTOS HERE</p>
            <p className="font-archivo text-sm text-ink/50">or click to select — JPEG, PNG, HEIC accepted</p>
            <p className="font-archivo text-xs text-ink/40 mt-2">Up to {MAX_IMPORT} photos per import</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) acceptFiles(Array.from(e.target.files))
            }}
          />

          {overLimit && (
            <p className="mt-3 font-archivo text-sm text-amber-600">
              Only the first {MAX_IMPORT} photos will be imported. Select fewer to stay under the limit.
            </p>
          )}

          {files.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="font-bebas text-lg tracking-[0.1em]">
                {files.length} PHOTO{files.length !== 1 ? 'S' : ''} SELECTED
              </p>
              <button onClick={startProcessing} className={primaryBtnCls}>
                START PROCESSING →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Processing ── */}
      {step === 'processing' && (
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="font-bebas text-2xl tracking-[0.1em] mb-2">PROCESSING PHOTOS</div>
          <p className="font-archivo text-sm text-ink/60 mb-6">
            Reading photo {Math.min(progress + 1, total)} of {total}…
          </p>
          <div className="w-full bg-ink/10 h-2 mb-8">
            <div
              className="bg-ink h-2 transition-all duration-300"
              style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
            />
          </div>
          <button
            onClick={() => {
              cancelledRef.current = true
              setStep('upload')
            }}
            className={outlineBtnCls}
          >
            CANCEL
          </button>
        </div>
      )}

      {/* ── Review ── */}
      {step === 'review' && group && form && (
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Progress header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              {idx > 0 && (
                <button
                  onClick={goBack}
                  className="font-bebas text-xs tracking-[0.15em] text-ink/50 hover:text-ink transition-colors"
                >
                  ← BACK
                </button>
              )}
              <span className="font-bebas text-xs tracking-[0.2em] text-ink/50">
                GAME {idx + 1} OF {groups.length}
              </span>
            </div>
            <span className="font-bebas text-xs tracking-[0.2em] text-ink/50">
              {reviews.filter((r) => r.status === 'saved').length} SAVED
            </span>
          </div>
          <div className="w-full bg-ink/10 h-1.5 mb-6">
            <div
              className="bg-ink h-1.5 transition-all duration-300"
              style={{ width: `${((idx + 1) / groups.length) * 100}%` }}
            />
          </div>

          {/* Unmatched banner */}
          {group.isUnmatched && (
            <div className="bg-amber-50 border-2 border-amber-300 px-4 py-3 mb-4">
              <p className="font-bebas text-sm tracking-[0.1em] text-amber-800">
                PHOTOS WITHOUT DATE / LOCATION DATA
              </p>
              <p className="font-archivo text-xs text-amber-700 mt-0.5">
                {group.photos.length} photo{group.photos.length !== 1 ? 's' : ''} had no readable
                metadata. Fill in the details below or skip.
              </p>
            </div>
          )}

          {/* Saved indicator */}
          {review.status === 'saved' && (
            <div className="bg-green-50 border-2 border-green-400 px-4 py-3 mb-4 flex items-center gap-2">
              <span className="text-green-600 text-lg">✓</span>
              <p className="font-bebas text-sm tracking-[0.1em] text-green-700">SAVED TO YOUR DIARY</p>
            </div>
          )}

          {/* ESPN lookup banner */}
          {espnLoading && (
            <div className="border border-ink/20 px-4 py-2 mb-4">
              <p className="font-bebas text-xs tracking-[0.15em] text-ink/40 animate-pulse">
                LOOKING UP GAME…
              </p>
            </div>
          )}
          {espnResult && !espnLoading && (
            <div className="bg-paper-deep border-2 border-ink px-4 py-3 mb-4">
              <p className="font-bebas text-xs tracking-[0.2em] text-ink/50 mb-1">WE THINK THIS GAME WAS…</p>
              <p className="font-bebas text-base tracking-[0.1em]">
                {espnResult.awayTeam} @ {espnResult.homeTeam}
                {espnResult.homeScore !== undefined && (
                  <span className="ml-2 text-ink/60">
                    {espnResult.awayScore}–{espnResult.homeScore}
                  </span>
                )}
              </p>
              {espnResult.venue && (
                <p className="font-archivo text-xs text-ink/50 mt-0.5">{espnResult.venue}</p>
              )}
              <p className="font-archivo text-xs text-ink/40 mt-1">Fields auto-filled below — edit as needed</p>
            </div>
          )}

          {/* Photo grid */}
          {group.photos.length > 0 && (
            <div className="mb-6">
              <p className={labelCls}>
                PHOTOS ({group.photos.filter((_, i) => form.includedPhotos[i]).length} of{' '}
                {group.photos.length} included)
              </p>
              <div className="flex flex-wrap gap-2">
                {group.photos.map((photo, i) => {
                  const included = form.includedPhotos[i] ?? true
                  const isCover = form.coverIdx === i && included
                  return (
                    <div key={i} className="relative flex-shrink-0">
                      <img
                        src={photo.dataUrl}
                        alt={`Photo ${i + 1}`}
                        className={`w-24 h-24 object-cover cursor-pointer transition-opacity ${
                          included ? 'opacity-100' : 'opacity-30'
                        } ${isCover ? 'ring-2 ring-offset-1 ring-gold' : ''}`}
                        onClick={() => {
                          if (included) {
                            updateForm({ coverIdx: i })
                          } else {
                            const next = [...form.includedPhotos]
                            next[i] = true
                            updateForm({ includedPhotos: next })
                          }
                        }}
                      />
                      {isCover && (
                        <span className="absolute top-1 left-1 font-bebas text-[9px] tracking-widest bg-gold text-ink px-1 leading-tight py-0.5">
                          COVER
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const next = [...form.includedPhotos]
                          next[i] = !included
                          const patch: Partial<ReviewForm> = { includedPhotos: next }
                          if (included && form.coverIdx === i) {
                            const nextCover = next.findIndex((inc) => inc)
                            patch.coverIdx = nextCover >= 0 ? nextCover : 0
                          }
                          updateForm(patch)
                        }}
                        className={`absolute top-1 right-1 w-5 h-5 flex items-center justify-center text-xs font-bold leading-none transition-colors ${
                          included
                            ? 'bg-ink text-paper hover:bg-red'
                            : 'bg-ink/30 text-paper hover:bg-ink'
                        }`}
                      >
                        {included ? '×' : '+'}
                      </button>
                    </div>
                  )
                })}
              </div>
              <p className="font-archivo text-xs text-ink/40 mt-1.5">
                Click a photo to set it as the cover · × to exclude · + to re-include
              </p>
            </div>
          )}

          {/* Form */}
          <div className="grid gap-4">
            <div>
              <label className={labelCls}>SPORT</label>
              <select
                value={form.sport}
                onChange={(e) => updateForm({ sport: e.target.value })}
                className={selectCls}
              >
                <option value="">Select sport…</option>
                {ENABLED_SPORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>DATE</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateForm({ date: e.target.value })}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>VENUE</label>
              <input
                type="text"
                value={form.venue}
                onChange={(e) => updateForm({ venue: e.target.value })}
                placeholder="Stadium or arena name…"
                className={inputCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>HOME TEAM</label>
                <input
                  type="text"
                  value={form.homeTeam}
                  onChange={(e) => updateForm({ homeTeam: e.target.value })}
                  placeholder="e.g. Buffalo Bills"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>AWAY TEAM</label>
                <input
                  type="text"
                  value={form.awayTeam}
                  onChange={(e) => updateForm({ awayTeam: e.target.value })}
                  placeholder="e.g. Patriots"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>HOME SCORE</label>
                <input
                  type="number"
                  min="0"
                  value={form.homeScore}
                  onChange={(e) => updateForm({ homeScore: e.target.value })}
                  placeholder="—"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>AWAY SCORE</label>
                <input
                  type="number"
                  min="0"
                  value={form.awayScore}
                  onChange={(e) => updateForm({ awayScore: e.target.value })}
                  placeholder="—"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>NICKNAME (OPTIONAL)</label>
              <input
                type="text"
                maxLength={60}
                value={form.nickname}
                onChange={(e) => updateForm({ nickname: e.target.value })}
                placeholder="e.g. The Comeback Game"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>NOTES (OPTIONAL)</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => updateForm({ notes: e.target.value })}
                placeholder="How was it?"
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>

          {saveError && (
            <div className="mt-4 border-2 border-red px-4 py-3">
              <p className="font-archivo text-sm text-red">{saveError}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6">
            {review.status !== 'saved' ? (
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={handleSaveNext} disabled={isSaving} className={primaryBtnCls}>
                  {isSaving
                    ? 'SAVING…'
                    : idx < groups.length - 1
                    ? 'SAVE & NEXT →'
                    : 'SAVE & FINISH ✓'}
                </button>
                {idx < groups.length - 1 && (
                  <button onClick={handleSaveFinish} disabled={isSaving} className={outlineBtnCls}>
                    SAVE & FINISH
                  </button>
                )}
                <button
                  onClick={handleSkip}
                  disabled={isSaving}
                  className="font-bebas tracking-[0.15em] text-sm text-ink/50 hover:text-ink px-2 py-2.5 transition-colors disabled:opacity-40"
                >
                  SKIP
                </button>
              </div>
            ) : (
              <button onClick={advance} className={primaryBtnCls}>
                {idx < groups.length - 1 ? 'NEXT →' : 'FINISH ✓'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Done ── */}
      {step === 'done' && (
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="font-bebas text-4xl tracking-[0.1em] mb-2">
            ADDED {savedCount} GAME{savedCount !== 1 ? 'S' : ''}!
          </h1>
          <p className="font-archivo text-sm text-ink/60 mb-8">
            {savedCount === 0
              ? 'No games were saved this time.'
              : `Your diary now has ${savedCount === 1 ? 'a new entry' : `${savedCount} new entries`}.`}
          </p>

          {newMilestones.length > 0 && (
            <div className="mb-8 text-left border-2 border-ink bg-paper-deep px-4 py-4">
              <p className="font-bebas text-xs tracking-[0.2em] text-ink/50 mb-3">
                NEW MILESTONES UNLOCKED
              </p>
              <div className="flex flex-col gap-3">
                {newMilestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="text-2xl">{m.icon}</span>
                    <div>
                      <p className="font-bebas text-base tracking-[0.1em]">{m.title}</p>
                      <p className="font-archivo text-xs text-ink/60">{m.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button onClick={() => navigate('/')} className={primaryBtnCls}>
              VIEW MY DIARY →
            </button>
            <button onClick={resetForNewImport} className={outlineBtnCls}>
              IMPORT MORE PHOTOS
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

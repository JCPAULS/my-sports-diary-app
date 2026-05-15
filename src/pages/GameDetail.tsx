import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getAllGames, deleteGame } from '@/lib/storage'
import { getWeekLabel } from '@/lib/nflTeams'
import Nav from '@/components/Nav'
import TeamBadge from '@/components/TeamBadge'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="py-3 border-b-2 border-ink/10 last:border-0">
      <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-1">{label}</p>
      <p className="font-archivo text-base text-ink">{value}</p>
    </div>
  )
}

function LittleThingRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="leading-snug">
      <span className="font-bebas text-xs tracking-[0.15em] text-ink/40">{label} — </span>
      <span className="font-caveat text-lg text-navy">{value}</span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)

  const game = getAllGames().find((g) => g.id === id)

  if (!game) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <p className="font-bebas text-2xl text-ink/40">Game not found</p>
          <button
            onClick={() => navigate('/')}
            className="font-caveat text-lg text-navy underline mt-3 block"
          >
            ← Back to timeline
          </button>
        </div>
        </div>
      </div>
    )
  }

  const hasScore = game.homeScore !== undefined && game.awayScore !== undefined
  const hasLittleThings = !!(game.whatYouWore || game.whatYouAte || game.whoDrove || game.pregameRitual)
  const hasRightContent = !!(game.photos?.length || game.notes || game.vibe || game.mvp || game.whoWasThere || hasLittleThings || game.summary)

  function handleDelete() {
    if (!window.confirm('Delete this game entry?')) return
    deleteGame(game!.id)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav />
      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 cursor-pointer"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            className="absolute top-4 right-5 font-bebas text-white text-3xl hover:text-red transition-colors leading-none"
            onClick={() => setLightboxPhoto(null)}
          >
            ✕
          </button>
          <img
            src={lightboxPhoto}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain border-2 border-white/20"
          />
        </div>
      )}

      <header className="bg-hero-blue border-b-4 border-ink">
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6">
          <button
            onClick={() => navigate(-1)}
            className="font-bebas text-xl tracking-wider text-ink hover:text-red transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-5 lg:gap-10 lg:items-start">

          {/* ── LEFT: Ticket stub ── */}
          <div className="lg:col-span-2 mb-8 lg:mb-0">
            <div className="bg-paper-deep border-2 border-ink card-stamp">
              <div className="p-6">
                {game.sportId === 'custom' ? (
                  <p className="font-bebas text-sm tracking-[0.2em] text-ink/40 mb-1">
                    CUSTOM ENTRY{game.level ? ` · ${game.level.toUpperCase()}` : ''}
                  </p>
                ) : game.sportId === 'college' ? (
                  <p className="font-bebas text-sm tracking-[0.2em] text-ink/40 mb-1">
                    COLLEGE{game.collegeSportType ? ` · ${game.collegeSportType.toUpperCase()}` : ' SPORTS'}
                  </p>
                ) : (game.scheduleLabel || game.week) && (
                  <p className="font-bebas text-sm tracking-[0.2em] text-ink/40 mb-1">
                    {game.scheduleLabel ?? `${getWeekLabel(game.week!).toUpperCase()} · ${game.season} SEASON`}
                  </p>
                )}
                {game.date && (
                  <p className="font-bebas text-xs tracking-[0.15em] text-ink/30 mb-2">
                    {formatDate(game.date)}
                  </p>
                )}
                <h1 className="font-bebas text-5xl lg:text-6xl leading-none text-ink">
                  {game.homeTeam}
                </h1>
                <p className="font-bebas text-2xl lg:text-3xl text-ink/50 mt-1">
                  vs {game.awayTeam}
                </p>
                {hasScore ? (
                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <TeamBadge team={game.homeTeam} sportId={game.sportId} size="lg" />
                    <div className="bg-ink text-gold font-bebas text-3xl lg:text-5xl tracking-widest px-4 py-2">
                      {game.homeScore} – {game.awayScore}
                    </div>
                    <TeamBadge team={game.awayTeam} sportId={game.sportId} size="lg" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mt-4">
                    <TeamBadge team={game.homeTeam} sportId={game.sportId} size="lg" />
                    <TeamBadge team={game.awayTeam} sportId={game.sportId} size="lg" />
                  </div>
                )}
              </div>
              {game.venue && (
                <>
                  <div className="border-t-2 border-dashed border-ink/30 mx-6" />
                  <div className="px-6 py-3">
                    <p className="font-bebas text-xs tracking-[0.2em] text-ink/40">Venue</p>
                    <p className="font-bebas text-lg text-ink">{game.venue}</p>
                  </div>
                </>
              )}
              {(game.section || game.row || game.seatNumbers) && (() => {
                const parts = [
                  game.section   ? `SECTION ${game.section}`   : null,
                  game.row       ? `ROW ${game.row}`           : null,
                  game.seatNumbers ? `SEATS ${game.seatNumbers}` : null,
                ].filter(Boolean)
                return (
                  <>
                    <div className="border-t-2 border-dashed border-ink/30 mx-6" />
                    <div className="px-6 py-3">
                      <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-0.5">Your Seats</p>
                      <p className="font-bebas text-base text-ink tracking-[0.05em]">{parts.join(' · ')}</p>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>

          {/* ── RIGHT: Diary entry panel ── */}
          <div className="lg:col-span-3">
            {/* Desktop label */}
            <div className="hidden lg:flex items-center gap-3 mb-6">
              <div className="font-bebas text-xs tracking-[0.25em] text-ink/30">DIARY ENTRY</div>
              <div className="flex-1 border-t-2 border-dashed border-ink/20" />
            </div>

            {/* Photo strip */}
            {game.photos && game.photos.length > 0 && (
              <div className="mb-6">
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {game.photos.map((photo, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightboxPhoto(photo)}
                      className="flex-shrink-0 w-28 h-28 lg:w-32 lg:h-32 border-2 border-ink shadow-[3px_3px_0_#000] overflow-hidden hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#000] transition-all"
                    >
                      <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* The Story: vibe, MVP, ESPN recap, notes */}
            {(game.notes || game.vibe || game.mvp || game.summary) && (
              <div className="py-3 border-b-2 border-ink/10 mb-1">
                {(game.vibe || game.mvp) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {game.vibe && (
                      <span className="font-bebas text-xs tracking-[0.15em] bg-gold/25 border border-ink/20 text-ink px-2 py-1">
                        {game.vibe.toUpperCase()}
                      </span>
                    )}
                    {game.mvp && (
                      <span className="font-bebas text-xs tracking-[0.15em] border-2 border-ink text-ink px-2 py-1">
                        MVP: {game.mvp}
                      </span>
                    )}
                  </div>
                )}
                {game.summary && (
                  <div className="bg-paper border border-ink/20 px-3 py-2.5 mb-3">
                    <p className="font-bebas text-[10px] tracking-[0.25em] text-ink/35 mb-1">ESPN RECAP</p>
                    <p className="font-archivo text-sm text-ink/55 italic leading-snug">{game.summary}</p>
                  </div>
                )}
                {game.notes && (
                  <div className="border-l-4 border-navy pl-4">
                    <p className="font-caveat text-xl text-navy leading-relaxed">{game.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Who Was There */}
            <DetailRow label="Who Was There" value={game.whoWasThere} />

            {/* The Little Things */}
            {hasLittleThings && (
              <div className="py-3 border-b-2 border-ink/10">
                <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-3">THE LITTLE THINGS</p>
                <div className="flex flex-col gap-2">
                  <LittleThingRow label="WHAT WE WORE" value={game.whatYouWore} />
                  <LittleThingRow label="WHAT WE ATE" value={game.whatYouAte} />
                  <LittleThingRow label="WHO DROVE" value={game.whoDrove} />
                  <LittleThingRow label="PREGAME RITUAL" value={game.pregameRitual} />
                </div>
              </div>
            )}

            {/* Empty right panel fallback */}
            {!hasRightContent && (
              <p className="font-caveat text-lg text-ink/30 py-4">
                No notes for this game yet.
              </p>
            )}

            {/* Delete */}
            <div className="border-t-2 border-ink/10 pt-6 mt-4">
              <button
                onClick={handleDelete}
                className="font-archivo text-sm text-red hover:text-red-deep underline transition-colors"
              >
                Delete this entry
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}

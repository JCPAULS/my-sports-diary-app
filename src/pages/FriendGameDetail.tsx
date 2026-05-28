import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import Nav from '@/components/Nav'
import AvatarCircle from '@/components/AvatarCircle'
import PhotoImg from '@/components/PhotoImg'
import TeamBadge from '@/components/TeamBadge'
import { useToast } from '@/components/Toast'
import { getFriendGameById, isActiveHighlight, type FeedItem } from '@/lib/feedStore'

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default function FriendGameDetail() {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [item, setItem] = useState<FeedItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (!gameId) { navigate('/feed'); return }
    getFriendGameById(gameId)
      .then((found) => {
        if (!found) {
          toast('Game not available', 'error')
          navigate('/feed')
          return
        }
        setItem(found)
      })
      .catch(() => {
        toast('Game not available', 'error')
        navigate('/feed')
      })
      .finally(() => setLoading(false))
  }, [gameId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-8 h-8 border-[3px] border-ink/15 border-t-ink rounded-full" style={{ animation: 'spin 0.65s linear infinite' }} />
        </div>
      </div>
    )
  }

  if (!item) return null

  const { game, owner, isAnniversary, anniversaryYears } = item
  const activeHighlight = isActiveHighlight(game)
  const hasScore = game.homeScore !== undefined && game.awayScore !== undefined
  const hasLittleThings = !!(game.whatYouWore || game.whatYouAte || game.whoDrove || game.pregameRitual || game.outfitPhoto)

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
          >✕</button>
          <PhotoImg
            src={lightboxPhoto}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain border-2 border-white/20"
          />
        </div>
      )}

      {/* Highlight sash */}
      {(activeHighlight || isAnniversary) && (
        <div className="bg-gold/20 border-b-2 border-gold/40 px-4 py-2 text-center">
          <p className="font-bebas text-sm tracking-[0.15em] text-ink/70">
            {isAnniversary
              ? `📅 ${anniversaryYears} YEAR${anniversaryYears !== 1 ? 'S' : ''} AGO TODAY`
              : `⭐ ${owner.displayName ?? 'Your friend'} marked this a highlight`}
          </p>
        </div>
      )}

      <header className="bg-hero-blue border-b-4 border-ink">
        <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 flex items-center gap-4">
          <Link to="/feed" className="font-bebas text-xl tracking-wider text-ink hover:text-red transition-colors">
            ← Feed
          </Link>
          <div className="flex-1 flex items-center gap-3">
            <AvatarCircle photoUrl={owner.profilePhotoUrl} name={owner.displayName} size="sm" />
            <p className="font-caveat text-xl text-navy leading-tight">
              {owner.displayName ?? owner.username ?? 'Your friend'} was here
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
        <div className="lg:grid lg:grid-cols-5 lg:gap-10 lg:items-start">

          {/* ── LEFT: Ticket stub ── */}
          <div className="lg:col-span-2 mb-8 lg:mb-0">
            <div className={`bg-paper-deep border-2 border-ink ${activeHighlight || isAnniversary ? 'shadow-[6px_6px_0_var(--color-gold)]' : 'card-stamp'}`}>
              <div className="p-6">
                {game.nickname && (
                  <p className="font-caveat text-xl text-navy mb-2 leading-tight">{game.nickname}</p>
                )}
                {game.scheduleLabel && (
                  <p className="font-bebas text-sm tracking-[0.2em] text-ink/40 mb-1">{game.scheduleLabel}</p>
                )}
                {game.date && (
                  <p className="font-bebas text-xs tracking-[0.15em] text-ink/30 mb-2">{formatDate(game.date)}</p>
                )}
                <h1 className="font-bebas text-5xl lg:text-6xl leading-none text-ink">{game.homeTeam}</h1>
                <p className="font-bebas text-2xl lg:text-3xl text-ink/50 mt-1">vs {game.awayTeam}</p>
                {hasScore ? (
                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <TeamBadge team={game.homeTeam} sportId={game.sportId} size="lg" />
                    <div className="bg-ink text-gold font-bebas text-3xl tracking-widest px-4 py-2">
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
                  game.section ? `SECTION ${game.section}` : null,
                  game.row ? `ROW ${game.row}` : null,
                  game.seatNumbers ? `SEATS ${game.seatNumbers}` : null,
                ].filter(Boolean)
                return (
                  <>
                    <div className="border-t-2 border-dashed border-ink/30 mx-6" />
                    <div className="px-6 py-3">
                      <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-0.5">Seats</p>
                      <p className="font-bebas text-base text-ink tracking-[0.05em]">{parts.join(' · ')}</p>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>

          {/* ── RIGHT: Diary content ── */}
          <div className="lg:col-span-3">
            <div className="hidden lg:flex items-center gap-3 mb-6">
              <div className="font-bebas text-xs tracking-[0.25em] text-ink/30">DIARY ENTRY</div>
              <div className="flex-1 border-t-2 border-dashed border-ink/20" />
            </div>

            {/* Photos */}
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
                      <PhotoImg src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes & vibe */}
            {(game.notes || game.vibe || game.mvp) && (
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
                {game.notes && (
                  <div className="border-l-4 border-navy pl-4">
                    <p className="font-caveat text-xl text-navy leading-relaxed">{game.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Who was there */}
            {game.whoWasThere && (
              <div className="py-3 border-b-2 border-ink/10">
                <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-1">WHO WAS THERE</p>
                {game.attendees && game.attendees.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {game.attendees.map((name) => (
                      <span key={name} className="font-archivo text-sm bg-paper border border-ink/20 px-2.5 py-1 rounded-sm">
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="font-archivo text-base text-ink">{game.whoWasThere}</p>
                )}
              </div>
            )}

            {/* Little things */}
            {hasLittleThings && (
              <div className="py-3 border-b-2 border-ink/10">
                <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-3">THE LITTLE THINGS</p>
                <div className="flex flex-col gap-2">
                  {game.whatYouWore && (
                    <div className="leading-snug">
                      <span className="font-bebas text-xs tracking-[0.15em] text-ink/40">WORE — </span>
                      <span className="font-caveat text-lg text-navy">{game.whatYouWore}</span>
                    </div>
                  )}
                  {game.whatYouAte && (
                    <div className="leading-snug">
                      <span className="font-bebas text-xs tracking-[0.15em] text-ink/40">ATE — </span>
                      <span className="font-caveat text-lg text-navy">{game.whatYouAte}</span>
                    </div>
                  )}
                  {game.whoDrove && (
                    <div className="leading-snug">
                      <span className="font-bebas text-xs tracking-[0.15em] text-ink/40">DROVE — </span>
                      <span className="font-caveat text-lg text-navy">{game.whoDrove}</span>
                    </div>
                  )}
                  {game.pregameRitual && (
                    <div className="leading-snug">
                      <span className="font-bebas text-xs tracking-[0.15em] text-ink/40">PREGAME — </span>
                      <span className="font-caveat text-lg text-navy">{game.pregameRitual}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

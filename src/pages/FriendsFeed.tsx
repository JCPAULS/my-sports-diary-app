import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '@/components/Nav'
import AvatarCircle from '@/components/AvatarCircle'
import PhotoImg from '@/components/PhotoImg'
import TeamBadge from '@/components/TeamBadge'
import {
  getFriendsFeed,
  isActiveHighlight,
  FEED_PAGE_SIZE,
  type FeedItem,
} from '@/lib/feedStore'
import type { Game } from '@/types/Game'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function matchupLine(game: Game): string {
  const parts: string[] = []
  if (game.homeTeam && game.awayTeam) parts.push(`${game.homeTeam} vs ${game.awayTeam}`)
  if (game.date) {
    const [y, m, d] = game.date.split('-').map(Number)
    parts.push(new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))
  }
  if (game.venue) parts.push(game.venue)
  return parts.join(' · ')
}

const MAX_HIGHLIGHTS = 3

// ─── FeedCard ─────────────────────────────────────────────────────────────────

function FeedCard({ item, isHighlightSection = false }: { item: FeedItem; isHighlightSection?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const { game, owner, isAnniversary, anniversaryYears } = item
  const activeHighlight = isActiveHighlight(game)
  const isFeatured = activeHighlight || isAnniversary
  const coverPhoto = game.photos?.[0]

  const highlightReason = isAnniversary
    ? `📅 ${anniversaryYears} YEAR${anniversaryYears !== 1 ? 'S' : ''} AGO TODAY`
    : `⭐ ${owner.displayName ?? 'Your friend'} marked this a highlight`

  return (
    <article
      className={`border-2 border-ink bg-paper transition-all ${
        isFeatured
          ? 'shadow-[6px_6px_0_var(--color-gold)] border-gold/60'
          : 'shadow-[4px_4px_0_#000]'
      } ${isHighlightSection ? '' : ''}`}
    >
      {/* Highlight badge */}
      {isFeatured && (
        <div className="bg-gold/25 border-b border-gold/30 px-4 py-1.5 flex items-center gap-2">
          <span className="font-bebas text-xs tracking-[0.2em] text-ink/70">{highlightReason}</span>
        </div>
      )}

      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 pt-4 pb-3"
      >
        {/* Owner row */}
        <div className="flex items-center gap-2 mb-2">
          <AvatarCircle photoUrl={owner.profilePhotoUrl} name={owner.displayName} size="sm" className="flex-shrink-0" />
          <Link
            to={`/user/${owner.userId}`}
            onClick={(e) => e.stopPropagation()}
            className="font-bebas text-sm tracking-[0.1em] text-ink hover:text-red transition-colors"
          >
            {owner.displayName ?? owner.username ?? 'Friend'}
          </Link>
          <span className="font-archivo text-xs text-ink/30 ml-auto flex-shrink-0">{timeAgo(game.createdAt)}</span>
        </div>

        {/* Main content row */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Big line: nickname or matchup */}
            <p className="font-caveat text-2xl text-navy leading-tight mb-1 line-clamp-2">
              {game.nickname || `${game.homeTeam} vs ${game.awayTeam}`}
            </p>
            {/* Meta line */}
            <p className="font-bebas text-xs tracking-[0.1em] text-ink/40 leading-snug truncate">
              {matchupLine(game)}
            </p>
            {/* Expand hint */}
            {!expanded && (
              <p className="font-bebas text-[10px] tracking-[0.2em] text-ink/20 mt-2">
                TAP TO EXPAND
              </p>
            )}
          </div>
          {/* Cover photo thumbnail */}
          {coverPhoto && (
            <div className="flex-shrink-0 w-16 h-16 border-2 border-ink shadow-[2px_2px_0_#000] overflow-hidden">
              <PhotoImg src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t-2 border-ink/10 px-4 pb-4 pt-3 flex flex-col gap-4">

          {/* Score chips */}
          {game.homeScore !== undefined && game.awayScore !== undefined && (
            <div className="flex items-center gap-3 flex-wrap">
              <TeamBadge team={game.homeTeam} sportId={game.sportId} size="sm" />
              <div className="bg-ink text-gold font-bebas text-xl tracking-widest px-3 py-1">
                {game.homeScore} – {game.awayScore}
              </div>
              <TeamBadge team={game.awayTeam} sportId={game.sportId} size="sm" />
            </div>
          )}

          {/* Photos carousel */}
          {game.photos && game.photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {game.photos.map((photo, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-24 h-24 border-2 border-ink shadow-[2px_2px_0_#000] overflow-hidden"
                >
                  <PhotoImg src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Vibe + MVP */}
          {(game.vibe || game.mvp) && (
            <div className="flex flex-wrap gap-2">
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

          {/* Notes */}
          {game.notes && (
            <div className="border-l-4 border-navy pl-3">
              <p className="font-caveat text-xl text-navy leading-relaxed">{game.notes}</p>
            </div>
          )}

          {/* Who was there */}
          {game.attendees && game.attendees.length > 0 && (
            <div>
              <p className="font-bebas text-[10px] tracking-[0.2em] text-ink/40 mb-1.5">WHO WAS THERE</p>
              <div className="flex flex-wrap gap-1.5">
                {game.attendees.map((name) => (
                  <span key={name} className="font-archivo text-sm bg-paper-deep border border-ink/20 px-2 py-0.5 rounded-sm">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Little things */}
          {(game.whatYouWore || game.whatYouAte || game.whoDrove || game.pregameRitual) && (
            <div>
              <p className="font-bebas text-[10px] tracking-[0.2em] text-ink/40 mb-1.5">THE LITTLE THINGS</p>
              <div className="flex flex-col gap-1">
                {game.whatYouWore && (
                  <p className="font-caveat text-base text-navy">
                    <span className="font-bebas text-[10px] tracking-[0.15em] text-ink/30">WORE </span>
                    {game.whatYouWore}
                  </p>
                )}
                {game.whatYouAte && (
                  <p className="font-caveat text-base text-navy">
                    <span className="font-bebas text-[10px] tracking-[0.15em] text-ink/30">ATE </span>
                    {game.whatYouAte}
                  </p>
                )}
                {game.whoDrove && (
                  <p className="font-caveat text-base text-navy">
                    <span className="font-bebas text-[10px] tracking-[0.15em] text-ink/30">DROVE </span>
                    {game.whoDrove}
                  </p>
                )}
                {game.pregameRitual && (
                  <p className="font-caveat text-base text-navy">
                    <span className="font-bebas text-[10px] tracking-[0.15em] text-ink/30">PREGAME </span>
                    {game.pregameRitual}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer: collapse + view full */}
          <div className="flex items-center justify-between pt-1 border-t border-ink/10">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="font-bebas text-xs tracking-[0.15em] text-ink/40 hover:text-ink transition-colors"
            >
              ▲ COLLAPSE
            </button>
            <Link
              to={`/feed/${game.id}`}
              className="font-bebas text-xs tracking-[0.15em] text-navy hover:text-red transition-colors underline"
            >
              VIEW FULL ENTRY →
            </Link>
          </div>
        </div>
      )}
    </article>
  )
}

// ─── Highlights strip ─────────────────────────────────────────────────────────

function HighlightStrip({ items }: { items: FeedItem[] }) {
  if (items.length === 0) return null
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-bebas text-xl tracking-[0.2em] text-ink flex-shrink-0">HIGHLIGHTS</h2>
        <div className="flex-1 h-[2px] bg-gold/50" />
      </div>
      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <FeedCard key={`hl-${item.game.id}`} item={item} isHighlightSection />
        ))}
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FriendsFeed() {
  const [items, setItems] = useState<FeedItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [friendCount, setFriendCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadedOnce = useRef(false)

  const loadPage = useCallback(async (pageNum: number, replace = false) => {
    if (pageNum === 0) setLoading(true); else setLoadingMore(true)
    setError(null)
    try {
      const result = await getFriendsFeed(pageNum)
      setItems((prev) => replace ? result.items : [...prev, ...result.items])
      setHasMore(result.hasMore)
      setFriendCount(result.friendCount)
      setPage(pageNum)
    } catch {
      setError('Could not load the feed — check your connection and try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (loadedOnce.current) return
    loadedOnce.current = true
    loadPage(0, true)
  }, [loadPage])

  // Partition into highlights (capped at MAX_HIGHLIGHTS) and regular feed
  const highlightItems = items
    .filter((i) => isActiveHighlight(i.game) || i.isAnniversary)
    .slice(0, MAX_HIGHLIGHTS)
  const highlightIds = new Set(highlightItems.map((i) => i.game.id))

  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      <header className="bg-hero-blue border-b-4 border-ink">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8">
          <h1 className="font-bebas text-6xl text-ink tracking-wide leading-none">FEED</h1>
          <p className="font-caveat text-xl text-navy mt-1">Games your friends have been to.</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 lg:px-8 py-8">

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-ink/15 border-t-ink rounded-full" style={{ animation: 'spin 0.65s linear infinite' }} />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="border-2 border-red bg-paper-deep p-6 text-center">
            <p className="font-bebas text-lg text-red mb-3">{error}</p>
            <button
              type="button"
              onClick={() => loadPage(0, true)}
              className="font-bebas text-sm tracking-[0.15em] border-2 border-ink px-4 py-2 hover:bg-paper-deep transition-colors"
            >
              TRY AGAIN
            </button>
          </div>
        )}

        {/* Empty states */}
        {!loading && !error && friendCount === 0 && (
          <div className="border-2 border-ink/20 bg-paper-deep p-8 text-center">
            <p className="font-bebas text-2xl text-ink/40 mb-2">NO FRIENDS YET</p>
            <p className="font-caveat text-lg text-ink/50 mb-5">
              Add friends to see their games here.
            </p>
            <Link
              to="/friends"
              className="font-bebas text-sm tracking-[0.15em] bg-red text-white border-2 border-ink px-5 py-2.5 btn-press inline-block"
            >
              FIND FRIENDS
            </Link>
          </div>
        )}

        {!loading && !error && friendCount > 0 && items.length === 0 && (
          <div className="border-2 border-ink/20 bg-paper-deep p-8 text-center">
            <p className="font-bebas text-2xl text-ink/40 mb-2">NOTHING HERE YET</p>
            <p className="font-caveat text-lg text-ink/50">
              Your friends haven't logged any games yet. Once they do, you'll see them here.
            </p>
          </div>
        )}

        {/* Highlights section */}
        {!loading && highlightItems.length > 0 && (
          <HighlightStrip items={highlightItems} />
        )}

        {/* Chronological feed */}
        {!loading && items.length > 0 && (
          <>
            {highlightIds.size > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-bebas text-xl tracking-[0.2em] text-ink flex-shrink-0">RECENT</h2>
                <div className="flex-1 h-[2px] bg-ink" />
              </div>
            )}
            <div className="flex flex-col gap-5">
              {items.map((item) => (
                <FeedCard key={item.game.id} item={item} />
              ))}
            </div>
          </>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => loadPage(page + 1)}
              disabled={loadingMore}
              className="font-bebas text-lg tracking-[0.15em] border-2 border-ink px-8 py-3 bg-paper hover:bg-paper-deep transition-colors disabled:opacity-40"
            >
              {loadingMore ? 'LOADING…' : `LOAD ${FEED_PAGE_SIZE} MORE`}
            </button>
          </div>
        )}

      </main>
    </div>
  )
}

// IWasTherePanel — the "I WAS THERE TOO!" linking feature + "Also Logged By" section.
//
// canLink=true:  Shows the "I WAS THERE TOO!" button (only on friend game pages).
// canLink=false: Shows only the "ALSO LOGGED BY" list (used on own game pages).
//
// When linking:
// 1. Load user's own matching games (same date + sport + venue or home team).
// 2. If 1 match: link immediately.
// 3. If multiple matches: show a picker.
// 4. If no match: offer to browse own diary (link to timeline with date filter).

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  findMatchingGames,
  createAttendanceLink,
  removeAttendanceLink,
  getAttendanceLinks,
  getExistingLink,
  type AttendanceLinkEntry,
} from '@/lib/engagementStore'
import type { Game } from '@/types/Game'
import { avatarInitials } from '@/lib/profileUtils'

function MiniAvatar({ url, name }: { url?: string | null; name?: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? ''}
        className="w-6 h-6 rounded-full border border-ink object-cover flex-shrink-0"
      />
    )
  }
  return (
    <div className="w-6 h-6 rounded-full border border-ink bg-paper-deep flex items-center justify-center flex-shrink-0">
      <span className="font-bebas text-[8px] text-ink/40 leading-none">{avatarInitials(name)}</span>
    </div>
  )
}

interface Props {
  game: Game            // the game being viewed (friend's or own)
  gameOwnerId: string   // userId of game owner
  myUserId?: string     // current user (undefined if not logged in)
  canLink?: boolean     // true on friend game pages, false on own game page
}

type LinkState = 'idle' | 'searching' | 'picking' | 'linked' | 'noMatch'

export default function IWasTherePanel({ game, gameOwnerId, myUserId, canLink = false }: Props) {
  const [linkState, setLinkState] = useState<LinkState>('idle')
  const [matchingGames, setMatchingGames] = useState<Game[]>([])
  const [links, setLinks] = useState<AttendanceLinkEntry[]>([])
  const [myLinkId, setMyLinkId] = useState<string | null>(null) // ID of link created by me
  const [justLinked, setJustLinked] = useState(false)
  const [linking, setLinking] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Load existing attendance links for this game
  useEffect(() => {
    if (!game.id) return
    getAttendanceLinks(game.id).then(setLinks).catch(() => {})
  }, [game.id])

  // If canLink: check whether the current user already has a link to this game
  useEffect(() => {
    if (!canLink || !myUserId || !game.id) return
    // Find any link entry where linked game is owned by me (or I'm the linker)
    const mine = links.find((l) => l.isLinkedByMe)
    setMyLinkId(mine?.id ?? null)
  }, [links, canLink, myUserId, game.id])

  async function handleIWasThereClick() {
    if (!myUserId || !game.date) return
    setLinkState('searching')
    try {
      const matches = await findMatchingGames(game)
      if (matches.length === 0) {
        setLinkState('noMatch')
        return
      }
      if (matches.length === 1) {
        await doLink(matches[0])
      } else {
        setMatchingGames(matches)
        setLinkState('picking')
      }
    } catch {
      setLinkState('idle')
    }
  }

  async function doLink(myGame: Game) {
    if (!myUserId || linking) return
    setLinking(true)
    try {
      // Check for existing link first
      const existingId = await getExistingLink(myGame.id, game.id)
      if (existingId) {
        setMyLinkId(existingId)
        setJustLinked(true)
        setLinkState('linked')
        // Refresh links list
        getAttendanceLinks(game.id).then(setLinks).catch(() => {})
        return
      }

      const linkId = await createAttendanceLink(myGame.id, game.id, gameOwnerId)
      setMyLinkId(linkId)
      setJustLinked(true)
      setLinkState('linked')
      getAttendanceLinks(game.id).then(setLinks).catch(() => {})
    } catch {
      setLinkState('idle')
    } finally {
      setLinking(false)
    }
  }

  async function handleRemoveLink(linkId: string) {
    setRemovingId(linkId)
    try {
      await removeAttendanceLink(linkId)
      setLinks((prev) => prev.filter((l) => l.id !== linkId))
      if (linkId === myLinkId) {
        setMyLinkId(null)
        setJustLinked(false)
        setLinkState('idle')
      }
    } catch {
      // silent — RLS rejects unauthorized deletions
    } finally {
      setRemovingId(null)
    }
  }

  const alreadyLinkedByMe = !!myLinkId || linkState === 'linked'

  return (
    <div>
      {/* ── "I WAS THERE TOO!" button section ── */}
      {canLink && myUserId && gameOwnerId !== myUserId && !game.tagInfo && (
        <div className="mb-5">
          {!alreadyLinkedByMe && linkState !== 'noMatch' && linkState !== 'picking' && (
            <button
              type="button"
              onClick={handleIWasThereClick}
              disabled={linkState === 'searching' || linking}
              className={`group w-full flex items-center justify-center gap-3 border-2 border-ink py-4 px-5 transition-all font-bebas text-base tracking-[0.15em] ${
                linkState === 'idle'
                  ? 'bg-paper hover:bg-hero-blue hover:shadow-[3px_3px_0_var(--color-gold)] hover:border-gold hover:text-ink'
                  : 'bg-paper-deep opacity-60 cursor-wait'
              }`}
            >
              <span className="text-2xl group-hover:scale-125 transition-transform">🤝</span>
              {linkState === 'searching' ? 'CHECKING YOUR DIARY…' : 'I WAS THERE TOO!'}
            </button>
          )}

          {linkState === 'noMatch' && !alreadyLinkedByMe && (
            <div className="border-2 border-ink/20 bg-paper-deep px-4 py-3 text-center">
              <p className="font-bebas text-sm tracking-[0.15em] text-ink/60 mb-1">
                NO MATCHING GAME FOUND IN YOUR DIARY
              </p>
              <p className="font-caveat text-sm text-ink/40 mb-2">
                Add this game to your diary first, then come back to link entries.
              </p>
              <Link
                to="/add"
                className="font-bebas text-xs tracking-[0.15em] text-navy underline hover:text-red transition-colors"
              >
                + ADD GAME →
              </Link>
            </div>
          )}

          {linkState === 'picking' && (
            <div className="border-2 border-ink bg-paper shadow-[3px_3px_0_#000]">
              <div className="bg-ink px-4 py-2">
                <p className="font-bebas text-xs tracking-[0.2em] text-gold">WHICH GAME IN YOUR DIARY?</p>
              </div>
              <div className="divide-y-2 divide-ink/10">
                {matchingGames.map((mg) => (
                  <button
                    key={mg.id}
                    type="button"
                    onClick={() => doLink(mg)}
                    disabled={linking}
                    className="w-full text-left px-4 py-3 hover:bg-paper-deep transition-colors disabled:opacity-40"
                  >
                    <p className="font-bebas text-sm text-ink leading-tight">
                      {mg.homeTeam} vs {mg.awayTeam}
                    </p>
                    <p className="font-archivo text-xs text-ink/50">
                      {mg.date}{mg.venue ? ` · ${mg.venue}` : ''}
                    </p>
                  </button>
                ))}
              </div>
              <div className="px-4 py-2 border-t-2 border-ink/10">
                <button
                  type="button"
                  onClick={() => setLinkState('idle')}
                  className="font-bebas text-xs tracking-[0.15em] text-ink/40 hover:text-ink transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {(alreadyLinkedByMe || justLinked) && (
            <div className={`border-2 border-gold bg-gold/10 px-4 py-3 flex items-center gap-3 ${justLinked ? 'animate-fade-slide-up' : ''}`}>
              <span className="text-xl flex-shrink-0">🤝</span>
              <div className="flex-1">
                <p className="font-bebas text-sm tracking-[0.15em] text-ink">YOU'RE BOTH ON THE BOOKS</p>
                <p className="font-caveat text-sm text-ink/50 leading-tight">
                  Your diary entries are now linked for this game.
                </p>
              </div>
              {myLinkId && (
                <button
                  type="button"
                  onClick={() => handleRemoveLink(myLinkId)}
                  disabled={removingId === myLinkId}
                  className="font-bebas text-[10px] tracking-[0.15em] text-ink/30 hover:text-red underline transition-colors flex-shrink-0"
                >
                  {removingId === myLinkId ? '…' : 'REMOVE'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── "Also Logged By" section ── */}
      {links.length > 0 && (
        <div className="border-2 border-ink/20 bg-paper-deep">
          <div className="px-4 py-2 border-b border-ink/10">
            <p className="font-bebas text-[10px] tracking-[0.25em] text-ink/50">
              ALSO AT THIS GAME
            </p>
          </div>
          <div className="divide-y divide-ink/10">
            {links.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                <MiniAvatar url={l.linkedGameOwnerAvatarUrl} name={l.linkedGameOwnerDisplayName} />
                <span className="font-bebas text-sm text-ink flex-1 min-w-0 truncate">
                  {l.linkedGameOwnerDisplayName ?? 'Someone'}
                </span>
                <Link
                  to={`/game/${l.linkedGameId}`}
                  className="font-bebas text-[10px] tracking-[0.15em] text-navy hover:text-red underline transition-colors flex-shrink-0"
                >
                  VIEW ENTRY →
                </Link>
                {l.isLinkedByMe && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(l.id)}
                    disabled={removingId === l.id}
                    className="font-bebas text-[9px] tracking-[0.1em] text-ink/25 hover:text-red transition-colors flex-shrink-0 ml-1"
                    title="Remove this connection"
                  >
                    {removingId === l.id ? '…' : '×'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

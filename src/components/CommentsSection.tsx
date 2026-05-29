// CommentsSection — comment list + input for friend game detail pages.
// Shows 3 comments collapsed; expands to full list.
// RLS enforces delete rights server-side; we also check client-side.

import { useEffect, useRef, useState } from 'react'
import {
  getCommentsWithProfiles,
  submitComment,
  removeComment,
  type CommentWithProfile,
} from '@/lib/engagementStore'
import { checkRateLimit, consumeRateLimit } from '@/lib/rateLimit'
import { commentPassesContentCheck } from '@/lib/contentFilter'
import { avatarInitials } from '@/lib/profileUtils'

const INITIAL_SHOW = 3

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'Yesterday' : `${days}d ago`
}

function SmallAvatar({ url, name }: { url?: string | null; name?: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? ''}
        className="w-7 h-7 rounded-full border border-ink object-cover flex-shrink-0"
      />
    )
  }
  return (
    <div className="w-7 h-7 rounded-full border border-ink bg-paper-deep flex items-center justify-center flex-shrink-0">
      <span className="font-bebas text-[9px] text-ink/40 leading-none">{avatarInitials(name)}</span>
    </div>
  )
}

interface Props {
  gameId: string
  gameOwnerId: string
  myUserId?: string
  myDisplayName?: string | null
  myAvatarUrl?: string | null
}

export default function CommentsSection({ gameId, gameOwnerId, myUserId, myDisplayName, myAvatarUrl }: Props) {
  const [comments, setComments] = useState<CommentWithProfile[]>([])
  const [expanded, setExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    getCommentsWithProfiles(gameId)
      .then((cs) => { if (!cancelled) setComments(cs) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [gameId])

  const visible = expanded ? comments : comments.slice(0, INITIAL_SHOW)
  const hidden = comments.length - INITIAL_SHOW

  async function handleSubmit() {
    const content = input.trim()
    if (!content || submitting || !myUserId) return
    if (content.length > 500) { setError('Comment must be 500 characters or fewer.'); return }
    if (!commentPassesContentCheck(content)) { setError('Comment contains disallowed content.'); return }
    if (!checkRateLimit('comment')) { setError('You\'ve posted too many comments today. Try again tomorrow.'); return }
    setError(null)
    setSubmitting(true)
    setInput('')
    try {
      consumeRateLimit('comment')
      const newComment = await submitComment(gameId, content, gameOwnerId)
      setComments((prev) => [...prev, newComment])
      setExpanded(true)
    } catch {
      setError('Could not post comment. Try again.')
      setInput(content)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await removeComment(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch {
      // silent — RLS rejects unauthorized deletes
    }
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-3">
        <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 flex-shrink-0">
          COMMENTS{comments.length > 0 ? ` (${comments.length})` : ''}
        </p>
        <div className="flex-1 border-t border-ink/10" />
      </div>

      {/* Comment list */}
      {comments.length === 0 && (
        <p className="font-caveat text-base text-ink/30 mb-3">Be the first to comment.</p>
      )}

      {visible.length > 0 && (
        <div className="flex flex-col gap-3 mb-3">
          {visible.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <SmallAvatar url={c.avatarUrl} name={c.displayName ?? c.username} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-bebas text-xs tracking-[0.1em] text-ink">
                    {c.displayName ?? c.username ?? 'Someone'}
                  </span>
                  <span className="font-archivo text-[10px] text-ink/30">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="font-archivo text-sm text-ink leading-snug mt-0.5">{c.content}</p>
              </div>
              {(c.canDelete || c.userId === gameOwnerId || myUserId === gameOwnerId) && (
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="text-ink/20 hover:text-red transition-colors font-bebas text-lg leading-none flex-shrink-0 pt-0.5"
                  aria-label="Delete comment"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Show more / collapse */}
      {!expanded && hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="font-bebas text-xs tracking-[0.15em] text-navy hover:text-red underline transition-colors mb-3"
        >
          VIEW {hidden} MORE COMMENT{hidden !== 1 ? 'S' : ''}
        </button>
      )}
      {expanded && comments.length > INITIAL_SHOW && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="font-bebas text-xs tracking-[0.15em] text-ink/30 hover:text-ink transition-colors mb-3"
        >
          ▲ SHOW FEWER
        </button>
      )}

      {/* Input */}
      {myUserId && (
        <div className="flex items-center gap-2 mt-1">
          <SmallAvatar url={myAvatarUrl} name={myDisplayName} />
          <div className="flex-1 flex items-center border-2 border-ink focus-within:border-red transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value.slice(0, 500)); setError(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              placeholder="Add a comment…"
              disabled={submitting}
              className="flex-1 bg-transparent px-3 py-2 font-archivo text-sm text-ink placeholder-ink/30 outline-none"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!input.trim() || submitting}
              className="font-bebas text-xs tracking-[0.15em] text-white bg-red px-3 py-2 disabled:opacity-30 transition-opacity flex-shrink-0 self-stretch flex items-center"
            >
              {submitting ? '…' : 'POST'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="font-caveat text-sm text-red mt-1">{error}</p>
      )}

      {/* Char count */}
      {input.length > 450 && (
        <p className={`font-bebas text-[10px] tracking-[0.15em] mt-0.5 ${input.length >= 500 ? 'text-red' : 'text-ink/40'}`}>
          {500 - input.length} chars remaining
        </p>
      )}
    </div>
  )
}

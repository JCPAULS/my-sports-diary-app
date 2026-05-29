// NotificationsInbox — Notification panel opened from the bell icon in Nav.
// Marks all as read on open. Supports pagination via "Show More".
// Fixed-position: full-width on mobile, 384px dropdown on desktop.

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getNotifications,
  markAllRead,
  markOneRead,
  formatTimeAgo,
  type RichNotification,
} from '@/lib/notificationsStore'
import { avatarInitials } from '@/lib/profileUtils'

interface Props {
  onClose: () => void
  onCountRefresh: () => void
}

function NotifAvatar({ url, name, emoji }: { url?: string | null; name?: string | null; emoji: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? ''}
        className="w-9 h-9 rounded-full border-2 border-ink object-cover flex-shrink-0"
      />
    )
  }
  if (name) {
    return (
      <div className="w-9 h-9 rounded-full border-2 border-ink bg-paper-deep flex items-center justify-center flex-shrink-0">
        <span className="font-bebas text-xs text-ink leading-none">{avatarInitials(name)}</span>
      </div>
    )
  }
  // System notification (anniversary, milestone) — show emoji
  return (
    <div className="w-9 h-9 rounded-full border-2 border-ink bg-paper flex items-center justify-center flex-shrink-0 text-base">
      {emoji}
    </div>
  )
}

function NotifItem({ n, onClick }: { n: RichNotification; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-paper-deep transition-colors border-b border-ink/10 last:border-b-0 ${
        !n.read ? 'bg-gold/5' : ''
      }`}
    >
      <NotifAvatar url={n.actorAvatarUrl} name={n.actorDisplayName} emoji={n.emoji} />
      <div className="flex-1 min-w-0">
        <p className="font-archivo text-sm text-ink leading-snug">
          {!n.read && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red mr-1.5 mb-0.5 flex-shrink-0 align-middle" />
          )}
          {n.text}
        </p>
        <p className="font-bebas text-[10px] tracking-[0.1em] text-ink/35 mt-0.5">
          {formatTimeAgo(n.createdAt)}
        </p>
      </div>
    </button>
  )
}

export default function NotificationsInbox({ onClose, onCountRefresh }: Props) {
  const navigate = useNavigate()
  const [items, setItems] = useState<RichNotification[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [markedRead, setMarkedRead] = useState(false)

  const load = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum > 0) setLoadingMore(true)
    else setLoading(true)
    try {
      const result = await getNotifications(pageNum)
      setItems((prev) => append ? [...prev, ...result.items] : result.items)
      setHasMore(result.hasMore)
      setPage(pageNum)
    } catch {
      // network error — show what we have
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Load page 0 on mount, then mark all as read
  useEffect(() => {
    load(0, false).then(async () => {
      if (!markedRead) {
        await markAllRead().catch(() => {})
        setMarkedRead(true)
        onCountRefresh()
        // Update local items to show as read
        setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleItemClick(n: RichNotification) {
    if (!n.read) {
      await markOneRead(n.id).catch(() => {})
    }
    onClose()
    navigate(n.destination)
  }

  async function handleMarkAllRead() {
    await markAllRead().catch(() => {})
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    onCountRefresh()
  }

  const hasUnread = items.some((n) => !n.read)

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed z-50 bg-paper border-2 border-ink shadow-[4px_4px_0_#000] flex flex-col
          inset-x-0 top-[49px] max-h-[calc(100vh-49px)]
          lg:inset-x-auto lg:right-14 lg:w-96 lg:top-[52px] lg:max-h-[80vh]"
        role="dialog"
        aria-label="Notifications"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-ink flex-shrink-0">
          <h2 className="font-bebas text-lg tracking-[0.2em] text-ink">NOTIFICATIONS</h2>
          <div className="flex items-center gap-3">
            {hasUnread && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="font-bebas text-[10px] tracking-[0.1em] text-ink/40 hover:text-ink transition-colors underline"
              >
                MARK ALL READ
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="font-bebas text-xl text-ink/40 hover:text-ink transition-colors leading-none"
              aria-label="Close notifications"
            >
              ✕
            </button>
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="w-6 h-6 border-[3px] border-ink/15 border-t-ink rounded-full"
                style={{ animation: 'spin 0.65s linear infinite' }}
              />
            </div>
          ) : items.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-3xl mb-3">🔔</p>
              <p className="font-bebas text-base tracking-[0.15em] text-ink/50 mb-1">ALL CAUGHT UP</p>
              <p className="font-caveat text-sm text-ink/35 leading-snug">
                Notifications about friends, tags, and milestones will appear here.
              </p>
            </div>
          ) : (
            <>
              {items.map((n) => (
                <NotifItem key={n.id} n={n} onClick={() => handleItemClick(n)} />
              ))}

              {hasMore && (
                <div className="px-4 py-3 border-t border-ink/10">
                  <button
                    type="button"
                    onClick={() => load(page + 1, true)}
                    disabled={loadingMore}
                    className="w-full font-bebas text-xs tracking-[0.15em] text-ink/50 hover:text-ink transition-colors disabled:opacity-40"
                  >
                    {loadingMore ? 'LOADING…' : 'SHOW MORE'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

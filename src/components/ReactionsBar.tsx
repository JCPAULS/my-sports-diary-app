// ReactionsBar — emoji reactions used on feed cards and friend game detail pages.
//
// compact=true  → shows only existing reaction clusters (collapsed feed card view).
// compact=false → adds a "+" picker button (expanded / detail view).
//
// Optimistic updates: clicking instantly changes local state; API confirms async.

import { useEffect, useRef, useState } from 'react'
import {
  getReactionGroups,
  toggleReaction,
  REACTION_EMOJIS,
  type ReactionGroup,
} from '@/lib/engagementStore'

interface Props {
  gameId: string
  gameOwnerId: string
  compact?: boolean
  className?: string
}

export default function ReactionsBar({ gameId, gameOwnerId, compact = false, className = '' }: Props) {
  const [groups, setGroups] = useState<ReactionGroup[]>([])
  const [loaded, setLoaded] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tooltipEmoji, setTooltipEmoji] = useState<string | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    getReactionGroups(gameId)
      .then((gs) => { if (!cancelled) { setGroups(gs); setLoaded(true) } })
      .catch(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [gameId])

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  async function handleToggle(emoji: string) {
    // Optimistic update
    setGroups((prev) => {
      const existing = prev.find((g) => g.emoji === emoji)
      if (existing) {
        if (existing.isMine) {
          const next = { ...existing, count: existing.count - 1, isMine: false }
          return next.count === 0
            ? prev.filter((g) => g.emoji !== emoji)
            : prev.map((g) => (g.emoji === emoji ? next : g))
        }
        return prev.map((g) =>
          g.emoji === emoji ? { ...g, count: g.count + 1, isMine: true } : g,
        )
      }
      // New emoji: insert in fixed order
      const newGroup: ReactionGroup = { emoji, count: 1, isMine: true, displayNames: [] }
      const order = REACTION_EMOJIS
      const all = [...prev, newGroup].sort(
        (a, b) => order.indexOf(a.emoji as typeof order[number]) - order.indexOf(b.emoji as typeof order[number]),
      )
      return all
    })
    setPickerOpen(false)

    try {
      await toggleReaction(gameId, emoji, gameOwnerId)
    } catch {
      // Revert on error by re-fetching
      getReactionGroups(gameId).then(setGroups).catch(() => {})
    }
  }

  function showTooltip(emoji: string) {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    setTooltipEmoji(emoji)
    tooltipTimerRef.current = setTimeout(() => setTooltipEmoji(null), 2000)
  }

  if (!loaded && groups.length === 0 && compact) return null

  const tooltip = groups.find((g) => g.emoji === tooltipEmoji)

  return (
    <div className={`flex items-center flex-wrap gap-1.5 ${className}`}>
      {/* Existing reaction chips */}
      {groups.map((g) => (
        <div key={g.emoji} className="relative">
          <button
            type="button"
            onClick={() => handleToggle(g.emoji)}
            onMouseEnter={() => showTooltip(g.emoji)}
            onMouseLeave={() => setTooltipEmoji(null)}
            className={`flex items-center gap-1 px-2 py-0.5 border text-sm transition-all ${
              g.isMine
                ? 'bg-ink text-gold border-ink shadow-[1px_1px_0_var(--color-gold)]'
                : 'bg-paper-deep border-ink/30 text-ink hover:border-ink hover:bg-paper'
            }`}
          >
            <span>{g.emoji}</span>
            <span className="font-bebas text-xs leading-none">{g.count}</span>
          </button>

          {/* Tooltip on hover */}
          {tooltipEmoji === g.emoji && g.displayNames.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1.5 z-30 bg-ink text-gold font-archivo text-xs px-2 py-1 whitespace-nowrap shadow-[2px_2px_0_rgba(0,0,0,0.5)] max-w-[180px] truncate">
              {g.displayNames.join(', ')}
            </div>
          )}
        </div>
      ))}

      {/* Tooltip for any group */}
      {tooltip && tooltipEmoji && !groups.find((g) => g.emoji === tooltipEmoji) && null}

      {/* Add reaction button (full view only) */}
      {!compact && (
        <div ref={pickerRef} className="relative">
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="flex items-center gap-1 px-2 py-0.5 border border-dashed border-ink/30 text-ink/40 hover:border-ink/60 hover:text-ink/70 transition-colors text-sm"
            aria-label="Add reaction"
          >
            <span className="font-bebas text-[10px] tracking-[0.15em]">
              {groups.length > 0 ? '+' : '+ REACT'}
            </span>
          </button>

          {pickerOpen && (
            <div className="absolute bottom-full left-0 mb-2 z-30 bg-paper border-2 border-ink shadow-[3px_3px_0_#000] flex gap-1 p-2">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleToggle(emoji)}
                  className="text-xl hover:scale-125 transition-transform w-8 h-8 flex items-center justify-center"
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

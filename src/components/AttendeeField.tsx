// AttendeeField — "Who Was There" chip input that supports both free-text names
// and tagged app users.  Friends are searched first (most common case); a "Search
// all users" option offers broader discovery.
//
// Tagged-user chips show a small avatar + @ indicator.
// Free-text chips show a plain name.
// Existing text entries and loaded user tags are initialised externally via the
// `entries` / `onChange` props.

import { useState, useEffect, useRef } from 'react'
import { listMyFriends, getMyBlockedIds, searchByUsername } from '@/lib/friendsStore'
import type { UserProfile } from '@/types/database'
import { avatarInitials } from '@/lib/profileUtils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttendeeEntry =
  | { type: 'text'; name: string }
  | {
      type: 'user'
      userId: string
      displayName: string
      username?: string | null
      avatarUrl?: string | null
    }

interface Props {
  entries: AttendeeEntry[]
  onChange: (entries: AttendeeEntry[]) => void
  myUserId?: string
  disabled?: boolean
}

// ─── Small avatar for chips and dropdown rows ──────────────────────────────────

function MiniAvatar({ photoUrl, name, size = 18 }: { photoUrl?: string | null; name?: string | null; size?: number }) {
  const style = { width: size, height: size, minWidth: size }
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name ?? ''}
        style={style}
        className="rounded-full border border-ink object-cover flex-shrink-0"
      />
    )
  }
  return (
    <div
      style={style}
      className="rounded-full border border-ink bg-paper-deep flex items-center justify-center flex-shrink-0"
    >
      <span className="font-bebas text-[8px] text-ink/40 leading-none">{avatarInitials(name)}</span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttendeeField({ entries, onChange, myUserId, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [open, setOpen] = useState(false)

  // Friends list loaded once on mount
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())
  const [friendsLoaded, setFriendsLoaded] = useState(false)

  // Broader search state
  const [globalResults, setGlobalResults] = useState<UserProfile[]>([])
  const [globalSearching, setGlobalSearching] = useState(false)
  const [showGlobalResults, setShowGlobalResults] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load friends + blocked IDs once
  useEffect(() => {
    Promise.all([listMyFriends(), getMyBlockedIds()]).then(([friendList, blocked]) => {
      setFriends(friendList)
      setBlockedIds(new Set(blocked))
      setFriendsLoaded(true)
    }).catch(() => setFriendsLoaded(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setShowGlobalResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // IDs of already-tagged users (to exclude from suggestions)
  const taggedUserIds = new Set(
    entries.filter((e): e is Extract<AttendeeEntry, { type: 'user' }> => e.type === 'user').map((e) => e.userId),
  )

  // Filtered friends: match query, exclude tagged, blocked, and self
  const friendSuggestions = friendsLoaded
    ? friends.filter((f) => {
        if (f.userId === myUserId) return false
        if (taggedUserIds.has(f.userId)) return false
        if (blockedIds.has(f.userId)) return false
        if (!inputValue.trim()) return false
        const q = inputValue.toLowerCase()
        return (
          f.displayName?.toLowerCase().includes(q) ||
          f.username?.toLowerCase().includes(q)
        )
      }).slice(0, 5)
    : []

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputValue(val)
    setOpen(true)
    setShowGlobalResults(false)
    setGlobalResults([])

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!val.trim()) return
    debounceRef.current = setTimeout(() => {
      // Only run broader search if there are few friend matches
      if (friendSuggestions.length < 3) {
        setGlobalSearching(true)
        searchByUsername(val)
          .then((results) => {
            const filtered = results.filter(
              (r) => !taggedUserIds.has(r.userId) && !blockedIds.has(r.userId) && r.userId !== myUserId,
            )
            setGlobalResults(filtered)
          })
          .catch(() => setGlobalResults([]))
          .finally(() => setGlobalSearching(false))
      }
    }, 300)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault()
      commitText(inputValue.replace(/,/g, '').trim())
    }
    if (e.key === 'Backspace' && !inputValue && entries.length > 0) {
      onChange(entries.slice(0, -1))
    }
  }

  function commitText(name: string) {
    if (!name) return
    // Don't add duplicates
    const already = entries.some(
      (e) =>
        (e.type === 'text' && e.name.toLowerCase() === name.toLowerCase()) ||
        (e.type === 'user' && e.displayName.toLowerCase() === name.toLowerCase()),
    )
    if (!already) onChange([...entries, { type: 'text', name }])
    setInputValue('')
    setOpen(false)
    setGlobalResults([])
    setShowGlobalResults(false)
  }

  function addUser(profile: UserProfile) {
    if (taggedUserIds.has(profile.userId)) return
    onChange([
      ...entries,
      {
        type: 'user',
        userId: profile.userId,
        displayName: profile.displayName ?? profile.username ?? 'Unknown',
        username: profile.username,
        avatarUrl: profile.profilePhotoUrl,
      },
    ])
    setInputValue('')
    setOpen(false)
    setGlobalResults([])
    setShowGlobalResults(false)
    inputRef.current?.focus()
  }

  function removeEntry(idx: number) {
    onChange(entries.filter((_, i) => i !== idx))
  }

  function handleGlobalSearch() {
    setShowGlobalResults(true)
    setGlobalSearching(true)
    searchByUsername(inputValue)
      .then((results) => {
        const filtered = results.filter(
          (r) => !taggedUserIds.has(r.userId) && !blockedIds.has(r.userId) && r.userId !== myUserId,
        )
        setGlobalResults(filtered)
      })
      .catch(() => setGlobalResults([]))
      .finally(() => setGlobalSearching(false))
  }

  const showDropdown = open && inputValue.trim().length > 0

  return (
    <div ref={containerRef} className="relative">
      {/* Chip container + input */}
      <div
        className="flex flex-wrap gap-1.5 bg-white border-2 border-ink px-2 py-1.5 min-h-[46px] cursor-text focus-within:border-red transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        {entries.map((entry, idx) => (
          <span
            key={idx}
            className={`flex items-center gap-1 text-xs border px-2 py-0.5 leading-tight flex-shrink-0 ${
              entry.type === 'user'
                ? 'bg-ink text-gold border-ink font-bebas tracking-[0.1em]'
                : 'bg-paper-deep text-ink border-ink/40 font-archivo'
            }`}
          >
            {entry.type === 'user' && (
              <MiniAvatar photoUrl={entry.avatarUrl} name={entry.displayName} size={14} />
            )}
            {entry.type === 'user' ? entry.displayName : entry.name}
            {entry.type === 'user' && (
              <span className="font-bebas text-[9px] text-gold/60 ml-0.5">@</span>
            )}
            {!disabled && (
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); removeEntry(idx) }}
                className="ml-0.5 hover:opacity-60 leading-none text-sm"
                aria-label={`Remove ${entry.type === 'user' ? entry.displayName : entry.name}`}
              >
                ×
              </button>
            )}
          </span>
        ))}

        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => { if (inputValue.trim()) setOpen(true) }}
            onKeyDown={handleKeyDown}
            placeholder={entries.length === 0 ? 'Type a name and press Enter, or select a friend…' : ''}
            className="flex-1 min-w-[140px] bg-transparent font-archivo text-sm text-ink placeholder-ink/30 outline-none py-0.5"
          />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-30 bg-white border-2 border-ink border-t-0 shadow-[2px_2px_0_#000] max-h-56 overflow-y-auto">
          {/* Friend suggestions */}
          {friendSuggestions.length > 0 && (
            <>
              <p className="font-bebas text-[9px] tracking-[0.2em] text-ink/40 px-3 pt-2 pb-0.5">FRIENDS</p>
              {friendSuggestions.map((f) => (
                <button
                  key={f.userId}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); addUser(f) }}
                  className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-paper-deep border-b border-ink/10 last:border-0 transition-colors"
                >
                  <MiniAvatar photoUrl={f.profilePhotoUrl} name={f.displayName} size={22} />
                  <span className="flex-1 min-w-0">
                    <span className="font-bebas text-sm text-ink">{f.displayName ?? f.username}</span>
                    {f.username && (
                      <span className="font-archivo text-xs text-ink/40 ml-1.5">@{f.username}</span>
                    )}
                  </span>
                  <span className="font-bebas text-[9px] tracking-[0.15em] text-gold bg-ink px-1.5 py-0.5 flex-shrink-0">
                    TAG
                  </span>
                </button>
              ))}
            </>
          )}

          {/* Global search results */}
          {showGlobalResults && globalResults.length > 0 && (
            <>
              <p className="font-bebas text-[9px] tracking-[0.2em] text-ink/40 px-3 pt-2 pb-0.5">ALL USERS</p>
              {globalResults
                .filter((r) => !friendSuggestions.some((f) => f.userId === r.userId))
                .map((r) => (
                  <button
                    key={r.userId}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); addUser(r) }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 hover:bg-paper-deep border-b border-ink/10 last:border-0 transition-colors"
                  >
                    <MiniAvatar photoUrl={r.profilePhotoUrl} name={r.displayName} size={22} />
                    <span className="flex-1 min-w-0">
                      <span className="font-bebas text-sm text-ink">{r.displayName ?? r.username}</span>
                      {r.username && (
                        <span className="font-archivo text-xs text-ink/40 ml-1.5">@{r.username}</span>
                      )}
                    </span>
                    <span className="font-bebas text-[9px] tracking-[0.15em] text-gold bg-ink px-1.5 py-0.5 flex-shrink-0">
                      TAG
                    </span>
                  </button>
                ))}
            </>
          )}

          {/* "Search all users" option */}
          {!showGlobalResults && inputValue.trim() && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleGlobalSearch() }}
              className="w-full text-left flex items-center gap-2 px-3 py-2.5 hover:bg-paper-deep border-t border-ink/10 transition-colors"
            >
              {globalSearching ? (
                <span className="font-bebas text-xs tracking-[0.15em] text-ink/50">SEARCHING…</span>
              ) : (
                <span className="font-bebas text-xs tracking-[0.15em] text-ink/60">
                  SEARCH ALL USERS FOR &ldquo;{inputValue}&rdquo;
                </span>
              )}
            </button>
          )}

          {/* "Add as free text" fallback */}
          {inputValue.trim() && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); commitText(inputValue.trim()) }}
              className="w-full text-left flex items-center gap-2 px-3 py-2.5 hover:bg-paper-deep border-t border-ink/10 transition-colors"
            >
              <span className="font-archivo text-sm text-ink/50">
                Add &ldquo;<strong className="text-ink">{inputValue.trim()}</strong>&rdquo; as plain text
              </span>
            </button>
          )}
        </div>
      )}

      <p className="font-caveat text-sm text-ink/40 mt-1">
        Press Enter to add a name · Select a friend to tag them
      </p>
    </div>
  )
}

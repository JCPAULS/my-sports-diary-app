import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AvatarCircle from '@/components/AvatarCircle'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/lib/AuthContext'
import { useProfileContext } from '@/lib/ProfileContext'
import {
  searchByUsername,
  findUserByShareCode,
  sendFriendRequest,
  acceptFriendRequest,
  denyFriendRequest,
  cancelFriendRequest,
  getMyBlockedIds,
  getFriendSuggestions,
  type FriendSuggestion,
} from '@/lib/friendsStore'
import { checkRateLimit, consumeRateLimit, getRateLimitRemaining, RATE_LIMITS } from '@/lib/rateLimit'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ─── Types ────────────────────────────────────────────────────────────────────

type SearchMode = 'username' | 'email'
type FriendStatus = 'none' | 'friends' | 'sent' | 'received'

interface FriendshipCtx {
  friendIds: Set<string>
  sentRequests: Map<string, string>     // toUserId → requestId
  receivedRequests: Map<string, string> // fromUserId → requestId
}

// ─── UserDiscoveryCard ────────────────────────────────────────────────────────

interface CardProps {
  profile: UserProfile
  ctx: FriendshipCtx
  onStatusChange: (userId: string, newStatus: FriendStatus, requestId?: string) => void
}

function UserDiscoveryCard({ profile, ctx, onStatusChange }: CardProps) {
  const toast = useToast()
  const { refreshRequestCount } = useProfileContext()
  const [busy, setBusy] = useState(false)

  const status: FriendStatus = ctx.friendIds.has(profile.userId)
    ? 'friends'
    : ctx.sentRequests.has(profile.userId)
    ? 'sent'
    : ctx.receivedRequests.has(profile.userId)
    ? 'received'
    : 'none'

  const requestId =
    ctx.sentRequests.get(profile.userId) ?? ctx.receivedRequests.get(profile.userId)

  async function handleAdd() {
    // Auto-accept if they've already sent us a request
    if (status === 'received' && requestId) {
      setBusy(true)
      try {
        await acceptFriendRequest(requestId)
        onStatusChange(profile.userId, 'friends')
        await refreshRequestCount()
        toast(`You and ${profile.displayName ?? 'this user'} are now friends`)
      } catch (err) {
        toast((err as Error).message, 'error')
      } finally {
        setBusy(false)
      }
      return
    }

    if (!checkRateLimit('friend_request')) {
      toast(`Daily limit reached (${RATE_LIMITS.friend_request}/day). Try again tomorrow.`, 'info')
      return
    }

    setBusy(true)
    try {
      const req = await sendFriendRequest(profile.userId)
      consumeRateLimit('friend_request')
      onStatusChange(profile.userId, 'sent', req.id)
      toast('Friend request sent')
    } catch (err) {
      const msg = (err as Error).message
      toast(
        msg.includes('duplicate') || msg.includes('unique') ? 'Request already sent' : msg,
        'error',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleAccept() {
    if (!requestId) return
    setBusy(true)
    try {
      await acceptFriendRequest(requestId)
      onStatusChange(profile.userId, 'friends')
      await refreshRequestCount()
      toast(`You and ${profile.displayName ?? 'this user'} are now friends`)
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeny() {
    if (!requestId) return
    setBusy(true)
    try {
      await denyFriendRequest(requestId)
      onStatusChange(profile.userId, 'none')
      await refreshRequestCount()
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    if (!requestId) return
    setBusy(true)
    try {
      await cancelFriendRequest(requestId)
      onStatusChange(profile.userId, 'none')
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-3 border-2 border-ink/15 bg-paper hover:border-ink/30 transition-colors">
      <Link to={`/user/${profile.userId}`} className="flex-shrink-0">
        <AvatarCircle photoUrl={profile.profilePhotoUrl} name={profile.displayName} size="sm" />
      </Link>

      <Link to={`/user/${profile.userId}`} className="flex-1 min-w-0 block">
        <p className="font-caveat text-xl text-ink leading-tight truncate">
          {profile.displayName ?? 'Unknown'}
        </p>
        {profile.username && (
          <p className="font-archivo text-xs text-ink/40">@{profile.username}</p>
        )}
      </Link>

      <div className="flex items-center gap-2 flex-shrink-0">
        {status === 'friends' && (
          <span className="font-bebas text-[10px] tracking-[0.12em] text-ink/40 border border-ink/20 px-2 py-1">
            FRIENDS
          </span>
        )}

        {status === 'sent' && (
          <div className="flex items-center gap-1.5">
            <span className="font-bebas text-[10px] tracking-[0.1em] text-ink/30">PENDING</span>
            <button
              onClick={handleCancel}
              disabled={busy}
              className="font-archivo text-[11px] text-ink/40 underline hover:text-red transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        )}

        {status === 'received' && (
          <div className="flex items-center gap-1.5">
            <span className="font-bebas text-[9px] tracking-[0.08em] text-ink/30 hidden sm:block">
              WANTS TO CONNECT
            </span>
            <button
              onClick={handleAccept}
              disabled={busy}
              className="font-bebas text-[10px] tracking-[0.1em] px-2.5 py-1.5 bg-red text-paper border border-ink disabled:opacity-40"
            >
              ACCEPT
            </button>
            <button
              onClick={handleDeny}
              disabled={busy}
              className="font-archivo text-[11px] text-ink/40 underline hover:text-red transition-colors disabled:opacity-40"
            >
              Deny
            </button>
          </div>
        )}

        {status === 'none' && (
          <button
            onClick={handleAdd}
            disabled={busy}
            className="font-bebas text-[10px] tracking-[0.12em] px-3 py-1.5 border-2 border-ink text-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-40"
          >
            {busy ? '…' : 'ADD'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionRule({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="font-bebas text-base tracking-[0.2em] text-ink/50 flex-shrink-0">{title}</h2>
      <div className="flex-1 h-px bg-ink/10" />
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export default function FindFriendsTab() {
  const { user } = useAuth()
  const toast = useToast()

  // Search
  const [searchMode, setSearchMode] = useState<SearchMode>('username')
  const [usernameQuery, setUsernameQuery] = useState('')
  const [emailQuery, setEmailQuery] = useState('')

  // Results
  const [usernameResults, setUsernameResults] = useState<UserProfile[]>([])
  const [usernameLoading, setUsernameLoading] = useState(false)
  const [emailResult, setEmailResult] = useState<UserProfile | null | 'not_found' | 'unavailable'>(null)
  const [emailLoading, setEmailLoading] = useState(false)

  // Share code
  const [shareCode, setShareCode] = useState('')
  const [shareCodeState, setShareCodeState] = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle')
  const [shareCodeProfile, setShareCodeProfile] = useState<UserProfile | null>(null)

  // Suggestions
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(true)

  // Friendship context (pre-loaded for status indicators)
  const [ctx, setCtx] = useState<FriendshipCtx>({
    friendIds: new Set(),
    sentRequests: new Map(),
    receivedRequests: new Map(),
  })
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set())
  const [ctxReady, setCtxReady] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!user) return
    loadContext()
    loadSuggestions()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced username search (300 ms)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (searchMode !== 'username' || usernameQuery.length < 2) {
      setUsernameResults([])
      setUsernameLoading(false)
      return
    }
    setUsernameLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const raw = await searchByUsername(usernameQuery)
        // Client-side remove users I've blocked (can't do this in the DB query via RLS)
        setUsernameResults(raw.filter(u => !blockedIds.has(u.userId)))
      } catch {
        // silently drop partial-search errors
      } finally {
        setUsernameLoading(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [usernameQuery, searchMode, blockedIds])

  async function loadContext() {
    if (!user) return
    try {
      const [friendships, sentReqs, receivedReqs, blocked] = await Promise.all([
        db
          .from('friendships')
          .select('user_a_id,user_b_id')
          .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`),
        db
          .from('friend_requests')
          .select('id,to_user_id')
          .eq('from_user_id', user.id)
          .eq('status', 'pending'),
        db
          .from('friend_requests')
          .select('id,from_user_id')
          .eq('to_user_id', user.id)
          .eq('status', 'pending'),
        getMyBlockedIds(),
      ])

      setCtx({
        friendIds: new Set(
          ((friendships.data ?? []) as { user_a_id: string; user_b_id: string }[]).map(f =>
            f.user_a_id === user.id ? f.user_b_id : f.user_a_id,
          ),
        ),
        sentRequests: new Map(
          ((sentReqs.data ?? []) as { id: string; to_user_id: string }[]).map(r => [r.to_user_id, r.id]),
        ),
        receivedRequests: new Map(
          ((receivedReqs.data ?? []) as { id: string; from_user_id: string }[]).map(r => [
            r.from_user_id,
            r.id,
          ]),
        ),
      })
      setBlockedIds(new Set(blocked))
    } finally {
      setCtxReady(true)
    }
  }

  async function loadSuggestions() {
    setSuggestionsLoading(true)
    try {
      setSuggestions(await getFriendSuggestions())
    } finally {
      setSuggestionsLoading(false)
    }
  }

  function handleStatusChange(userId: string, newStatus: FriendStatus, requestId?: string) {
    setCtx(prev => {
      const friendIds = new Set(prev.friendIds)
      const sentRequests = new Map(prev.sentRequests)
      const receivedRequests = new Map(prev.receivedRequests)

      if (newStatus === 'friends') {
        friendIds.add(userId)
        sentRequests.delete(userId)
        receivedRequests.delete(userId)
      } else if (newStatus === 'sent' && requestId) {
        sentRequests.set(userId, requestId)
      } else if (newStatus === 'none') {
        sentRequests.delete(userId)
        receivedRequests.delete(userId)
      }

      return { friendIds, sentRequests, receivedRequests }
    })
  }

  async function handleEmailSearch() {
    const email = emailQuery.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      toast('Enter a valid email address', 'info')
      return
    }
    if (!checkRateLimit('email_search')) {
      toast(`Daily email search limit reached (${RATE_LIMITS.email_search}/day). Try again tomorrow.`, 'info')
      return
    }
    consumeRateLimit('email_search')
    setEmailLoading(true)
    setEmailResult(null)
    // Email lookup requires a Supabase Edge Function to access auth.users.email.
    // TODO (F-edge): deploy `find-by-email` edge function and wire it here.
    setEmailResult('unavailable')
    setEmailLoading(false)
  }

  async function doShareCodeLookup(code: string) {
    if (!code) return
    setShareCodeState('loading')
    setShareCodeProfile(null)
    try {
      const result = await findUserByShareCode(code)
      if (result && !blockedIds.has(result.userId)) {
        setShareCodeProfile(result)
        setShareCodeState('found')
      } else {
        setShareCodeState('not_found')
      }
    } catch {
      setShareCodeState('not_found')
    }
  }

  function handleShareCodeChange(val: string) {
    const cleaned = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    setShareCode(cleaned)
    setShareCodeState('idle')
    setShareCodeProfile(null)
    if (cleaned.length === 8) doShareCodeLookup(cleaned)
  }

  const emailRemaining = getRateLimitRemaining('email_search')

  return (
    <div className="flex flex-col gap-10">

      {/* ── USERNAME / EMAIL SEARCH ──────────────────────────────────────── */}
      <div>
        {/* Mode switcher */}
        <div className="flex border-2 border-ink/15 w-fit mb-3">
          <button
            onClick={() => { setSearchMode('username'); setUsernameQuery(''); setUsernameResults([]) }}
            className={`font-bebas text-xs tracking-[0.15em] px-4 py-2 transition-colors ${
              searchMode === 'username' ? 'bg-ink text-paper' : 'text-ink/40 hover:text-ink hover:bg-ink/5'
            }`}
          >
            USERNAME
          </button>
          <button
            onClick={() => { setSearchMode('email'); setEmailQuery(''); setEmailResult(null) }}
            className={`font-bebas text-xs tracking-[0.15em] px-4 py-2 transition-colors ${
              searchMode === 'email' ? 'bg-ink text-paper' : 'text-ink/40 hover:text-ink hover:bg-ink/5'
            }`}
          >
            EMAIL
          </button>
        </div>

        {/* Username search */}
        {searchMode === 'username' && (
          <>
            <div className="relative">
              <input
                type="text"
                value={usernameQuery}
                onChange={e => setUsernameQuery(e.target.value.slice(0, 30))}
                placeholder="Search by username…"
                autoComplete="off"
                className="w-full bg-white border-2 border-ink px-3 py-2.5 font-archivo text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-red transition-colors"
              />
              {usernameLoading && (
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-ink/15 border-t-ink rounded-full"
                  style={{ animation: 'spin 0.65s linear infinite' }}
                />
              )}
            </div>

            {usernameQuery.length > 0 && usernameQuery.length < 2 && (
              <p className="font-archivo text-xs text-ink/40 mt-2">Type at least 2 characters to search</p>
            )}

            {usernameQuery.length >= 2 && !usernameLoading && usernameResults.length === 0 && (
              <p className="font-archivo text-xs text-ink/40 mt-2">
                No users found matching "{usernameQuery}".{' '}
                <span className="text-ink/30">Want to invite them? Share your code with them.</span>
              </p>
            )}

            {usernameResults.length > 0 && (
              <div className="flex flex-col gap-1 mt-3">
                {usernameResults.map(profile => (
                  <UserDiscoveryCard
                    key={profile.userId}
                    profile={profile}
                    ctx={ctx}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Email search */}
        {searchMode === 'email' && (
          <>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailQuery}
                onChange={e => { setEmailQuery(e.target.value); setEmailResult(null) }}
                onKeyDown={e => { if (e.key === 'Enter') handleEmailSearch() }}
                placeholder="friend@example.com"
                className="flex-1 bg-white border-2 border-ink px-3 py-2.5 font-archivo text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-red transition-colors"
              />
              <button
                onClick={handleEmailSearch}
                disabled={emailLoading || !emailQuery.includes('@')}
                className="font-bebas text-sm tracking-[0.15em] px-5 py-2.5 bg-ink text-paper border-2 border-ink disabled:opacity-40 transition-opacity"
              >
                {emailLoading ? '…' : 'SEARCH'}
              </button>
            </div>
            <p className="font-archivo text-[11px] text-ink/30 mt-1.5">
              {emailRemaining} of {RATE_LIMITS.email_search} searches remaining today
            </p>

            {emailResult === 'unavailable' && (
              <div className="mt-3 bg-paper-deep border border-ink/15 px-4 py-3">
                <p className="font-archivo text-sm text-ink/60 leading-relaxed">
                  Email search isn't available yet — it needs a server function still being built.
                  Try finding them by username or share code.
                </p>
              </div>
            )}
            {emailResult === 'not_found' && (
              <p className="font-archivo text-xs text-ink/40 mt-2">No user found with that email address.</p>
            )}
            {emailResult && emailResult !== 'not_found' && emailResult !== 'unavailable' && (
              <div className="mt-3">
                <UserDiscoveryCard profile={emailResult} ctx={ctx} onStatusChange={handleStatusChange} />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── SHARE CODE LOOKUP ──────────────────────────────────────────────── */}
      <div>
        <SectionRule title="ENTER A SHARE CODE" />
        <p className="font-caveat text-lg text-ink/50 mb-3">
          Got someone's 8-character code? Enter it here.
        </p>
        <div className="flex items-start gap-2">
          <input
            type="text"
            value={shareCode}
            onChange={e => handleShareCodeChange(e.target.value)}
            placeholder="XXXXXXXX"
            maxLength={8}
            className="w-44 bg-white border-2 border-ink px-3 py-2.5 font-mono text-xl tracking-[0.35em] text-ink placeholder-ink/20 uppercase focus:outline-none focus:border-red transition-colors"
          />
          <button
            onClick={() => doShareCodeLookup(shareCode)}
            disabled={shareCodeState === 'loading' || shareCode.length === 0}
            className="font-bebas text-sm tracking-[0.15em] px-5 py-2.5 border-2 border-ink text-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-40"
          >
            {shareCodeState === 'loading' ? '…' : 'GO'}
          </button>
        </div>
        <p className="font-archivo text-[11px] text-ink/30 mt-1.5">
          Auto-submits when all 8 characters are entered
        </p>

        {shareCodeState === 'not_found' && (
          <p className="font-archivo text-xs text-ink/40 mt-3">
            No user found with that code. Double-check the code and try again.
          </p>
        )}
        {shareCodeState === 'found' && shareCodeProfile && (
          <div className="mt-3">
            <UserDiscoveryCard
              profile={shareCodeProfile}
              ctx={ctx}
              onStatusChange={handleStatusChange}
            />
          </div>
        )}
      </div>

      {/* ── FRIEND-OF-FRIEND SUGGESTIONS ───────────────────────────────────── */}
      <div>
        <SectionRule title="PEOPLE YOU MAY KNOW" />

        {suggestionsLoading || !ctxReady ? (
          <div className="flex justify-center py-8">
            <div
              className="w-6 h-6 border-[3px] border-ink/15 border-t-ink rounded-full"
              style={{ animation: 'spin 0.65s linear infinite' }}
            />
          </div>
        ) : suggestions.length === 0 ? (
          <p className="font-caveat text-xl text-ink/30">
            Add a friend to see suggestions here.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {suggestions.map(({ profile, mutualCount, sampleMutuals }) => {
              const mutualNames = sampleMutuals
                .map(m => m.displayName ?? m.username ?? 'Someone')
                .join(', ')
              const mutualLabel =
                mutualCount === 1
                  ? `1 mutual friend${sampleMutuals.length > 0 ? ` · ${mutualNames}` : ''}`
                  : `${mutualCount} mutual friends${sampleMutuals.length > 0 ? ` · ${mutualNames}` : ''}`

              return (
                <div
                  key={profile.userId}
                  className="border-2 border-ink/15 bg-paper hover:border-ink/25 transition-colors"
                >
                  <UserDiscoveryCard
                    profile={profile}
                    ctx={ctx}
                    onStatusChange={handleStatusChange}
                  />
                  <p className="px-3 pb-2.5 font-archivo text-[11px] text-ink/40 -mt-1">
                    {mutualLabel}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

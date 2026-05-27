import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Nav from '@/components/Nav'
import AvatarCircle from '@/components/AvatarCircle'
import ConfirmModal from '@/components/ConfirmModal'
import FindFriendsTab from '@/components/FindFriendsTab'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/lib/AuthContext'
import { useProfileContext } from '@/lib/ProfileContext'
import {
  listMyFriends,
  listIncomingRequests,
  listOutgoingRequests,
  acceptFriendRequest,
  denyFriendRequest,
  cancelFriendRequest,
  removeFriend,
  blockUser,
  muteUser,
  unmuteUser,
  getUserProfile,
} from '@/lib/friendsStore'
import { supabase } from '@/lib/supabase'
import type { UserProfile, FriendRequest } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type Tab = 'friends' | 'requests' | 'find'

interface RequestWithProfile {
  request: FriendRequest
  profile: UserProfile | null
}

// ─── Small sub-components ────────────────────────────────────────────────────

function TabButton({ active, onClick, label, badge }: { active: boolean; onClick: () => void; label: string; badge?: number }) {
  return (
    <button
      onClick={onClick}
      className={`relative font-bebas text-sm tracking-[0.2em] px-5 py-3 border-b-2 transition-colors ${
        active ? 'border-red text-ink' : 'border-transparent text-ink/40 hover:text-ink hover:border-ink/30'
      }`}
    >
      {label}
      {badge != null && badge > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red border border-ink rounded-full flex items-center justify-center font-archivo text-[9px] text-paper font-bold">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  )
}

function ShareCodeBar({ code, onCopy, copied }: { code: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="flex items-center gap-3 bg-paper-deep border-2 border-ink/15 px-4 py-2.5">
      <div>
        <p className="font-bebas text-[10px] tracking-[0.25em] text-ink/40">YOUR CODE</p>
        <p className="font-bebas text-xl tracking-[0.35em] text-ink">{code}</p>
      </div>
      <button
        onClick={onCopy}
        className="ml-auto font-bebas text-xs tracking-[0.15em] px-3 py-1 border-2 border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
      >
        {copied ? 'COPIED!' : 'COPY'}
      </button>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-7 h-7 border-[3px] border-ink/15 border-t-ink rounded-full" style={{ animation: 'spin 0.65s linear infinite' }} />
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function Friends() {
  const { user } = useAuth()
  const { myProfile, pendingRequestCount, refreshRequestCount } = useProfileContext()
  const toast = useToast()

  const [tab, setTab] = useState<Tab>('friends')
  const [copied, setCopied] = useState(false)

  // Friends tab
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [friendSearch, setFriendSearch] = useState('')
  const [mutedUserIds, setMutedUserIds] = useState<Set<string>>(new Set())

  // Requests tab
  const [incoming, setIncoming] = useState<RequestWithProfile[]>([])
  const [outgoing, setOutgoing] = useState<RequestWithProfile[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)

  // Action state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<{ type: 'unfriend' | 'block'; userId: string; name: string } | null>(null)

  // Close menu on any outside click
  useEffect(() => {
    const close = () => setOpenMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  useEffect(() => {
    if (!user) return
    loadFriends()
    loadRequests()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadFriends() {
    setFriendsLoading(true)
    try {
      const [friendList, muteData] = await Promise.all([
        listMyFriends(),
        db.from('muted_users').select('muted_user_id').eq('muter_user_id', user!.id),
      ])
      setFriends(friendList)
      setMutedUserIds(new Set((muteData.data ?? []).map((m: { muted_user_id: string }) => m.muted_user_id)))
    } finally {
      setFriendsLoading(false)
    }
  }

  async function loadRequests() {
    setRequestsLoading(true)
    try {
      const [inc, out] = await Promise.all([listIncomingRequests(), listOutgoingRequests()])
      const [incWithProfiles, outWithProfiles] = await Promise.all([
        Promise.all(inc.map(async r => ({ request: r, profile: await getUserProfile(r.fromUserId).catch(() => null) }))),
        Promise.all(out.map(async r => ({ request: r, profile: await getUserProfile(r.toUserId).catch(() => null) }))),
      ])
      setIncoming(incWithProfiles)
      setOutgoing(outWithProfiles)
    } finally {
      setRequestsLoading(false)
    }
  }

  async function copyShareCode() {
    if (!myProfile?.shareCode) return
    await navigator.clipboard.writeText(myProfile.shareCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleAccept(requestId: string, name: string) {
    try {
      await acceptFriendRequest(requestId)
      setIncoming(prev => prev.filter(r => r.request.id !== requestId))
      await refreshRequestCount()
      await loadFriends()
      toast(`You and ${name} are now friends`)
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  async function handleDeny(requestId: string) {
    try {
      await denyFriendRequest(requestId)
      setIncoming(prev => prev.filter(r => r.request.id !== requestId))
      await refreshRequestCount()
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  async function handleCancel(requestId: string) {
    try {
      await cancelFriendRequest(requestId)
      setOutgoing(prev => prev.filter(r => r.request.id !== requestId))
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  async function handleUnfriend(friendUserId: string) {
    setConfirmId(null)
    try {
      await removeFriend(friendUserId)
      setFriends(prev => prev.filter(f => f.userId !== friendUserId))
      toast('Unfriended')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  async function handleBlock(targetUserId: string) {
    setConfirmId(null)
    try {
      await removeFriend(targetUserId).catch(() => {})
      await blockUser(targetUserId)
      setFriends(prev => prev.filter(f => f.userId !== targetUserId))
      toast('User blocked')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  async function handleMuteToggle(targetUserId: string, name: string) {
    setOpenMenuId(null)
    try {
      if (mutedUserIds.has(targetUserId)) {
        await unmuteUser(targetUserId)
        setMutedUserIds(prev => { const s = new Set(prev); s.delete(targetUserId); return s })
        toast(`Unmuted ${name}`)
      } else {
        await muteUser(targetUserId)
        setMutedUserIds(prev => new Set([...prev, targetUserId]))
        toast(`Muted ${name}`)
      }
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const filteredFriends = friends.filter(f => {
    const q = friendSearch.toLowerCase()
    return (
      (f.displayName?.toLowerCase().includes(q) ?? false) ||
      (f.username?.toLowerCase().includes(q) ?? false)
    )
  })

  const timeAgo = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(ms / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      {confirmId && (
        <ConfirmModal
          open
          title={confirmId.type === 'unfriend' ? 'UNFRIEND?' : 'BLOCK USER?'}
          message={
            confirmId.type === 'unfriend'
              ? `Unfriend ${confirmId.name}? You'll both lose access to each other's games and stats.`
              : `Block ${confirmId.name}? They won't be able to find you or see your games. Existing friendship will be removed.`
          }
          confirmLabel={confirmId.type === 'unfriend' ? 'UNFRIEND' : 'BLOCK'}
          danger
          onConfirm={() =>
            confirmId.type === 'unfriend'
              ? handleUnfriend(confirmId.userId)
              : handleBlock(confirmId.userId)
          }
          onCancel={() => setConfirmId(null)}
        />
      )}

      <header className="bg-hero-blue border-b-4 border-ink">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8">
          <h1 className="font-bebas text-4xl tracking-[0.15em] text-ink">FRIENDS</h1>
        </div>
      </header>

      {/* Tab bar */}
      <div className="bg-paper border-b border-ink/15">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 flex items-center gap-0 -mb-[1px]">
          <TabButton active={tab === 'friends'} onClick={() => setTab('friends')} label="FRIENDS" />
          <TabButton active={tab === 'requests'} onClick={() => setTab('requests')} label="REQUESTS" badge={pendingRequestCount} />
          <TabButton active={tab === 'find'} onClick={() => setTab('find')} label="FIND" />
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 lg:px-8 py-6">

        {/* ── FRIENDS TAB ─────────────────────────────────────────────────── */}
        {tab === 'friends' && (
          <div className="flex flex-col gap-5">
            {myProfile?.shareCode && (
              <ShareCodeBar code={myProfile.shareCode} onCopy={copyShareCode} copied={copied} />
            )}

            <input
              type="text"
              value={friendSearch}
              onChange={e => setFriendSearch(e.target.value)}
              placeholder="Search friends…"
              className="w-full bg-white border-2 border-ink/20 px-3 py-2.5 font-archivo text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-ink transition-colors"
            />

            {friendsLoading ? (
              <Spinner />
            ) : filteredFriends.length === 0 ? (
              <div className="text-center py-14">
                <p className="font-caveat text-2xl text-ink/30 mb-2">
                  {friendSearch ? 'No matches' : 'No friends yet'}
                </p>
                {!friendSearch && (
                  <p className="font-archivo text-sm text-ink/30">
                    Share your code or go to the FIND tab to connect with people.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredFriends.map(friend => (
                  <div key={friend.userId} className="flex items-center gap-3 px-3 py-3 border-2 border-ink/10 hover:border-ink/25 transition-colors bg-paper">
                    <AvatarCircle photoUrl={friend.profilePhotoUrl} name={friend.displayName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-archivo text-sm text-ink font-medium truncate">
                          {friend.displayName ?? friend.username ?? 'Unknown'}
                        </p>
                        {mutedUserIds.has(friend.userId) && (
                          <span className="font-bebas text-[9px] tracking-[0.1em] text-ink/30 border border-ink/15 px-1.5 py-0.5">MUTED</span>
                        )}
                      </div>
                      {friend.username && (
                        <p className="font-archivo text-xs text-ink/40">@{friend.username}</p>
                      )}
                    </div>
                    <Link
                      to={`/user/${friend.userId}`}
                      className="font-bebas text-xs tracking-[0.1em] px-3 py-1.5 border-2 border-ink/20 text-ink/50 hover:border-ink hover:text-ink transition-colors"
                    >
                      VIEW
                    </Link>
                    {/* "..." menu */}
                    <div className="relative">
                      <button
                        onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === friend.userId ? null : friend.userId) }}
                        className="w-7 h-7 flex items-center justify-center text-ink/30 hover:text-ink transition-colors font-bold"
                        aria-label="More options"
                      >
                        ···
                      </button>
                      {openMenuId === friend.userId && (
                        <div className="absolute right-0 top-[calc(100%+4px)] w-36 bg-paper border-2 border-ink shadow-[4px_4px_0_#000] z-20">
                          <button
                            onClick={e => { e.stopPropagation(); handleMuteToggle(friend.userId, friend.displayName ?? 'this user') }}
                            className="w-full text-left px-3 py-2.5 font-archivo text-sm text-ink hover:bg-ink/5"
                          >
                            {mutedUserIds.has(friend.userId) ? 'Unmute' : 'Mute'}
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setOpenMenuId(null); setConfirmId({ type: 'unfriend', userId: friend.userId, name: friend.displayName ?? 'this user' }) }}
                            className="w-full text-left px-3 py-2.5 font-archivo text-sm text-ink hover:bg-ink/5"
                          >
                            Unfriend
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setOpenMenuId(null); setConfirmId({ type: 'block', userId: friend.userId, name: friend.displayName ?? 'this user' }) }}
                            className="w-full text-left px-3 py-2.5 font-archivo text-sm text-red hover:bg-ink/5"
                          >
                            Block
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── REQUESTS TAB ─────────────────────────────────────────────────── */}
        {tab === 'requests' && (
          <div className="flex flex-col gap-8">
            {requestsLoading ? (
              <Spinner />
            ) : (
              <>
                {/* Incoming */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="font-bebas text-base tracking-[0.2em] text-ink/50 flex-shrink-0">INCOMING</h2>
                    <div className="flex-1 h-px bg-ink/10" />
                  </div>
                  {incoming.length === 0 ? (
                    <p className="font-caveat text-lg text-ink/30">No incoming requests</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {incoming.map(({ request, profile }) => (
                        <div key={request.id} className="flex items-center gap-3 px-3 py-3 border-2 border-ink/10 bg-paper">
                          <AvatarCircle photoUrl={profile?.profilePhotoUrl} name={profile?.displayName} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="font-archivo text-sm text-ink font-medium truncate">
                              {profile?.displayName ?? profile?.username ?? request.fromUserId.slice(0, 8)}
                            </p>
                            <p className="font-archivo text-xs text-ink/40">
                              Sent you a request · {timeAgo(request.createdAt)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAccept(request.id, profile?.displayName ?? 'this user')}
                            className="font-bebas text-xs tracking-[0.1em] px-3 py-1.5 bg-red text-paper border-2 border-ink"
                          >
                            ACCEPT
                          </button>
                          <button
                            onClick={() => handleDeny(request.id)}
                            className="font-archivo text-xs text-ink/40 underline hover:text-red transition-colors"
                          >
                            Deny
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outgoing */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="font-bebas text-base tracking-[0.2em] text-ink/50 flex-shrink-0">OUTGOING</h2>
                    <div className="flex-1 h-px bg-ink/10" />
                  </div>
                  {outgoing.length === 0 ? (
                    <p className="font-caveat text-lg text-ink/30">No outgoing requests</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {outgoing.map(({ request, profile }) => (
                        <div key={request.id} className="flex items-center gap-3 px-3 py-3 border-2 border-ink/10 bg-paper">
                          <AvatarCircle photoUrl={profile?.profilePhotoUrl} name={profile?.displayName} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="font-archivo text-sm text-ink font-medium truncate">
                              {profile?.displayName ?? profile?.username ?? request.toUserId.slice(0, 8)}
                            </p>
                            <p className="font-archivo text-xs text-ink/40">
                              Request sent · {timeAgo(request.createdAt)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCancel(request.id)}
                            className="font-archivo text-xs text-ink/40 underline hover:text-red transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── FIND TAB ─────────────────────────────────────────────────────── */}
        {/* Mounted fresh each time the tab is selected — state resets on tab switch */}
        {tab === 'find' && <FindFriendsTab />}
      </main>
    </div>
  )
}

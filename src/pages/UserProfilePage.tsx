import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Nav from '@/components/Nav'
import AvatarCircle from '@/components/AvatarCircle'
import TeamBadge from '@/components/TeamBadge'
import ConfirmModal from '@/components/ConfirmModal'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/lib/AuthContext'
import { useProfileContext } from '@/lib/ProfileContext'
import {
  getUserProfile,
  sendFriendRequest,
  acceptFriendRequest,
  denyFriendRequest,
  cancelFriendRequest,
  removeFriend,
  blockUser,
  muteUser,
  unmuteUser,
  listMutualFriends,
} from '@/lib/friendsStore'
import { supabase } from '@/lib/supabase'
import { dbGameToGame } from '@/types/database'
import type { UserProfile, DbGame } from '@/types/database'
import type { Game } from '@/types/Game'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type FriendshipStatus = 'none' | 'friends' | 'sent' | 'received'

function FriendGameCard({ game }: { game: Game }) {
  const home = game.homeTeam
  const away = game.awayTeam
  const hasScore = game.homeScore !== undefined && game.awayScore !== undefined

  return (
    <div className="border-2 border-ink/15 bg-paper p-3 flex gap-3">
      {game.photos?.[0] && (
        <img
          src={game.photos[0]}
          alt="game photo"
          className="w-14 h-14 object-cover border border-ink/10 flex-shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-bebas text-base tracking-[0.05em] text-ink leading-tight truncate">
          {away} <span className="text-ink/40">vs</span> {home}
        </p>
        {hasScore && (
          <p className="font-bebas text-sm text-ink/60">
            {game.awayScore} – {game.homeScore}
          </p>
        )}
        {game.date && (
          <p className="font-archivo text-xs text-ink/40 mt-0.5">
            {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {game.venue ? ` · ${game.venue}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refreshRequestCount } = useProfileContext()
  const toast = useToast()

  // Page state
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)

  // Profile data
  const [theirProfile, setTheirProfile] = useState<UserProfile | null>(null)
  const [theirGameCount, setTheirGameCount] = useState(0)
  const [theirFriendCount, setTheirFriendCount] = useState(0)
  const [theirFollowedTeams, setTheirFollowedTeams] = useState<Record<string, string[]>>({})
  const [theirGames, setTheirGames] = useState<Game[]>([])
  const [mutualFriends, setMutualFriends] = useState<UserProfile[]>([])

  // Friendship state
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none')
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)

  // Action state
  const [actionLoading, setActionLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Confirm modals
  const [confirmUnfriend, setConfirmUnfriend] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  useEffect(() => {
    if (!userId || !user) return

    // Redirect to own profile
    if (userId === user.id) {
      navigate('/profile', { replace: true })
      return
    }

    loadData()
  }, [userId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    if (!userId || !user) return
    setLoading(true)
    try {
      // Check if I've blocked them
      const { data: blockData } = await db
        .from('blocked_users')
        .select('id')
        .eq('blocker_user_id', user.id)
        .eq('blocked_user_id', userId)
        .maybeSingle()

      if (blockData) { setNotFound(true); setLoading(false); return }

      // Load their profile
      const profile = await getUserProfile(userId)
      if (!profile) { setNotFound(true); setLoading(false); return }
      setTheirProfile(profile)

      // Check friendship status
      const userA = user.id < userId ? user.id : userId
      const userB = user.id < userId ? userId : user.id

      const { data: friendData } = await db
        .from('friendships')
        .select('id')
        .eq('user_a_id', userA)
        .eq('user_b_id', userB)
        .maybeSingle()

      const isFriends = !!friendData

      if (isFriends) {
        setFriendshipStatus('friends')
      } else {
        // Check for pending request sent by me
        const [{ data: sent }, { data: received }] = await Promise.all([
          db.from('friend_requests').select('id').eq('from_user_id', user.id).eq('to_user_id', userId).eq('status', 'pending').maybeSingle(),
          db.from('friend_requests').select('id').eq('from_user_id', userId).eq('to_user_id', user.id).eq('status', 'pending').maybeSingle(),
        ])

        if (sent) {
          setFriendshipStatus('sent')
          setPendingRequestId(sent.id)
        } else if (received) {
          setFriendshipStatus('received')
          setPendingRequestId(received.id)
        } else {
          setFriendshipStatus('none')
          setPendingRequestId(null)
        }
      }

      // If privacy_mode and not friends, mark private
      if (profile.privacyMode && !isFriends) {
        setIsPrivate(true)
        setLoading(false)
        return
      }

      // Check if I've muted them
      const { data: muteData } = await db
        .from('muted_users')
        .select('id')
        .eq('muter_user_id', user.id)
        .eq('muted_user_id', userId)
        .maybeSingle()
      setIsMuted(!!muteData)

      // Load stats + followed teams in parallel
      const [gamesCountRes, friendsCountRes, settingsRes] = await Promise.all([
        supabase.from('games').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        db.from('friendships').select('*', { count: 'exact', head: true }).or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`),
        supabase.from('user_settings').select('followed_teams').eq('user_id', userId).maybeSingle(),
      ])

      setTheirGameCount(gamesCountRes.count ?? 0)
      setTheirFriendCount(friendsCountRes.count ?? 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const followed = (settingsRes.data as any)?.followed_teams
      if (followed) setTheirFollowedTeams(followed as Record<string, string[]>)

      // If friends, load games and mutual friends
      if (isFriends) {
        const [gamesRes, mutuals] = await Promise.all([
          supabase.from('games').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(15),
          listMutualFriends(userId),
        ])
        setTheirGames(((gamesRes.data ?? []) as DbGame[]).map(dbGameToGame))
        setMutualFriends(mutuals)
      }
    } catch (err) {
      toast((err as Error).message || 'Failed to load profile', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendRequest() {
    if (!userId) return
    setActionLoading(true)
    try {
      const req = await sendFriendRequest(userId)
      setFriendshipStatus('sent')
      setPendingRequestId(req.id)
      toast('Friend request sent')
    } catch (err) {
      const msg = (err as Error).message
      toast(msg.includes('duplicate') ? 'Request already sent' : msg, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleAccept() {
    if (!pendingRequestId) return
    setActionLoading(true)
    try {
      await acceptFriendRequest(pendingRequestId)
      setFriendshipStatus('friends')
      setPendingRequestId(null)
      await refreshRequestCount()
      toast(`You and ${theirProfile?.displayName ?? 'this user'} are now friends`)
      loadData()
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeny() {
    if (!pendingRequestId) return
    setActionLoading(true)
    try {
      await denyFriendRequest(pendingRequestId)
      setFriendshipStatus('none')
      setPendingRequestId(null)
      await refreshRequestCount()
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel() {
    if (!pendingRequestId) return
    setActionLoading(true)
    try {
      await cancelFriendRequest(pendingRequestId)
      setFriendshipStatus('none')
      setPendingRequestId(null)
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUnfriend() {
    if (!userId) return
    setConfirmUnfriend(false)
    setActionLoading(true)
    try {
      await removeFriend(userId)
      setFriendshipStatus('none')
      setTheirGames([])
      setMutualFriends([])
      toast('Unfriended')
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleBlock() {
    if (!userId) return
    setConfirmBlock(false)
    setActionLoading(true)
    try {
      // Remove friendship first if applicable
      if (friendshipStatus === 'friends') await removeFriend(userId).catch(() => {})
      await blockUser(userId)
      toast('User blocked')
      navigate('/friends')
    } catch (err) {
      toast((err as Error).message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleMuteToggle() {
    if (!userId) return
    setMenuOpen(false)
    try {
      if (isMuted) {
        await unmuteUser(userId)
        setIsMuted(false)
        toast('Unmuted')
      } else {
        await muteUser(userId)
        setIsMuted(true)
        toast('Muted')
      }
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  const allFollowedTeams = Object.entries(theirFollowedTeams).flatMap(([sportId, teams]) =>
    teams.map(team => ({ sportId, team }))
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <div className="flex justify-center items-center pt-24">
          <div className="w-8 h-8 border-[3px] border-ink/15 border-t-ink rounded-full" style={{ animation: 'spin 0.65s linear infinite' }} />
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <p className="font-bebas text-5xl text-ink/20 tracking-widest mb-3">NOT FOUND</p>
          <p className="font-archivo text-sm text-ink/40">This user doesn't exist or is unavailable.</p>
          <Link to="/friends" className="inline-block mt-6 font-bebas text-sm tracking-[0.15em] px-5 py-2.5 border-2 border-ink hover:bg-ink hover:text-paper transition-colors">← BACK TO FRIENDS</Link>
        </div>
      </div>
    )
  }

  if (isPrivate) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="flex items-center gap-6 mb-8">
            <AvatarCircle photoUrl={theirProfile?.profilePhotoUrl} name={theirProfile?.displayName} size="lg" />
            <div>
              <p className="font-caveat text-3xl text-ink">{theirProfile?.displayName}</p>
              {theirProfile?.username && <p className="font-archivo text-sm text-ink/50">@{theirProfile.username}</p>}
            </div>
          </div>
          <div className="border-2 border-ink/15 bg-paper-deep p-6 text-center">
            <p className="font-bebas text-xl tracking-[0.15em] text-ink/40 mb-2">PRIVATE ACCOUNT</p>
            <p className="font-archivo text-sm text-ink/50">This user's profile is private. Send them a friend request to see their content.</p>
            {friendshipStatus === 'none' && (
              <button
                onClick={handleSendRequest}
                disabled={actionLoading}
                className="mt-4 font-bebas text-sm tracking-[0.15em] px-6 py-2.5 bg-red text-paper border-2 border-ink disabled:opacity-40"
              >
                {actionLoading ? 'SENDING…' : 'ADD AS FRIEND'}
              </button>
            )}
            {friendshipStatus === 'sent' && (
              <p className="mt-4 font-bebas text-sm tracking-[0.15em] text-ink/40">REQUEST PENDING</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      <ConfirmModal
        open={confirmUnfriend}
        title="UNFRIEND?"
        message={`Unfriend ${theirProfile?.displayName ?? 'this user'}? You'll both lose access to each other's games and stats.`}
        confirmLabel="UNFRIEND"
        danger
        onConfirm={handleUnfriend}
        onCancel={() => setConfirmUnfriend(false)}
      />
      <ConfirmModal
        open={confirmBlock}
        title="BLOCK USER?"
        message={`Block ${theirProfile?.displayName ?? 'this user'}? They won't be able to find you, request you, or see your games. Existing friendship will be removed.`}
        confirmLabel="BLOCK"
        danger
        onConfirm={handleBlock}
        onCancel={() => setConfirmBlock(false)}
      />

      {/* Header with friendship actions */}
      <header className="bg-hero-blue border-b-4 border-ink">
        <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <AvatarCircle photoUrl={theirProfile?.profilePhotoUrl} name={theirProfile?.displayName} size="md" />
            <div className="min-w-0">
              <p className="font-caveat text-2xl text-ink leading-tight truncate">
                {theirProfile?.displayName}
              </p>
              {theirProfile?.username && (
                <p className="font-archivo text-xs text-ink/50">@{theirProfile.username}</p>
              )}
            </div>
          </div>

          {/* Friendship controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {friendshipStatus === 'friends' && (
              <>
                <span className="font-bebas text-xs tracking-[0.15em] text-ink/50 border border-ink/25 px-2.5 py-1">
                  FRIENDS
                </span>
                <div ref={menuRef} className="relative">
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    className="w-8 h-8 border-2 border-ink/25 flex items-center justify-center text-ink/50 hover:border-ink hover:text-ink transition-colors font-bold text-sm"
                    aria-label="More options"
                  >
                    ···
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-[calc(100%+6px)] w-40 bg-paper border-2 border-ink shadow-[4px_4px_0_#000] z-20">
                      <button onClick={handleMuteToggle} className="w-full text-left px-3 py-2.5 font-archivo text-sm text-ink hover:bg-ink/5">
                        {isMuted ? 'Unmute' : 'Mute'}
                      </button>
                      <button onClick={() => { setMenuOpen(false); setConfirmUnfriend(true) }} className="w-full text-left px-3 py-2.5 font-archivo text-sm text-ink hover:bg-ink/5">
                        Unfriend
                      </button>
                      <button onClick={() => { setMenuOpen(false); setConfirmBlock(true) }} className="w-full text-left px-3 py-2.5 font-archivo text-sm text-red hover:bg-ink/5">
                        Block
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {friendshipStatus === 'none' && (
              <button
                onClick={handleSendRequest}
                disabled={actionLoading}
                className="font-bebas text-xs tracking-[0.15em] px-4 py-2 bg-red text-paper border-2 border-ink disabled:opacity-40"
              >
                {actionLoading ? '…' : 'ADD AS FRIEND'}
              </button>
            )}

            {friendshipStatus === 'sent' && (
              <div className="flex items-center gap-2">
                <span className="font-bebas text-xs tracking-[0.1em] text-ink/40">REQUEST PENDING</span>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="font-archivo text-xs text-ink/40 underline hover:text-red transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
              </div>
            )}

            {friendshipStatus === 'received' && (
              <div className="flex items-center gap-2">
                <span className="font-bebas text-[10px] tracking-[0.1em] text-ink/40 hidden sm:block">WANTS TO BE FRIENDS</span>
                <button
                  onClick={handleAccept}
                  disabled={actionLoading}
                  className="font-bebas text-xs tracking-[0.15em] px-3 py-1.5 bg-red text-paper border-2 border-ink disabled:opacity-40"
                >
                  ACCEPT
                </button>
                <button
                  onClick={handleDeny}
                  disabled={actionLoading}
                  className="font-archivo text-xs text-ink/40 underline hover:text-red transition-colors disabled:opacity-40"
                >
                  Deny
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-8">

        {/* Bio */}
        {theirProfile?.bio && (
          <p className="font-caveat text-2xl text-ink/80 leading-snug">{theirProfile.bio}</p>
        )}

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-0 border-t-2 border-b-2 border-ink/10 py-4">
          <div className="flex-1 min-w-[80px] text-center px-2">
            <p className="font-bebas text-3xl text-ink">{theirGameCount}</p>
            <p className="font-archivo text-[10px] text-ink/40 uppercase tracking-widest">Games Logged</p>
          </div>
          <div className="w-px h-10 bg-ink/10" />
          <div className="flex-1 min-w-[80px] text-center px-2">
            <p className="font-bebas text-3xl text-ink">{theirFriendCount}</p>
            <p className="font-archivo text-[10px] text-ink/40 uppercase tracking-widest">Friends</p>
          </div>
          {mutualFriends.length > 0 && (
            <>
              <div className="w-px h-10 bg-ink/10" />
              <div className="flex-1 min-w-[80px] text-center px-2">
                <p className="font-bebas text-3xl text-ink">{mutualFriends.length}</p>
                <p className="font-archivo text-[10px] text-ink/40 uppercase tracking-widest">Mutual</p>
              </div>
            </>
          )}
        </div>

        {/* Followed teams */}
        {allFollowedTeams.length > 0 && (
          <div>
            <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-3">FOLLOWS</p>
            <div className="flex flex-wrap gap-2">
              {allFollowedTeams.map(({ sportId, team }) => (
                <TeamBadge key={`${sportId}-${team}`} team={team} sportId={sportId} size="sm" />
              ))}
            </div>
          </div>
        )}

        {/* Mutual friends */}
        {mutualFriends.length > 0 && (
          <div>
            <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 mb-3">MUTUAL FRIENDS</p>
            <div className="flex flex-wrap gap-2">
              {mutualFriends.map(mf => (
                <Link key={mf.userId} to={`/user/${mf.userId}`} className="flex items-center gap-2 border border-ink/15 px-2 py-1 hover:border-ink transition-colors">
                  <AvatarCircle photoUrl={mf.profilePhotoUrl} name={mf.displayName} size="sm" />
                  <span className="font-archivo text-xs text-ink">{mf.displayName ?? mf.username ?? 'Unknown'}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Games section */}
        {friendshipStatus === 'friends' ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <p className="font-bebas text-xs tracking-[0.2em] text-ink/40 flex-shrink-0">GAMES ATTENDED</p>
              <div className="flex-1 h-px bg-ink/10" />
              <p className="font-archivo text-[10px] text-ink/30">LIGHT VIEW — personal details hidden</p>
            </div>
            {theirGames.length === 0 ? (
              <p className="font-caveat text-lg text-ink/30 text-center py-6">No games logged yet</p>
            ) : (
              <div className="flex flex-col gap-2">
                {theirGames.map(game => (
                  <FriendGameCard key={game.id} game={game} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="border-2 border-ink/10 bg-paper-deep p-6 text-center">
            <p className="font-bebas text-sm tracking-[0.15em] text-ink/30 mb-1">
              {theirGameCount} GAMES LOGGED
            </p>
            <p className="font-archivo text-xs text-ink/30">
              Become friends to see their game diary
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

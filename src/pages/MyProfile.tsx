import { useEffect, useRef, useState } from 'react'
import Nav from '@/components/Nav'
import AvatarCircle from '@/components/AvatarCircle'
import TeamBadge from '@/components/TeamBadge'
import Toggle from '@/components/Toggle'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/lib/AuthContext'
import { useProfileContext } from '@/lib/ProfileContext'
import { updateMyProfile } from '@/lib/friendsStore'
import { compressAvatarImage } from '@/lib/profileUtils'
import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken'

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="font-bebas text-base tracking-[0.2em] text-ink/50 flex-shrink-0">{title}</h2>
      <div className="flex-1 h-px bg-ink/15" />
    </div>
  )
}


export default function MyProfile() {
  const { user } = useAuth()
  const { myProfile, myProfileLoading, refreshMyProfile } = useProfileContext()
  const toast = useToast()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // Edit form
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [editDiscoverByUsername, setEditDiscoverByUsername] = useState(true)
  const [editDiscoverByEmail, setEditDiscoverByEmail] = useState(true)
  const [editDiscoverByShareCode, setEditDiscoverByShareCode] = useState(true)
  const [editPrivacyMode, setEditPrivacyMode] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')

  // Stats
  const [gamesCount, setGamesCount] = useState(0)
  const [friendsCount, setFriendsCount] = useState(0)
  const [followedTeams, setFollowedTeams] = useState<Record<string, string[]>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!user) return
    Promise.all([
      supabase.from('games').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      db.from('friendships').select('*', { count: 'exact', head: true }).or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`),
      supabase.from('user_settings').select('followed_teams').eq('user_id', user.id).maybeSingle(),
    ]).then(([games, friends, settings]) => {
      setGamesCount(games.count ?? 0)
      setFriendsCount(friends.count ?? 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const followed = (settings.data as any)?.followed_teams
      if (followed) setFollowedTeams(followed as Record<string, string[]>)
    })
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function startEditing() {
    if (!myProfile) return
    setEditDisplayName(myProfile.displayName ?? '')
    setEditUsername(myProfile.username ?? '')
    setEditBio(myProfile.bio ?? '')
    setEditPhotoPreview(null)
    setEditDiscoverByUsername(myProfile.isDiscoverableByUsername)
    setEditDiscoverByEmail(myProfile.isDiscoverableByEmail)
    setEditDiscoverByShareCode(myProfile.isDiscoverableByShareCode)
    setEditPrivacyMode(myProfile.privacyMode)
    setUsernameStatus('idle')
    setEditing(true)
  }

  function handleUsernameChange(val: string) {
    const cleaned = val.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30)
    setEditUsername(cleaned)
    clearTimeout(usernameTimerRef.current)

    if (!cleaned || cleaned === myProfile?.username) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    usernameTimerRef.current = setTimeout(async () => {
      const { data } = await db
        .from('user_profiles')
        .select('user_id')
        .eq('username', cleaned)
        .maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 500)
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const compressed = await compressAvatarImage(file)
      setEditPhotoPreview(compressed)
    } catch {
      toast('Could not process photo', 'error')
    }
    // Reset input so the same file can be picked again
    e.target.value = ''
  }

  async function handleSave() {
    if (usernameStatus === 'taken' || usernameStatus === 'checking') return
    setSaving(true)
    try {
      await updateMyProfile({
        displayName: editDisplayName.trim() || null,
        username: editUsername.trim() || null,
        bio: editBio.trim() || null,
        profilePhotoUrl: editPhotoPreview ?? myProfile?.profilePhotoUrl,
        isDiscoverableByUsername: editDiscoverByUsername,
        isDiscoverableByEmail: editDiscoverByEmail,
        isDiscoverableByShareCode: editDiscoverByShareCode,
        privacyMode: editPrivacyMode,
      })
      await refreshMyProfile()
      setEditing(false)
      toast('Profile saved')
    } catch (err) {
      toast((err as Error).message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function copyShareCode() {
    if (!myProfile?.shareCode) return
    await navigator.clipboard.writeText(myProfile.shareCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const allFollowedTeams = Object.entries(followedTeams).flatMap(([sportId, teams]) =>
    teams.map(team => ({ sportId, team }))
  )

  const sportsFollowedCount = Object.values(followedTeams).filter(t => t.length > 0).length

  if (myProfileLoading) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <div className="flex justify-center items-center pt-24">
          <div
            className="w-8 h-8 border-[3px] border-ink/15 border-t-ink rounded-full"
            style={{ animation: 'spin 0.65s linear infinite' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      <header className="bg-hero-blue border-b-4 border-ink">
        <div className="max-w-2xl mx-auto px-4 lg:px-8 py-8 flex items-center justify-between">
          <h1 className="font-bebas text-4xl tracking-[0.15em] text-ink">MY PROFILE</h1>
          {!editing && (
            <button
              onClick={startEditing}
              className="font-bebas text-sm tracking-[0.15em] px-5 py-2.5 bg-paper border-2 border-ink hover:bg-paper-deep transition-colors"
            >
              EDIT PROFILE
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-8">

        {/* Avatar + name row */}
        <div className="flex items-start gap-6">
          <div className="relative flex-shrink-0">
            <AvatarCircle
              photoUrl={editing ? (editPhotoPreview ?? myProfile?.profilePhotoUrl) : myProfile?.profilePhotoUrl}
              name={editing ? editDisplayName : myProfile?.displayName}
              size="xl"
            />
            {editing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center text-paper font-bebas text-xs tracking-[0.1em] opacity-0 hover:opacity-100 transition-opacity"
              >
                CHANGE
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="font-bebas text-xs tracking-[0.15em] text-ink/40 block mb-1">DISPLAY NAME</label>
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={e => setEditDisplayName(e.target.value.slice(0, 50))}
                    placeholder="Your name"
                    className="w-full bg-white border-2 border-ink px-3 py-2 font-caveat text-2xl text-ink placeholder-ink/30 focus:outline-none focus:border-red transition-colors"
                  />
                </div>
                <div>
                  <label className="font-bebas text-xs tracking-[0.15em] text-ink/40 block mb-1">
                    USERNAME <span className="text-ink/25 normal-case font-archivo text-[10px]">letters, numbers, underscores · max 30</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-archivo text-sm text-ink/40">@</span>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={e => handleUsernameChange(e.target.value)}
                      placeholder="yourname"
                      className="w-full bg-white border-2 border-ink pl-7 pr-3 py-2 font-archivo text-sm text-ink placeholder-ink/30 focus:outline-none focus:border-red transition-colors"
                    />
                  </div>
                  {usernameStatus === 'checking' && (
                    <p className="font-archivo text-xs text-ink/40 mt-1">Checking…</p>
                  )}
                  {usernameStatus === 'available' && (
                    <p className="font-archivo text-xs text-green-600 mt-1">✓ Available</p>
                  )}
                  {usernameStatus === 'taken' && (
                    <p className="font-archivo text-xs text-red mt-1">✗ Already taken</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <p className="font-caveat text-4xl text-ink leading-tight">
                  {myProfile?.displayName || 'No name set'}
                </p>
                {myProfile?.username && (
                  <p className="font-archivo text-sm text-ink/50 mt-1">@{myProfile.username}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {editing ? (
          <div>
            <label className="font-bebas text-xs tracking-[0.15em] text-ink/40 block mb-1">
              BIO{' '}
              <span className="text-ink/25 normal-case font-archivo text-[10px]">
                {editBio.length}/280
              </span>
            </label>
            <textarea
              value={editBio}
              onChange={e => setEditBio(e.target.value.slice(0, 280))}
              placeholder="A little about yourself…"
              rows={3}
              className="w-full bg-white border-2 border-ink px-3 py-2.5 font-caveat text-xl text-ink placeholder-ink/30 focus:outline-none focus:border-red transition-colors resize-none"
            />
          </div>
        ) : (
          myProfile?.bio ? (
            <p className="font-caveat text-2xl text-ink/80 leading-snug">{myProfile.bio}</p>
          ) : null
        )}

        {/* Share code (view only) */}
        {!editing && myProfile?.shareCode && (
          <div className="flex items-center gap-4 bg-paper-deep border-2 border-ink/15 px-4 py-3">
            <div>
              <p className="font-bebas text-[10px] tracking-[0.25em] text-ink/40 mb-0.5">YOUR SHARE CODE</p>
              <p className="font-bebas text-2xl tracking-[0.4em] text-ink">{myProfile.shareCode}</p>
            </div>
            <button
              onClick={copyShareCode}
              className="ml-auto font-bebas text-xs tracking-[0.15em] px-3 py-1.5 border-2 border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
            >
              {copied ? 'COPIED!' : 'COPY'}
            </button>
          </div>
        )}

        {/* Stats (view only) */}
        {!editing && (
          <div className="flex flex-wrap items-center gap-0 border-t-2 border-b-2 border-ink/10 py-4">
            <div className="flex-1 min-w-[80px] text-center px-2">
              <p className="font-bebas text-3xl text-ink">{gamesCount}</p>
              <p className="font-archivo text-[10px] text-ink/40 uppercase tracking-widest">Games Logged</p>
            </div>
            <div className="w-px h-10 bg-ink/10" />
            <div className="flex-1 min-w-[80px] text-center px-2">
              <p className="font-bebas text-3xl text-ink">{friendsCount}</p>
              <p className="font-archivo text-[10px] text-ink/40 uppercase tracking-widest">Friends</p>
            </div>
            {sportsFollowedCount > 0 && (
              <>
                <div className="w-px h-10 bg-ink/10" />
                <div className="flex-1 min-w-[80px] text-center px-2">
                  <p className="font-bebas text-3xl text-ink">{sportsFollowedCount}</p>
                  <p className="font-archivo text-[10px] text-ink/40 uppercase tracking-widest">Sports</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Followed teams (view only) */}
        {!editing && allFollowedTeams.length > 0 && (
          <div>
            <SectionDivider title="FOLLOWED TEAMS" />
            <div className="flex flex-wrap gap-2">
              {allFollowedTeams.map(({ sportId, team }) => (
                <TeamBadge key={`${sportId}-${team}`} team={team} sportId={sportId} size="sm" />
              ))}
            </div>
          </div>
        )}

        {/* Discovery & privacy toggles (edit only) */}
        {editing && (
          <div className="flex flex-col gap-6">
            <div>
              <SectionDivider title="DISCOVERY" />
              <div className="flex flex-col gap-4">
                <Toggle
                  checked={editDiscoverByUsername}
                  onChange={setEditDiscoverByUsername}
                  label="Allow people to find me by username"
                />
                <Toggle
                  checked={editDiscoverByEmail}
                  onChange={setEditDiscoverByEmail}
                  label="Allow people to find me by email"
                />
                <Toggle
                  checked={editDiscoverByShareCode}
                  onChange={setEditDiscoverByShareCode}
                  label="Allow people to find me by share code"
                />
              </div>
            </div>

            <div>
              <SectionDivider title="PRIVACY" />
              <Toggle
                checked={editPrivacyMode}
                onChange={setEditPrivacyMode}
                label="Privacy Mode"
                description="When on, you're hidden from discovery, new games default to private, and your existing shared games become less visible."
              />
            </div>
          </div>
        )}

        {/* Save / Cancel (edit only) */}
        {editing && (
          <div className="flex items-center gap-4 pt-2 border-t-2 border-ink/10">
            <button
              onClick={handleSave}
              disabled={saving || usernameStatus === 'taken' || usernameStatus === 'checking'}
              className="font-bebas text-lg tracking-[0.15em] px-8 py-3 bg-red text-paper border-2 border-ink disabled:opacity-40 transition-opacity btn-press"
            >
              {saving ? 'SAVING…' : 'SAVE PROFILE'}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="font-bebas text-lg tracking-[0.15em] px-6 py-3 bg-paper text-ink border-2 border-ink hover:bg-paper-deep transition-colors"
            >
              CANCEL
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

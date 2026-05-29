import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { dbProfileToProfile, type UserProfile } from '@/types/database'
import { getUnreadCount } from '@/lib/notificationsStore'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

interface ProfileCtxValue {
  myProfile: UserProfile | null
  myProfileLoading: boolean
  pendingRequestCount: number
  unreadNotificationCount: number
  refreshMyProfile: () => Promise<void>
  refreshRequestCount: () => Promise<void>
  refreshUnreadCount: () => Promise<void>
}

const ProfileCtx = createContext<ProfileCtxValue | null>(null)

async function ensureProfileExists(
  userId: string,
  email: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { data: existing } = await db
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return

  const rawName = ((metadata.full_name ?? metadata.name ?? '') as string).trim()
  const displayName = rawName || email.split('@')[0]

  await db.from('user_profiles').insert({
    user_id: userId,
    display_name: displayName,
    username: null,
    bio: null,
    profile_photo_url: null,
    is_discoverable_by_username: true,
    is_discoverable_by_email: true,
    is_discoverable_by_share_code: true,
    privacy_mode: false,
  })
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [myProfile, setMyProfile] = useState<UserProfile | null>(null)
  const [myProfileLoading, setMyProfileLoading] = useState(true)
  const [pendingRequestCount, setPendingRequestCount] = useState(0)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refreshMyProfile = useCallback(async () => {
    if (!user) {
      setMyProfile(null)
      setMyProfileLoading(false)
      return
    }
    setMyProfileLoading(true)
    try {
      const { data } = await db
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      setMyProfile(data ? dbProfileToProfile(data) : null)
    } finally {
      setMyProfileLoading(false)
    }
  }, [user])

  const refreshRequestCount = useCallback(async () => {
    if (!user) { setPendingRequestCount(0); return }
    const { count } = await db
      .from('friend_requests')
      .select('*', { count: 'exact', head: true })
      .eq('to_user_id', user.id)
      .eq('status', 'pending')
    setPendingRequestCount(count ?? 0)
  }, [user])

  const refreshUnreadCount = useCallback(async () => {
    if (!user) { setUnreadNotificationCount(0); return }
    const n = await getUnreadCount().catch(() => 0)
    setUnreadNotificationCount(n)
  }, [user])

  useEffect(() => {
    if (!user) {
      setMyProfile(null)
      setMyProfileLoading(false)
      setPendingRequestCount(0)
      setUnreadNotificationCount(0)
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }
    ensureProfileExists(user.id, user.email ?? '', user.user_metadata ?? {})
      .then(() => Promise.all([refreshMyProfile(), refreshRequestCount(), refreshUnreadCount()]))
      .catch(console.error)

    // Poll unread count every 60s to catch notifications from other users
    pollRef.current = setInterval(() => {
      refreshUnreadCount().catch(() => {})
    }, 60_000)

    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ProfileCtx.Provider value={{
      myProfile, myProfileLoading, pendingRequestCount, unreadNotificationCount,
      refreshMyProfile, refreshRequestCount, refreshUnreadCount,
    }}>
      {children}
    </ProfileCtx.Provider>
  )
}

export function useProfileContext() {
  const ctx = useContext(ProfileCtx)
  if (!ctx) throw new Error('useProfileContext must be inside ProfileProvider')
  return ctx
}

import { useRef, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { useProfileContext } from '@/lib/ProfileContext'
import NotificationsInbox from '@/components/NotificationsInbox'

function UserMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!user) return null

  const initial = (user.email ?? '?')[0].toUpperCase()

  const handleSignOut = async () => {
    setOpen(false)
    await signOut()
    navigate('/login')
  }

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-red border-2 border-ink flex items-center justify-center font-bebas text-sm text-paper leading-none hover:bg-red-deep transition-colors"
        aria-label="User menu"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] w-56 bg-paper border-2 border-ink card-stamp z-50">
          <div className="px-4 py-3 border-b-2 border-ink/10">
            <p className="font-bebas text-xs tracking-[0.15em] text-ink/40 mb-0.5">LOGGED IN AS</p>
            <p className="font-archivo text-sm text-ink truncate">{user.email}</p>
          </div>

          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-3 font-archivo text-sm text-ink hover:bg-ink/5 transition-colors border-b-2 border-ink/10"
          >
            My Profile
          </Link>

          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-3 font-archivo text-sm text-ink hover:bg-ink/5 transition-colors border-b-2 border-ink/10"
          >
            Settings
          </Link>

          <button
            onClick={handleSignOut}
            className="w-full text-left flex items-center px-4 py-3 font-archivo text-sm text-red hover:bg-ink/5 transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export default function Nav() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { pendingRequestCount, unreadNotificationCount, refreshUnreadCount } = useProfileContext()
  const [inboxOpen, setInboxOpen] = useState(false)

  const friendsActive = pathname === '/friends' || pathname.startsWith('/friends/') || pathname.startsWith('/user/')

  const navItem = (to: string, label: string) => {
    const active = pathname === to || pathname.startsWith(to + '/')
    return (
      <Link
        to={to}
        className={`flex-1 text-center font-bebas text-sm tracking-[0.2em] px-1 py-3 border-b-2 transition-colors min-w-0 ${
          active
            ? 'border-red text-ink'
            : 'border-transparent text-ink/40 hover:text-ink hover:border-ink/30'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <div className="bg-paper border-b border-ink/15 relative">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center -mb-[2px]">
        {/* Nav items — evenly spaced across available width */}
        <div className="flex items-center flex-1 min-w-0">
          {navItem('/', 'TIMELINE')}
          {navItem('/feed', 'FEED')}

          {/* Friends tab with pending badge */}
          <Link
            to="/friends"
            className={`flex-1 text-center relative font-bebas text-sm tracking-[0.2em] px-1 py-3 border-b-2 transition-colors min-w-0 ${
              friendsActive
                ? 'border-red text-ink'
                : 'border-transparent text-ink/40 hover:text-ink hover:border-ink/30'
            }`}
          >
            FRIENDS
            {pendingRequestCount > 0 && (
              <span className="absolute top-1.5 right-0.5 w-4 h-4 bg-red border border-ink rounded-full flex items-center justify-center font-archivo text-[9px] text-paper font-bold leading-none">
                {pendingRequestCount > 9 ? '9+' : pendingRequestCount}
              </span>
            )}
          </Link>

          {navItem('/stats', 'STATS')}
        </div>

        {/* Bell + avatar pinned to the right */}
        <div className="flex-shrink-0 pl-2 pb-[2px] flex items-center gap-2">
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setInboxOpen((v) => !v)}
                aria-label="Notifications"
                className="relative w-8 h-8 flex items-center justify-center text-ink/50 hover:text-ink transition-colors"
              >
                {/* Bell icon (SVG) */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-0 right-0 min-w-[14px] h-[14px] bg-red border border-ink rounded-full flex items-center justify-center font-archivo text-[8px] text-paper font-bold leading-none px-[2px]">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>

              {inboxOpen && (
                <NotificationsInbox
                  onClose={() => setInboxOpen(false)}
                  onCountRefresh={() => refreshUnreadCount().catch(() => {})}
                />
              )}
            </div>
          )}
          <UserMenu />
        </div>
      </div>
    </div>
  )
}

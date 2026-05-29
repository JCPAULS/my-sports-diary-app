import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Nav from '@/components/Nav'
import Toggle from '@/components/Toggle'
import { ENABLED_SPORTS } from '@/lib/sports'
import { getTeamsBySport, getTeam } from '@/lib/teams'
import { getSettings, applyTheme, type AppSettings } from '@/lib/settings'
import * as settingsStore from '@/lib/settingsStore'
import { getAllGames } from '@/lib/storage'
import { useMigration } from '@/lib/MigrationContext'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import {
  getNotifPrefs,
  saveNotifPrefs,
  ALL_NOTIF_TYPES,
  NOTIF_TYPE_LABELS,
  type NotificationPrefs,
} from '@/lib/notificationPrefs'
import {
  isPushSupported,
  isIosDevice,
  isInStandaloneMode,
  getCurrentPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isCurrentlySubscribed,
} from '@/lib/pushStore'

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="font-bebas text-xl tracking-[0.2em] text-ink flex-shrink-0">{title}</h2>
      <div className="flex-1 h-[2px] bg-ink" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  const navigate = useNavigate()
  const { triggerMigration } = useMigration()
  const [settings, setSettings] = useState<AppSettings>(getSettings)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const hasLocalGames = getAllGames().length > 0

  // ─── Notification state ───────────────────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(getNotifPrefs)
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [subscribeStatus, setSubscribeStatus] = useState<string | null>(null)
  const [checkingPush, setCheckingPush] = useState(true)
  const pushSupported = isPushSupported()
  const isIos = isIosDevice()
  const isStandalone = isInStandaloneMode()
  const vapidConfigured = !!import.meta.env.VITE_VAPID_PUBLIC_KEY

  useEffect(() => {
    setPushPermission(getCurrentPermission())
    isCurrentlySubscribed().then((v) => {
      setIsSubscribed(v)
      setCheckingPush(false)
    }).catch(() => setCheckingPush(false))
  }, [])

  function updateNotifPrefs(updates: Partial<NotificationPrefs>) {
    setNotifPrefs((prev) => {
      const next = { ...prev, ...updates }
      saveNotifPrefs(next)
      return next
    })
  }

  function togglePushType(type: typeof ALL_NOTIF_TYPES[number]) {
    const next = { ...notifPrefs.push, [type]: !notifPrefs.push[type] }
    updateNotifPrefs({ push: next })
  }

  async function handleEnablePush() {
    setSubscribeStatus(null)
    const result = await subscribeToPush()
    setPushPermission(getCurrentPermission())
    if (result === 'subscribed' || result === 'already_subscribed') {
      setIsSubscribed(true)
      setSubscribeStatus('push_enabled')
    } else if (result === 'permission_denied') {
      setSubscribeStatus('permission_denied')
    } else if (result === 'no_vapid_key') {
      setSubscribeStatus('no_vapid_key')
    } else {
      setSubscribeStatus('error')
    }
  }

  async function handleDisablePush() {
    await unsubscribeFromPush()
    setIsSubscribed(false)
    setSubscribeStatus(null)
  }

  // ─── Account deletion ─────────────────────────────────────────────────────
  const { signOut } = useAuth()
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const deleteInputRef = useRef<HTMLInputElement>(null)

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return
    setDeleting(true)
    setDeleteError(null)
    try {
      // 1. Delete game photos from storage (best-effort)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: folders } = await supabase.storage.from('game-photos').list(user.id)
        if (folders?.length) {
          for (const folder of folders) {
            const { data: files } = await supabase.storage.from('game-photos').list(`${user.id}/${folder.name}`)
            if (files?.length) {
              const paths = files.map((f) => `${user.id}/${folder.name}/${f.name}`)
              await supabase.storage.from('game-photos').remove(paths).catch(() => {})
            }
          }
        }
      }

      // 2. Call the SECURITY DEFINER RPC — deletes auth.users, cascades everything
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).rpc('delete_my_account')
      if (error) throw new Error(error.message)

      // 3. Sign out and redirect
      await signOut()
      navigate('/login')
    } catch (err) {
      setDeleteError(
        (err as Error).message?.includes('not_authenticated')
          ? 'Session expired — please sign in again.'
          : 'Deletion failed. Contact support or try again.',
      )
      setDeleting(false)
    }
  }

  // Load latest settings from Supabase on mount
  useEffect(() => {
    settingsStore.getSettings().then((s) => {
      setSettings(s)
      applyTheme(s)
    }).catch(() => {})
  }, [])

  // Live preview: apply theme as user tweaks it, revert on unmount if not saved
  useEffect(() => {
    applyTheme(settings)
  }, [settings.themeMode, settings.primaryFavoriteTeam])

  useEffect(() => {
    return () => { applyTheme() } // revert to persisted settings on unmount
  }, [])

  const selectClass =
    'w-full bg-white border-2 border-ink px-3 py-2.5 font-archivo text-base text-ink focus:outline-none focus:border-red transition-colors cursor-pointer'

  function toggleTeam(sportId: string, teamName: string) {
    setSettings((prev) => {
      const current = prev.followedTeams[sportId] ?? []
      const isFollowing = current.includes(teamName)
      const next: AppSettings = {
        ...prev,
        followedTeams: { ...prev.followedTeams },
      }
      if (isFollowing) {
        next.followedTeams[sportId] = current.filter((t) => t !== teamName)
        // Clear primary if this team was it
        if (prev.primaryFavoriteTeam?.sportId === sportId && prev.primaryFavoriteTeam?.teamName === teamName) {
          next.primaryFavoriteTeam = null
        }
      } else {
        next.followedTeams[sportId] = [...current, teamName]
      }
      return next
    })
  }

  function setPrimary(sportId: string, teamName: string) {
    setSettings((prev) => ({
      ...prev,
      primaryFavoriteTeam: sportId && teamName ? { sportId, teamName } : null,
    }))
  }

  async function handleSave() {
    setSaving(true)
    await settingsStore.saveSettings(settings)
    applyTheme(settings)
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 1500)
  }

  // Sports with static team data (can follow teams)
  const sportsWithTeams = ENABLED_SPORTS.filter(
    (s) => !s.isCustom && getTeamsBySport(s.id).length > 0
  )

  // All eligible theme teams across all followed teams
  const themeOptions: { sportId: string; teamName: string; color: string }[] = []
  for (const [sid, teamNames] of Object.entries(settings.followedTeams)) {
    for (const teamName of teamNames) {
      const team = getTeam(sid, teamName)
      if (team?.textColor === 'white' && team?.primaryColor) {
        themeOptions.push({ sportId: sid, teamName, color: team.primaryColor })
      }
    }
  }

  const primaryTeam = settings.primaryFavoriteTeam
    ? getTeam(settings.primaryFavoriteTeam.sportId, settings.primaryFavoriteTeam.teamName)
    : null

  const sport = ENABLED_SPORTS.find((s) => s.id === settings.primaryFavoriteTeam?.sportId)

  return (
    <div className="min-h-screen bg-paper">
      <Nav />

      <header className="bg-hero-blue border-b-4 border-ink">
        <div className="max-w-2xl mx-auto px-4 lg:px-8 py-8">
          <h1 className="font-bebas text-6xl text-ink tracking-wide leading-none">SETTINGS</h1>
          <p className="font-caveat text-xl text-navy mt-1">personalize your diary</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 lg:px-8 py-8 flex flex-col gap-10">

        {/* ── FOLLOWED TEAMS ── */}
        <div>
          <SectionHeader title="FOLLOWED TEAMS" />
          <p className="font-caveat text-base text-ink/50 mb-5">
            Follow your teams to auto-fill "who were you rooting for" and highlight them in stats.
          </p>
          <div className="flex flex-col gap-4">
            {sportsWithTeams.map((s) => {
              const followed = settings.followedTeams[s.id] ?? []
              const available = getTeamsBySport(s.id).map((t) => t.name).sort().filter((n) => !followed.includes(n))
              return (
                <div key={s.id} className="grid grid-cols-[120px_1fr] items-start gap-4">
                  <span className="font-bebas text-sm tracking-[0.15em] text-ink pt-2">{s.label}</span>
                  <div className="flex flex-wrap gap-2 min-h-[38px] items-center">
                    {followed.map((teamName) => (
                      <span
                        key={teamName}
                        className="inline-flex items-center gap-1.5 font-bebas text-xs tracking-[0.08em] bg-paper border-2 border-ink text-ink px-2.5 py-1"
                      >
                        {teamName}
                        <button
                          type="button"
                          onClick={() => toggleTeam(s.id, teamName)}
                          className="text-red hover:text-red-deep font-archivo font-bold text-sm leading-none"
                          aria-label={`Unfollow ${teamName}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {available.length > 0 && (
                      <select
                        value=""
                        onChange={(e) => { if (e.target.value) { toggleTeam(s.id, e.target.value) } }}
                        className="font-bebas text-xs tracking-[0.08em] bg-paper border-2 border-dashed border-ink/40 text-ink/50 px-2.5 py-1 focus:outline-none focus:border-ink hover:border-ink/70 transition-colors cursor-pointer"
                      >
                        <option value="">+ Add team</option>
                        {available.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── THEME ── */}
        <div>
          <SectionHeader title="APP THEME" />
          <p className="font-caveat text-base text-ink/50 mb-5">
            Team Colors replaces the app's red accent with your favorite team's color.
          </p>

          {/* Mode toggle */}
          <div className="flex gap-3 mb-6">
            {(['classic', 'team'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSettings((p) => ({ ...p, themeMode: mode }))}
                className={`font-bebas text-lg tracking-[0.15em] px-5 py-2.5 border-2 border-ink transition-all ${
                  settings.themeMode === mode
                    ? 'bg-red text-white shadow-[3px_3px_0_#000]'
                    : 'bg-paper text-ink/50 hover:text-ink'
                }`}
              >
                {mode === 'classic' ? 'CLASSIC' : 'TEAM COLORS'}
              </button>
            ))}
          </div>

          {/* Team picker — shown in team mode */}
          {settings.themeMode === 'team' && (
            <div className="flex flex-col gap-4 pl-1 border-l-4 border-ink/20">
              {themeOptions.length === 0 ? (
                <p className="font-caveat text-base text-ink/50">
                  Follow a team above first. Only teams with darker colors are available for theming (so text stays readable).
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                    <span className="font-bebas text-sm tracking-[0.15em] text-ink">PRIMARY TEAM</span>
                    <select
                      value={
                        settings.primaryFavoriteTeam
                          ? `${settings.primaryFavoriteTeam.sportId}::${settings.primaryFavoriteTeam.teamName}`
                          : ''
                      }
                      onChange={(e) => {
                        const [sid, teamName] = e.target.value.split('::')
                        setPrimary(sid ?? '', teamName ?? '')
                      }}
                      className={selectClass}
                    >
                      <option value="">— pick team —</option>
                      {themeOptions.map(({ sportId, teamName }) => (
                        <option key={`${sportId}::${teamName}`} value={`${sportId}::${teamName}`}>
                          {teamName} ({ENABLED_SPORTS.find((s) => s.id === sportId)?.label})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Live color preview */}
                  {primaryTeam && (
                    <div className="flex items-center gap-4 mt-1">
                      <div
                        className="w-12 h-12 border-2 border-ink flex-shrink-0 shadow-[3px_3px_0_#000]"
                        style={{ background: primaryTeam.primaryColor }}
                      />
                      <div>
                        <p className="font-bebas text-base text-ink leading-tight">
                          {settings.primaryFavoriteTeam?.teamName}
                        </p>
                        <p className="font-bebas text-xs tracking-[0.1em] text-ink/40">
                          {sport?.label} · {primaryTeam.primaryColor?.toUpperCase()}
                        </p>
                        {/* Sample accent button */}
                        <button
                          type="button"
                          className="font-bebas text-sm tracking-[0.15em] bg-red text-white border-2 border-ink px-4 py-1.5 mt-2 btn-press"
                        >
                          SAMPLE BUTTON
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── RESTORE DEVICE GAMES ── */}
        {hasLocalGames && (
          <div>
            <SectionHeader title="DATA" />
            <p className="font-caveat text-base text-ink/50 mb-4">
              You have games saved on this device. Back them up to your account to access them anywhere.
            </p>
            <button
              type="button"
              onClick={triggerMigration}
              className="font-bebas text-lg tracking-[0.15em] bg-paper border-2 border-ink text-ink px-6 py-2.5 hover:bg-paper-deep transition-colors"
            >
              RESTORE DEVICE GAMES
            </button>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        <div>
          <SectionHeader title="NOTIFICATIONS" />

          {/* Master pause toggle */}
          <div className="mb-6 p-4 border-2 border-ink/20 bg-paper-deep">
            <Toggle
              checked={notifPrefs.pauseAll}
              onChange={(v) => updateNotifPrefs({ pauseAll: v })}
              label="Pause all notifications"
              description="Notifications are still recorded but won't send push alerts."
            />
          </div>

          {/* Push notifications setup */}
          <div className="mb-6">
            <p className="font-bebas text-sm tracking-[0.15em] text-ink mb-3">PUSH NOTIFICATIONS</p>

            {!pushSupported && (
              <div className="p-3 border border-ink/20 bg-paper-deep">
                <p className="font-archivo text-sm text-ink/50">
                  Push notifications are not supported in this browser.
                </p>
              </div>
            )}

            {pushSupported && isIos && !isStandalone && (
              <div className="p-3 border border-gold/50 bg-gold/5 mb-3">
                <p className="font-bebas text-xs tracking-[0.1em] text-ink/70 mb-1">IPHONE NOTE</p>
                <p className="font-archivo text-sm text-ink/60 leading-snug">
                  Push notifications on iPhone require the app to be added to your Home Screen first.
                  Tap the Share button → "Add to Home Screen", then reopen from there.
                </p>
              </div>
            )}

            {pushSupported && !vapidConfigured && (
              <div className="p-3 border border-ink/20 bg-paper-deep">
                <p className="font-archivo text-sm text-ink/50">
                  Push notifications are not configured for this deployment.
                </p>
              </div>
            )}

            {pushSupported && vapidConfigured && !checkingPush && (
              <div className="flex items-center gap-3">
                {isSubscribed ? (
                  <>
                    <span className="font-archivo text-sm text-ink/60">Push enabled on this device</span>
                    <button
                      type="button"
                      onClick={handleDisablePush}
                      className="font-bebas text-xs tracking-[0.1em] text-ink/40 hover:text-red underline transition-colors"
                    >
                      DISABLE
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleEnablePush}
                    disabled={pushPermission === 'denied'}
                    className="font-bebas text-sm tracking-[0.15em] bg-ink text-paper px-5 py-2.5 hover:bg-red transition-colors disabled:opacity-40"
                  >
                    ENABLE PUSH NOTIFICATIONS
                  </button>
                )}
              </div>
            )}

            {subscribeStatus === 'permission_denied' && (
              <p className="font-archivo text-xs text-red mt-2">
                Notifications are blocked. Enable them in your browser settings and try again.
              </p>
            )}
            {subscribeStatus === 'push_enabled' && (
              <p className="font-archivo text-xs text-ink/50 mt-2">Push notifications enabled!</p>
            )}
            {subscribeStatus === 'error' && (
              <p className="font-archivo text-xs text-red mt-2">
                Something went wrong. Try again or reload the page.
              </p>
            )}
          </div>

          {/* Per-type push toggles */}
          {pushSupported && vapidConfigured && (
            <div className="flex flex-col gap-4">
              <p className="font-bebas text-xs tracking-[0.15em] text-ink/40">PUSH ALERTS FOR</p>
              {ALL_NOTIF_TYPES.map((type) => (
                <Toggle
                  key={type}
                  checked={notifPrefs.push[type]}
                  onChange={() => togglePushType(type)}
                  label={NOTIF_TYPE_LABELS[type]}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── DANGER ZONE ── */}
        <div>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="font-bebas text-xl tracking-[0.2em] text-red flex-shrink-0">DANGER ZONE</h2>
            <div className="flex-1 h-[2px] bg-red/30" />
          </div>
          <div className="border-2 border-red/30 bg-paper-deep p-5">
            <p className="font-bebas text-sm tracking-[0.15em] text-ink mb-1">DELETE ACCOUNT</p>
            <p className="font-archivo text-sm text-ink/50 mb-4 leading-snug">
              This permanently deletes your account, all your games, photos, and data.
              Friends will not be notified. This cannot be undone.
            </p>
            <p className="font-bebas text-xs tracking-[0.15em] text-ink/60 mb-2">
              TYPE <span className="text-red">DELETE</span> TO CONFIRM
            </p>
            <div className="flex items-center gap-3">
              <input
                ref={deleteInputRef}
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                disabled={deleting}
                className="flex-1 max-w-[160px] bg-white border-2 border-ink/30 px-3 py-2 font-bebas text-sm tracking-[0.15em] text-ink focus:outline-none focus:border-red transition-colors disabled:opacity-40"
              />
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                className="font-bebas text-sm tracking-[0.1em] bg-red text-white border-2 border-ink px-5 py-2 disabled:opacity-30 transition-opacity"
              >
                {deleting ? 'DELETING…' : 'DELETE MY ACCOUNT'}
              </button>
            </div>
            {deleteError && (
              <p className="font-archivo text-xs text-red mt-2">{deleteError}</p>
            )}
          </div>
        </div>

        {/* ── SAVE ── */}
        <div className="flex items-center gap-4 pt-2 border-t-2 border-ink/10">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="font-bebas text-2xl tracking-[0.15em] bg-red text-white border-2 border-ink px-8 py-3 btn-press disabled:opacity-50"
          >
            {saving ? 'SAVING…' : saved ? 'SAVED ✓' : 'SAVE SETTINGS'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="font-archivo text-sm text-ink/50 hover:text-ink underline transition-colors"
          >
            Cancel
          </button>
        </div>

      </main>
    </div>
  )
}

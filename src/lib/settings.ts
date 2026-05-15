import { getTeam } from '@/lib/teams'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  favoriteTeams: Record<string, string>                            // sportId → teamName
  themeMode: 'classic' | 'team'
  primaryFavoriteTeam: { sportId: string; teamName: string } | null
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const KEY = 'sports-diary-settings'

function defaults(): AppSettings {
  return { favoriteTeams: {}, themeMode: 'classic', primaryFavoriteTeam: null }
}

export function getSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults()
    return { ...defaults(), ...JSON.parse(raw) }
  } catch {
    return defaults()
  }
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}

// ─── Theme application ────────────────────────────────────────────────────────

export function applyTheme(s?: AppSettings): void {
  const settings = s ?? getSettings()
  const root = document.documentElement

  if (settings.themeMode === 'team' && settings.primaryFavoriteTeam) {
    const { sportId, teamName } = settings.primaryFavoriteTeam
    const team = getTeam(sportId, teamName)
    if (team?.primaryColor) {
      root.style.setProperty('--color-red', team.primaryColor)
      root.style.setProperty('--color-red-deep', shadeColor(team.primaryColor, -20))
      return
    }
  }

  root.style.removeProperty('--color-red')
  root.style.removeProperty('--color-red-deep')
}

function shadeColor(hex: string, pct: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + pct * 2.55))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + pct * 2.55))
  const b = Math.max(0, Math.min(255, (n & 0xff) + pct * 2.55))
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
}

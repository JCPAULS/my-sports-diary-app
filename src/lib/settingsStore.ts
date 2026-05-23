import { supabase } from '@/lib/supabase'
import { getSettings as lsGet, saveSettings as lsSave, type AppSettings } from '@/lib/settings'
import type { DbUserSettings } from '@/types/database'

async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function getSettings(): Promise<AppSettings> {
  const user = await getUser()
  if (!user) return lsGet()

  const { data, error } = await db
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single() as { data: DbUserSettings | null; error: unknown }

  if (error || !data) {
    // No cloud settings yet — seed from localStorage
    const local = lsGet()
    await saveSettings(local)
    return local
  }

  return {
    followedTeams: (data.followed_teams as Record<string, string[]>) ?? {},
    themeMode: (data.theme_mode as 'classic' | 'team') ?? 'classic',
    primaryFavoriteTeam: (data.primary_favorite_team as { sportId: string; teamName: string } | null) ?? null,
  }
}

export async function saveSettings(s: AppSettings): Promise<void> {
  lsSave(s)

  const user = await getUser()
  if (!user) return

  const { error } = await db
    .from('user_settings')
    .upsert(
      {
        user_id: user.id,
        followed_teams: s.followedTeams,
        primary_favorite_team: s.primaryFavoriteTeam,
        theme_mode: s.themeMode,
      },
      { onConflict: 'user_id' },
    ) as { error: unknown }

  if (error) console.warn('[settingsStore] save failed', error)
}

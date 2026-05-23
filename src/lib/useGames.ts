import { useState, useEffect } from 'react'
import { getAllGames } from '@/lib/gameStore'
import type { Game } from '@/types/Game'

export interface UseGamesResult {
  games: Game[]
  loading: boolean
  error: string | null
  reload: () => void
}

export function useGames(): UseGamesResult {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getAllGames()
      .then((gs) => { if (!cancelled) { setGames(gs); setLoading(false) } })
      .catch((err) => {
        if (!cancelled) {
          console.error('[useGames]', err)
          setError('Could not load games.')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [tick])

  return { games, loading, error, reload: () => setTick((n) => n + 1) }
}

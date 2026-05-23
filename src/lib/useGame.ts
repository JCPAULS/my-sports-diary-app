import { useState, useEffect } from 'react'
import { getGameById } from '@/lib/gameStore'
import type { Game } from '@/types/Game'

export interface UseGameResult {
  game: Game | null
  loading: boolean
}

export function useGame(id: string | undefined): UseGameResult {
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    getGameById(id)
      .then((g) => { if (!cancelled) { setGame(g); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  return { game, loading }
}

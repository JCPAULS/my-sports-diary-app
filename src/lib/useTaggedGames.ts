import { useState, useEffect } from 'react'
import { getTaggedGames, type TaggedGame } from '@/lib/tagsStore'
import { useAuth } from '@/lib/AuthContext'

export interface UseTaggedGamesResult {
  taggedGames: TaggedGame[]
  loading: boolean
  reload: () => void
}

export function useTaggedGames(): UseTaggedGamesResult {
  const { user } = useAuth()
  const [taggedGames, setTaggedGames] = useState<TaggedGame[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!user) { setTaggedGames([]); setLoading(false); return }

    let cancelled = false
    setLoading(true)
    getTaggedGames()
      .then((gs) => { if (!cancelled) { setTaggedGames(gs); setLoading(false) } })
      .catch(() => { if (!cancelled) { setTaggedGames([]); setLoading(false) } })
    return () => { cancelled = true }
  }, [user?.id, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  return { taggedGames, loading, reload: () => setTick((n) => n + 1) }
}

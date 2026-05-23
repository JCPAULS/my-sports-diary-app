import { useParams, Navigate } from 'react-router-dom'
import { useGame } from '@/lib/useGame'
import Nav from '@/components/Nav'
import AddGame from '@/pages/AddGame'

export default function EditGame() {
  const { id } = useParams<{ id: string }>()
  const { game, loading } = useGame(id)

  if (loading) {
    return (
      <div className="min-h-screen bg-paper">
        <Nav />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div
            className="w-8 h-8 border-[3px] border-ink/15 border-t-ink rounded-full"
            style={{ animation: 'spin 0.65s linear infinite' }}
          />
        </div>
      </div>
    )
  }

  if (!game) return <Navigate to="/" replace />
  return <AddGame initialGame={game} />
}

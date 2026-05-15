import { useParams, Navigate } from 'react-router-dom'
import { getAllGames } from '@/lib/storage'
import AddGame from '@/pages/AddGame'

export default function EditGame() {
  const { id } = useParams<{ id: string }>()
  const game = getAllGames().find((g) => g.id === id)
  if (!game) return <Navigate to="/" replace />
  return <AddGame initialGame={game} />
}

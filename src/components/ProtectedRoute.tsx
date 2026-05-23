import { Navigate } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div
        className="w-8 h-8 border-[3px] border-ink/15 border-t-ink rounded-full"
        style={{ animation: 'spin 0.65s linear infinite' }}
      />
    </div>
  )
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

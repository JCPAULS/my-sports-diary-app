import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/lib/AuthContext'
import { MigrationProvider } from '@/lib/MigrationContext'
import { ProfileProvider } from '@/lib/ProfileContext'
import { ToastProvider } from '@/components/Toast'
import { ProtectedRoute, PublicRoute } from '@/components/ProtectedRoute'
import MigrationModal from '@/components/MigrationModal'
import Home from '@/pages/Home'
import AddGame from '@/pages/AddGame'
import EditGame from '@/pages/EditGame'
import GameDetail from '@/pages/GameDetail'
import Stats from '@/pages/Stats'
import Settings from '@/pages/Settings'
import ImportGames from '@/pages/ImportGames'
import MyProfile from '@/pages/MyProfile'
import UserProfilePage from '@/pages/UserProfilePage'
import Friends from '@/pages/Friends'
import Login from '@/pages/Login'
import SignUp from '@/pages/SignUp'
import ResetPassword from '@/pages/ResetPassword'
import UpdatePassword from '@/pages/UpdatePassword'
import { applyTheme } from '@/lib/settings'

export default function App() {
  useEffect(() => { applyTheme() }, [])

  return (
    <AuthProvider>
      <ProfileProvider>
        <ToastProvider>
          <MigrationProvider>
            <BrowserRouter>
              <MigrationModal />
              <Routes>
                {/* Public-only routes — redirect to / if already signed in */}
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
                <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

                {/* Open route — accessible regardless of auth (needed for email link flow) */}
                <Route path="/update-password" element={<UpdatePassword />} />

                {/* Protected routes — redirect to /login if not signed in */}
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
                <Route path="/add" element={<ProtectedRoute><AddGame /></ProtectedRoute>} />
                <Route path="/game/:id" element={<ProtectedRoute><GameDetail /></ProtectedRoute>} />
                <Route path="/game/:id/edit" element={<ProtectedRoute><EditGame /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/import" element={<ProtectedRoute><ImportGames /></ProtectedRoute>} />

                {/* Friends feature */}
                <Route path="/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
                <Route path="/user/:userId" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
                <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
              </Routes>
            </BrowserRouter>
          </MigrationProvider>
        </ToastProvider>
      </ProfileProvider>
    </AuthProvider>
  )
}

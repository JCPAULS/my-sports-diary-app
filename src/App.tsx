import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from '@/pages/Home'
import AddGame from '@/pages/AddGame'
import EditGame from '@/pages/EditGame'
import GameDetail from '@/pages/GameDetail'
import Stats from '@/pages/Stats'
import Settings from '@/pages/Settings'
import { applyTheme } from '@/lib/settings'

export default function App() {
  useEffect(() => { applyTheme() }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/add" element={<AddGame />} />
        <Route path="/game/:id" element={<GameDetail />} />
        <Route path="/game/:id/edit" element={<EditGame />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}

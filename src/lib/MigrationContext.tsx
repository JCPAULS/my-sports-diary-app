import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { getAllGames } from '@/lib/storage'

export const MIGRATION_DONE_KEY = 'sports-diary-migration-done'

interface MigrationContextValue {
  showModal: boolean
  triggerMigration: () => void
  dismissModal: () => void
}

const MigrationContext = createContext<MigrationContextValue>({
  showModal: false,
  triggerMigration: () => {},
  dismissModal: () => {},
})

export function useMigration() {
  return useContext(MigrationContext)
}

function hasPendingLocalGames(): boolean {
  return getAllGames().length > 0
}

function isMigrationDone(): boolean {
  return localStorage.getItem(MIGRATION_DONE_KEY) === 'true'
}

export function MigrationProvider({ children }: { children: ReactNode }) {
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        if (!isMigrationDone() && hasPendingLocalGames()) {
          setShowModal(true)
        }
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const triggerMigration = useCallback(() => {
    if (hasPendingLocalGames()) setShowModal(true)
  }, [])

  const dismissModal = useCallback(() => setShowModal(false), [])

  return (
    <MigrationContext.Provider value={{ showModal, triggerMigration, dismissModal }}>
      {children}
    </MigrationContext.Provider>
  )
}

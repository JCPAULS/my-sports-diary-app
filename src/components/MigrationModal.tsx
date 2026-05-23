import { useState } from 'react'
import { useMigration, MIGRATION_DONE_KEY } from '@/lib/MigrationContext'
import { getAllGames } from '@/lib/storage'
import { saveGame } from '@/lib/gameStore'

export default function MigrationModal() {
  const { showModal, dismissModal } = useMigration()
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  if (!showModal) return null

  const localGames = getAllGames()

  async function handleMigrate() {
    const games = getAllGames()
    if (!games.length) { dismissModal(); return }
    setTotal(games.length)
    setProgress(0)
    setStatus('running')
    try {
      for (let i = 0; i < games.length; i++) {
        await saveGame(games[i])
        setProgress(i + 1)
      }
      localStorage.setItem(MIGRATION_DONE_KEY, 'true')
      setStatus('done')
    } catch (err) {
      console.error('[MigrationModal] migration failed', err)
      setErrorMsg('Something went wrong. Your games are still on this device — try again.')
      setStatus('error')
    }
  }

  function handleSkip() {
    localStorage.setItem(MIGRATION_DONE_KEY, 'true')
    dismissModal()
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-paper border-4 border-ink shadow-[8px_8px_0_#d4a017] max-w-sm w-full animate-fade-slide-up">
        <div className="bg-ink px-6 py-4">
          <p className="font-bebas text-2xl text-gold tracking-[0.2em]">BACK UP YOUR DIARY</p>
        </div>

        <div className="p-6">
          {status === 'idle' && (
            <>
              <p className="font-archivo text-sm text-ink/70 mb-3 leading-snug">
                You have{' '}
                <span className="font-bold">{localGames.length} game{localGames.length !== 1 ? 's' : ''}</span>{' '}
                saved on this device. Back them up to your account so they're available everywhere.
              </p>
              <p className="font-caveat text-base text-navy mb-6">
                Photos will be uploaded to your private cloud storage — this may take a minute.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleMigrate}
                  className="w-full font-bebas text-xl tracking-[0.15em] bg-red text-paper border-2 border-ink py-3 btn-press"
                >
                  BACK UP NOW
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full font-bebas text-base tracking-[0.15em] text-ink/50 hover:text-ink transition-colors"
                >
                  Skip — keep local only
                </button>
              </div>
            </>
          )}

          {status === 'running' && (
            <>
              <p className="font-bebas text-sm tracking-[0.15em] text-ink/50 mb-3">
                UPLOADING {progress} / {total} GAMES…
              </p>
              <div className="w-full bg-ink/10 h-3 border-2 border-ink/20 mb-4">
                <div
                  className="bg-red h-full transition-all"
                  style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
                />
              </div>
              <p className="font-caveat text-sm text-ink/40">
                Keep this tab open until backup completes.
              </p>
            </>
          )}

          {status === 'done' && (
            <>
              <div className="text-center mb-4">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-bebas text-2xl tracking-[0.15em] text-ink">ALL BACKED UP!</p>
                <p className="font-caveat text-base text-ink/60 mt-2">
                  {total} game{total !== 1 ? 's' : ''} saved to your account.
                </p>
              </div>
              <button
                type="button"
                onClick={dismissModal}
                className="w-full font-bebas text-xl tracking-[0.15em] bg-gold text-ink border-2 border-ink py-3 btn-press"
              >
                NICE!
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <p className="font-bebas text-sm text-red mb-2">BACKUP FAILED</p>
              <p className="font-archivo text-sm text-ink/70 mb-4">{errorMsg}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('idle')}
                  className="flex-1 font-bebas text-lg tracking-[0.15em] bg-red text-paper border-2 border-ink py-2.5 btn-press"
                >
                  TRY AGAIN
                </button>
                <button
                  type="button"
                  onClick={dismissModal}
                  className="font-bebas text-lg tracking-[0.15em] text-ink border-2 border-ink px-4 py-2.5 hover:bg-paper-deep transition-colors"
                >
                  CLOSE
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

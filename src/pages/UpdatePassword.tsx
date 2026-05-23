import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const inputClass =
  'w-full bg-white border-2 border-ink px-3 py-2.5 font-archivo text-base text-ink placeholder-ink/30 focus:outline-none focus:border-red transition-colors'

function EyeIcon({ open }: { open: boolean }) {
  if (open) return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function UpdatePassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Supabase fires PASSWORD_RECOVERY when the user arrives from the reset email link.
  // It also fires SIGNED_IN when the recovery token establishes a session.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    await supabase.auth.signOut()
    setTimeout(() => navigate('/login'), 2000)
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-bebas text-4xl tracking-[0.3em] text-ink">MY SPORTS DIARY</h1>
      </div>

      <div className="w-full max-w-sm bg-paper border-2 border-ink card-stamp p-8">
        {done ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="font-bebas text-2xl tracking-[0.2em] text-ink mb-2">PASSWORD UPDATED</h2>
            <p className="font-archivo text-sm text-ink/50">Redirecting you to sign in…</p>
          </div>
        ) : !ready ? (
          <div className="text-center">
            <h2 className="font-bebas text-2xl tracking-[0.2em] text-ink mb-3">SET NEW PASSWORD</h2>
            <p className="font-archivo text-sm text-ink/50 mb-6">
              Verifying your reset link…
            </p>
            <div
              className="mx-auto w-8 h-8 border-[3px] border-ink/15 border-t-ink rounded-full"
              style={{ animation: 'spin 0.65s linear infinite' }}
            />
            <p className="mt-6 text-center">
              <Link to="/reset-password" className="font-archivo text-sm text-ink/40 hover:text-red transition-colors">
                Link not working? Request a new one
              </Link>
            </p>
          </div>
        ) : (
          <>
            <h2 className="font-bebas text-3xl tracking-[0.2em] text-ink mb-6">SET NEW PASSWORD</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-bebas text-xs tracking-[0.2em] text-ink/50 mb-1">NEW PASSWORD</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 transition-colors"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bebas text-xs tracking-[0.2em] text-ink/50 mb-1">CONFIRM PASSWORD</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    required
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 transition-colors"
                  >
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
              </div>

              {error && (
                <p className="font-archivo text-sm text-red border-2 border-red px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red text-paper font-bebas tracking-[0.2em] text-lg py-3 border-2 border-ink btn-press disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'UPDATING…' : 'UPDATE PASSWORD'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

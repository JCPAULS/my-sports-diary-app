import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

const inputClass =
  'w-full bg-white border-2 border-ink px-3 py-2.5 font-archivo text-base text-ink placeholder-ink/30 focus:outline-none focus:border-red transition-colors'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-bebas text-4xl tracking-[0.3em] text-ink">MY SPORTS DIARY</h1>
      </div>

      <div className="w-full max-w-sm bg-paper border-2 border-ink card-stamp p-8">
        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📧</div>
            <h2 className="font-bebas text-2xl tracking-[0.2em] text-ink mb-3">EMAIL SENT</h2>
            <p className="font-archivo text-sm text-ink/60 mb-6">
              Check your inbox for a password reset link. It expires in 1 hour.
            </p>
            <Link
              to="/login"
              className="font-bebas tracking-[0.2em] text-ink/50 hover:text-red transition-colors"
            >
              ← BACK TO SIGN IN
            </Link>
          </div>
        ) : (
          <>
            <h2 className="font-bebas text-3xl tracking-[0.2em] text-ink mb-2">RESET PASSWORD</h2>
            <p className="font-archivo text-sm text-ink/50 mb-6">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-bebas text-xs tracking-[0.2em] text-ink/50 mb-1">EMAIL</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className={inputClass}
                />
              </div>

              {error && (
                <p className="font-archivo text-sm text-red border-2 border-red px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red text-paper font-bebas tracking-[0.2em] text-lg py-3 border-2 border-ink btn-press disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'SENDING…' : 'SEND RESET EMAIL'}
              </button>
            </form>

            <p className="mt-6 text-center">
              <Link to="/login" className="font-archivo text-sm text-ink/40 hover:text-red transition-colors">
                ← Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

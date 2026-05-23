import { useState } from 'react'
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

function CheckEmailScreen({ email }: { email: string }) {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm bg-paper border-2 border-ink card-stamp p-8 text-center">
        <div className="text-5xl mb-4">📬</div>
        <h2 className="font-bebas text-3xl tracking-[0.2em] text-ink mb-3">CHECK YOUR EMAIL</h2>
        <p className="font-archivo text-sm text-ink/60 mb-2">
          We sent a confirmation link to:
        </p>
        <p className="font-archivo text-sm font-medium text-ink mb-6 break-all">{email}</p>
        <p className="font-archivo text-sm text-ink/50 mb-6">
          Click the link in that email to activate your account, then come back and sign in.
        </p>
        <Link
          to="/login"
          className="inline-block font-bebas tracking-[0.2em] text-lg px-6 py-3 bg-red text-paper border-2 border-ink btn-press"
        >
          GO TO SIGN IN
        </Link>
        <p className="mt-5 font-caveat text-base text-ink/40">
          No email? Check your spam folder.
        </p>
      </div>
    </div>
  )
}

export default function SignUp() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [awaitingConfirm, setAwaitingConfirm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    if (data.session) {
      // Email confirmation is disabled — signed in immediately
      navigate('/')
    } else {
      // Email confirmation required (Supabase default)
      setAwaitingConfirm(true)
    }
  }

  const handleGoogle = async () => {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  if (awaitingConfirm) return <CheckEmailScreen email={email} />

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="font-bebas text-4xl tracking-[0.3em] text-ink">MY SPORTS DIARY</h1>
        <p className="font-caveat text-xl text-ink/50 mt-1">Your stadium memories, forever.</p>
      </div>

      <div className="w-full max-w-sm bg-paper border-2 border-ink card-stamp p-8">
        <h2 className="font-bebas text-3xl tracking-[0.2em] text-ink mb-6">CREATE ACCOUNT</h2>

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

          <div>
            <label className="block font-bebas text-xs tracking-[0.2em] text-ink/50 mb-1">PASSWORD</label>
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
            className="w-full bg-red text-paper font-bebas tracking-[0.2em] text-lg py-3 border-2 border-ink btn-press disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-[2px] bg-ink/10" />
          <span className="font-bebas text-xs tracking-[0.2em] text-ink/30">OR</span>
          <div className="flex-1 h-[2px] bg-ink/10" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-ink px-4 py-3 font-archivo text-sm font-medium text-ink hover:bg-ink/5 transition-colors"
        >
          <GoogleIcon />
          Sign in with Google
        </button>

        <p className="mt-6 text-center font-archivo text-sm text-ink/50">
          Already have an account?{' '}
          <Link to="/login" className="text-ink font-medium hover:text-red transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

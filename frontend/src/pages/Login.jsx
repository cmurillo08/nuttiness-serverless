import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, me } from '../api/auth'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    me()
      .then(() => navigate('/', { replace: true }))
      .catch(() => {})
  }, [navigate])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(
        err.message === 'Invalid credentials'
          ? 'Invalid credentials'
          : 'Unable to sign in. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 py-8 sm:px-6">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-[#8B6F47]">Nuttiness</h1>
          <p className="text-sm text-slate-600">Sign in to continue</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="min-h-11 w-full rounded-lg border border-stone-300 px-3 py-2 text-slate-900 shadow-sm outline-none transition focus:border-[#8B6F47] focus:ring-2 focus:ring-[#8B6F47]/20"
            />
          </div>

          {error && (
            <p
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="min-h-11 w-full rounded-lg bg-[#8B6F47] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7b613d] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Signing in…' : 'Log in'}
          </button>
        </form>
      </div>
    </main>
  )
}

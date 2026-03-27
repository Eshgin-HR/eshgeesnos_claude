import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signInWithPassword } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')
    const err = await signInWithPassword(password)
    if (err) {
      setError('Wrong password. Try again.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#0d1f35' }}
    >
      <div className="w-full max-w-xs flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: '#1D9E75', color: '#ffffff' }}
          >
            E
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">EshgeenOS</h1>
            <p className="text-sm mt-1" style={{ color: '#7a8a9e' }}>Personal Operating System</p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-xl p-6 flex flex-col gap-4"
          style={{ backgroundColor: '#0d1f35', border: '1px solid #1a2a40' }}
        >
          <div className="flex flex-col gap-2">
            <label style={{ fontSize: '11px', color: '#7a8a9e', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoFocus
              className="w-full rounded-lg px-3 py-3 outline-none placeholder-gray-600"
              style={{
                backgroundColor: '#0d1f35',
                border: `1px solid ${error ? '#ef4444' : '#1a2a40'}`,
                fontSize: '14px',
              }}
            />
            {error && (
              <p style={{ fontSize: '11px', color: '#ef4444' }}>{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: '#1D9E75', fontSize: '14px' }}
          >
            {loading ? 'Signing in...' : 'Enter EshgeenOS'}
          </button>
        </form>

        <p style={{ fontSize: '10px', color: '#7a8a9e' }}>
          Built for one person. Runs your entire day.
        </p>
      </div>
    </div>
  )
}

import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { getNhostClient } from '../lib/nhost'
import { APP_NAME } from '../config/navigation'

export function ChangePasswordPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const nhost = getNhostClient()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setStatus(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (!nhost) {
      setError('Configure Nhost to change passwords.')
      return
    }

    setLoading(true)
    try {
      const result = await nhost.auth.changePassword({ newPassword: password })
      if (result.error) throw new Error(result.error.message)
      setStatus('Password updated. Sign in with your new password.')
      setPassword('')
      setConfirm('')
      window.setTimeout(() => navigate('/login', { replace: true }), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password change failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page single">
      <form className="login-card" onSubmit={handleSubmit}>
        <span className="eyebrow">Account security</span>
        <h2>Set a new password</h2>
        {!auth.usesNhost ? (
          <p className="form-error">Nhost is not configured. Use local development sign-in instead.</p>
        ) : null}
        <label>
          New password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        <label>
          Confirm password
          <input
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {status ? <p className="form-success">{status}</p> : null}
        <button className="button primary" type="submit" disabled={loading || !auth.usesNhost}>
          {loading ? 'Updating...' : 'Update password'}
        </button>
        <Link to="/login">Back to sign in</Link>
      </form>
      <small>{APP_NAME} password reset for {auth.usesNhost ? 'Nhost' : 'local'} accounts</small>
    </div>
  )
}

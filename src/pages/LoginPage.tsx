import { FormEvent, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { APP_NAME } from '../config/navigation'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/'

  useEffect(() => {
    if (!auth.authReady || !auth.isAuthenticated) return
    navigate(from, { replace: true })
  }, [auth.authReady, auth.isAuthenticated, from, navigate])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await auth.signIn(email, password)
      setPassword('')
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand-lockup">
          <div className="brand-mark large">eD</div>
          <span>{APP_NAME}</span>
        </div>
        <div>
          <span className="eyebrow">Secure routing workspace</span>
          <h1>Review, approve, acknowledge, and sign controlled documents.</h1>
          <p>Static frontend, private storage, privileged Worker operations, and tenant-aware authorization by design.</p>
        </div>
        <small>{auth.usesNhost ? 'Nhost authentication' : 'Local development mode until Nhost is configured'}</small>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit} autoComplete="off">
          <span className="eyebrow">Welcome back</span>
          <h2>Sign in to {APP_NAME}</h2>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="button primary" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          {auth.usesNhost ? (
            <Link className="text-link" to="/reset-password">
              Forgot password?
            </Link>
          ) : null}
          {!auth.usesNhost ? <small>Development mode accepts any email and password and stores the session in this browser tab only.</small> : null}
        </form>
      </section>
    </div>
  )
}

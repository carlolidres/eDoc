import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'

export function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const auth = useAuth()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setStatus(null)
    setError(null)
    try {
      await auth.requestPasswordReset(email)
      setStatus(auth.usesNhost ? 'Password reset email requested.' : 'Configure Nhost to send password reset email.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.')
    }
  }

  return (
    <div className="login-page single">
      <form className="login-card" onSubmit={submit}>
        <span className="eyebrow">Account recovery</span>
        <h2>Reset password</h2>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        {error ? <p className="form-error">{error}</p> : null}
        {status ? <p className="form-success">{status}</p> : null}
        <button className="button primary" type="submit">Request reset</button>
        <Link to="/login">Back to sign in</Link>
      </form>
    </div>
  )
}

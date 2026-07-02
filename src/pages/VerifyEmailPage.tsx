import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { APP_NAME } from '../config/navigation'

export function VerifyEmailPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('Checking verification status...')

  useEffect(() => {
    if (!auth.authReady) return
    if (auth.isAuthenticated && auth.user?.emailVerified) {
      setStatus('Email verified. Redirecting to your workspace...')
      window.setTimeout(() => navigate('/', { replace: true }), 1200)
      return
    }
    if (auth.isAuthenticated) {
      setStatus('Email verification is still pending. Use the banner in your workspace to resend the email.')
      return
    }
    setStatus('Sign in to finish email verification.')
  }, [auth.authReady, auth.isAuthenticated, auth.user?.emailVerified, navigate])

  return (
    <div className="login-page single">
      <section className="login-card">
        <span className="eyebrow">Email verification</span>
        <h2>{APP_NAME}</h2>
        <p className="form-success">{status}</p>
        <Link to={auth.isAuthenticated ? '/' : '/login'}>
          {auth.isAuthenticated ? 'Back to workspace' : 'Sign in'}
        </Link>
      </section>
    </div>
  )
}

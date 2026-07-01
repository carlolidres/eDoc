import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  const location = useLocation()

  if (!auth.authReady) return <main className="auth-loading">Verifying session...</main>
  if (!auth.isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  return <>{children}</>
}

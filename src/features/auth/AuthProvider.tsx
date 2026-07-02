import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { authRedirectUrl } from '../../lib/authRedirect'
import { env } from '../../lib/env'
import { getNhostClient, subscribeNhostAuth } from '../../lib/nhost'

interface AuthUser {
  id: string
  email: string
  displayName: string
  role: string
  organizationId?: string
  emailVerified: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  accessToken: string | null
  authReady: boolean
  isAuthenticated: boolean
  usesNhost: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  sendVerificationEmail: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const localUserKey = 'edoc.localUser'

function toAuthUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== 'object') return null
  const user = value as {
    id?: string
    email?: string
    displayName?: string
    emailVerified?: boolean
    metadata?: Record<string, unknown>
  }
  if (!user.id || !user.email) return null
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName || user.email,
    role: String(user.metadata?.role ?? 'Document Owner'),
    organizationId: typeof user.metadata?.organizationId === 'string' ? user.metadata.organizationId : undefined,
    emailVerified: Boolean(user.emailVerified),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const nhost = getNhostClient()
  const usesNhost = Boolean(nhost)
  const navigate = useNavigate()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [authReady, setAuthReady] = useState(!usesNhost)

  const signOut = useCallback(async () => {
    if (nhost) await nhost.auth.signOut()
    sessionStorage.removeItem(localUserKey)
    setUser(null)
    setAccessToken(null)
    navigate('/login', { replace: true })
  }, [navigate, nhost])

  useEffect(() => {
    if (!nhost) {
      const cached = sessionStorage.getItem(localUserKey)
      setUser(cached ? (JSON.parse(cached) as AuthUser) : null)
      setAuthReady(true)
      return
    }

    const session = nhost.auth.getSession()
    setAccessToken(session?.accessToken ?? null)
    setUser(toAuthUser(session?.user))
    setAuthReady(true)

    const unsubscribe = subscribeNhostAuth((_event, sessionValue) => {
      setAccessToken(sessionValue?.accessToken ?? null)
      setUser(toAuthUser(sessionValue?.user))
    })

    return () => {
      unsubscribe()
    }
  }, [nhost])

  useEffect(() => {
    if (!user) return
    const timeoutMs = Math.max(1, env.sessionTimeoutMinutes) * 60_000
    let timer = window.setTimeout(() => void signOut(), timeoutMs)
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => void signOut(), timeoutMs)
    }
    window.addEventListener('mousemove', reset)
    window.addEventListener('keydown', reset)
    window.addEventListener('click', reset)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('mousemove', reset)
      window.removeEventListener('keydown', reset)
      window.removeEventListener('click', reset)
    }
  }, [signOut, user])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    accessToken,
    authReady,
    isAuthenticated: Boolean(user),
    usesNhost,
    signIn: async (email, password) => {
      if (nhost) {
        const result = await nhost.auth.signIn({ email, password })
        if (result.error) throw new Error(result.error.message)
        setAccessToken(result.session?.accessToken ?? null)
        setUser(toAuthUser(result.session?.user))
        return
      }
      const localUser: AuthUser = {
        id: 'local-development-user',
        email,
        displayName: email.split('@')[0] || 'Local user',
        role: 'Super Administrator',
        organizationId: 'local-org',
        emailVerified: true,
      }
      sessionStorage.setItem(localUserKey, JSON.stringify(localUser))
      setUser(localUser)
    },
    signOut,
    requestPasswordReset: async (email) => {
      if (!nhost) return
      const result = await nhost.auth.resetPassword({
        email,
        options: { redirectTo: authRedirectUrl('/change-password') },
      })
      if (result.error) throw new Error(result.error.message)
    },
    sendVerificationEmail: async () => {
      if (!nhost || !user?.email) return
      const result = await nhost.auth.sendVerificationEmail({
        email: user.email,
        options: { redirectTo: authRedirectUrl('/verify-email') },
      })
      if (result.error) throw new Error(result.error.message)
    },
  }), [accessToken, authReady, nhost, signOut, user, usesNhost])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

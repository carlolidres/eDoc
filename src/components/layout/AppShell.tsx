import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, Menu, Moon, Search, Sun } from 'lucide-react'
import { useState } from 'react'
import { APP_NAME, APP_TAGLINE, navigationItems } from '../../config/navigation'
import { useAuth } from '../../features/auth/AuthProvider'
import { useTheme } from '../../hooks/useTheme'

function pageTitle(pathname: string) {
  if (pathname.startsWith('/sign/')) return 'Signing Workspace'
  return navigationItems.find((item) => item.path === pathname)?.label ?? 'Workspace'
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, signOut, usesNhost, sendVerificationEmail } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const showVerifyBanner = usesNhost && user && !user.emailVerified && !bannerDismissed

  const sidebarClass = ['sidebar', collapsed ? 'collapsed' : '', mobileOpen ? 'open' : ''].filter(Boolean).join(' ')

  return (
    <div className="app-shell">
      <aside className={sidebarClass}>
        <div className="sidebar-header">
          <div className="brand-mark">eD</div>
          <div className="sidebar-brand">
            <strong>{APP_NAME}</strong>
            <span>{APP_TAGLINE}</span>
          </div>
          <button className="icon-button" type="button" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar">
            <Menu size={18} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-chip">
            <span className="avatar">{user?.displayName.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{user?.displayName}</strong>
              <small>{user?.role}</small>
            </span>
          </div>
          <span className="environment-dot-row">
            <span className="environment-dot" />
            {usesNhost ? 'Nhost connected' : 'Local development auth'}
          </span>
        </div>
      </aside>

      {mobileOpen ? <button className="sidebar-scrim" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /> : null}

      <div className={`app-main${collapsed ? ' sidebar-collapsed' : ''}`}>
        <header className="topbar">
          <div className="topbar-leading">
            {collapsed ? (
              <button className="icon-button glow" type="button" onClick={() => setCollapsed(false)} aria-label="Expand sidebar">
                <Menu size={18} />
              </button>
            ) : null}
            <button className="icon-button mobile-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu size={18} />
            </button>
            <div>
              <span className="eyebrow">{APP_NAME}</span>
              <h1>{pageTitle(location.pathname)}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Search workspace" disabled>
              <Search size={18} />
            </button>
            <button className="icon-button" type="button" onClick={toggleTheme} aria-label="Toggle theme">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="icon-button" type="button" onClick={() => void signOut()} aria-label="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="page">
          {showVerifyBanner ? (
            <div className="verify-banner" role="status">
              <div>
                <strong>Verify your email</strong>
                <p>Confirm {user.email} to unlock full workspace access.</p>
                {verifyStatus ? <p className="form-success">{verifyStatus}</p> : null}
              </div>
              <div className="verify-banner-actions">
                <button
                  className="button secondary"
                  type="button"
                  disabled={verifyLoading}
                  onClick={() => {
                    setVerifyLoading(true)
                    setVerifyStatus(null)
                    void sendVerificationEmail()
                      .then(() => setVerifyStatus('Verification email sent.'))
                      .catch((err: unknown) => setVerifyStatus(err instanceof Error ? err.message : 'Could not send email.'))
                      .finally(() => setVerifyLoading(false))
                  }}
                >
                  {verifyLoading ? 'Sending...' : 'Resend email'}
                </button>
                <button className="icon-button" type="button" aria-label="Dismiss" onClick={() => setBannerDismissed(true)}>
                  ×
                </button>
              </div>
            </div>
          ) : null}
          <Outlet />
        </main>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/hooks/useAuth'
import { Avatar, Button } from './ui'

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '')
    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }
}

const NAV_LINKS = [
  { label: 'Skills', to: '/' },
  { label: 'Plugins', to: '/plugins' },
  { label: 'Docs', to: '/docs' },
]

const ADMIN_LINK = { label: 'Admin', to: '/admin' }

export function Navbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggle } = useTheme()

  function isActive(to: string) {
    if (to === '/') return location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <nav
      style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--color-nav-bg)',
        backdropFilter: 'blur(12px)',
        borderBottom: '0.5px solid var(--color-border)',
        padding: '0 24px', height: 52,
        display: 'flex', alignItems: 'center', gap: 0,
      }}
    >
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginRight: 24 }}>
        <div
          style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none">
            <path d="M12 2l1.8 7.2L21 12l-7.2 1.8L12 22l-1.8-8.2L3 12l8.2-1.8z"/>
          </svg>
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em' }}>GatesFoundation</span>
        <span style={{ fontWeight: 400, fontSize: 14, color: 'var(--color-text-secondary)', letterSpacing: '-0.01em' }}>AI Registry</span>
      </Link>

      {/* Nav tabs */}
      <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', marginRight: 20 }}>
        {[...NAV_LINKS, ...(user?.is_admin ? [ADMIN_LINK] : [])].map(({ label, to }) => (
          <Link
            key={to}
            to={to}
            style={{
              display: 'flex', alignItems: 'center', padding: '0 14px',
              fontSize: 13, fontWeight: isActive(to) ? 500 : 400,
              color: isActive(to) ? 'var(--color-text)' : 'var(--color-text-secondary)',
              borderBottom: `2px solid ${isActive(to) ? 'var(--color-accent)' : 'transparent'}`,
              transition: 'color 0.15s, border-color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 360, position: 'relative' }}>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-text-muted)" strokeWidth="2"
          style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          placeholder="Search skills…"
          onChange={(e) => navigate(`/?q=${encodeURIComponent(e.target.value)}`)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') (e.target as HTMLInputElement).blur()
          }}
          style={{
            width: '100%', height: 32, padding: '0 12px 0 32px',
            border: '0.5px solid var(--color-border)',
            borderRadius: 'var(--radius)', background: 'var(--color-surface)',
            color: 'var(--color-text)', fontSize: 13, outline: 'none',
          }}
        />
      </div>

      {/* Install hint */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12,
          background: 'var(--color-surface)', border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius)', padding: '4px 10px',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: 'var(--color-text-secondary)', whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: 'var(--color-accent)' }}>$</span> npx gf-skillhub-cli add &lt;name&gt;
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            background: 'none', border: '0.5px solid var(--color-border)',
            borderRadius: 'var(--radius)', width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 14,
          }}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
        {user ? (
          <>
            <Link to={location.pathname.startsWith('/plugins') ? '/publish-plugin' : '/publish'}>
              <Button variant="primary" size="sm">
                {location.pathname.startsWith('/plugins') ? 'Publish plugin' : 'Publish skill'}
              </Button>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar name={user.display_name || user.username} size={28} />
              <button
                onClick={() => logout()}
                style={{
                  background: 'none', border: 'none', fontSize: 12,
                  color: 'var(--color-text-muted)', cursor: 'pointer',
                }}
              >
                Sign out
              </button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm">Get started</Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}

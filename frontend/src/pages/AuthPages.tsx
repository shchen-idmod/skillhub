import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/api/client'
import { useAuthStore } from '@/hooks/useAuth'
import { Button, Input } from '@/components/ui'

function AuthLayout({ title, sub, children }: { title: string; sub: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 24px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>{title}</h1>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{sub}</div>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '1.5rem' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await authApi.login({ email, password })
      setAuth(data.user, data.access_token)
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Sign in to GatesFoundation AI Registry" sub={<>Don't have an account? <Link to="/register" style={{ color: 'var(--color-accent)' }}>Create one</Link></>}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        {error && <div style={{ fontSize: 12, color: 'var(--color-danger)' }}>{error}</div>}
        <Button variant="primary" type="submit" loading={loading} style={{ width: '100%', justifyContent: 'center' }}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ username: '', email: '', password: '', display_name: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await authApi.register(form)
      setAuth(data.user, data.access_token)
      navigate('/')
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      setError(Array.isArray(detail) ? detail[0]?.msg : (detail ?? 'Registration failed'))
    } finally {
      setLoading(false)
    }
  }

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  return (
    <AuthLayout title="Create your account" sub={<>Already have one? <Link to="/login" style={{ color: 'var(--color-accent)' }}>Sign in</Link></>}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Username" value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="yourname" required />
          <Input label="Display name" value={form.display_name} onChange={(e) => set('display_name', e.target.value)} placeholder="Your Name" />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" required />
        <Input label="Password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 8 characters" required />
        {error && <div style={{ fontSize: 12, color: 'var(--color-danger)' }}>{error}</div>}
        <Button variant="primary" type="submit" loading={loading} style={{ width: '100%', justifyContent: 'center' }}>
          Create account
        </Button>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          By signing up you agree to our Terms of Service.
        </div>
      </form>
    </AuthLayout>
  )
}

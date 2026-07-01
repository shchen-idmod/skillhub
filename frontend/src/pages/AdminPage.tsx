import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/client'
import type { User } from '@/api/client'
import { useAuthStore } from '@/hooks/useAuth'
import { Button, Input, Spinner } from '@/components/ui'

export function AdminPage() {
  const user = useAuthStore((s) => s.user)
  const setAuth = useAuthStore((s) => s.setAuth)
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['admin-status'],
    queryFn: () => adminApi.status().then((r) => r.data),
  })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => adminApi.listUsers(search || undefined).then((r) => r.data),
    enabled: !!user?.is_admin,
  })

  const seedMutation = useMutation({
    mutationFn: () => adminApi.seed(user!.username).then((r) => r.data),
    onSuccess: (updatedUser) => {
      const token = localStorage.getItem('token')!
      setAuth(updatedUser, token)
      qc.invalidateQueries({ queryKey: ['admin-status'] })
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (err: any) => setError(err?.response?.data?.detail ?? 'Failed'),
  })

  const promoteMutation = useMutation({
    mutationFn: (username: string) => adminApi.promote(username).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err: any) => setError(err?.response?.data?.detail ?? 'Failed'),
  })

  const revokeMutation = useMutation({
    mutationFn: (username: string) => adminApi.revoke(username).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err: any) => setError(err?.response?.data?.detail ?? 'Failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (username: string) => adminApi.deleteUser(username),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err: any) => setError(err?.response?.data?.detail ?? 'Failed'),
  })

  if (statusLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size={32} /></div>
  }

  // Not logged in
  if (!user) {
    return (
      <div style={{ maxWidth: 480, margin: '4rem auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Sign in to access the admin panel.</div>
      </div>
    )
  }

  // No admin exists yet — show seed flow
  if (!status?.has_admin) {
    return (
      <div style={{ maxWidth: 480, margin: '4rem auto', padding: '0 24px' }}>
        <div style={{
          background: 'var(--color-surface)', border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: '2rem', textAlign: 'center',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔑</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Claim admin access</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 24 }}>
            No admin exists yet. As <strong>{user.username}</strong>, you can claim the first admin seat.
          </p>
          {error && (
            <div style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 16 }}>{error}</div>
          )}
          <Button
            variant="primary"
            loading={seedMutation.isPending}
            onClick={() => { setError(''); seedMutation.mutate() }}
          >
            Make me admin
          </Button>
        </div>
      </div>
    )
  }

  // Admin exists but this user is not one
  if (!user.is_admin) {
    return (
      <div style={{ maxWidth: 480, margin: '4rem auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
          You don't have admin access. Ask an existing admin to promote your account.
        </div>
      </div>
    )
  }

  // Admin panel
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 24px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Admin panel</h1>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Manage user admin rights</div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Search by username or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 16 }}>{error}</div>
      )}

      {usersLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner size={24} /></div>
      ) : (
        <div style={{
          background: 'var(--color-surface)', border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        }}>
          {(users ?? []).length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
              No users found.
            </div>
          ) : (
            (users ?? []).map((u: User, i: number) => (
              <UserRow
                key={u.id}
                u={u}
                isSelf={u.username === user.username}
                isLast={i === (users ?? []).length - 1}
                onPromote={() => { setError(''); promoteMutation.mutate(u.username) }}
                onRevoke={() => { setError(''); revokeMutation.mutate(u.username) }}
                onDelete={() => { setError(''); deleteMutation.mutate(u.username) }}
                busy={promoteMutation.isPending || revokeMutation.isPending || deleteMutation.isPending}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function UserRow({
  u, isSelf, isLast, onPromote, onRevoke, onDelete, busy,
}: {
  u: User
  isSelf: boolean
  isLast: boolean
  onPromote: () => void
  onRevoke: () => void
  onDelete: () => void
  busy: boolean
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      borderBottom: isLast ? 'none' : '0.5px solid var(--color-border)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'var(--color-accent)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#fff',
      }}>
        {(u.display_name || u.username)[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{u.username}</span>
          {u.is_admin && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px',
              borderRadius: 4, background: 'rgba(99,102,241,0.15)',
              color: 'var(--color-accent)', letterSpacing: '.04em',
            }}>
              ADMIN
            </span>
          )}
          {isSelf && (
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>(you)</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{u.email}</div>
      </div>
      {!isSelf && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {u.is_admin ? (
            <Button variant="ghost" size="sm" onClick={onRevoke} loading={busy}>
              Revoke admin
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={onPromote} loading={busy}>
              Make admin
            </Button>
          )}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete user"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', padding: 4, borderRadius: 6, lineHeight: 1,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--color-danger)' }}>Delete?</span>
              <button
                onClick={() => { setConfirmDelete(false); onDelete() }}
                title="Confirm delete"
                disabled={busy}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-danger)', padding: 4, borderRadius: 6, lineHeight: 1,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                title="Cancel"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', padding: 4, borderRadius: 6, lineHeight: 1,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

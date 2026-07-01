import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pluginsApi } from '@/api/client'
import { useAuthStore } from '@/hooks/useAuth'
import { Button, Input, Spinner } from '@/components/ui'
import { fetchClaudePlugName } from './PluginsPage'

const CATEGORIES = ['Tools', 'Data & Analytics', 'Models', 'Channels', 'Web', 'Other']

export function EditPluginPage() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)

  const { data: plugin, isLoading } = useQuery({
    queryKey: ['plugin', namespace, name],
    queryFn: () => pluginsApi.get(namespace!, name!).then((r) => r.data),
    enabled: !!namespace && !!name,
  })

  const [form, setForm] = useState({
    display_name: '',
    description: '',
    readme: '',
    category: '',
    tags: '',
    version: '',
    github_url: '',
    docs_url: '',
    marketplace_name: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (plugin) {
      setForm({
        display_name: plugin.display_name,
        description: plugin.description,
        readme: plugin.readme ?? '',
        category: plugin.category,
        tags: plugin.tags.join(', '),
        version: plugin.version,
        github_url: plugin.github_url ?? '',
        docs_url: plugin.docs_url ?? '',
        marketplace_name: plugin.marketplace_name ?? '',
      })
      if (!plugin.marketplace_name && plugin.github_url) {
        fetchClaudePlugName(plugin.github_url).then(name => {
          if (name) setForm(f => ({ ...f, marketplace_name: name }))
        })
      }
    }
  }, [plugin])

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function handleGithubBlur() {
    if (!form.github_url) return
    const name = await fetchClaudePlugName(form.github_url)
    if (name) set('marketplace_name', name)
  }

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      pluginsApi.update(namespace!, name!, {
        display_name: form.display_name,
        description: form.description,
        readme: form.readme || undefined,
        category: form.category,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        version: form.version,
        github_url: form.github_url || undefined,
        docs_url: form.docs_url || undefined,
        marketplace_name: form.marketplace_name || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plugin', namespace, name] })
      qc.invalidateQueries({ queryKey: ['plugins'] })
      navigate(`/plugins/${namespace}/${name}`)
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail
      setError(Array.isArray(detail) ? detail[0]?.msg : (detail ?? 'Failed to update plugin'))
    },
  })

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size={32} /></div>
  }

  if (!plugin) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Plugin not found.</div>
  }

  if (user?.username !== plugin.author.username && !user?.is_admin) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>You are not authorized to edit this plugin.</div>
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    mutate()
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 24px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Edit plugin</h1>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {plugin.namespace}/{plugin.name}
        </div>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <Section title="Identity">
          <Input label="Display name" value={form.display_name} onChange={(e) => set('display_name', e.target.value)} required />
          <Input label="Version" value={form.version} onChange={(e) => set('version', e.target.value)} required />
        </Section>

        <Section title="Classification">
          <div>
            <label style={labelStyle}>Category</label>
            <select value={form.category} onChange={(e) => set('category', e.target.value)} required style={selectStyle}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input label="Tags (comma-separated)" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
        </Section>

        <Section title="Description">
          <div>
            <label style={labelStyle}>Short description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              required
              rows={3}
              style={textareaStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>README / documentation (Markdown)</label>
            <textarea
              value={form.readme}
              onChange={(e) => set('readme', e.target.value)}
              rows={10}
              style={{ ...textareaStyle, fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </Section>

        <Section title="Links">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input label="GitHub URL" value={form.github_url} onChange={(e) => set('github_url', e.target.value)} onBlur={handleGithubBlur} />
            <Input label="Docs URL" value={form.docs_url} onChange={(e) => set('docs_url', e.target.value)} />
          </div>
        </Section>

        {error && (
          <div style={{ fontSize: 13, color: 'var(--color-danger)', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius)', border: '0.5px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="primary" type="submit" loading={isPending}>Save changes</Button>
          <Button variant="ghost" type="button" onClick={() => navigate(`/plugins/${namespace}/${name}`)}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '0.5px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: '1.25rem',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 500,
  color: 'var(--color-text-secondary)', marginBottom: 5,
}

const selectStyle: React.CSSProperties = {
  width: '100%', height: 36, padding: '0 10px',
  border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius)',
  background: 'var(--color-surface)', color: 'var(--color-text)',
  fontSize: 13, outline: 'none', cursor: 'pointer',
}

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius)',
  background: 'var(--color-surface)', color: 'var(--color-text)',
  fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.55,
}

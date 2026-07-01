import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { pluginsApi } from '@/api/client'
import { useAuthStore } from '@/hooks/useAuth'
import { Button, Input } from '@/components/ui'
import { fetchClaudePlugName } from './PluginsPage'

const CATEGORIES = ['Tools', 'Data & Analytics', 'Models', 'Channels', 'Web', 'Other']

export function PublishPluginPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [form, setForm] = useState({
    name: '',
    display_name: '',
    description: '',
    readme: '',
    category: '',
    tags: '',
    version: '1.0.0',
    github_url: '',
    docs_url: '',
    marketplace_name: '',
  })
  const [error, setError] = useState('')

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function handleGithubBlur() {
    if (!form.github_url) return
    const name = await fetchClaudePlugName(form.github_url)
    if (name) set('marketplace_name', name)
  }

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      pluginsApi.create({
        name: form.name,
        namespace: user!.username,
        display_name: form.display_name,
        description: form.description,
        readme: form.readme || undefined,
        category: form.category,
        platform: '',
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        version: form.version,
        github_url: form.github_url || undefined,
        docs_url: form.docs_url || undefined,
        marketplace_name: form.marketplace_name || undefined,
      }),
    onSuccess: (res) => {
      const p = res.data
      navigate(`/plugins/${p.namespace}/${p.name}`)
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail
      setError(Array.isArray(detail) ? detail[0]?.msg : (detail ?? 'Failed to publish plugin'))
    },
  })

  if (!user) {
    return (
      <div style={{ maxWidth: 560, margin: '4rem auto', padding: '0 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: 14 }}>You must be signed in to publish a plugin.</div>
      </div>
    )
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.category) { setError('Please select a category'); return }
    mutate()
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 24px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Publish a plugin</h1>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
          Share a service connector or integration with the Gates Foundation agent ecosystem.
        </p>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Identity */}
        <Section title="Identity">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Namespace</label>
              <div style={readonlyStyle}>{user.username}</div>
            </div>
            <Input
              label="Name (slug)"
              value={form.name}
              onChange={(e) => set('name', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="sharepoint-connector"
              required
            />
          </div>
          <Input
            label="Display name"
            value={form.display_name}
            onChange={(e) => set('display_name', e.target.value)}
            placeholder="SharePoint Connector"
            required
          />
          <Input
            label="Version"
            value={form.version}
            onChange={(e) => set('version', e.target.value)}
            placeholder="1.0.0"
            required
          />
        </Section>

        {/* Classification */}
        <Section title="Classification">
          <div>
            <label style={labelStyle}>Category <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              required
              style={selectStyle}
            >
              <option value="">Select category…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input
            label="Tags (comma-separated)"
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="sharepoint, documents, search"
          />
        </Section>

        {/* Description */}
        <Section title="Description">
          <div>
            <label style={labelStyle}>Short description <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What does this plugin do? Explain its key capabilities in 1–2 sentences."
              required
              rows={3}
              style={{
                width: '100%', padding: '8px 12px',
                border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius)', background: 'var(--color-surface)',
                color: 'var(--color-text)', fontSize: 13, outline: 'none',
                resize: 'vertical', lineHeight: 1.55,
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>README / documentation (Markdown, optional)</label>
            <textarea
              value={form.readme}
              onChange={(e) => set('readme', e.target.value)}
              placeholder="## Overview&#10;&#10;Detailed usage instructions, available actions, configuration..."
              rows={10}
              style={{
                width: '100%', padding: '8px 12px',
                border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius)', background: 'var(--color-surface)',
                color: 'var(--color-text)', fontSize: 13, outline: 'none',
                resize: 'vertical', lineHeight: 1.55, fontFamily: 'var(--font-mono)',
              }}
            />
          </div>
        </Section>

        {/* Links */}
        <Section title="Links">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Input
              label="GitHub URL"
              value={form.github_url}
              onChange={(e) => set('github_url', e.target.value)}
              onBlur={handleGithubBlur}
              placeholder="https://github.com/org/repo"
            />
            <Input
              label="Docs URL"
              value={form.docs_url}
              onChange={(e) => set('docs_url', e.target.value)}
              placeholder="https://docs.example.com/plugin"
            />
          </div>
        </Section>

        {error && (
          <div style={{ fontSize: 13, color: 'var(--color-danger)', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius)', border: '0.5px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="primary" type="submit" loading={isPending}>
            Publish plugin
          </Button>
          <Button variant="ghost" type="button" onClick={() => navigate('/plugins')}>
            Cancel
          </Button>
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

const readonlyStyle: React.CSSProperties = {
  height: 36, padding: '0 12px', display: 'flex', alignItems: 'center',
  border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius)',
  background: 'var(--color-surface-2)', color: 'var(--color-text-muted)',
  fontSize: 13, fontFamily: 'var(--font-mono)',
}

const selectStyle: React.CSSProperties = {
  width: '100%', height: 36, padding: '0 10px',
  border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius)',
  background: 'var(--color-surface)', color: 'var(--color-text)',
  fontSize: 13, outline: 'none', cursor: 'pointer',
}

import { useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { skillsApi } from '@/api/client'
import { Button, Input, Textarea, Badge, Spinner } from '@/components/ui'
import { useAuthStore } from '@/hooks/useAuth'

const DOMAINS = ['Global Health', 'Global Development', 'Data & Analytics', 'Research & Evidence', 'Technology & Tools', 'Communications']
const AUDIENCES = ['Researcher', 'Data Analyst', 'Program Officer', 'Software Engineer', 'IT & Platform']
const LICENSES = ['Apache 2.0', 'MIT', 'CC BY 4.0', 'Proprietary']
const AGENTS = ['All Agents', 'Claude Code', 'Codex', 'Cursor']

export function EditSkillPage() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const { data: skill, isLoading } = useQuery({
    queryKey: ['skill', namespace, name],
    queryFn: () => skillsApi.get(namespace!, name!).then((r) => r.data),
    enabled: !!(namespace && name),
  })

  const [form, setForm] = useState({
    description: '',
    domain: '',
    audience: '',
    version: '',
    license: '',
    github_url: '',
  })
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [agents, setAgents] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Pre-fill form once skill data loads
  if (skill && !initialized) {
    setForm({
      description: skill.description,
      domain: skill.domain,
      audience: skill.audience ?? '',
      version: skill.version,
      license: skill.license,
      github_url: skill.github_url ?? '',
    })
    setTags(skill.tags)
    setAgents(skill.supported_agents)
    setInitialized(true)
  }

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim() && tags.length < 8) {
      e.preventDefault()
      const val = tagInput.trim().replace(',', '')
      if (val && !tags.includes(val)) setTags([...tags, val])
      setTagInput('')
    }
  }

  function toggleAgent(a: string) {
    setAgents((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.description) e.description = 'Required'
    if (!form.domain) e.domain = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit() {
    if (!validate()) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v))
      fd.append('tags', JSON.stringify(tags))
      fd.append('supported_agents', JSON.stringify(agents))
      if (file) fd.append('file', file)
      await skillsApi.update(namespace!, name!, fd)
      navigate(`/skills/${namespace}/${name}`)
    } catch (err: any) {
      const msg = err?.response?.data?.detail ?? 'Something went wrong'
      setErrors({ submit: msg })
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
        <Spinner size={36} />
      </div>
    )
  }

  if (!skill) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
        Skill not found.
      </div>
    )
  }

  if (user?.username !== skill.author.username && !user?.is_admin) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div>You don't have permission to edit this skill.</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 24px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
          Edit {skill.namespace}/{skill.name}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Update your skill's metadata or upload a new version.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 600 }}>
        <Textarea
          label="Description *"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={3}
          maxLength={280}
          error={errors.description}
          hint={`${form.description.length}/280 characters`}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Domain *</label>
            <select
              value={form.domain}
              onChange={(e) => set('domain', e.target.value)}
              style={{ width: '100%', height: 36, padding: '0 10px', border: `0.5px solid ${errors.domain ? 'var(--color-danger)' : 'var(--color-border-hover)'}`, borderRadius: 'var(--radius)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, outline: 'none' }}
            >
              <option value="">Select domain…</option>
              {DOMAINS.map((d) => <option key={d}>{d}</option>)}
            </select>
            {errors.domain && <span style={{ fontSize: 11, color: 'var(--color-danger)' }}>{errors.domain}</span>}
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Audience</label>
            <select
              value={form.audience}
              onChange={(e) => set('audience', e.target.value)}
              style={{ width: '100%', height: 36, padding: '0 10px', border: '0.5px solid var(--color-border-hover)', borderRadius: 'var(--radius)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, outline: 'none' }}
            >
              <option value="">Select audience…</option>
              {AUDIENCES.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Tags</label>
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 8px', border: '0.5px solid var(--color-border-hover)', borderRadius: 'var(--radius)', background: 'var(--color-surface)', minHeight: 38, cursor: 'text' }}
            onClick={() => document.getElementById('tag-input-edit')?.focus()}
          >
            {tags.map((t) => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-surface-2)', border: '0.5px solid var(--color-border)', borderRadius: 20, padding: '2px 8px', fontSize: 12 }}>
                {t}
                <button onClick={() => setTags(tags.filter((x) => x !== t))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1 }}>×</button>
              </span>
            ))}
            <input
              id="tag-input-edit"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder={tags.length ? '' : 'Add tag…'}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: 'var(--color-text)', minWidth: 80, flex: 1 }}
            />
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Press Enter or comma to add. Up to 8 tags.</span>
        </div>

        {/* Agents */}
        <div>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 8 }}>Supported agents</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {AGENTS.map((a) => (
              <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={agents.includes(a)} onChange={() => toggleAgent(a)}
                  style={{ accentColor: 'var(--color-accent)', width: 13, height: 13 }} />
                {a}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Version" value={form.version} onChange={(e) => set('version', e.target.value)} placeholder="1.0.0" hint="Bump this to publish a new version" />
          <div>
            <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>License</label>
            <select
              value={form.license}
              onChange={(e) => set('license', e.target.value)}
              style={{ width: '100%', height: 36, padding: '0 10px', border: '0.5px solid var(--color-border-hover)', borderRadius: 'var(--radius)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, outline: 'none' }}
            >
              {LICENSES.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <Input label="GitHub repo URL" value={form.github_url} onChange={(e) => set('github_url', e.target.value)} placeholder="https://github.com/org/repo" />

        {/* Optional file upload */}
        <div>
          <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>Replace skill file <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
            style={{
              border: `1px dashed ${dragOver ? 'var(--color-accent)' : 'var(--color-border-hover)'}`,
              borderRadius: 12, padding: '1.25rem', textAlign: 'center',
              background: dragOver ? 'var(--color-accent-dim)' : 'var(--color-surface)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <input ref={fileRef} type="file" accept=".md,.json,.zip" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              {file ? file.name : 'Drop a new .md, .json, or .zip to replace the current file'}
            </div>
          </div>
          {file && (
            <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
              style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}>
              Remove
            </button>
          )}
        </div>

        {errors.submit && <div style={{ fontSize: 13, color: 'var(--color-danger)' }}>{errors.submit}</div>}

        <div style={{ display: 'flex', gap: 10, paddingTop: '1rem', borderTop: '0.5px solid var(--color-border)' }}>
          <Button variant="primary" onClick={submit} loading={submitting}>Save changes</Button>
          <Button variant="ghost" onClick={() => navigate(`/skills/${namespace}/${name}`)}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

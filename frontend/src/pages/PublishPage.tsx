import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { skillsApi } from '@/api/client'
import type { GithubPrefetchResult } from '@/api/client'
import { Button, Input, Textarea, Badge } from '@/components/ui'
import { useAuthStore } from '@/hooks/useAuth'

const DOMAINS = ['Global Health', 'Global Development', 'Data & Analytics', 'Research & Evidence', 'Technology & Tools', 'Communications']
const AUDIENCES = ['Researcher', 'Data Analyst', 'Program Officer', 'Software Engineer', 'IT & Platform']
const LICENSES = ['Apache 2.0', 'MIT', 'CC BY 4.0', 'Proprietary']
const AGENTS = ['All Agents', 'Claude Code', 'Codex', 'Cursor']

export function PublishPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '', namespace: user?.username ?? '', description: '',
    domain: '', audience: '', version: '1.0.0', license: 'Apache 2.0',
    github_url: '',
  })
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [agents, setAgents] = useState<string[]>(['All Agents'])
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [source, setSource] = useState<'upload' | 'github'>('upload')
  const [githubUrl, setGithubUrl] = useState('')
  const [githubFetching, setGithubFetching] = useState(false)
  const [githubInfo, setGithubInfo] = useState<GithubPrefetchResult | null>(null)

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

  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t))
  }

  function toggleAgent(a: string) {
    setAgents((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a])
  }

  function handleFile(f: File) {
    setFile(f)
    setStep(2)
  }

  async function fetchGithub() {
    if (!githubUrl.trim()) return
    setGithubFetching(true)
    setErrors({})
    try {
      const { data } = await skillsApi.prefetchGithub(githubUrl.trim())
      setGithubInfo(data)
      setForm(f => ({
        ...f,
        name: data.name || f.name,
        description: data.description || f.description,
        github_url: data.github_url,
      }))
      if (data.topics.length > 0) setTags(data.topics)
    } catch (err: any) {
      setErrors({ github: err?.response?.data?.detail ?? 'Could not fetch repo — check the URL' })
    } finally {
      setGithubFetching(false)
    }
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name) e.name = 'Required'
    else if (!/^[a-z0-9][a-z0-9-]+[a-z0-9]$/.test(form.name)) e.name = 'Lowercase letters, hyphens only'
    if (!form.namespace) e.namespace = 'Required'
    if (!form.description) e.description = 'Required'
    if (!form.domain) e.domain = 'Required'
    if (source === 'upload' && !file) e.file = 'Upload a skill file'
    if (source === 'github' && !githubInfo) e.github = 'Fetch a GitHub repo first'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function submit() {
    if (!validate()) return
    setSubmitting(true)
    try {
      if (source === 'github') {
        const { data } = await skillsApi.importFromGithub({
          github_url: githubInfo!.github_url,
          name: form.name,
          namespace: form.namespace,
          description: form.description,
          domain: form.domain,
          audience: form.audience || undefined,
          tags,
          supported_agents: agents,
          version: form.version,
          license: form.license,
        })
        navigate(`/skills/${data.namespace}/${data.name}`)
      } else {
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => v && fd.append(k, v))
        fd.append('tags', JSON.stringify(tags))
        fd.append('supported_agents', JSON.stringify(agents))
        fd.append('file', file!)
        const { data } = await skillsApi.publish(fd)
        navigate(`/skills/${data.namespace}/${data.name}`)
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      const msg = Array.isArray(detail)
        ? detail.map((e: any) => e.msg ?? JSON.stringify(e)).join('; ')
        : (detail ?? err?.message ?? 'Something went wrong')
      setErrors({ submit: msg })
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div style={{ maxWidth: 480, margin: '5rem auto', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8 }}>Sign in to publish</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
          You need an account to publish skills to the registry.
        </div>
        <Button variant="primary" onClick={() => navigate('/register')}>Create account</Button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 24px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Publish a skill</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Share your skill with the community — developers can install it with a single command.
        </p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '2rem' }}>
        {[['1', 'Metadata'], ['2', 'Files'], ['3', 'Review']].map(([n, label], i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
              background: step > i + 1 ? 'var(--color-accent)' : step === i + 1 ? 'var(--color-accent-dim)' : 'var(--color-surface-2)',
              border: `0.5px solid ${step >= i + 1 ? 'var(--color-accent)' : 'var(--color-border)'}`,
              color: step > i + 1 ? 'black' : step === i + 1 ? 'var(--color-accent)' : 'var(--color-text-muted)',
            }}>
              {step > i + 1 ? '✓' : n}
            </div>
            <span style={{ fontSize: 12, color: step === i + 1 ? 'var(--color-text)' : 'var(--color-text-muted)' }}>{label}</span>
            {i < 2 && <div style={{ width: 40, height: 0.5, background: 'var(--color-border)', marginLeft: 4 }} />}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '1.5rem', alignItems: 'start' }}>
        <div>
          {/* Section: Basic info */}
          <Section title="Basic information">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Skill name *" value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. rag-blueprint" error={errors.name}
                hint="Lowercase, hyphens only. Used in install command." />
              <Input label="Namespace *" value={form.namespace} onChange={(e) => set('namespace', e.target.value)}
                placeholder="e.g. anthropic or your-username" error={errors.namespace} />
            </div>
            <Textarea label="Short description *" value={form.description} onChange={(e) => set('description', e.target.value)}
              placeholder="What does this skill do? When should an agent use it?" rows={3}
              maxLength={280} error={errors.description}
              hint={`${form.description.length}/280 characters`} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Domain *</label>
                <select value={form.domain} onChange={(e) => set('domain', e.target.value)}
                  style={{ width: '100%', height: 36, padding: '0 10px', border: `0.5px solid ${errors.domain ? 'var(--color-danger)' : 'var(--color-border-hover)'}`, borderRadius: 'var(--radius)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, outline: 'none' }}>
                  <option value="">Select domain…</option>
                  {DOMAINS.map((d) => <option key={d}>{d}</option>)}
                </select>
                {errors.domain && <span style={{ fontSize: 11, color: 'var(--color-danger)' }}>{errors.domain}</span>}
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Primary audience</label>
                <select value={form.audience} onChange={(e) => set('audience', e.target.value)}
                  style={{ width: '100%', height: 36, padding: '0 10px', border: '0.5px solid var(--color-border-hover)', borderRadius: 'var(--radius)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, outline: 'none' }}>
                  <option value="">Select audience…</option>
                  {AUDIENCES.map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            {/* Tags */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 8px', border: '0.5px solid var(--color-border-hover)', borderRadius: 'var(--radius)', background: 'var(--color-surface)', minHeight: 38, cursor: 'text' }}
                onClick={() => document.getElementById('tag-input')?.focus()}>
                {tags.map((t) => (
                  <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--color-surface-2)', border: '0.5px solid var(--color-border)', borderRadius: 20, padding: '2px 8px', fontSize: 12 }}>
                    {t}
                    <button onClick={() => removeTag(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 13, lineHeight: 1 }}>×</button>
                  </span>
                ))}
                <input id="tag-input" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={addTag} placeholder={tags.length ? '' : 'Add tag…'}
                  style={{ border: 'none', background: 'none', outline: 'none', fontSize: 13, color: 'var(--color-text)', minWidth: 80, flex: 1 }} />
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
          </Section>

          {/* File / GitHub source */}
          <Section title="Skill files">
            {/* Source toggle */}
            <div style={{ display: 'flex', gap: 0, border: '0.5px solid var(--color-border)', borderRadius: 'var(--radius)', overflow: 'hidden', width: 'fit-content' }}>
              {(['upload', 'github'] as const).map((s) => (
                <button key={s} onClick={() => setSource(s)} style={{
                  padding: '6px 16px', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
                  background: source === s ? 'var(--color-accent)' : 'var(--color-surface)',
                  color: source === s ? '#fff' : 'var(--color-text-secondary)',
                  transition: 'all 0.15s',
                }}>
                  {s === 'upload' ? '📁 Upload file' : '🐙 From GitHub'}
                </button>
              ))}
            </div>

            {source === 'upload' ? (
              <>
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                  style={{
                    border: `1px dashed ${errors.file ? 'var(--color-danger)' : dragOver ? 'var(--color-accent)' : 'var(--color-border-hover)'}`,
                    borderRadius: 12, padding: '2rem', textAlign: 'center',
                    background: dragOver ? 'var(--color-accent-dim)' : 'var(--color-surface)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <input ref={fileRef} type="file" accept=".md,.json,.zip" style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Drop your skill files here</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Supports .md, .json, or a .zip folder — up to 10 MB</div>
                </div>
                {file && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--color-surface)', border: '0.5px solid rgba(56,161,105,0.4)', borderRadius: 'var(--radius)' }}>
                    <span style={{ color: '#38a169', fontSize: 16 }}>✓</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{file.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</span>
                    <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>✕</button>
                  </div>
                )}
                {errors.file && <div style={{ fontSize: 11, color: 'var(--color-danger)' }}>{errors.file}</div>}
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  Your skill must include a <code style={{ fontFamily: 'var(--font-mono)' }}>SKILL.md</code> as the entry point.
                </div>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Input
                      placeholder="https://github.com/owner/repo"
                      value={githubUrl}
                      onChange={(e) => { setGithubUrl(e.target.value); setGithubInfo(null) }}
                      onKeyDown={(e) => e.key === 'Enter' && fetchGithub()}
                      error={errors.github}
                    />
                  </div>
                  <Button variant="secondary" onClick={fetchGithub} loading={githubFetching}>
                    Fetch info
                  </Button>
                </div>
                {githubInfo && (
                  <div style={{ padding: '10px 12px', background: 'var(--color-surface)', border: '0.5px solid rgba(56,161,105,0.4)', borderRadius: 'var(--radius)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ color: '#38a169', fontSize: 14 }}>✓</span>
                      <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                        {githubInfo.owner}/{githubInfo.repo}
                        {githubInfo.path && <span style={{ color: 'var(--color-accent)' }}>/{githubInfo.path}</span>}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>★ {githubInfo.stars.toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      {githubInfo.path ? `Subfolder README fetched` : `Repo README fetched`} — will be used as skill content.
                      {githubInfo.topics.length > 0 && ` Topics auto-filled as tags.`}
                    </div>
                  </div>
                )}
                {errors.github && !githubInfo && (
                  <div style={{ fontSize: 11, color: 'var(--color-danger)' }}>{errors.github}</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  The repo's README will be used as the skill content. The repo must be public.
                </div>
              </>
            )}
          </Section>

          {/* Publishing options */}
          <Section title="Publishing options">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Version *" value={form.version} onChange={(e) => set('version', e.target.value)} placeholder="1.0.0" hint="Semantic versioning (major.minor.patch)" />
              <div>
                <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 5 }}>License</label>
                <select value={form.license} onChange={(e) => set('license', e.target.value)}
                  style={{ width: '100%', height: 36, padding: '0 10px', border: '0.5px solid var(--color-border-hover)', borderRadius: 'var(--radius)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, outline: 'none' }}>
                  {LICENSES.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <Input label="GitHub repo URL" value={form.github_url} onChange={(e) => set('github_url', e.target.value)} placeholder="https://github.com/org/repo" />
          </Section>

          {errors.submit && <div style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 12 }}>{errors.submit}</div>}

          <div style={{ display: 'flex', gap: 10, paddingTop: '1rem', borderTop: '0.5px solid var(--color-border)' }}>
            <Button variant="primary" onClick={submit} loading={submitting}>Publish skill</Button>
            <Button variant="secondary">Save draft</Button>
            <Button variant="ghost" onClick={() => navigate('/')}>Cancel</Button>
          </div>
        </div>

        {/* Preview */}
        <div style={{ position: 'sticky', top: 72, background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '1rem' }}>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12 }}>Card preview</div>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--color-surface-2)', border: '0.5px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 8 }}>🧩</div>
          <div style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)', marginBottom: 2, color: form.name ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
            {form.name || 'skill-name'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>{form.namespace || 'namespace'}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 10, minHeight: 54 }}>
            {form.description || 'Your description will appear here…'}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
            {form.domain && <Badge color="blue">{form.domain}</Badge>}
            {tags.slice(0, 2).map((t) => <Badge key={t} color="gray">{t}</Badge>)}
            {!form.domain && !tags.length && <Badge color="gray">tag</Badge>}
          </div>
          <div style={{ borderTop: '0.5px solid var(--color-border)', paddingTop: 8, fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            npx skills add {form.namespace || '—'}/{form.name || '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', paddingBottom: 10, borderBottom: '0.5px solid var(--color-border)', marginBottom: 14 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {children}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { skillsApi } from '@/api/client'
import { Badge, Avatar, Spinner, Card } from '@/components/ui'
import { useAuthStore } from '@/hooks/useAuth'

const AGENT_CMDS: Record<string, string> = {
  'Claude Code': '--agent claude-code',
  'Codex': '--agent codex',
  'All Agents': '',
}

export function SkillDetailPage() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'readme' | 'versions' | 'deps'>('readme')
  const [activeAgent, setActiveAgent] = useState('Claude Code')
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleDelete() {
    try {
      await skillsApi.delete(namespace!, name!)
      navigate('/')
    } catch {
      setConfirmDelete(false)
    }
  }

  const queryClient = useQueryClient()

  const { data: skill, isLoading, error } = useQuery({
    queryKey: ['skill', namespace, name],
    queryFn: () => skillsApi.get(namespace!, name!).then((r) => r.data),
    enabled: !!(namespace && name),
  })

  const { data: myRating } = useQuery({
    queryKey: ['my-rating', namespace, name],
    queryFn: () => skillsApi.getMyRating(namespace!, name!).then((r) => r.data),
    enabled: !!(namespace && name && user),
  })

  const [hovered, setHovered] = useState(0)

  const rateMutation = useMutation({
    mutationFn: (score: number) => skillsApi.rate(namespace!, name!, score),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill', namespace, name] })
      queryClient.invalidateQueries({ queryKey: ['my-rating', namespace, name] })
    },
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
        <Spinner size={36} />
      </div>
    )
  }

  if (error || !skill) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
        <div>Skill not found</div>
        <Link to="/" style={{ color: 'var(--color-accent)', fontSize: 13, marginTop: 8, display: 'block' }}>
          Back to registry
        </Link>
      </div>
    )
  }

  const agentFlag = AGENT_CMDS[activeAgent] ?? ''
  const hasZip = !skill.github_url
  const installCmd = hasZip
    ? `npx gf-skillhub-cli add ${skill.slug}${agentFlag ? ' ' + agentFlag : ''}`
    : `npx skills add ${skill.github_url}${agentFlag ? ' ' + agentFlag : ''}`

  function copy() {
    navigator.clipboard.writeText(installCmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 24px' }}>
      {/* Back + Edit */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to registry
        </Link>
        {(user?.username === skill.author.username || user?.is_admin) && (
          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Link
              to={`/skills/${namespace}/${name}/edit`}
              title="Edit skill"
              style={{ color: 'var(--color-text-muted)', padding: 4, borderRadius: 6, lineHeight: 1, textDecoration: 'none' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </Link>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Delete skill"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, borderRadius: 6, lineHeight: 1 }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <button
                  onClick={handleDelete}
                  title="Confirm delete"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: 4, borderRadius: 6, lineHeight: 1 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  title="Cancel"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, borderRadius: 6, lineHeight: 1 }}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 272px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left */}
        <div>
          {/* Hero */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: '1rem' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 13,
              background: 'var(--color-surface-2)', border: '0.5px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0,
            }}>
              🧩
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)', marginBottom: 2 }}>{skill.name}</h1>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{skill.namespace}/{skill.name}</div>
            </div>
          </div>

          {skill.description && (
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.65, marginBottom: '1rem' }}>
              {skill.description.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1').trim()}
            </p>
          )}

          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
            <Badge color="blue">{skill.domain}</Badge>
            {skill.audience && <Badge color="purple">{skill.audience}</Badge>}
            {skill.tags.map((t) => <Badge key={t} color="gray">{t}</Badge>)}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 24, marginBottom: '1.5rem' }}>
            {[
              { label: 'Installs', value: skill.install_count >= 1000 ? `${(skill.install_count / 1000).toFixed(1)}K` : skill.install_count },
              { label: 'Rating', value: skill.rating ? `★ ${skill.rating.toFixed(1)}` : '—' },
              { label: 'Version', value: skill.version },
              { label: 'Size', value: skill.file_size_kb ? `${skill.file_size_kb} KB` : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid var(--color-border)', marginBottom: '1.25rem' }}>
            {(['readme', 'versions', 'deps'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer',
                  color: activeTab === tab ? 'var(--color-text)' : 'var(--color-text-secondary)',
                  borderBottom: `2px solid ${activeTab === tab ? 'var(--color-accent)' : 'transparent'}`,
                  marginBottom: -1, textTransform: tab === 'readme' ? 'none' : 'capitalize',
                }}
              >
                {tab === 'readme' ? 'SKILL.md' : tab === 'deps' ? 'Dependencies' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          {activeTab === 'readme' && (() => {
            if (!skill.readme) return <div style={{ color: 'var(--color-text-muted)' }}>No SKILL.md provided.</div>
            const fmMatch = skill.readme.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
            const meta = fmMatch ? fmMatch[1].trim() : null
            const body = (fmMatch ? fmMatch[2] : skill.readme).trim()
            return (
              <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
                <div style={{ fontWeight: 600, fontSize: '1.4em', color: 'var(--color-text)', marginBottom: '0.75em' }}>{skill.name}</div>
                {meta && (
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '0 0 1.5em', fontSize: 'inherit', lineHeight: 'inherit' }}>{meta}</pre>
                )}
                {body && (
                  <div className="markdown-body">
                    <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{body}</ReactMarkdown>
                  </div>
                )}
              </div>
            )
          })()}

          {activeTab === 'versions' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--color-border)' }}>
                  {['Version', 'Released', 'Notes'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skill.versions.map((v) => (
                  <tr key={v.version} style={{ borderBottom: '0.5px solid var(--color-border)' }}>
                    <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{v.version}</td>
                    <td style={{ padding: '8px', color: 'var(--color-text-secondary)', fontSize: 12 }}>
                      {new Date(v.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '8px', color: 'var(--color-text-secondary)', fontSize: 12 }}>
                      {v.changelog ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'deps' && (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
              No declared dependencies.
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Install card */}
          <Card style={{ padding: '1rem' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 10 }}>Install for agent</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {Object.keys(AGENT_CMDS).map((a) => (
                <button
                  key={a}
                  onClick={() => setActiveAgent(a)}
                  style={{
                    fontSize: 10, padding: '3px 8px', borderRadius: 20, cursor: 'pointer',
                    border: '0.5px solid var(--color-border)',
                    background: activeAgent === a ? 'var(--color-surface-2)' : 'transparent',
                    color: activeAgent === a ? 'var(--color-text)' : 'var(--color-text-secondary)',
                    transition: 'all 0.1s',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
            <div style={{
              background: 'var(--color-surface-2)', border: '0.5px solid var(--color-border)',
              borderRadius: 'var(--radius)', padding: '8px 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 8, marginBottom: 10,
            }}>
              <code style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {installCmd}
              </code>
              <button
                onClick={copy}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? 'var(--color-accent)' : 'var(--color-text-muted)', fontSize: 12, flexShrink: 0 }}
              >
                {copied ? '✓' : '⎘'}
              </button>
            </div>
            <button
              onClick={copy}
              style={{
                width: '100%', padding: '8px 0', borderRadius: 'var(--radius)',
                border: '0.5px solid var(--color-accent)',
                background: 'var(--color-accent-dim)', color: 'var(--color-accent)',
                fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {copied ? 'Copied!' : 'Copy install'}
            </button>
          </Card>

          {/* Author */}
          <Card style={{ padding: '1rem' }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>Published by</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar name={skill.author.display_name || skill.author.username} size={32} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{skill.author.display_name || skill.author.username}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>@{skill.author.username}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{skill.author.email}</div>
              </div>
            </div>
          </Card>

          {/* Rating */}
          <Card style={{ padding: '1rem' }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>
              Rate this skill
              {skill.rating && (
                <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                  ★ {skill.rating.toFixed(1)} avg
                </span>
              )}
            </div>
            {user ? (
              <div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled = star <= (hovered || myRating?.score || 0)
                    return (
                      <button
                        key={star}
                        onClick={() => rateMutation.mutate(star)}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 22, lineHeight: 1, padding: '2px',
                          color: filled ? 'var(--color-accent)' : 'var(--color-border-hover)',
                          transition: 'color 0.1s',
                        }}
                      >
                        ★
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                  {myRating?.score ? `Your rating: ${myRating.score} star${myRating.score > 1 ? 's' : ''}` : 'Click to rate'}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                <Link to="/login" style={{ color: 'var(--color-accent)' }}>Sign in</Link> to rate this skill
              </div>
            )}
          </Card>

          {/* Details */}
          <Card style={{ padding: '1rem' }}>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>Details</div>
            {[
              ['License', skill.license],
              ['Domain', skill.domain],
              ['Version', skill.version],
              ['Published', new Date(skill.created_at).toLocaleDateString()],
              ['Updated', new Date(skill.updated_at).toLocaleDateString()],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid var(--color-border)', fontSize: 12 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{k}</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>{v}</span>
              </div>
            ))}
          </Card>

          {/* Links */}
          {skill.github_url && (
            <Card style={{ padding: '0.75rem 1rem' }}>
              <a href={skill.github_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                View on GitHub
              </a>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

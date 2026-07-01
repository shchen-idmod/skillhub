import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pluginsApi } from '@/api/client'
import { useAuthStore } from '@/hooks/useAuth'
import { parseGithubOrgRepo, buildInstallCommand } from './PluginsPage'
import { Badge, Spinner } from '@/components/ui'

const CATEGORY_ICONS: Record<string, string> = {
  'Tools': '🔧',
  'Data & Analytics': '📊',
  'Models': '🤖',
  'Channels': '💬',
  'Web': '🌐',
  'Other': '🔌',
}

export function PluginDetailPage() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [hovered, setHovered] = useState(0)

  const { data: plugin, isLoading, error } = useQuery({
    queryKey: ['plugin', namespace, name],
    queryFn: () => pluginsApi.get(namespace!, name!).then((r) => r.data),
    enabled: !!namespace && !!name,
  })

  const { data: myRating } = useQuery({
    queryKey: ['my-plugin-rating', namespace, name],
    queryFn: () => pluginsApi.getMyRating(namespace!, name!).then((r) => r.data),
    enabled: !!namespace && !!name && !!user,
  })

  const rateMutation = useMutation({
    mutationFn: (score: number) => pluginsApi.rate(namespace!, name!, score),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plugin', namespace, name] })
      qc.invalidateQueries({ queryKey: ['my-plugin-rating', namespace, name] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => pluginsApi.delete(namespace!, name!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plugins'] })
      navigate('/plugins')
    },
  })

  function handleDelete() {
    deleteMutation.mutate()
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <Spinner size={32} />
      </div>
    )
  }

  if (error || !plugin) {
    return (
      <div style={{ maxWidth: 680, margin: '4rem auto', padding: '0 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔌</div>
        <div style={{ fontSize: 14 }}>Plugin not found.</div>
        <Link to="/plugins" style={{ fontSize: 13, color: 'var(--color-accent)', marginTop: 8, display: 'inline-block' }}>
          ← Back to Plugins
        </Link>
      </div>
    )
  }

  const isOwner = user?.username === plugin.author.username || user?.is_admin === true
  const icon = CATEGORY_ICONS[plugin.category] ?? '🔌'

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '2rem 24px' }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link to="/plugins" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Plugins</Link>
        <span>/</span>
        <span>{plugin.namespace}</span>
        <span>/</span>
        <span style={{ color: 'var(--color-text)' }}>{plugin.name}</span>
      </div>

      {/* Header */}
      <div style={{
        background: 'var(--color-surface)', border: '0.5px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem',
        position: 'relative',
      }}>
        {isOwner && (
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: 2, alignItems: 'center' }}>
            <Link
              to={`/plugins/${plugin.namespace}/${plugin.name}/edit`}
              title="Edit plugin"
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
                title="Delete plugin"
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
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 13, flexShrink: 0,
            background: 'var(--color-surface-2)', border: '0.5px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          }}>
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{plugin.display_name}</h1>
              <Badge color="gray">v{plugin.version}</Badge>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
              {plugin.namespace}/{plugin.name}
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.6 }}>
              {plugin.description}
            </p>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
          <Badge color="blue">{plugin.category}</Badge>
          {plugin.tags.map((t) => <Badge key={t} color="gray">{t}</Badge>)}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <CopyInstallButton githubUrl={plugin.github_url} pluginName={plugin.name} installName={plugin.marketplace_name ?? undefined} />
          {plugin.github_url && (
            <a
              href={plugin.github_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 34, padding: '0 14px', borderRadius: 'var(--radius)',
                border: '0.5px solid var(--color-border)',
                color: 'var(--color-text-secondary)', fontSize: 13, textDecoration: 'none',
                background: 'var(--color-surface)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              View on GitHub ↗
            </a>
          )}
          {plugin.docs_url && (
            <a
              href={plugin.docs_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                height: 34, padding: '0 14px', borderRadius: 'var(--radius)',
                border: '0.5px solid var(--color-border)',
                color: 'var(--color-text-secondary)', fontSize: 13, textDecoration: 'none',
                background: 'var(--color-surface)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              Docs ↗
            </a>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1.5rem', alignItems: 'flex-start' }}>

        {/* README */}
        <div style={{
          background: 'var(--color-surface)', border: '0.5px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)', padding: '1.5rem',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
            README
          </div>
          {plugin.readme ? (
            <pre style={{
              fontSize: 13, lineHeight: 1.7, color: 'var(--color-text)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
              fontFamily: 'inherit',
            }}>
              {plugin.readme}
            </pre>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No README provided.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <InstallInstructions githubUrl={plugin.github_url} pluginName={plugin.name} installName={plugin.marketplace_name ?? undefined} />
          <MetaCard title="Details">
            <MetaRow label="Category" value={plugin.category} />
            <MetaRow label="Version" value={`v${plugin.version}`} />
            <MetaRow label="Installs" value={String(plugin.install_count)} />
            {plugin.rating != null && <MetaRow label="Rating" value={`★ ${plugin.rating.toFixed(1)}`} />}
            <MetaRow label="Published" value={new Date(plugin.created_at).toLocaleDateString()} />
            <MetaRow label="Updated" value={new Date(plugin.updated_at).toLocaleDateString()} />
          </MetaCard>

          <MetaCard title="Rate this plugin">
            {user ? (
              <div>
                <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
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
                <Link to="/login" style={{ color: 'var(--color-accent)' }}>Sign in</Link> to rate this plugin
              </div>
            )}
          </MetaCard>
          <MetaCard title="Author">
            <MetaRow label="Username" value={plugin.author.username} />
            {plugin.author.display_name && <MetaRow label="Name" value={plugin.author.display_name} />}
            <MetaRow label="Email" value={plugin.author.email} />
          </MetaCard>
        </div>
      </div>
    </div>
  )
}

function CopyInstallButton({ githubUrl, pluginName, installName }: { githubUrl: string | null; pluginName: string; installName?: string }) {
  const [copied, setCopied] = useState(false)
  const orgRepo = parseGithubOrgRepo(githubUrl)

  function copy() {
    // installName = .claude-plug/*.json filename = marketplace name (after @)
    const text = buildInstallCommand(githubUrl, pluginName, installName)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!orgRepo) return null

  return (
    <button
      onClick={copy}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        height: 34, padding: '0 14px', borderRadius: 'var(--radius)',
        background: copied ? 'var(--color-surface)' : 'var(--color-accent)',
        border: copied ? '0.5px solid var(--color-accent)' : 'none',
        color: copied ? 'var(--color-accent)' : 'white',
        fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      )}
      {copied ? 'Copied!' : 'Copy install'}
    </button>
  )
}

function InstallInstructions({ githubUrl, pluginName, installName }: { githubUrl: string | null; pluginName: string; installName?: string }) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const orgRepo = parseGithubOrgRepo(githubUrl)

  if (!orgRepo) return null

  const repoName = orgRepo.split('/')[1].replace(/_/g, '-')
  const marketplaceName = installName ?? repoName

  function copySnippet(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  const snippets = [
    {
      label: 'Claude Code plugin',
      code: `/plugin marketplace add ${orgRepo}\n/plugin install ${pluginName}@${marketplaceName}`,
    },
  ]

  return (
    <div style={{
      background: 'var(--color-surface)', border: '0.5px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: '1rem',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
        Install
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {snippets.map((s, i) => (
          <div key={i}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{s.label}</div>
            <div style={{ position: 'relative' }}>
              <pre style={{
                margin: 0, padding: '8px 36px 8px 10px',
                background: 'var(--color-surface-2)', borderRadius: 6,
                fontSize: 11, fontFamily: 'var(--font-mono)', lineHeight: 1.6,
                color: 'var(--color-text)', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                border: '0.5px solid var(--color-border)',
              }}>
                {s.code}
              </pre>
              <button
                onClick={() => copySnippet(s.code, i)}
                style={{
                  position: 'absolute', top: 6, right: 6,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: copiedIdx === i ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  padding: 2,
                }}
              >
                {copiedIdx === i ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MetaCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '0.5px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: '1rem',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 8 }}>
      <span style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--color-text)', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}

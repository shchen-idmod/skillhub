import { useState, useCallback, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pluginsApi, PluginListItem } from '@/api/client'
import { useAuthStore } from '@/hooks/useAuth'
import { Badge, Spinner } from '@/components/ui'

const CATEGORIES = ['Tools', 'Data & Analytics', 'Models', 'Channels', 'Web', 'Other']
const SORT_OPTIONS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name A–Z' },
]

const CATEGORY_ICONS: Record<string, string> = {
  'Tools': '🔧',
  'Data & Analytics': '📊',
  'Models': '🤖',
  'Channels': '💬',
  'Web': '🌐',
  'Other': '🔌',
}

const CATEGORY_COLORS: Record<string, 'blue' | 'green' | 'purple' | 'orange' | 'gray'> = {
  'Tools': 'orange',
  'Data & Analytics': 'purple',
  'Models': 'blue',
  'Channels': 'green',
  'Web': 'blue',
  'Other': 'gray',
}

export function PluginsPage() {
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [categories, setCategories] = useState<string[]>([])
  const [sort, setSort] = useState('popular')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(true)

  useEffect(() => {
    const urlQ = searchParams.get('q') ?? ''
    setQ(urlQ)
    setPage(1)
  }, [searchParams])

  const params = {
    q: q || undefined,
    category: categories[0],
    sort,
    page,
    page_size: 24,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['plugins', params],
    queryFn: () => pluginsApi.list(params).then((r) => r.data),
  })

  const toggle = useCallback(
    (val: string, list: string[], setter: (v: string[]) => void) => {
      setter(list.includes(val) ? list.filter((v) => v !== val) : [...list, val])
      setPage(1)
    },
    []
  )

  const activeFilterCount = categories.length

  function clearAll() { setCategories([]) }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>

      {/* Hero */}
      <div style={{
        padding: '2rem 0 1.5rem',
        borderBottom: '0.5px solid var(--color-border)',
        marginBottom: '1.5rem',
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, flexShrink: 0,
          background: 'rgba(99, 102, 241, 0.12)', border: '0.5px solid rgba(99, 102, 241, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgb(99,102,241)" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' }}>Plugins</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
            Official Gates Foundation integrations and service connectors for agents
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>

        {/* Filter sidebar */}
        {showFilters && (
          <aside style={{ width: 200, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                Filters {activeFilterCount > 0 && <span style={{ color: 'var(--color-accent)' }}>({activeFilterCount})</span>}
              </span>
              <button
                onClick={() => setShowFilters(false)}
                title="Close filters"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', fontSize: 16, lineHeight: 1,
                  padding: '2px 4px', borderRadius: 4,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <FilterSection title="Category">
              {CATEGORIES.map((c) => (
                <FilterOption key={c} label={c} checked={categories.includes(c)} onChange={() => toggle(c, categories, setCategories)} />
              ))}
            </FilterSection>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAll}
                style={{ fontSize: 12, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Clear all filters
              </button>
            )}
          </aside>
        )}

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
            {!showFilters && (
              <button
                onClick={() => setShowFilters(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  height: 36, padding: '0 12px', borderRadius: 'var(--radius)',
                  border: '0.5px solid var(--color-border-hover)',
                  background: 'var(--color-surface)', color: 'var(--color-text-secondary)',
                  fontSize: 12, cursor: 'pointer', flexShrink: 0,
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/>
                </svg>
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </button>
            )}
            <div style={{ flex: 1, position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1) }}
                placeholder="Search plugins by name, description, or tag…"
                style={{
                  width: '100%', height: 36, padding: '0 12px 0 32px',
                  border: '0.5px solid var(--color-border-hover)',
                  borderRadius: 'var(--radius)', background: 'var(--color-surface)',
                  color: 'var(--color-text)', fontSize: 13, outline: 'none',
                }}
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              style={{
                height: 36, padding: '0 10px',
                border: '0.5px solid var(--color-border)',
                borderRadius: 'var(--radius)', background: 'var(--color-surface)',
                color: 'var(--color-text)', fontSize: 12, outline: 'none', cursor: 'pointer',
              }}
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {activeFilterCount > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {categories.map((f) => (
                <Badge key={f} color="green">{f}</Badge>
              ))}
            </div>
          )}

          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            {isLoading ? 'Loading…' : `${data?.total ?? 0} plugin${data?.total !== 1 ? 's' : ''}`}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <Spinner size={32} />
            </div>
          ) : data?.items.length === 0 ? (
            <EmptyState hasFilters={activeFilterCount > 0 || q.length > 0} onClear={clearAll} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {data?.items.map((p) => <PluginCard key={p.id} plugin={p} />)}
            </div>
          )}

          {data && data.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '2rem' }}>
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{
                    width: 32, height: 32, borderRadius: 'var(--radius)',
                    border: `0.5px solid ${p === page ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    background: p === page ? 'var(--color-accent-dim)' : 'transparent',
                    color: p === page ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    fontSize: 12, cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PluginCard({ plugin }: { plugin: PluginListItem }) {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const icon = CATEGORY_ICONS[plugin.category] ?? '🔌'
  const badgeColor = CATEGORY_COLORS[plugin.category] ?? 'gray'
  const isOwner = user?.username === plugin.author.username || user?.is_admin === true

  function copyInstall(e: React.MouseEvent) {
    e.stopPropagation()
    const text = buildInstallCommand(plugin.github_url, plugin.name, plugin.marketplace_name)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    await pluginsApi.delete(plugin.namespace, plugin.name)
    qc.invalidateQueries({ queryKey: ['plugins'] })
  }

  return (
    <div
      onClick={() => navigate(`/plugins/${plugin.namespace}/${plugin.name}`)}
      style={{
        background: 'var(--color-surface)',
        border: '0.5px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem',
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--color-border-hover)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--color-border)'
        el.style.transform = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: 'var(--color-surface-2)',
          border: '0.5px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {isOwner && (
            <>
              <Link
                to={`/plugins/${plugin.namespace}/${plugin.name}/edit`}
                onClick={(e) => e.stopPropagation()}
                title="Edit plugin"
                style={{
                  color: 'var(--color-text-muted)', fontSize: 13, padding: 4,
                  borderRadius: 6, lineHeight: 1, textDecoration: 'none',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </Link>
              {!confirmDelete ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
                  title="Delete plugin"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', padding: 4, borderRadius: 6, lineHeight: 1,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              ) : (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  <button
                    onClick={handleDelete}
                    title="Confirm delete"
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
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
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
            </>
          )}
          <button
            onClick={copyInstall}
            title="Copy install command"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: copied ? 'var(--color-accent)' : 'var(--color-text-muted)',
              fontSize: 14, padding: 4, borderRadius: 6, lineHeight: 1,
            }}
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{plugin.display_name}</div>

      <div style={{
        fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.55,
        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', marginBottom: 10,
      }}>
        {plugin.description}
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
        <Badge color={badgeColor}>{plugin.category}</Badge>
        {plugin.tags.slice(0, 2).map((t) => (
          <Badge key={t} color="gray">{t}</Badge>
        ))}
      </div>

      <div style={{
        borderTop: '0.5px solid var(--color-border)', paddingTop: 10,
        display: 'flex', alignItems: 'center', gap: 12,
        fontSize: 11, color: 'var(--color-text-muted)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {plugin.install_count >= 1000 ? `${(plugin.install_count / 1000).toFixed(1)}K` : plugin.install_count}
        </span>
        {plugin.rating != null && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ color: '#f6c90e' }}>★</span> {plugin.rating.toFixed(1)}
          </span>
        )}
        <span>v{plugin.version}</span>
        <span style={{ marginLeft: 'auto' }}>{daysAgo(plugin.updated_at)}</span>
      </div>
    </div>
  )
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🔌</div>
      <div style={{ fontSize: 14, marginBottom: 4 }}>No plugins found</div>
      <div style={{ fontSize: 12, marginBottom: hasFilters ? 16 : 0 }}>
        {hasFilters ? 'Try a different search or clear filters' : 'No plugins have been published yet'}
      </div>
      {hasFilters && (
        <button onClick={onClear} style={{ fontSize: 12, color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
          Clear filters
        </button>
      )}
    </div>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {children}
      </div>
    </div>
  )
}

function FilterOption({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: checked ? 'var(--color-text)' : 'var(--color-text-secondary)', cursor: 'pointer' }}>
      <input
        type="checkbox" checked={checked} onChange={onChange}
        style={{ accentColor: 'var(--color-accent)', width: 13, height: 13 }}
      />
      {label}
    </label>
  )
}

export function parseGithubOrgRepo(githubUrl: string | null | undefined): string | null {
  if (!githubUrl) return null
  const m = githubUrl.match(/github\.com\/([^/]+\/[^/]+)/)
  return m ? m[1] : null
}

export function getGithubRepoUrl(githubUrl: string | null | undefined): string | null {
  const orgRepo = parseGithubOrgRepo(githubUrl)
  return orgRepo ? `https://github.com/${orgRepo}` : null
}

export function buildInstallCommand(githubUrl: string | null | undefined, pluginName: string, marketplaceName?: string | null): string {
  const orgRepo = parseGithubOrgRepo(githubUrl)
  if (!orgRepo) return githubUrl ?? ''
  const repoName = orgRepo.split('/')[1].replace(/_/g, '-')
  const marketplace = marketplaceName || repoName
  return `/plugin marketplace add ${orgRepo}\n/plugin install ${pluginName}@${marketplace}`
}

export async function fetchClaudePlugName(githubUrl: string | null | undefined): Promise<string | null> {
  const orgRepo = parseGithubOrgRepo(githubUrl)
  if (!orgRepo) return null
  try {
    const res = await fetch(`https://api.github.com/repos/${orgRepo}/contents/.claude-plugin`)
    if (!res.ok) return null
    const files: { name: string; download_url: string }[] = await res.json()
    const marketplaceFile = files.find(f => f.name === 'marketplace.json')
    if (marketplaceFile) {
      try {
        const contentRes = await fetch(marketplaceFile.download_url)
        if (contentRes.ok) {
          const content = await contentRes.json()
          if (typeof content.name === 'string' && content.name) return content.name
        }
      } catch {}
    }
    const jsonFile = files.find(f => f.name.endsWith('.json'))
    return jsonFile ? jsonFile.name.replace(/\.json$/, '') : null
  } catch {
    return null
  }
}

function daysAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  return `${Math.floor(days / 365)}y`
}

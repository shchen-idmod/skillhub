import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { skillsApi } from '@/api/client'
import { SkillCard } from '@/components/SkillCard'
import { Badge, Spinner } from '@/components/ui'

const DOMAINS = ['Global Health', 'Global Development', 'Data & Analytics', 'Research & Evidence', 'Technology & Tools', 'Communications']
const AUDIENCES = ['Researcher', 'Data Analyst', 'Program Officer', 'Software Engineer', 'IT & Platform']
const AGENTS = ['All Agents', 'Claude Code', 'Codex', 'Cursor']
const SORT_OPTIONS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'name', label: 'Name A–Z' },
]

export function RegistryPage() {
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') ?? '')
  const [domains, setDomains] = useState<string[]>([])
  const [audiences, setAudiences] = useState<string[]>([])
  const [agents, setAgents] = useState<string[]>([])
  const [sort, setSort] = useState('popular')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(true)

  // Sync q when URL param changes (e.g. typed in Navbar)
  useEffect(() => {
    const urlQ = searchParams.get('q') ?? ''
    setQ(urlQ)
    setPage(1)
  }, [searchParams])

  const params = {
    q: q || undefined,
    domain: domains[0],
    audience: audiences[0],
    agent: agents[0],
    sort,
    page,
    page_size: 24,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['skills', params],
    queryFn: () => skillsApi.list(params).then((r) => r.data),
  })

  const toggle = useCallback(
    (val: string, list: string[], setter: (v: string[]) => void) => {
      setter(list.includes(val) ? list.filter((v) => v !== val) : [...list, val])
      setPage(1)
    },
    []
  )

  const activeFilterCount = domains.length + audiences.length + agents.length

  function clearAll() {
    setDomains([]); setAudiences([]); setAgents([])
  }

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
          background: 'var(--color-accent-dim)', border: '0.5px solid var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--color-accent)" stroke="none">
            <path d="M12 2l1.8 7.2L21 12l-7.2 1.8L12 22l-1.8-8.2L3 12l8.2-1.8z"/>
          </svg>
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' }}>Skills</h1>
          <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 }}>
            Official Gates Foundation skills for agents
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>

        {/* Filter sidebar */}
        {showFilters && (
          <aside style={{ width: 200, flexShrink: 0 }}>
            {/* Sidebar header */}
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

            <FilterSection title="Domain">
              {DOMAINS.map((d) => (
                <FilterOption key={d} label={d} checked={domains.includes(d)} onChange={() => toggle(d, domains, setDomains)} />
              ))}
            </FilterSection>
            <FilterSection title="Audience">
              {AUDIENCES.map((a) => (
                <FilterOption key={a} label={a} checked={audiences.includes(a)} onChange={() => toggle(a, audiences, setAudiences)} />
              ))}
            </FilterSection>
            <FilterSection title="Agent">
              {AGENTS.map((a) => (
                <FilterOption key={a} label={a} checked={agents.includes(a)} onChange={() => toggle(a, agents, setAgents)} />
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
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
            {/* Show filters toggle */}
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

            {/* Search */}
            <div style={{ flex: 1, position: 'relative' }}>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-text-muted)" strokeWidth="2"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
              >
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1) }}
                placeholder="Search skills by name, description, or tag…"
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

          {/* Active filter pills */}
          {activeFilterCount > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {[...domains, ...audiences, ...agents].map((f) => (
                <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Badge color="green">{f}</Badge>
                </span>
              ))}
            </div>
          )}

          {/* Count */}
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            {isLoading ? 'Loading…' : `${data?.total ?? 0} skills`}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <Spinner size={32} />
            </div>
          ) : data?.items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 14, marginBottom: 4 }}>No skills found</div>
              <div style={{ fontSize: 12 }}>Try a different search or clear filters</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {data?.items.map((s) => <SkillCard key={s.id} skill={s} />)}
            </div>
          )}

          {/* Pagination */}
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

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { SkillListItem } from '@/api/client'
import { skillsApi } from '@/api/client'
import { useAuthStore } from '@/hooks/useAuth'
import { Badge } from './ui'
import { SkillModal } from './SkillModal'

const DOMAIN_COLORS: Record<string, 'green' | 'blue' | 'purple' | 'orange' | 'gray'> = {
  'AI & ML': 'blue',
  'Physical AI': 'purple',
  'Computing': 'orange',
  'Infrastructure': 'gray',
  'Dev Tools': 'green',
}

const ICONS: Record<string, string> = {
  'AI & ML': '🧩',
  'Physical AI': '🤖',
  'Computing': '⚡',
  'Infrastructure': '🏗️',
  'Dev Tools': '🛠️',
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

function daysAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  return `${Math.floor(days / 365)}y`
}

export function SkillCard({ skill }: { skill: SkillListItem }) {
  const [showModal, setShowModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const icon = ICONS[skill.domain] ?? '📦'
  const badgeColor = DOMAIN_COLORS[skill.domain] ?? 'gray'
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const isOwner = user?.username === skill.author.username || user?.is_admin === true

  function copyInstall(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(`npx skills add ${skill.slug}`)
  }

  const deleteMutation = useMutation({
    mutationFn: () => skillsApi.delete(skill.namespace, skill.name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['skills'] }),
  })

  return (
    <>
      {showModal && <SkillModal skill={skill} onClose={() => setShowModal(false)} />}
      <div
        onClick={() => setShowModal(true)}
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
        {/* Top row */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button
              onClick={copyInstall}
              title="Copy install command"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', fontSize: 14, padding: 4,
                borderRadius: 6, lineHeight: 1,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            {isOwner && !confirmDelete && (
              <>
                <Link
                  to={`/skills/${skill.namespace}/${skill.name}/edit`}
                  onClick={(e) => e.stopPropagation()}
                  title="Edit skill"
                  style={{ color: 'var(--color-text-muted)', padding: 4, borderRadius: 6, lineHeight: 1, textDecoration: 'none' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
                  title="Delete skill"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, borderRadius: 6, lineHeight: 1 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </>
            )}
            {isOwner && confirmDelete && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate() }}
                  title="Confirm delete"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', padding: 4, borderRadius: 6, lineHeight: 1 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }}
                  title="Cancel"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, borderRadius: 6, lineHeight: 1 }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Name */}
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
          {skill.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8 }}>
          {skill.namespace}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.55,
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', marginBottom: 10,
        }}>
          {skill.description}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          <Badge color={badgeColor}>{skill.domain}</Badge>
          {skill.tags.slice(0, 2).map((t) => (
            <Badge key={t} color="gray">{t}</Badge>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '0.5px solid var(--color-border)', paddingTop: 10,
          display: 'flex', alignItems: 'center', gap: 12,
          fontSize: 11, color: 'var(--color-text-muted)',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {formatCount(skill.install_count)}
          </span>
          {skill.rating && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ color: '#f6c90e' }}>★</span> {skill.rating.toFixed(1)}
            </span>
          )}
          <span style={{ marginLeft: 'auto' }}>{daysAgo(skill.updated_at)}</span>
        </div>
      </div>
    </>
  )
}
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SkillListItem } from '@/api/client'

const AGENT_CMDS: Record<string, string> = {
  'All Agents': '',
  'Claude Code': '--agent claude-code',
  'Codex': '--agent codex',
}

export function SkillModal({ skill, onClose }: { skill: SkillListItem; onClose: () => void }) {
  const navigate = useNavigate()
  const [activeAgent, setActiveAgent] = useState('All Agents')
  const [copied, setCopied] = useState(false)

  const flag = AGENT_CMDS[activeAgent] ?? ''
  const cmd = `npx skills add ${skill.slug}${flag ? ' ' + flag : ''}`

  function copy() {
    navigator.clipboard.writeText(cmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1a1a1a', border: '0.5px solid #333',
          borderRadius: 16, width: '100%', maxWidth: 560,
          maxHeight: '85vh', overflowY: 'auto',
          padding: '1.5rem',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
              {skill.name}
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>{skill.namespace}/{skill.name}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', fontSize: 20, lineHeight: 1, padding: 4 }}
          >
            ×
          </button>
        </div>

        {/* Agent tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
          {Object.keys(AGENT_CMDS).map((a) => (
            <button
              key={a}
              onClick={() => setActiveAgent(a)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                border: '0.5px solid',
                borderColor: activeAgent === a ? 'var(--color-accent)' : '#444',
                background: activeAgent === a ? 'rgba(118,185,0,0.15)' : 'transparent',
                color: activeAgent === a ? 'var(--color-accent)' : '#888',
              }}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Install command */}
        <div style={{
          background: '#111', border: '0.5px solid #333', borderRadius: 8,
          padding: '10px 14px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 8, marginBottom: '1rem',
        }}>
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {cmd}
          </code>
          <button
            onClick={copy}
            style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, fontSize: 14, color: copied ? 'var(--color-accent)' : '#666' }}
          >
            {copied ? '✓' : '⎘'}
          </button>
        </div>

        {/* Description */}
        <p style={{ fontSize: 14, color: '#aaa', lineHeight: 1.65, marginBottom: '1rem' }}>
          {skill.description}
        </p>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
          {skill.tags.map((t) => (
            <span key={t} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: 'rgba(255,255,255,0.06)', border: '0.5px solid #333', color: '#888',
            }}>
              {t}
            </span>
          ))}
          {skill.audience && (
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: 'rgba(118,185,0,0.1)', border: '0.5px solid rgba(118,185,0,0.3)', color: 'var(--color-accent)',
            }}>
              {skill.audience}
            </span>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 24, marginBottom: '1.25rem', paddingTop: '1rem', borderTop: '0.5px solid #222' }}>
          <div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>Updated</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {Math.floor((Date.now() - new Date(skill.updated_at).getTime()) / 86400000)}d ago
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>Installs</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {skill.install_count >= 1000 ? `${(skill.install_count / 1000).toFixed(1)}K` : skill.install_count}
            </div>
          </div>
          {skill.rating && (
            <div>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>Rating</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>★ {skill.rating.toFixed(1)}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { onClose(); navigate(`/skills/${skill.slug}`) }}
            style={{
              flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
              border: '0.5px solid #444', background: 'transparent', color: '#ccc', fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            View detail
          </button>
          {skill.github_url && (
            <button
              onClick={() => window.open(skill.github_url!, '_blank')}
              style={{
                flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
                border: '0.5px solid #444', background: 'transparent', color: '#ccc', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              View on GitHub ↗
            </button>
          )}
          <button
            onClick={copy}
            style={{
              flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
              border: 'none', background: 'var(--color-accent)', color: 'black', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {copied ? '✓ Copied!' : '⎘ Copy install'}
          </button>
        </div>
      </div>
    </div>
  )
}
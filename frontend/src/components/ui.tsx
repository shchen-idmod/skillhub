import React from 'react'
import clsx from 'clsx'

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  loading?: boolean
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center gap-2 font-medium border rounded transition-all'
  const variants = {
    primary: 'bg-[var(--color-accent)] text-black border-transparent hover:bg-[var(--color-accent-hover)]',
    secondary: 'bg-transparent text-[var(--color-text)] border-[var(--color-border-hover)] hover:bg-[var(--color-surface-2)]',
    ghost: 'bg-transparent border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
    danger: 'bg-transparent border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[rgba(229,62,62,0.1)]',
  }
  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
  }

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      style={{ cursor: disabled || loading ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
      {...props}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode
  color?: 'green' | 'blue' | 'purple' | 'gray' | 'orange'
}

const badgeColors = {
  green: { bg: 'rgba(118,185,0,0.15)', color: '#76b900', border: 'rgba(118,185,0,0.3)' },
  blue:  { bg: 'rgba(66,153,225,0.15)', color: '#63b3ed', border: 'rgba(66,153,225,0.3)' },
  purple:{ bg: 'rgba(159,122,234,0.15)', color: '#b794f4', border: 'rgba(159,122,234,0.3)' },
  gray:  { bg: 'rgba(255,255,255,0.06)', color: '#888', border: 'rgba(255,255,255,0.1)' },
  orange:{ bg: 'rgba(237,137,54,0.15)', color: '#f6ad55', border: 'rgba(237,137,54,0.3)' },
}

export function Badge({ children, color = 'gray' }: BadgeProps) {
  const { bg, color: c, border } = badgeColors[color]
  return (
    <span
      style={{
        fontSize: 11, padding: '2px 8px', borderRadius: 20,
        background: bg, color: c, border: `0.5px solid ${border}`,
        display: 'inline-block', fontWeight: 500, lineHeight: '18px',
      }}
    >
      {children}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={2.5}
      style={{ animation: 'spin 0.7s linear infinite' }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <circle cx="12" cy="12" r="10" strokeOpacity={0.2} />
      <path d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export function Input({ label, hint, error, className, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          {label}
        </label>
      )}
      <input
        style={{
          width: '100%', height: 36, padding: '0 10px',
          border: `0.5px solid ${error ? 'var(--color-danger)' : 'var(--color-border-hover)'}`,
          borderRadius: 'var(--radius)', background: 'var(--color-surface)',
          color: 'var(--color-text)', fontSize: 13,
          outline: 'none',
        }}
        {...props}
      />
      {hint && !error && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: 'var(--color-danger)' }}>{error}</span>}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export function Textarea({ label, hint, error, ...props }: TextareaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</label>}
      <textarea
        style={{
          width: '100%', padding: '8px 10px', resize: 'vertical',
          border: `0.5px solid ${error ? 'var(--color-danger)' : 'var(--color-border-hover)'}`,
          borderRadius: 'var(--radius)', background: 'var(--color-surface)',
          color: 'var(--color-text)', fontSize: 13, lineHeight: 1.6,
          outline: 'none', fontFamily: 'var(--font-sans)',
        }}
        {...props}
      />
      {hint && !error && <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: 'var(--color-danger)' }}>{error}</span>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export function Select({ label, options, ...props }: SelectProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</label>}
      <select
        style={{
          width: '100%', height: 36, padding: '0 10px',
          border: '0.5px solid var(--color-border-hover)',
          borderRadius: 'var(--radius)', background: 'var(--color-surface)',
          color: 'var(--color-text)', fontSize: 13, outline: 'none',
        }}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '0.5px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'var(--color-accent-dim)', border: '0.5px solid rgba(118,185,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.35, fontWeight: 500, color: 'var(--color-accent)',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

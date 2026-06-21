import React, { useState } from 'react';

/**
 * Card — bordered content block. Hiro cards are flat with a
 * hairline border + tiny radius; hover lifts subtly. Optional
 * eyebrow + trailing arrow for the "product" link style.
 */
export function Card({
  children,
  eyebrow,
  title,
  arrow = false,
  interactive = false,
  padding = 24,
  onClick,
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding,
        cursor: interactive ? 'pointer' : 'default',
        transform: interactive && hover ? 'translateY(-2px)' : 'translateY(0)',
        borderColor: interactive && hover ? 'var(--hiro-ink)' : 'var(--border-subtle)',
        boxShadow: interactive && hover ? 'var(--shadow-md)' : 'var(--shadow-none)',
        transition: 'transform var(--dur-base) var(--ease-out), border-color var(--dur-base), box-shadow var(--dur-base)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {eyebrow && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 'var(--ls-label)',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10,
        }}>{eyebrow}</div>
      )}
      {title && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          fontWeight: 700, fontSize: 20, letterSpacing: '-0.015em',
          color: 'var(--text-strong)', marginBottom: children ? 8 : 0,
        }}>
          <span>{title}</span>
          {arrow && <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>→</span>}
        </div>
      )}
      {children && (
        <div style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--text-muted)' }}>{children}</div>
      )}
    </div>
  );
}

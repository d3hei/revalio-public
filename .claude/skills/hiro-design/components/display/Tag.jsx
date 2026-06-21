import React from 'react';

/**
 * Tag — slash-prefixed mono category label used in Hiro nav and
 * filters ("/ Tools", "/ APIs"). Optional active state.
 */
export function Tag({ children, active = false, slash = true, onClick }) {
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontFamily: 'var(--font-mono)', fontSize: 12,
        letterSpacing: 'var(--ls-label)', textTransform: 'uppercase',
        color: active ? 'var(--text-strong)' : 'var(--text-muted)',
        cursor: onClick ? 'pointer' : 'default',
        borderBottom: active ? '1px solid var(--accent)' : '1px solid transparent',
        paddingBottom: 2, transition: 'color var(--dur-fast)',
      }}
    >
      {slash && <span style={{ color: 'var(--text-faint)' }}>/</span>}
      {children}
    </span>
  );
}

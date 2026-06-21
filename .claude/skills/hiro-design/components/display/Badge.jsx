import React from 'react';

/**
 * Badge — small status pill. Mono, uppercase, used for "NEW",
 * "BETA", "All systems normal", network status, etc.
 */
export function Badge({ children, tone = 'neutral', dot = false }) {
  const tones = {
    neutral: { bg: 'var(--hiro-paper-2)', fg: 'var(--text-strong)', dotc: 'var(--hiro-gray)' },
    accent:  { bg: 'var(--accent-wash)', fg: 'var(--accent-press)', dotc: 'var(--accent)' },
    orange:  { bg: 'var(--hiro-orange-50)', fg: 'var(--hiro-orange-600)', dotc: 'var(--hiro-orange)' },
    success: { bg: 'var(--hiro-green-50)', fg: 'var(--hiro-green)', dotc: 'var(--hiro-green)' },
    warning: { bg: 'var(--hiro-yellow-50)', fg: '#9a7800', dotc: 'var(--hiro-yellow)' },
    danger:  { bg: 'var(--hiro-red-50)', fg: 'var(--hiro-red)', dotc: 'var(--hiro-red)' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 9px',
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
      letterSpacing: 'var(--ls-label)', textTransform: 'uppercase',
      color: t.fg, background: t.bg, borderRadius: 'var(--radius-xs)',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.dotc }} />}
      {children}
    </span>
  );
}

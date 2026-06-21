import React from 'react';

/**
 * BracketButton — Hiro's signature [ LABEL ] mono control.
 * Used for newsletter / CTA chrome across the marketing site.
 */
export function BracketButton({
  children,
  filled = false,
  size = 'md',
  disabled = false,
  onClick,
  ...rest
}) {
  const pad = { sm: '7px 12px', md: '10px 16px', lg: '13px 22px' }[size];
  const fs = { sm: 11, md: 12, lg: 14 }[size];

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: pad,
    fontFamily: 'var(--font-mono)',
    fontSize: fs,
    fontWeight: 700,
    letterSpacing: 'var(--ls-wide)',
    textTransform: 'uppercase',
    color: filled ? '#fff' : 'var(--text-strong)',
    background: filled ? 'var(--hiro-ink)' : 'transparent',
    border: '1px solid var(--hiro-ink)',
    borderRadius: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'background var(--dur-fast), color var(--dur-fast)',
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={style}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = filled ? 'var(--accent)' : 'var(--hiro-ink)';
        e.currentTarget.style.color = '#fff';
        e.currentTarget.style.borderColor = filled ? 'var(--accent)' : 'var(--hiro-ink)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = filled ? 'var(--hiro-ink)' : 'transparent';
        e.currentTarget.style.color = filled ? '#fff' : 'var(--text-strong)';
        e.currentTarget.style.borderColor = 'var(--hiro-ink)';
      }}
      {...rest}
    >
      <span aria-hidden="true">[</span>
      {children}
      <span aria-hidden="true">]</span>
    </button>
  );
}

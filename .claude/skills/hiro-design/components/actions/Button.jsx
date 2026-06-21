import React from 'react';

/**
 * Hiro Button — primary action element.
 * Square-ish corners, Space Grotesk medium. Variants map to the
 * brand's ink / violet / outline / ghost treatments.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  arrow = false,
  fullWidth = false,
  disabled = false,
  type = 'button',
  onClick,
  ...rest
}) {
  const pad = {
    sm: '8px 14px',
    md: '11px 18px',
    lg: '15px 24px',
  }[size];
  const fs = { sm: 13, md: 15, lg: 17 }[size];

  const variants = {
    primary: { background: 'var(--hiro-ink)', color: '#fff', border: '1px solid var(--hiro-ink)' },
    accent:  { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' },
    secondary: { background: 'transparent', color: 'var(--text-strong)', border: '1px solid var(--border-strong)' },
    ghost:   { background: 'transparent', color: 'var(--text-strong)', border: '1px solid transparent' },
  };

  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: fullWidth ? '100%' : 'auto',
    padding: pad,
    fontFamily: 'var(--font-sans)',
    fontSize: fs,
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: '-0.01em',
    borderRadius: 'var(--radius-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'transform var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out), opacity var(--dur-fast)',
    ...variants[variant],
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={style}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = 'translateY(1px)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
      {...rest}
    >
      {children}
      {arrow && <span aria-hidden="true" style={{ fontFamily: 'var(--font-mono)' }}>→</span>}
    </button>
  );
}

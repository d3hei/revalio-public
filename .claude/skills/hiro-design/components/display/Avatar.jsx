import React from 'react';

/** Avatar — square monogram/image, Hiro-boxy. */
export function Avatar({ name = '', src, size = 40, square = true }) {
  const initials = name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const base = {
    width: size, height: size, flex: 'none',
    borderRadius: square ? 'var(--radius-sm)' : '50%',
    overflow: 'hidden', display: 'grid', placeItems: 'center',
    background: 'var(--hiro-ink)', color: '#fff',
    fontFamily: 'var(--font-mono)', fontWeight: 700,
    fontSize: Math.round(size * 0.36), letterSpacing: '-0.02em',
  };
  if (src) {
    return <img src={src} alt={name} style={{ ...base, objectFit: 'cover' }} />;
  }
  return <span style={base} aria-label={name}>{initials || '·'}</span>;
}

import React from 'react';

/** Toggle — pill switch. */
export function Toggle({ checked = false, label, disabled = false, onChange, id }) {
  const tid = id || (label ? `tg-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <label htmlFor={tid} style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-body)',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
    }}>
      <span style={{
        width: 40, height: 22, flex: 'none', borderRadius: 999,
        background: checked ? 'var(--accent)' : 'var(--hiro-paper-2)',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-subtle)'}`,
        position: 'relative', transition: 'background var(--dur-base) var(--ease-out)',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          boxShadow: 'var(--shadow-sm)',
          transition: 'left var(--dur-base) var(--ease-out)',
        }} />
      </span>
      <input id={tid} type="checkbox" checked={checked} disabled={disabled} onChange={onChange}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      {label}
    </label>
  );
}

import React from 'react';

/** Checkbox — square, ink/violet check. */
export function Checkbox({ checked = false, label, disabled = false, onChange, id }) {
  const cid = id || (label ? `cb-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <label htmlFor={cid} style={{
      display: 'inline-flex', alignItems: 'center', gap: 10,
      fontFamily: 'var(--font-sans)', fontSize: 15, color: 'var(--text-body)',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
    }}>
      <span style={{
        width: 18, height: 18, flex: 'none',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}`,
        background: checked ? 'var(--accent)' : 'transparent',
        borderRadius: 'var(--radius-xs)',
        display: 'grid', placeItems: 'center',
        transition: 'background var(--dur-fast), border-color var(--dur-fast)',
      }}>
        {checked && (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.2l2.2 2.3L9.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="square" />
          </svg>
        )}
      </span>
      <input id={cid} type="checkbox" checked={checked} disabled={disabled} onChange={onChange}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
      {label}
    </label>
  );
}

import React, { useState } from 'react';

/**
 * Input — text field with optional mono label and prefix.
 * Hairline border, square corners, violet focus ring.
 */
export function Input({
  label,
  placeholder,
  value,
  defaultValue,
  type = 'text',
  prefix,
  hint,
  error,
  disabled = false,
  mono = false,
  onChange,
  id,
  ...rest
}) {
  const [focus, setFocus] = useState(false);
  const inputId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const borderColor = error
    ? 'var(--hiro-red)'
    : focus
    ? 'var(--accent)'
    : 'var(--border-subtle)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)' }}>
      {label && (
        <label htmlFor={inputId} style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 'var(--ls-label)',
          textTransform: 'uppercase', color: 'var(--text-muted)',
        }}>{label}</label>
      )}
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-sm)',
        background: disabled ? 'var(--bg-sunken)' : 'var(--hiro-white)',
        boxShadow: focus ? '0 0 0 3px var(--accent-wash)' : 'none',
        transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
      }}>
        {prefix && (
          <span style={{ paddingLeft: 12, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>{prefix}</span>
        )}
        <input
          id={inputId}
          type={type}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={onChange}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            padding: '10px 12px',
            fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
            fontSize: 15, color: 'var(--text-strong)',
          }}
          {...rest}
        />
      </div>
      {(hint || error) && (
        <span style={{ fontSize: 12, color: error ? 'var(--hiro-red)' : 'var(--text-faint)' }}>{error || hint}</span>
      )}
    </div>
  );
}

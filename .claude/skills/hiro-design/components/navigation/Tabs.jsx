import React, { useState } from 'react';

/**
 * Tabs — mono uppercase tab bar with a sliding ink/violet
 * underline. Controlled or uncontrolled.
 */
export function Tabs({ tabs = [], value, defaultValue, onChange }) {
  const [internal, setInternal] = useState(defaultValue ?? (tabs[0] && tabs[0].id));
  const active = value !== undefined ? value : internal;
  const select = (id) => {
    if (value === undefined) setInternal(id);
    onChange && onChange(id);
  };
  return (
    <div style={{
      display: 'flex', gap: 28,
      borderBottom: '1px solid var(--border-subtle)',
      fontFamily: 'var(--font-mono)',
    }}>
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => select(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0 0 12px', marginBottom: -1,
              fontFamily: 'var(--font-mono)', fontSize: 12,
              letterSpacing: 'var(--ls-label)', textTransform: 'uppercase',
              color: on ? 'var(--text-strong)' : 'var(--text-muted)',
              borderBottom: `2px solid ${on ? 'var(--accent)' : 'transparent'}`,
              transition: 'color var(--dur-fast)',
            }}
          >
            {t.label}
            {t.count != null && (
              <span style={{ color: 'var(--text-faint)', marginLeft: 6 }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

import React from 'react';

/**
 * Terminal — dark code/CLI panel, a core Hiro brand motif.
 * Pass `lines` (array) or children. Each line may be a string or
 * { text, comment, prompt, tone }.
 */
export function Terminal({ title, lines, children, prompt = '$' }) {
  const tones = {
    default: 'var(--text-on-dark)',
    muted: 'var(--hiro-gray)',
    accent: 'var(--hiro-violet-300)',
    orange: 'var(--hiro-orange)',
    green: 'var(--hiro-green)',
  };
  return (
    <div style={{
      background: 'var(--surface-terminal)',
      border: '1px solid var(--border-dark)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      fontFamily: 'var(--font-mono)',
      fontSize: 13.5, lineHeight: 1.7,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '11px 14px', borderBottom: '1px solid var(--border-dark)',
      }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#36363a' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#36363a' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#36363a' }} />
        {title && (
          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--hiro-gray)', letterSpacing: '0.04em' }}>{title}</span>
        )}
      </div>
      <div style={{ padding: '16px 18px', color: 'var(--text-on-dark)' }}>
        {lines ? lines.map((l, i) => {
          if (typeof l === 'string') {
            return <div key={i}>{l}</div>;
          }
          return (
            <div key={i} style={{ color: tones[l.tone] || tones.default }}>
              {l.prompt && <span style={{ color: 'var(--hiro-gray)' }}>{prompt} </span>}
              {l.text}
              {l.comment && <span style={{ color: 'var(--hiro-gray)' }}>  # {l.comment}</span>}
            </div>
          );
        }) : children}
      </div>
    </div>
  );
}

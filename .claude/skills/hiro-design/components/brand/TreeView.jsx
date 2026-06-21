import React from 'react';

/**
 * TreeView — the `$ tree` file-tree motif used to lay out Hiro's
 * product map. Renders nodes with ├──/└── connectors + comments.
 */
export function TreeView({ root = '.', nodes = [], onSelect }) {
  const render = (items, prefix) =>
    items.map((n, i) => {
      const last = i === items.length - 1;
      const branch = last ? '└──' : '├──';
      const childPrefix = prefix + (last ? '\u00A0\u00A0\u00A0\u00A0' : '│\u00A0\u00A0\u00A0');
      return (
        <React.Fragment key={(n.label || '') + i}>
          <div
            onClick={n.onClick || (onSelect && (() => onSelect(n)))}
            style={{
              display: 'flex', alignItems: 'baseline', gap: 8,
              cursor: n.onClick || onSelect ? 'pointer' : 'default',
              padding: '2px 0', color: 'var(--text-strong)',
            }}
          >
            <span style={{ color: 'var(--hiro-orange)', whiteSpace: 'pre' }}>{prefix}{branch}</span>
            <span style={{
              color: n.accent ? 'var(--accent)' : 'var(--text-strong)',
              borderBottom: (n.onClick || onSelect) ? '1px solid transparent' : 'none',
            }}>{n.label}</span>
            {n.comment && <span style={{ color: 'var(--text-faint)' }}># {n.comment}</span>}
          </div>
          {n.children && render(n.children, childPrefix)}
        </React.Fragment>
      );
    });

  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-strong)' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>$ tree {root}</div>
      {render(nodes, '')}
    </div>
  );
}

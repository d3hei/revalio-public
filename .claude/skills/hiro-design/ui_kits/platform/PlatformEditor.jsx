/* Hiro Platform — Clarity code editor + console. */
function PlatformEditor({ network }) {
  const { Button, Badge } = window.HiroDesignSystem_318aec;
  const [active, setActive] = React.useState('counter.clar');
  const [log, setLog] = React.useState([
    { t: 'Clarinet 2.x · Clarity 3', tone: 'muted' },
  ]);
  const files = ['counter.clar', 'utils.clar'];

  const code = [
    [';; counter.clar — a minimal counter', 'cmt'],
    ['(define-data-var count uint u0)', 'plain'],
    ['', 'plain'],
    ['(define-public (increment)', 'kw'],
    ['  (begin', 'plain'],
    ['    (var-set count (+ (var-get count) u1))', 'plain'],
    ['    (ok (var-get count))))', 'ok'],
    ['', 'plain'],
    ['(define-read-only (get-count)', 'kw'],
    ['  (ok (var-get count)))', 'ok'],
  ];

  const check = () => setLog((l) => [...l,
    { t: '$ clarinet check', tone: 'prompt' },
    { t: '✓ Contract counter.clar checked — 0 errors, 0 warnings', tone: 'green' },
  ]);
  const deploy = () => setLog((l) => [...l,
    { t: `$ clarinet deployments apply --${network.toLowerCase()}`, tone: 'prompt' },
    { t: `→ Broadcasting counter.clar to ${network}…`, tone: 'orange' },
    { t: '✓ Deployed · txid 0x9f3a…c21b', tone: 'green' },
  ]);

  const toneColor = { muted: 'var(--hiro-gray)', prompt: 'var(--hiro-gray-2)', green: 'var(--hiro-green)', orange: 'var(--hiro-orange)' };
  const synColor = { cmt: 'var(--hiro-gray)', kw: 'var(--hiro-violet-300)', ok: 'var(--hiro-green)', plain: 'var(--text-on-dark)' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--surface-terminal)' }}>
      {/* file tabs + actions */}
      <div style={{ height: 42, flex: 'none', display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid var(--border-dark)' }}>
        <div style={{ display: 'flex' }}>
          {files.map((f) => (
            <button key={f} onClick={() => setActive(f)} style={{
              border: 'none', borderRight: '1px solid var(--border-dark)', cursor: 'pointer',
              padding: '0 18px', fontFamily: 'var(--font-mono)', fontSize: 13,
              background: active === f ? 'var(--surface-terminal-2)' : 'transparent',
              color: active === f ? 'var(--text-on-dark)' : 'var(--hiro-gray)',
              borderTop: active === f ? '2px solid var(--accent)' : '2px solid transparent',
            }}>{f}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 12 }}>
          <button onClick={check} style={{
            display: 'inline-flex', alignItems: 'center', padding: '8px 14px',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
            color: 'var(--text-on-dark)', background: 'transparent',
            border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            transition: 'background var(--dur-fast)',
          }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-terminal-2)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >Check</button>
          <Button size="sm" variant="accent" onClick={deploy}>Deploy → {network}</Button>
        </div>
      </div>
      {/* code */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 0', fontFamily: 'var(--font-mono)', fontSize: 13.5, lineHeight: 1.7 }}>
        {code.map((ln, i) => (
          <div key={i} style={{ display: 'flex' }}>
            <span style={{ width: 44, flex: 'none', textAlign: 'right', paddingRight: 14, color: '#45454a', userSelect: 'none' }}>{i + 1}</span>
            <span style={{ color: synColor[ln[1]], whiteSpace: 'pre' }}>{ln[0] || ' '}</span>
          </div>
        ))}
      </div>
      {/* console */}
      <div style={{ height: 152, flex: 'none', borderTop: '1px solid var(--border-dark)', background: 'var(--hiro-black)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid var(--border-dark)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--hiro-gray)' }}>Console</span>
          <Badge tone={network === 'Mainnet' ? 'orange' : network === 'Testnet' ? 'accent' : 'neutral'} dot>{network}</Badge>
        </div>
        <div style={{ padding: '10px 14px', overflow: 'auto', height: 'calc(100% - 37px)', fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.65 }}>
          {log.map((l, i) => (
            <div key={i} style={{ color: toneColor[l.tone] || 'var(--text-on-dark)' }}>{l.t}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.PlatformEditor = PlatformEditor;

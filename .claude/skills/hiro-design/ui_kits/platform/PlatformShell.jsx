/* Hiro Platform — app chrome: top bar + left sidebar. */
function PlatformTopBar({ project, network, setNetwork, onHome }) {
  const { Avatar } = window.HiroDesignSystem_318aec;
  const nets = ['Devnet', 'Testnet', 'Mainnet'];
  return (
    <div style={{
      height: 52, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', background: 'var(--surface-terminal)', borderBottom: '1px solid var(--border-dark)',
      color: 'var(--text-on-dark)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span onClick={onHome} style={{ width: 28, height: 28, background: '#fff', color: 'var(--hiro-ink)', borderRadius: 'var(--radius-sm)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, cursor: 'pointer' }}>H</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--hiro-gray)' }}>
          <span onClick={onHome} style={{ cursor: 'pointer' }}>platform</span>
          {project && <span> / <span style={{ color: 'var(--text-on-dark)' }}>{project}</span></span>}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', background: 'var(--surface-terminal-2)', border: '1px solid var(--border-dark)', borderRadius: 'var(--radius-sm)', padding: 3 }}>
          {nets.map((n) => (
            <button key={n} onClick={() => setNetwork(n)} style={{
              border: 'none', cursor: 'pointer', borderRadius: 4, padding: '5px 12px',
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase',
              background: network === n ? 'var(--accent)' : 'transparent',
              color: network === n ? '#fff' : 'var(--hiro-gray)',
            }}>{n}</button>
          ))}
        </div>
        <Avatar name="Dev User" size={28} />
      </div>
    </div>
  );
}

function PlatformSidebar({ active, files, openFile }) {
  const items = [
    { id: 'explorer', label: 'Explorer' },
    { id: 'deploy', label: 'Deploy' },
    { id: 'devnet', label: 'Devnet' },
  ];
  return (
    <aside style={{ width: 232, flex: 'none', background: 'var(--surface-terminal-2)', borderRight: '1px solid var(--border-dark)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px 10px', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--hiro-gray)' }}>Project files</div>
      <div style={{ padding: '0 10px', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.9, color: 'var(--hiro-gray-2)' }}>
        <div style={{ color: 'var(--text-on-dark)' }}>📁 contracts</div>
        {files.map((f) => (
          <div key={f} onClick={() => openFile(f)} style={{
            paddingLeft: 22, cursor: 'pointer',
            color: active === f ? 'var(--hiro-violet-300)' : 'var(--hiro-gray-2)',
            borderLeft: active === f ? '2px solid var(--accent)' : '2px solid transparent',
          }}>{f}</div>
        ))}
        <div style={{ color: 'var(--text-on-dark)', marginTop: 4 }}>📁 tests</div>
        <div style={{ paddingLeft: 22 }}>counter_test.ts</div>
        <div style={{ color: 'var(--hiro-gray)', marginTop: 4 }}>Clarinet.toml</div>
      </div>
    </aside>
  );
}
window.PlatformTopBar = PlatformTopBar;
window.PlatformSidebar = PlatformSidebar;

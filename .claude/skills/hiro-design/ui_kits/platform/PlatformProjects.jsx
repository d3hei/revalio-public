/* Hiro Platform — projects dashboard. */
function PlatformProjects({ openProject }) {
  const { Button, Badge } = window.HiroDesignSystem_318aec;
  const projects = [
    { name: 'counter', desc: 'A minimal Clarity counter contract.', contracts: 1, net: 'Devnet', updated: '2h ago' },
    { name: 'nft-marketplace', desc: 'SIP-009 NFT listing & escrow contracts.', contracts: 4, net: 'Testnet', updated: 'Yesterday' },
    { name: 'sbtc-vault', desc: 'A wrapped-BTC vault with Chainhook triggers.', contracts: 3, net: 'Devnet', updated: '3d ago' },
  ];
  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg-paper)' }}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>/ Your projects</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 36, letterSpacing: '-0.02em', color: 'var(--text-strong)', margin: 0 }}>Projects</h1>
          </div>
          <Button variant="primary" arrow>New project</Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {projects.map((p) => (
            <div key={p.name} onClick={() => openProject(p.name)} style={{
              background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)', padding: 22, cursor: 'pointer',
              transition: 'border-color var(--dur-base), transform var(--dur-base)',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--hiro-ink)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700, color: 'var(--text-strong)' }}>{p.name}</span>
                <Badge tone={p.net === 'Testnet' ? 'accent' : 'neutral'} dot>{p.net}</Badge>
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>{p.desc}</p>
              <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-faint)' }}>
                <span>{p.contracts} contract{p.contracts > 1 ? 's' : ''}</span>
                <span>updated {p.updated}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.PlatformProjects = PlatformProjects;

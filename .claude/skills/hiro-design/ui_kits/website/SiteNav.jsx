/* Hiro marketing — top nav. Logo + mono nav + actions. */
function SiteNav() {
  const { Button, Tag } = window.HiroDesignSystem_318aec;
  const items = ['Tools & APIs', 'Build', 'Resources', 'Company'];
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 20,
      background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {/* announcement bar */}
      <div style={{
        background: 'var(--hiro-ink)', color: 'var(--text-on-dark)',
        fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.02em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
        padding: '8px 16px', textAlign: 'center',
      }}>
        <span style={{ color: 'var(--hiro-gray-2)' }}>Increased API rate limits, dedicated support channels.</span>
        <a href="#" style={{ color: 'var(--hiro-violet-300)', textDecoration: 'none' }}>→ Meet Hiro's new account tiers</a>
      </div>
      <nav style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{
              width: 30, height: 30, background: 'var(--hiro-ink)', color: '#fff',
              borderRadius: 'var(--radius-sm)', display: 'grid', placeItems: 'center',
              fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, letterSpacing: '-0.04em',
            }}>H</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, letterSpacing: '-0.04em', color: 'var(--text-strong)' }}>Hiro</span>
          </a>
          <div style={{ display: 'flex', gap: 22 }}>
            {items.map((t) => (
              <a key={t} href="#" style={{
                fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5,
              }}>{t} <span style={{ fontSize: 9, color: 'var(--text-faint)' }}>▾</span></a>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <a href="#" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>Docs ↗</a>
          <a href="#" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)', textDecoration: 'none' }}>Sign in</a>
          <Button size="sm" variant="primary">Start building</Button>
        </div>
      </nav>
    </header>
  );
}
window.SiteNav = SiteNav;

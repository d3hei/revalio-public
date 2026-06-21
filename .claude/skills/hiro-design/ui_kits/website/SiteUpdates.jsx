/* Hiro marketing — latest posts & videos list + newsletter footer. */
function SiteUpdates() {
  const { Tag } = window.HiroDesignSystem_318aec;
  const posts = [
    { date: 'Feb 6, 2026', title: 'Chainhooks v2 Is Now Generally Available', kind: 'Blog post' },
    { date: 'Feb 6, 2026', title: 'Upcoming Deprecation of Ordinals, Runes, and BRC-20 APIs', kind: 'Blog post' },
    { date: 'Jun 10, 2025', title: "A Breakdown of Stacks' Proof of Transfer Smart Contract", kind: 'Video' },
    { date: 'Jun 10, 2025', title: 'Building Faster Payment Solutions for Bitcoin', kind: 'Video' },
  ];
  return (
    <section style={{ background: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px 72px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, letterSpacing: '-0.02em', color: 'var(--text-strong)', margin: '0 0 28px' }}>Latest posts &amp; videos</h2>
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {posts.map((p) => (
            <a key={p.title} href="#" style={{
              display: 'grid', gridTemplateColumns: '140px 1fr 120px', gap: 20, alignItems: 'center',
              padding: '20px 4px', borderBottom: '1px solid var(--border-subtle)', textDecoration: 'none',
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-paper)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-faint)' }}>{p.date}</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 19, letterSpacing: '-0.01em', color: 'var(--text-strong)' }}>{p.title}</span>
              <span style={{ justifySelf: 'end' }}><Tag>{p.kind}</Tag></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
window.SiteUpdates = SiteUpdates;

function SiteFooter() {
  const { BracketButton, Checkbox, Badge } = window.HiroDesignSystem_318aec;
  const [agree, setAgree] = React.useState(false);
  const cols = [
    { h: 'Tools', items: ['Hiro Platform', 'Chainhooks'] },
    { h: 'APIs', items: ['Stacks Blockchain API', 'Token Metadata API', 'Pricing'] },
    { h: 'Build', items: ['Documentation', 'Guides'] },
    { h: 'Company', items: ['Careers # we\'re hiring', 'About us', 'Press'] },
    { h: 'Resources', items: ['Blog', 'Videos', 'Newsletter'] },
  ];
  return (
    <footer style={{ background: 'var(--surface-terminal)', color: 'var(--text-on-dark)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 24px 40px' }}>
        {/* newsletter */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center',
          paddingBottom: 44, marginBottom: 44, borderBottom: '1px solid var(--border-dark)',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ width: 30, height: 30, background: '#fff', color: 'var(--hiro-ink)', borderRadius: 'var(--radius-sm)', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19 }}>H</span>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24 }}>Hiro</span>
            </div>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 16, color: 'var(--hiro-gray-2)', margin: 0, maxWidth: 360 }}>Stay up to date with product updates, learning resources, and more.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <input placeholder="you@domain.com" style={{
                flex: 1, background: 'var(--surface-terminal-2)', border: '1px solid var(--border-dark)',
                borderRadius: 'var(--radius-sm)', padding: '12px 14px', color: '#fff',
                fontFamily: 'var(--font-mono)', fontSize: 14, outline: 'none',
              }} />
              <BracketButton filled>Subscribe</BracketButton>
            </div>
            <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.4, color: 'var(--hiro-gray)', cursor: 'pointer' }}>
              <span onClick={() => setAgree(!agree)} style={{ width: 16, height: 16, flex: 'none', marginTop: 1, border: '1px solid var(--hiro-gray)', background: agree ? 'var(--accent)' : 'transparent', borderColor: agree ? 'var(--accent)' : 'var(--hiro-gray)', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 10 }}>{agree ? '✓' : ''}</span>
              I agree to receive marketing communications from Hiro, and consent to my data being processed per Hiro's Privacy Policy.
            </label>
          </div>
        </div>
        {/* link columns — tree style */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 24 }}>
          {cols.map((c) => (
            <div key={c.h}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--hiro-gray-2)', marginBottom: 14 }}>{c.h} /</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {c.items.map((it, i) => (
                  <a key={it} href="#" style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--hiro-gray-2)', textDecoration: 'none' }}>
                    <span style={{ color: 'var(--hiro-orange)' }}>{i === c.items.length - 1 ? '└──' : '├──'}</span> {it}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 44, paddingTop: 24, borderTop: '1px solid var(--border-dark)', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--hiro-gray)' }}>© 2026 Hiro Systems PBC</span>
          <Badge tone="success" dot>All systems normal</Badge>
        </div>
      </div>
    </footer>
  );
}
window.SiteFooter = SiteFooter;

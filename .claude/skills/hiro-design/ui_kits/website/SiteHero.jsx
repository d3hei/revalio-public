/* Hiro marketing — hero. Big uppercase headline + terminal visual. */
function SiteHero() {
  const { Button, Terminal, Badge } = window.HiroDesignSystem_318aec;
  return (
    <section style={{ background: 'var(--bg-canvas)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '72px 24px 80px',
        display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', gap: 56, alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: 'var(--ls-label)',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 22,
          }}>/ Developer tools for Bitcoin layers</div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 76, lineHeight: 0.92,
            letterSpacing: '-0.035em', textTransform: 'uppercase', color: 'var(--text-strong)', margin: '0 0 24px',
          }}>
            Build web3<br />on <span style={{ color: 'var(--accent)' }}>Bitcoin.</span>
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: 19, lineHeight: 1.5,
            color: 'var(--text-muted)', maxWidth: 440, margin: '0 0 32px',
          }}>Building on Bitcoin is hard. Hiro's developer tools make it easier.</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="primary" size="lg" arrow>Start coding</Button>
            <Button variant="secondary" size="lg">Read the docs</Button>
          </div>
        </div>
        <div>
          <Terminal title="~/hiro-quickstart" lines={[
            { text: 'npm create stacks@latest', prompt: true },
            { text: 'cd my-bitcoin-app && clarinet check', prompt: true, comment: 'verify contracts', tone: 'accent' },
            { text: '✓ 3 contracts checked, 0 errors', tone: 'green' },
            { text: 'clarinet devnet start', prompt: true },
            { text: 'Devnet running at http://localhost:8000', tone: 'muted' },
            { text: 'chainhook predicate apply ./hooks/mint.json', prompt: true, comment: 'react to onchain events', tone: 'orange' },
          ]} />
        </div>
      </div>
    </section>
  );
}
window.SiteHero = SiteHero;

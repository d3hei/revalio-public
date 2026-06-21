/* Hiro marketing — product explorer with Bento / Tree / Featured views. */
function ProductExplorer() {
  const { Tabs, Card, TreeView, Badge } = window.HiroDesignSystem_318aec;
  const [view, setView] = React.useState('bento');

  const products = [
    { eyebrow: 'Tool', title: 'Hiro Platform', desc: 'Write and deploy smart contracts from your browser.', badge: 'Beta' },
    { eyebrow: 'Tool', title: 'Chainhook', desc: 'Re-org aware indexing engine for Bitcoin layers.', badge: 'New' },
    { eyebrow: 'Tool', title: 'Ordhook', desc: 'A reliable client indexer for Ordinals.', badge: 'New' },
    { eyebrow: 'API', title: 'Stacks Blockchain API', desc: 'Query the Stacks blockchain via REST endpoints.' },
    { eyebrow: 'API', title: 'Token Metadata API', desc: 'Verify and display tokens and NFTs in your app.' },
    { eyebrow: 'Docs', title: 'Hiro Docs', desc: 'Guides and references to set up Hiro tools.' },
  ];

  return (
    <section style={{ background: 'var(--bg-paper)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px 72px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 40, letterSpacing: '-0.02em',
            color: 'var(--text-strong)', margin: 0, maxWidth: 520,
          }}>Developer tools for Bitcoin layers</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: 'var(--ls-label)', textTransform: 'uppercase', color: 'var(--text-faint)' }}>View :</span>
            <Tabs value={view} onChange={setView} tabs={[
              { id: 'bento', label: 'Bento' },
              { id: 'tree', label: 'Tree' },
              { id: 'featured', label: 'Featured' },
            ]} />
          </div>
        </div>

        {view === 'bento' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {products.map((p) => (
              <div key={p.title} style={{ position: 'relative' }}>
                {p.badge && (
                  <span style={{ position: 'absolute', top: 16, right: 16, zIndex: 2 }}>
                    <Badge tone={p.badge === 'Beta' ? 'warning' : 'accent'}>{p.badge}</Badge>
                  </span>
                )}
                <Card eyebrow={p.eyebrow} title={p.title} arrow interactive>{p.desc}</Card>
              </div>
            ))}
          </div>
        )}

        {view === 'tree' && (
          <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 28 }}>
            <TreeView root="path/hiro" nodes={[
              { label: 'stacks', children: [
                { label: 'hiro-platform', comment: 'the web3 development platform for Stacks', accent: true },
                { label: 'chainhook', comment: 'set actions in motion with IFTTT logic' },
                { label: 'stacks-blockchain-api', comment: 'query information via REST endpoints' },
                { label: 'token-metadata-api', comment: 'verify and display tokens & NFTs' },
              ]},
              { label: 'bitcoin', children: [
                { label: 'ordhook', comment: 'a reliable index for Ordinals' },
              ]},
            ]} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-faint)', marginTop: 16 }}>2 directories, 2 apis, 3 tools</div>
          </div>
        )}

        {view === 'featured' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card eyebrow="Featured · Stacks" title="Chainhook" arrow interactive padding={32}>
              Build smarter apps with webhook-like triggers that react to onchain events in real time, on both Stacks and Bitcoin.
            </Card>
            <Card eyebrow="Featured · Platform" title="Hiro Platform" arrow interactive padding={32}>
              The web3 development platform for Stacks — write, test and deploy Clarity contracts directly from your browser.
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
window.ProductExplorer = ProductExplorer;

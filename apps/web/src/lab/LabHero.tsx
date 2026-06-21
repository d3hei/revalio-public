import { useState, type FormEvent } from "react";

interface Props {
  onSearch: (address: string) => void;
  searchError: string | null;
}

export function LabHero({ onSearch, searchError }: Props) {
  const [query, setQuery] = useState("");

  function submit(e?: FormEvent) {
    e?.preventDefault();
    onSearch(query);
  }

  return (
    <>
      <section className="lab-hero">
        <div className="lab-hero-copy">
          <div className="lab-badge">
            <span className="lab-badge-dot" />
            Sui mainnet · design preview
          </div>
          <h1 className="lab-display lab-display-xl">
            <span className="lab-display-muted">Track.</span>{" "}
            <span>Analyze.</span>{" "}
            <span className="lab-display-muted">Understand.</span>
          </h1>
          <p>
            Portfolio intelligence for Sui wallets — balances, native staking, DeFi positions, and
            on-chain activity in one calm, readable surface.
          </p>
          <form className="lab-search" onSubmit={submit}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Paste Sui address (0x…)"
              spellCheck={false}
              autoComplete="off"
              aria-label="Search Sui address"
            />
            <button type="submit" className="lab-pill">
              Explore
            </button>
          </form>
          {searchError ? (
            <p style={{ marginTop: 12, color: "#b42318", fontSize: 13 }}>{searchError}</p>
          ) : null}
          <div className="lab-hero-actions">
            <button
              type="button"
              className="lab-pill lab-pill-ghost"
              onClick={() => {
                const demo = "0x67cf8792f7c029af45ab26c6becb5000f34cc57fcf413e30943523eac553dca8";
                setQuery(demo);
                onSearch(demo);
              }}
            >
              Staking demo
            </button>
          </div>
        </div>

        <div className="lab-diagram" aria-hidden>
          <div className="lab-diagram-grid" />
          <div className="lab-diagram-lines">
            <svg viewBox="0 0 400 420" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M200 80 L200 200 L80 280" stroke="#bbb" strokeWidth="1" />
              <path d="M200 200 L320 260" stroke="#bbb" strokeWidth="1" />
              <path d="M200 200 L200 340" stroke="#bbb" strokeWidth="1" />
              <circle cx="200" cy="200" r="28" stroke="#999" strokeWidth="1" fill="#f0f0f0" />
              <circle cx="80" cy="280" r="8" fill="#ccc" />
              <circle cx="320" cy="260" r="8" fill="#ccc" />
              <circle cx="200" cy="340" r="8" fill="#ccc" />
            </svg>
          </div>
        </div>
      </section>

      <section className="lab-stats">
        <div>
          <div className="lab-stat-value">929</div>
          <div className="lab-stat-label">SUI native staking tracked via RPC without indexer lag.</div>
        </div>
        <div>
          <div className="lab-stat-value">5+</div>
          <div className="lab-stat-label">Protocols decoded on mainnet — Navi, Cetus, Turbos, Scallop, Suilend.</div>
        </div>
        <div>
          <div className="lab-stat-value">24/7</div>
          <div className="lab-stat-label">Live portfolio valuation with Pyth spot prices and on-demand balances.</div>
        </div>
      </section>
    </>
  );
}

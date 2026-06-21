import { useState, type FormEvent } from "react";

interface Props {
  onSearch: (address: string) => void;
  searchError: string | null;
}

export function BoltHero({ onSearch, searchError }: Props) {
  const [query, setQuery] = useState("");

  function submit(e?: FormEvent) {
    e?.preventDefault();
    onSearch(query);
  }

  return (
    <section className="bolt-hero">
      <div className="bolt-hero-card">
        <span className="bolt-hero-badge">Sui portfolio analytics</span>
        <h1>Understand every wallet on mainnet</h1>
        <p>
          Balances, native staking, and DeFi positions — presented in a clean analytics dashboard.
          Paste any address or connect your wallet to explore.
        </p>
        <form className="bolt-hero-search" onSubmit={submit}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="0x… wallet address"
            spellCheck={false}
            autoComplete="off"
            aria-label="Search Sui address"
          />
          <button type="submit">Explore wallet</button>
        </form>
        {searchError ? <p className="bolt-hero-error">{searchError}</p> : null}
        <div className="bolt-hero-demos">
          <button
            type="button"
            onClick={() => {
              const demo = "0x67cf8792f7c029af45ab26c6becb5000f34cc57fcf413e30943523eac553dca8";
              setQuery(demo);
              onSearch(demo);
            }}
          >
            Staking demo
          </button>
          <button
            type="button"
            onClick={() => {
              const demo = "0x08beed3ebf0b5620ab5ea33be9ccd87e7b1ef590834fe3b7ac71e40c3f679ed1";
              setQuery(demo);
              onSearch(demo);
            }}
          >
            Cetus whale
          </button>
        </div>
      </div>

      <div className="bolt-hero-preview" aria-hidden>
        <div className="bolt-preview-kpi bolt-preview-kpi-primary">
          <span>Total portfolio</span>
          <strong>$738.42</strong>
        </div>
        <div className="bolt-preview-kpi">
          <span>Tokens</span>
          <strong>$12.04</strong>
        </div>
        <div className="bolt-preview-kpi">
          <span>Positions</span>
          <strong>$726.38</strong>
        </div>
        <div className="bolt-preview-chart">
          {[40, 55, 48, 72, 65, 80, 74, 92].map((h, i) => (
            <div
              key={i}
              className={i === 7 ? "bar active" : "bar"}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

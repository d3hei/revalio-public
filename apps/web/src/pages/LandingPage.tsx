import { WalletInflowPanel } from "../components/WalletInflowPanel.js";

/** Hero / empty state — shown at "/". */
export function LandingPage() {
  return (
    <section className="hero">
      <div className="hero-grid">
        <div className="hero-card">
          <p className="hero-eyebrow">/ Sui portfolio intelligence</p>
          <h2>
            Track any <span className="accent">Sui</span> wallet.
          </h2>
          <p>
            Portfolio intelligence for Sui. Assets, staking, DeFi positions, NFTs, activity and
            net worth - all in one place.
          </p>
          <ul className="hero-features">
            <li>Portfolio value &amp; net worth</li>
            <li>Staking, lending &amp; DeFi exposure</li>
            <li>NFTs &amp; on-chain activity</li>
            <li>Real-time data from Sui mainnet</li>
          </ul>
        </div>

        <WalletInflowPanel />
      </div>
    </section>
  );
}

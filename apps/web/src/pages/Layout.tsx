import { useCurrentAccount } from "@mysten/dapp-kit";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { FooterMatrix } from "../components/FooterMatrix.js";
import { SiteHeader } from "../components/SiteHeader.js";
import { SUI_NETWORK } from "../lib/network.js";
import { normalizeSuiAddress } from "../lib/sui.js";

function networkLabel(network: string): string {
  return network.charAt(0).toUpperCase() + network.slice(1);
}

/** App shell: announcement bar, header (search → route), content, footer. */
export function Layout() {
  const navigate = useNavigate();
  const account = useCurrentAccount();

  function onSearch(address: string | null) {
    if (address) {
      navigate(`/${address}`);
      return;
    }
    const connected = account?.address ? normalizeSuiAddress(account.address) : null;
    navigate(connected ? `/${connected}` : "/");
  }

  return (
    <div className="layout">
      <div className="announce">
        <span>Portfolio Intelligence for Sui</span>
        <Link to="/">→ Explore wallets</Link>
      </div>

      <SiteHeader
        onSearch={onSearch}
        onGoToMyWallet={() => {
          const connected = account?.address ? normalizeSuiAddress(account.address) : null;
          navigate(connected ? `/${connected}` : "/");
        }}
      />

      <main className="main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <FooterMatrix />
        <div className="site-footer-inner">
          <div className="footer-brand">
            <form className="footer-subscribe" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="your@email" spellCheck={false} aria-label="Email" />
              <button type="submit">Subscribe</button>
            </form>
          </div>

          <div className="footer-col">
            <h4>Explore</h4>
            <ul>
              <li>
                <Link to="/whales">Whales</Link>
              </li>
              <li>
                <Link to="/watchlist">Watchlist</Link>
              </li>
              <li>
                <Link to="/">Search</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Protocols</h4>
            <ul>
              <li>NAVI · Scallop</li>
              <li>Suilend · Cetus</li>
              <li>Turbos · DeepBook</li>
              <li>Native staking</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          Revalio — Portfolio intelligence for Sui · {networkLabel(SUI_NETWORK)} · © 2026
        </div>
      </footer>
    </div>
  );
}

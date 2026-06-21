import { Link } from "react-router-dom";
import { AnalysisNavButton } from "./AnalysisNavButton.js";
import { ConnectWallet } from "./ConnectWallet.js";
import { OtherNavMenu } from "./OtherNavMenu.js";
import { PortfolioNavButton } from "./PortfolioNavButton.js";
import { SiteHeaderSearch } from "./SiteHeaderSearch.js";

interface Props {
  onSearch: (address: string | null) => void;
  onGoToMyWallet: () => void;
}

export function SiteHeader({ onSearch, onGoToMyWallet }: Props) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link className="site-brand" to="/" aria-label="Revalio home">
          <img className="site-logo" src="/logo.png" alt="" width={28} height={28} decoding="async" />
          <span className="site-brand-text">Revalio</span>
        </Link>

        <nav className="site-header-nav" aria-label="Sections">
          <PortfolioNavButton />
          <AnalysisNavButton />
          <OtherNavMenu />
        </nav>

        <SiteHeaderSearch onSearch={onSearch} />

        <div className="site-header-actions">
          <ConnectWallet onGoToMyWallet={onGoToMyWallet} />
        </div>
      </div>
    </header>
  );
}

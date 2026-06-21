import { useCurrentAccount } from "@mysten/dapp-kit";
import { useMemo, useState } from "react";
import { ConnectWallet } from "../components/ConnectWallet.js";
import { normalizeSuiAddress, isValidSuiAddress, shortenAddress } from "../lib/sui.js";
import { BoltDashboard } from "./BoltDashboard.js";
import { BoltHeaderSearch } from "./BoltHeaderSearch.js";
import { BoltHero } from "./BoltHero.js";

type Tab = "portfolio" | "positions" | "activity";

export function BoltApp() {
  const account = useCurrentAccount();
  const [searchedAddress, setSearchedAddress] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("portfolio");

  const connectedAddress = useMemo(
    () => (account?.address ? normalizeSuiAddress(account.address) : null),
    [account?.address],
  );

  const address = useMemo(() => {
    if (searchedAddress) return searchedAddress;
    if (connectedAddress) return connectedAddress;
    return null;
  }, [searchedAddress, connectedAddress]);

  function onSearch(raw: string | null) {
    if (raw === null) {
      setSearchError(null);
      setSearchedAddress(null);
      return;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      setSearchError(null);
      setSearchedAddress(null);
      return;
    }
    if (!isValidSuiAddress(trimmed)) {
      setSearchError("Use 0x + 64 hex characters.");
      return;
    }
    setSearchError(null);
    setSearchedAddress(normalizeSuiAddress(trimmed));
    setTab("portfolio");
  }

  function goToMyWallet() {
    setSearchedAddress(null);
  }

  const profileLabel = address ? shortenAddress(address) : "Guest";

  return (
    <div className="bolt-layout">
      <header className="bolt-header">
        <div className="bolt-header-inner">
          <a className="bolt-brand" href="/bolt.html" onClick={(e) => e.preventDefault()}>
            <span className="bolt-brand-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Revalio
          </a>

          {address ? (
            <nav className="bolt-nav" aria-label="Main">
              {(
                [
                  ["portfolio", "Portfolio"],
                  ["positions", "Positions"],
                  ["activity", "Activity"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={tab === id ? "active" : ""}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </nav>
          ) : (
            <div className="bolt-nav bolt-nav-placeholder" />
          )}

          <BoltHeaderSearch onSearch={(addr) => onSearch(addr)} />

          <div className="bolt-header-actions">
            <button type="button" className="bolt-icon-btn" aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button type="button" className="bolt-icon-btn" aria-label="Settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <div className="bolt-profile-chip">
              <div className="bolt-profile-avatar">{profileLabel.slice(2, 4).toUpperCase()}</div>
              <div className="bolt-profile-meta">
                <span className="bolt-profile-name">{profileLabel}</span>
                <span className="bolt-profile-sub">Sui mainnet</span>
              </div>
            </div>
            <ConnectWallet onGoToMyWallet={goToMyWallet} />
          </div>
        </div>
      </header>

      <main className="bolt-main">
        {address ? (
          <BoltDashboard address={address} tab={tab} />
        ) : (
          <BoltHero onSearch={(raw) => onSearch(raw)} searchError={searchError} />
        )}

        <p className="bolt-footnote">
          Bolt lab preview (port <strong>5175</strong>) — analytics dashboard style. PlayerZero lab:{" "}
          <strong>5174</strong> · Production: <strong>5173</strong>.
        </p>
      </main>
    </div>
  );
}

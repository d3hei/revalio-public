import { useCurrentAccount } from "@mysten/dapp-kit";
import { useMemo, useState } from "react";
import { ConnectWallet } from "../components/ConnectWallet.js";
import { LabApiStatus } from "./LabApiStatus.js";
import { LabDashboard } from "./LabDashboard.js";
import { LabHeaderSearch } from "./LabHeaderSearch.js";
import { LabHero } from "./LabHero.js";
import { normalizeSuiAddress, isValidSuiAddress } from "../lib/sui.js";

export function LabApp() {
  const account = useCurrentAccount();
  const [onLanding, setOnLanding] = useState(false);
  const [searchedAddress, setSearchedAddress] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const connectedAddress = useMemo(
    () => (account?.address ? normalizeSuiAddress(account.address) : null),
    [account?.address],
  );

  const address = useMemo(() => {
    if (onLanding) return null;
    if (searchedAddress) return searchedAddress;
    if (connectedAddress) return connectedAddress;
    return null;
  }, [onLanding, searchedAddress, connectedAddress]);

  function goHome() {
    setOnLanding(true);
    setSearchedAddress(null);
    setSearchError(null);
  }

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
    setOnLanding(false);
    setSearchError(null);
    setSearchedAddress(normalizeSuiAddress(trimmed));
  }

  function goToMyWallet() {
    setOnLanding(false);
    setSearchedAddress(null);
  }

  return (
    <div className="lab-layout">
      <header className="lab-header">
        <div className="lab-header-inner">
          <a
            className="lab-brand"
            href="/lab.html"
            onClick={(e) => {
              e.preventDefault();
              goHome();
            }}
          >
            <span className="lab-brand-mark" aria-hidden />
            Revalio
          </a>
          <LabHeaderSearch
            onSearch={(addr) => {
              if (addr) onSearch(addr);
              else onSearch(null);
            }}
          />
          <div className="lab-header-actions">
            <ConnectWallet onGoToMyWallet={goToMyWallet} />
          </div>
        </div>
      </header>

      <LabApiStatus />

      <main className="lab-main">
        {address ? (
          <LabDashboard address={address} />
        ) : (
          <LabHero
            onSearch={(raw) => onSearch(raw)}
            searchError={searchError}
          />
        )}

        <p className="lab-note">
          Design lab preview (port 5174) — PlayerZero-inspired light theme. Production UI remains on{" "}
          <strong>localhost:5173</strong>.
        </p>
      </main>
    </div>
  );
}

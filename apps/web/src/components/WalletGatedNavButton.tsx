import { ConnectModal, useCurrentAccount } from "@mysten/dapp-kit";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeSuiAddress } from "../lib/sui.js";

interface Props {
  label: string;
  /** Path after wallet address, e.g. "" for overview or "/analysis". */
  pathSuffix?: string;
}

export function WalletGatedNavButton({ label, pathSuffix = "" }: Props) {
  const account = useCurrentAccount();
  const navigate = useNavigate();
  const [connectOpen, setConnectOpen] = useState(false);
  const pendingNav = useRef(false);

  useEffect(() => {
    if (!pendingNav.current || !account?.address) return;
    pendingNav.current = false;
    setConnectOpen(false);
    const address = normalizeSuiAddress(account.address);
    navigate(`/${address}${pathSuffix}`);
  }, [account?.address, navigate, pathSuffix]);

  function handleClick() {
    const connected = account?.address ? normalizeSuiAddress(account.address) : null;
    if (connected) {
      navigate(`/${connected}${pathSuffix}`);
      return;
    }
    pendingNav.current = true;
    setConnectOpen(true);
  }

  return (
    <>
      <button type="button" className="site-nav-btn" onClick={handleClick}>
        {label}
      </button>
      <ConnectModal
        trigger={
          <button type="button" style={{ display: "none" }} tabIndex={-1} aria-hidden>
            Connect
          </button>
        }
        open={connectOpen}
        onOpenChange={(open) => {
          setConnectOpen(open);
          if (!open) pendingNav.current = false;
        }}
      />
    </>
  );
}

import { ConnectModal, useCurrentAccount } from "@mysten/dapp-kit";
import { useEffect, useRef, useState } from "react";
import {
  addWatchlistAddress,
  removeWatchlistAddress,
} from "../lib/watchlist.js";
import { normalizeSuiAddress } from "../lib/sui.js";
import { useWatchlist } from "../hooks/useWatchlist.js";

interface Props {
  address: string;
}

export function WatchlistToggleButton({ address }: Props) {
  const account = useCurrentAccount();
  const watchlist = useWatchlist();
  const normalized = normalizeSuiAddress(address);
  const inWatchlist = watchlist.includes(normalized);
  const [connectOpen, setConnectOpen] = useState(false);
  const pendingAdd = useRef(false);

  useEffect(() => {
    if (!pendingAdd.current || !account?.address) return;
    pendingAdd.current = false;
    setConnectOpen(false);
    addWatchlistAddress(normalized, account.address);
  }, [account?.address, normalized]);

  function handleClick() {
    if (inWatchlist) {
      removeWatchlistAddress(normalized);
      return;
    }
    if (!account?.address) {
      pendingAdd.current = true;
      setConnectOpen(true);
      return;
    }
    addWatchlistAddress(normalized, account.address);
  }

  return (
    <>
      <button
        type="button"
        className={`wallet-watchlist-btn${inWatchlist ? " is-active" : ""}`}
        onClick={handleClick}
        aria-pressed={inWatchlist}
      >
        {inWatchlist ? "In Watchlist" : "Watchlist"}
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
          if (!open) pendingAdd.current = false;
        }}
      />
    </>
  );
}

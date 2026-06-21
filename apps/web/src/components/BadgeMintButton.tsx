import { ConnectModal, useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWalletBadges } from "../hooks/useWalletBadges.js";
import {
  buildBadgeMintMessage,
  hasWalletBadge,
  mintWalletBadge,
  type BadgeDefinition,
} from "../lib/badges.js";
import { normalizeSuiAddress } from "../lib/sui.js";

interface Props {
  badge: BadgeDefinition;
  className?: string;
}

export function BadgeMintButton({ badge, className = "pagination-btn" }: Props) {
  const account = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const [connectOpen, setConnectOpen] = useState(false);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingMint = useRef(false);
  const connected = account?.address ? normalizeSuiAddress(account.address) : null;
  const walletBadges = useWalletBadges(connected ?? "0x0");
  const minted =
    connected !== null &&
    walletBadges.some((entry) => entry.badgeId === badge.id);

  const performMint = useCallback(
    async (address: string) => {
      if (hasWalletBadge(address, badge.id)) return;
      setMinting(true);
      setError(null);
      try {
        const timestampMs = Date.now();
        const message = buildBadgeMintMessage(address, badge.id, timestampMs);
        await signPersonalMessage({
          message: new TextEncoder().encode(message),
        });
        mintWalletBadge(address, badge.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/reject|cancel|denied|declined|refused/i.test(msg)) {
          setError("Signature rejected.");
        } else {
          setError(msg || "Mint failed.");
        }
      } finally {
        setMinting(false);
      }
    },
    [badge.id, signPersonalMessage],
  );

  useEffect(() => {
    if (!pendingMint.current || !connected) return;
    pendingMint.current = false;
    setConnectOpen(false);
    void performMint(connected);
  }, [connected, performMint]);

  function handleClick() {
    if (minted || minting) return;
    if (!connected) {
      pendingMint.current = true;
      setConnectOpen(true);
      return;
    }
    void performMint(connected);
  }

  return (
    <>
      <button
        type="button"
        className={className + (minted ? " badge-mint-btn is-minted" : "")}
        onClick={handleClick}
        disabled={minting || minted}
      >
        {minting ? "Minting…" : minted ? "Minted to wallet" : "Mint to wallet"}
      </button>
      {error ? <p className="site-search-error badge-mint-error">{error}</p> : null}
      <ConnectModal
        trigger={
          <button type="button" style={{ display: "none" }} tabIndex={-1} aria-hidden>
            Connect
          </button>
        }
        open={connectOpen}
        onOpenChange={(open) => {
          setConnectOpen(open);
          if (!open) pendingMint.current = false;
        }}
      />
    </>
  );
}

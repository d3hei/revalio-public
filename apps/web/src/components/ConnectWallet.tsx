import { ConnectButton, useCurrentAccount, useDisconnectWallet } from "@mysten/dapp-kit";
import { shortenAddress } from "../lib/sui.js";

interface Props {
  onGoToMyWallet: () => void;
}

export function ConnectWallet({ onGoToMyWallet }: Props) {
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  if (account) {
    return (
      <div className="wallet-menu">
        <button
          type="button"
          className="wallet-menu-trigger"
          onClick={onGoToMyWallet}
          title="Go to my portfolio"
          aria-label={`Go to my portfolio (${shortenAddress(account.address)})`}
          aria-haspopup="menu"
        >
          {shortenAddress(account.address)}
        </button>
        <div className="wallet-menu-dropdown" role="menu">
          <button
            type="button"
            className="wallet-menu-item"
            role="menuitem"
            onClick={() => disconnect()}
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="connect-wallet-wrap">
      <ConnectButton connectText="Connect Wallet" />
    </div>
  );
}

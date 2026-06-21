import { createNetworkConfig, SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import type { ReactNode } from "react";
import { hiroDappKitTheme } from "../lib/dappKitTheme.js";
import { SUI_NETWORK } from "../lib/network.js";

const { networkConfig } = createNetworkConfig({
  mainnet: { url: getFullnodeUrl("mainnet") },
  testnet: { url: getFullnodeUrl("testnet") },
});

interface Props {
  children: ReactNode;
}

/** Read-only wallet connect: mainnet by default, no transaction signing in the UI. */
export function WalletProviders({ children }: Props) {
  return (
    <SuiClientProvider networks={networkConfig} defaultNetwork={SUI_NETWORK}>
      <WalletProvider autoConnect storageKey="revalio-wallet" theme={hiroDappKitTheme}>
        {children}
      </WalletProvider>
    </SuiClientProvider>
  );
}

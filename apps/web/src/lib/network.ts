export const SUI_NETWORK = (import.meta.env.VITE_SUI_NETWORK ?? "mainnet") as "mainnet" | "testnet";

export const EXPLORER_TX_BASE =
  SUI_NETWORK === "mainnet"
    ? "https://suiscan.xyz/mainnet/tx"
    : "https://suiscan.xyz/testnet/tx";

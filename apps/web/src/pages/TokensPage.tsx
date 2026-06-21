import { useOutletContext } from "react-router-dom";
import { WalletHoldingsSection } from "../components/WalletHoldingsSection.js";

export function TokensPage() {
  const { address } = useOutletContext<{ address: string }>();
  return <WalletHoldingsSection address={address} />;
}

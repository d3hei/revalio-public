import { useOutletContext } from "react-router-dom";
import { PortfolioChart } from "../components/PortfolioChart.js";
import { WalletHoldingsSection } from "../components/WalletHoldingsSection.js";

export function OverviewPage() {
  const { address } = useOutletContext<{ address: string }>();
  return (
    <>
      <PortfolioChart address={address} />
      <WalletHoldingsSection address={address} />
    </>
  );
}

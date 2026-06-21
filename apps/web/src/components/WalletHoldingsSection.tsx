import { useQuery } from "@tanstack/react-query";
import { getChart, getPositions, getWallet } from "../api/client.js";
import { isVisiblePosition } from "../lib/positionDisplay.js";
import { shortenAddress } from "../lib/sui.js";
import { AllocationCard } from "./AllocationCard.js";
import { WalletView } from "./WalletView.js";

interface Props {
  address: string;
  /** Overview: wait for the portfolio chart request before showing holdings below. */
  waitForChart?: boolean;
}

function EmptyHoldings({ address }: { address: string }) {
  return (
    <div className="card">
      <div className="card-header">Wallet</div>
      <div className="state">
        No tokens found for {shortenAddress(address)}.
      </div>
    </div>
  );
}

function LoadingHoldings() {
  return (
    <div className="card">
      <div className="card-header">Wallet</div>
      <div className="state">
        <div className="spinner" />
        Loading tokens…
      </div>
    </div>
  );
}

export function WalletHoldingsSection({ address, waitForChart = false }: Props) {
  const wallet = useQuery({
    queryKey: ["wallet", address],
    queryFn: () => getWallet(address),
    staleTime: 30_000,
  });
  const positions = useQuery({
    queryKey: ["positions", address],
    queryFn: () => getPositions(address),
    staleTime: 30_000,
  });
  const chart = useQuery({
    queryKey: ["chart", address, "7d"],
    queryFn: () => getChart(address, "7d"),
    enabled: waitForChart,
    staleTime: 60_000,
  });

  const portfolioLoading =
    wallet.isLoading ||
    (waitForChart && chart.isLoading);

  if (portfolioLoading) {
    return waitForChart ? null : <LoadingHoldings />;
  }

  const visiblePositions = (positions.data?.positions ?? []).filter(isVisiblePosition);
  const hasTokens = (wallet.data?.tokens.length ?? 0) > 0;
  const hasHoldings = hasTokens || positions.isLoading || visiblePositions.length > 0;

  if (!hasHoldings) return <EmptyHoldings address={address} />;

  return (
    <>
      <AllocationCard address={address} />
      {hasTokens ? <WalletView address={address} /> : null}
    </>
  );
}

import { useQuery } from "@tanstack/react-query";
import { getPositions } from "../api/client.js";
import { shortenAddress } from "../lib/sui.js";
import {
  CATEGORY_LABELS,
  friendlyProtocol,
  formatUsd,
  groupByProtocol,
  isVisiblePosition,
  protocolIconUrl,
} from "../lib/positionDisplay.js";
import { PositionRowInfo } from "./PositionRowInfo.js";

interface Props {
  address: string;
}

export function PositionsView({ address }: Props) {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["positions", address],
    queryFn: () => getPositions(address),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="card positions-card">
        <div className="card-header">Positions</div>
        <div className="state">
          <div className="spinner" />
          Loading positions…
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="card positions-card">
        <div className="card-header">Positions</div>
        <div className="state error">
          Failed to load positions.
          <button className="retry" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? "Retrying…" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  const positions = (data?.positions ?? []).filter(isVisiblePosition);
  if (positions.length === 0) {
    return (
      <div className="card positions-card">
        <div className="card-header">Positions</div>
        <div className="state">No positions found for {shortenAddress(address)}.</div>
      </div>
    );
  }

  const groups = groupByProtocol(positions);

  return (
    <div className="card positions-card">
      <div className="card-header portfolio-header">
        <span>Positions</span>
        <span className="portfolio-total">{formatUsd(data?.totalUsd ?? 0)}</span>
      </div>
      {groups.map((group) => {
        const iconUrl = protocolIconUrl(group.protocol);
        return (
          <div className="protocol-group" key={group.protocol}>
            <div className="protocol-name">
              {iconUrl ? <img className="protocol-icon" src={iconUrl} alt="" width={16} height={16} /> : null}
              <span>{friendlyProtocol(group.protocol)}</span>
            </div>
            {group.items.map((p, i) => (
              <div className="token-row" key={`${p.protocol}-${p.positionType}-${String(p.details.coinType ?? p.objectId ?? i)}`}>
                <div className="token-info">
                  <PositionRowInfo
                    position={p}
                    badge={
                      <span className={`category-badge cat-${p.category}`}>
                        {CATEGORY_LABELS[p.category] ?? p.category}
                      </span>
                    }
                  />
                </div>
                <div className="token-values">
                  <div className="token-amount">
                    {p.valueUsd !== null ? formatUsd(p.valueUsd) : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

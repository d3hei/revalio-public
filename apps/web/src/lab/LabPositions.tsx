import type { Position } from "../api/client.js";
import {
  CATEGORY_LABELS,
  friendlyProtocol,
  formatUsd,
  groupByProtocol,
  isVisiblePosition,
  protocolIconUrl,
} from "../lib/positionDisplay.js";
import { PositionRowInfo } from "../components/PositionRowInfo.js";

interface Props {
  positions?: Position[];
  totalUsd?: number;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function LabPositions({ positions, totalUsd, isLoading, isError, onRetry, isRetrying }: Props) {
  const rows = (positions ?? []).filter(isVisiblePosition);
  const groups = groupByProtocol(rows);

  return (
    <div className="lab-card">
      <div className="lab-card-header">
        <span className="lab-card-title">Positions</span>
        <span className="lab-card-value">{formatUsd(totalUsd ?? null)}</span>
      </div>

      {isLoading ? (
        <div className="lab-muted">Loading positions…</div>
      ) : isError ? (
        <div className="lab-muted">
          Failed to load positions.{" "}
          <button type="button" className="lab-link-btn" onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? "Retrying…" : "Retry"}
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="lab-muted">No positions found.</div>
      ) : (
        groups.map((group) => {
          const iconUrl = protocolIconUrl(group.protocol);
          return (
            <div className="lab-protocol-group" key={group.protocol}>
              <div className="lab-protocol-name">
                {iconUrl ? <img className="protocol-icon" src={iconUrl} alt="" width={16} height={16} /> : null}
                <span>{friendlyProtocol(group.protocol)}</span>
              </div>

              {group.items.map((p, i) => (
                <div className="lab-row" key={`${p.protocol}-${p.positionType}-${String(p.details.coinType ?? p.objectId ?? i)}`}>
                  <div className="lab-row-main">
                    <PositionRowInfo
                      position={p}
                      titleClassName="lab-row-symbol"
                      badge={
                        <span className={`lab-cat-badge lab-cat-${p.category}`}>
                          {CATEGORY_LABELS[p.category] ?? p.category}
                        </span>
                      }
                    />
                  </div>

                  <div className="lab-row-values">
                    <div className="lab-row-usd">{formatUsd(p.valueUsd)}</div>
                  </div>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}


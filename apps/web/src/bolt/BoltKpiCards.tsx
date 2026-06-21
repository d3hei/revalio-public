import { formatUsd } from "../lib/format.js";

interface Props {
  totalUsd: number | null;
  tokensUsd: number | null;
  positionsUsd: number | null;
  protocolCount: number;
  tokenCount: number;
}

function pctBadge(current: number | null, total: number | null): string | null {
  if (current === null || total === null || total === 0) return null;
  const pct = (current / total) * 100;
  return `${pct.toFixed(1)}% of portfolio`;
}

export function BoltKpiCards({
  totalUsd,
  tokensUsd,
  positionsUsd,
  protocolCount,
  tokenCount,
}: Props) {
  return (
    <div className="bolt-kpi-row">
      <div className="bolt-kpi bolt-kpi-primary">
        <div className="bolt-kpi-top">
          <span className="bolt-kpi-label">Total portfolio</span>
          <span className="bolt-kpi-icon bolt-kpi-icon-light" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.5 5M17 13l2.5 5M9.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 21a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        <div className="bolt-kpi-value">{formatUsd(totalUsd)}</div>
        <div className="bolt-kpi-foot">Live valuation · Pyth + on-chain</div>
      </div>

      <div className="bolt-kpi">
        <div className="bolt-kpi-top">
          <span className="bolt-kpi-label">Tokens</span>
          <span className="bolt-kpi-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 7v10M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </div>
        <div className="bolt-kpi-value dark">{formatUsd(tokensUsd)}</div>
        <div className="bolt-kpi-foot">
          {tokenCount} assets
          {pctBadge(tokensUsd, totalUsd) ? ` · ${pctBadge(tokensUsd, totalUsd)}` : ""}
        </div>
      </div>

      <div className="bolt-kpi">
        <div className="bolt-kpi-top">
          <span className="bolt-kpi-label">Positions</span>
          <span className="bolt-kpi-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
        </div>
        <div className="bolt-kpi-value dark">{formatUsd(positionsUsd)}</div>
        <div className="bolt-kpi-foot">
          DeFi & staking
          {pctBadge(positionsUsd, totalUsd) ? ` · ${pctBadge(positionsUsd, totalUsd)}` : ""}
        </div>
      </div>

      <div className="bolt-kpi">
        <div className="bolt-kpi-top">
          <span className="bolt-kpi-label">Protocols</span>
          <span className="bolt-kpi-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>
        <div className="bolt-kpi-value dark">{protocolCount}</div>
        <div className="bolt-kpi-foot">Active DeFi protocols detected</div>
      </div>
    </div>
  );
}

import { formatUsd } from "../lib/format.js";

interface Props {
  tokensUsd: number;
  positionsUsd: number;
}

export function BoltCompositionGauge({ tokensUsd, positionsUsd }: Props) {
  const total = tokensUsd + positionsUsd;
  const positionsPct = total > 0 ? (positionsUsd / total) * 100 : 0;
  const tokensPct = total > 0 ? (tokensUsd / total) * 100 : 0;
  const displayPct = total > 0 ? positionsPct : 0;

  const segments = 24;
  const filled = Math.round((displayPct / 100) * segments);

  return (
    <div className="bolt-card bolt-gauge-card">
      <div className="bolt-card-head">
        <div>
          <h3>Portfolio mix</h3>
          <p>Tokens vs DeFi / staking</p>
        </div>
      </div>

      <div className="bolt-gauge-wrap">
        <div className="bolt-gauge" role="img" aria-label={`${displayPct.toFixed(1)}% in positions`}>
          {Array.from({ length: segments }, (_, i) => (
            <span key={i} className={i < filled ? "seg on" : "seg"} />
          ))}
          <div className="bolt-gauge-center">
            <strong>{displayPct.toFixed(1)}%</strong>
            <span>in positions</span>
          </div>
        </div>

        <div className="bolt-gauge-stats">
          <div className="bolt-gauge-stat">
            <span className="bolt-gauge-stat-label">Tokens</span>
            <strong>{formatUsd(tokensUsd)}</strong>
            <span className="bolt-gauge-badge">{tokensPct.toFixed(1)}%</span>
          </div>
          <div className="bolt-gauge-stat">
            <span className="bolt-gauge-stat-label">Positions</span>
            <strong>{formatUsd(positionsUsd)}</strong>
            <span className="bolt-gauge-badge accent">{positionsPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

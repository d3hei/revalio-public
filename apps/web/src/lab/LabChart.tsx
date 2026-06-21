import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChart, type ChartPoint, type ChartRange, type PortfolioSummary } from "../api/client.js";
import { formatChartDate, formatUsd } from "../lib/format.js";

interface Props {
  address: string;
  portfolio?: PortfolioSummary;
}

const RANGES: ChartRange[] = ["24h", "7d", "30d"];
const VIEW_W = 720;
const VIEW_H = 160;
const PAD_X = 4;
const PAD_Y = 14;

interface ChartLayout {
  line: string;
  area: string;
  coords: { x: number; y: number; timestamp: number; netWorthUsd: number }[];
}

function buildChartLayout(points: ChartPoint[]): ChartLayout | null {
  if (points.length === 0) return null;
  const series = points.length === 1
    ? [points[0]!, { ...points[0]!, timestamp: points[0]!.timestamp + 1 }]
    : points;
  const values = series.map((p) => p.netWorthUsd);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const n = series.length;

  const xAt = (i: number) => PAD_X + (i / (n - 1)) * (VIEW_W - 2 * PAD_X);
  const yAt = (v: number) =>
    max === min ? VIEW_H / 2 : PAD_Y + (1 - (v - min) / (max - min)) * (VIEW_H - 2 * PAD_Y);

  const coords = series.map((p, i) => ({
    x: xAt(i),
    y: yAt(p.netWorthUsd),
    timestamp: p.timestamp,
    netWorthUsd: p.netWorthUsd,
  }));

  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
  const area = `${line} L${coords[n - 1]!.x.toFixed(2)},${VIEW_H} L${coords[0]!.x.toFixed(2)},${VIEW_H} Z`;
  return { line, area, coords };
}

export function LabChart({ address, portfolio }: Props) {
  const [range, setRange] = useState<ChartRange>("7d");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["chart", address, range],
    queryFn: () => getChart(address, range),
    staleTime: 30_000,
  });

  const points = data?.points ?? [];
  const layout = buildChartLayout(points);
  const activeIndex = hoverIndex ?? (points.length > 0 ? points.length - 1 : null);
  const activePoint = activeIndex !== null ? points[activeIndex] : null;

  const first = points[0]?.netWorthUsd ?? null;
  const chartLast = data?.liveTotalUsd ?? points[points.length - 1]?.netWorthUsd ?? null;
  const headline = activePoint?.netWorthUsd ?? portfolio?.totalUsd ?? chartLast;
  const last = chartLast;
  const deltaPct =
    first !== null && last !== null && first !== 0 ? ((last - first) / first) * 100 : null;
  const up = deltaPct === null ? true : deltaPct >= 0;
  const stroke = up ? "var(--lab-text)" : "var(--lab-text-muted)";

  const updateHover = useCallback(
    (clientX: number) => {
      if (!layout || points.length === 0 || !chartRef.current) return;
      const rect = chartRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setHoverIndex(Math.round(ratio * (points.length - 1)));
    },
    [layout, points.length],
  );

  const hoverCoord = activeIndex !== null && layout ? layout.coords[activeIndex] : null;
  const crosshairPct = hoverCoord ? (hoverCoord.x / VIEW_W) * 100 : null;
  const dotTopPct = hoverCoord ? (hoverCoord.y / VIEW_H) * 100 : null;

  return (
    <div className="lab-card lab-chart-card">
      <div className="lab-card-header lab-chart-header">
        <div>
          <span className="lab-card-title">Portfolio value</span>
          <div className="lab-chart-headline-row">
            <span className="lab-card-value">{headline != null ? formatUsd(headline) : "—"}</span>
            {deltaPct !== null && (
              <span className={`lab-chart-delta ${up ? "up" : "down"}`}>
                {up ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(2)}%
              </span>
            )}
          </div>
          {portfolio ? (
            <p className="lab-chart-sub">
              Tokens {formatUsd(portfolio.tokensUsd)} · Positions {formatUsd(portfolio.positionsUsd)}
            </p>
          ) : null}
        </div>
        <div className="lab-range-toggle">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={r === range ? "active" : ""}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={chartRef}
        className="lab-chart-body"
        onMouseMove={(e) => updateHover(e.clientX)}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {isLoading ? (
          <div className="lab-muted">Loading chart…</div>
        ) : isError ? (
          <div className="lab-muted">
            Failed to load chart.{" "}
            <button type="button" className="lab-link-btn" onClick={() => void refetch()} disabled={isFetching}>
              Retry
            </button>
          </div>
        ) : !layout ? (
          <div className="lab-muted">
            Not enough price history yet — showing live total only.
          </div>
        ) : (
          <>
            {hoverIndex !== null && activePoint && crosshairPct !== null && (
              <div className="lab-chart-tooltip" style={{ left: `${crosshairPct}%` }}>
                <span>{formatChartDate(activePoint.timestamp, range)}</span>
                <strong>{formatUsd(activePoint.netWorthUsd)}</strong>
              </div>
            )}
            {hoverIndex !== null && crosshairPct !== null && (
              <div className="lab-chart-crosshair" style={{ left: `${crosshairPct}%` }} />
            )}
            {hoverIndex !== null && dotTopPct !== null && crosshairPct !== null && (
              <div
                className="lab-chart-dot"
                style={{ left: `${crosshairPct}%`, top: `${dotTopPct}%` }}
              />
            )}
            <svg
              className="lab-chart-svg"
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              role="img"
              aria-label="Portfolio value over time"
            >
              <defs>
                <linearGradient id="lab-chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity="0.12" />
                  <stop offset="100%" stopColor={stroke} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={layout.area} fill="url(#lab-chart-fill)" />
              <path
                d={layout.line}
                fill="none"
                stroke={stroke}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </>
        )}
      </div>
    </div>
  );
}

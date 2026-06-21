import { useCallback, useRef, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import {
  getChart,
  getPositions,
  getWallet,
  type ChartPoint,
  type ChartRange,
} from "../api/client.js";

import { formatChartDate, formatUsd } from "../lib/format.js";

interface Props {
  address: string;
}

const RANGES: ChartRange[] = ["24h", "7d", "30d", "1y"];

const VIEW_W = 720;
const VIEW_H = 160;
const PAD_X = 4;
const PAD_Y = 14;

const RANGE_MS: Record<ChartRange, number> = {
  "24h": 86_400_000,
  "7d": 7 * 86_400_000,
  "30d": 30 * 86_400_000,
  "1y": 365 * 86_400_000,
};

interface ChartLayout {
  line: string;
  area: string;
  coords: { x: number; y: number; point: ChartPoint }[];
}

function buildChartLayout(points: ChartPoint[], range: ChartRange): ChartLayout | null {
  if (points.length === 0) return null;

  const rangeEnd = Date.now();
  const rangeStart = rangeEnd - RANGE_MS[range];
  const visible = points
    .filter((p) => p.timestamp >= rangeStart && p.timestamp <= rangeEnd)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (visible.length === 0) return null;

  const series =
    visible.length === 1
      ? [visible[0]!, { ...visible[0]!, timestamp: Math.min(rangeEnd, visible[0]!.timestamp + 1) }]
      : visible;

  const values = series.map((p) => p.netWorthUsd);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, rangeEnd - rangeStart);

  const xAt = (t: number) =>
    PAD_X +
    ((Math.max(rangeStart, Math.min(rangeEnd, t)) - rangeStart) / span) * (VIEW_W - 2 * PAD_X);
  const yAt = (v: number) =>
    max === min ? VIEW_H / 2 : PAD_Y + (1 - (v - min) / (max - min)) * (VIEW_H - 2 * PAD_Y);

  const coords = series.map((p) => ({
    x: xAt(p.timestamp),
    y: yAt(p.netWorthUsd),
    point: p,
  }));

  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
  const area = `${line} L${coords[coords.length - 1]!.x.toFixed(2)},${VIEW_H} L${coords[0]!.x.toFixed(2)},${VIEW_H} Z`;

  return { line, area, coords };
}

export function PortfolioChart({ address }: Props) {
  const [range, setRange] = useState<ChartRange>("7d");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["chart", address, range],
    queryFn: () => getChart(address, range),
    staleTime: 60_000,
  });
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

  const portfolioLiveTotal =
    wallet.data && positions.data
      ? wallet.data.totalUsd + positions.data.totalUsd
      : null;
  const liveTotal =
    portfolioLiveTotal !== null && portfolioLiveTotal > 0
      ? portfolioLiveTotal
      : data?.liveTotalUsd ?? null;
  const rawPoints = data?.points ?? [];
  const apiLiveTotal = data?.liveTotalUsd ?? null;
  const scale =
    liveTotal !== null && apiLiveTotal !== null && apiLiveTotal > 0
      ? liveTotal / apiLiveTotal
      : 1;
  const points =
    liveTotal !== null && rawPoints.length > 0
      ? rawPoints.map((point, index) => ({
          ...point,
          assetsUsd: point.assetsUsd * scale,
          debtUsd: point.debtUsd * scale,
          netWorthUsd: index === rawPoints.length - 1 ? liveTotal : point.netWorthUsd * scale,
        }))
      : rawPoints;
  const layout = buildChartLayout(points, range);
  const activeIndex = hoverIndex ?? (layout ? layout.coords.length - 1 : null);
  const activePoint = activeIndex !== null && layout ? layout.coords[activeIndex]?.point : null;

  const displayNetWorth =
    hoverIndex !== null
      ? activePoint?.netWorthUsd ?? liveTotal
      : liveTotal ?? activePoint?.netWorthUsd ?? null;
  const chartPending = isLoading && displayNetWorth == null;
  const first = layout?.coords[0]?.point.netWorthUsd ?? null;
  const last = displayNetWorth;
  const deltaPct =
    first !== null && last !== null && first !== 0 ? ((last - first) / first) * 100 : null;
  const up = deltaPct === null ? true : deltaPct >= 0;
  const stroke = up ? "var(--accent-2)" : "var(--danger)";

  const updateHover = useCallback(
    (clientX: number) => {
      if (!layout || layout.coords.length === 0 || !chartRef.current) return;
      const rect = chartRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const targetX = PAD_X + ratio * (VIEW_W - 2 * PAD_X);

      let nearest = 0;
      let best = Infinity;
      for (let i = 0; i < layout.coords.length; i++) {
        const dist = Math.abs(layout.coords[i]!.x - targetX);
        if (dist < best) {
          best = dist;
          nearest = i;
        }
      }
      setHoverIndex(nearest);
    },
    [layout],
  );

  const clearHover = useCallback(() => setHoverIndex(null), []);

  const hoverCoord = activeIndex !== null && layout ? layout.coords[activeIndex] : null;
  const crosshairPct = hoverCoord ? (hoverCoord.x / VIEW_W) * 100 : null;

  return (
    <div className="card chart-card">
      <div className="card-header chart-header">
        <div className="chart-summary">
          <span className="chart-label">Portfolio value</span>
          <span className="chart-value">{displayNetWorth != null ? formatUsd(displayNetWorth) : "—"}</span>
          {deltaPct !== null && (
            <span className={`chart-delta ${up ? "up" : "down"}`}>
              {up ? "▲" : "▼"} {Math.abs(deltaPct).toFixed(2)}%
            </span>
          )}
        </div>
        <div className="range-toggle">
          {RANGES.map((r) => (
            <button
              key={r}
              className={r === range ? "active" : ""}
              onClick={() => {
                setHoverIndex(null);
                setRange(r);
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-body">
        {chartPending ? (
          <div className="state">
            <div className="spinner" />
            Loading chart…
          </div>
        ) : isError && !layout ? (
          <div className="state error">
            Failed to load chart.
            <button className="retry" onClick={() => void refetch()} disabled={isFetching}>
              {isFetching ? "Retrying…" : "Retry"}
            </button>
          </div>
        ) : !layout && (isLoading || isFetching) ? (
          <div className="state">
            <div className="spinner" />
            Loading chart…
          </div>
        ) : !layout ? (
          <div className="state">
            Portfolio history is being recorded. Open this wallet again later to see the chart.
          </div>
        ) : (
          <div
            ref={chartRef}
            className="chart-plot"
            onMouseMove={(e) => updateHover(e.clientX)}
            onMouseLeave={clearHover}
          >
            {hoverIndex !== null && activePoint && crosshairPct !== null && (
              <div className="chart-tooltip" style={{ left: `${crosshairPct}%` }}>
                <span className="chart-tooltip-date">
                  {formatChartDate(activePoint.timestamp, range)}
                </span>
              </div>
            )}
            <svg
              className="chart-svg"
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              preserveAspectRatio="none"
              role="img"
              aria-label="Portfolio net worth over time"
            >
              <defs>
                <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={stroke} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={layout.area} fill="url(#chart-fill)" />
              <path
                d={layout.line}
                fill="none"
                stroke={stroke}
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
              {hoverIndex !== null && hoverCoord && (
                <>
                  <line
                    className="chart-crosshair-svg"
                    x1={hoverCoord.x}
                    y1={0}
                    x2={hoverCoord.x}
                    y2={VIEW_H}
                  />
                  <circle
                    className="chart-hover-dot-svg"
                    cx={hoverCoord.x}
                    cy={hoverCoord.y}
                    r={5}
                  />
                </>
              )}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

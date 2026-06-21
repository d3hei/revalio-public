import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChart, type ChartRange } from "../api/client.js";
import { formatChartDate, formatUsd } from "../lib/format.js";

interface Props {
  address: string;
}

const RANGES: ChartRange[] = ["24h", "7d", "30d"];

function bucketLabel(t: number, range: ChartRange, index: number, total: number): string {
  if (range === "24h") return formatChartDate(t, range);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = new Date(t);
  if (total <= 12) return months[d.getMonth()] ?? `#${index + 1}`;
  return formatChartDate(t, range);
}

export function BoltBarChart({ address }: Props) {
  const [range, setRange] = useState<ChartRange>("7d");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["chart", address, range],
    queryFn: () => getChart(address, range),
  });

  const points = data?.points ?? [];
  const maxVal = useMemo(() => Math.max(...points.map((p) => p.netWorthUsd), 1), [points]);
  const activeIndex = hoverIndex ?? (points.length > 0 ? points.length - 1 : null);
  const activePoint = activeIndex !== null ? points[activeIndex] : null;

  const updateHover = useCallback(
    (clientX: number) => {
      if (points.length === 0 || !chartRef.current) return;
      const rect = chartRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setHoverIndex(Math.min(points.length - 1, Math.floor(ratio * points.length)));
    },
    [points.length],
  );

  return (
    <div className="bolt-card bolt-chart-card">
      <div className="bolt-card-head">
        <div>
          <h3>Performance overview</h3>
          <p>Portfolio value over time</p>
        </div>
        <select
          className="bolt-select"
          value={range}
          onChange={(e) => setRange(e.target.value as ChartRange)}
          aria-label="Chart range"
        >
          {RANGES.map((r) => (
            <option key={r} value={r}>
              {r === "24h" ? "Last 24 hours" : r === "7d" ? "Last 7 days" : "Last 30 days"}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={chartRef}
        className="bolt-bar-chart"
        onMouseMove={(e) => updateHover(e.clientX)}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {isLoading ? (
          <div className="bolt-empty">Loading chart…</div>
        ) : isError ? (
          <div className="bolt-empty">
            Failed to load chart.{" "}
            <button type="button" className="bolt-link" onClick={() => void refetch()} disabled={isFetching}>
              Retry
            </button>
          </div>
        ) : points.length === 0 ? (
          <div className="bolt-empty">Not enough history yet.</div>
        ) : (
          <>
            {activePoint && hoverIndex !== null && (
              <div className="bolt-bar-tooltip">
                <span>{formatChartDate(activePoint.timestamp, range)}</span>
                <strong>{formatUsd(activePoint.netWorthUsd)}</strong>
              </div>
            )}
            <div className="bolt-bars">
              {points.map((p, i) => {
                const h = Math.max(4, (p.netWorthUsd / maxVal) * 100);
                const active = i === activeIndex;
                return (
                  <div key={p.timestamp} className="bolt-bar-col">
                    <div
                      className={`bolt-bar ${active ? "active" : ""}`}
                      style={{ height: `${h}%` }}
                    />
                    <span className="bolt-bar-label">{bucketLabel(p.timestamp, range, i, points.length)}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

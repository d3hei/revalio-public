import { type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPositions, getWallet } from "../api/client.js";
import { formatUsd } from "../lib/format.js";
import { friendlyProtocol } from "../lib/positionDisplay.js";

interface Props {
  address: string;
}

const SEG_COLORS = [
  "var(--violet)",
  "var(--orange)",
  "var(--green)",
  "var(--ink)",
  "var(--gray)",
  "var(--violet-700)",
];

interface Slice {
  label: string;
  usd: number;
}

/** Sort desc, keep top-N, fold the rest into "Others". */
function toSlices(raw: Slice[], topN = 6): Slice[] {
  const sorted = raw.filter((s) => s.usd > 0).sort((a, b) => b.usd - a.usd);
  if (sorted.length <= topN) return sorted;
  const top = sorted.slice(0, topN - 1);
  const rest = sorted.slice(topN - 1).reduce((s, x) => s + x.usd, 0);
  return [...top, { label: "Others", usd: rest }];
}

function Bar({ slices, total }: { slices: Slice[]; total: number }) {
  return (
    <div
      style={{
        display: "flex",
        height: 10,
        borderRadius: 4,
        overflow: "hidden",
        border: "1px solid var(--line)",
      }}
    >
      {slices.map((s, i) => (
        <div
          key={s.label}
          title={`${s.label} · ${formatUsd(s.usd)}`}
          style={{
            width: `${total > 0 ? (s.usd / total) * 100 : 0}%`,
            background: SEG_COLORS[i % SEG_COLORS.length],
          }}
        />
      ))}
    </div>
  );
}

function Legend({ slices, total }: { slices: Slice[]; total: number }) {
  return (
    <ul
      style={{
        listStyle: "none",
        margin: "12px 0 0",
        padding: 0,
        fontFamily: "var(--font-mono)",
        fontSize: 13,
      }}
    >
      {slices.map((s, i) => {
        const pct = total > 0 ? (s.usd / total) * 100 : 0;
        const connector = i === slices.length - 1 ? "└──" : "├──";
        return (
          <li key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, lineHeight: 1.9 }}>
            <span style={{ color: "var(--gray-2)" }}>{connector}</span>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: SEG_COLORS[i % SEG_COLORS.length],
                flex: "0 0 auto",
              }}
            />
            <span
              style={{
                flex: 1,
                color: "var(--ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {s.label}
            </span>
            <span style={{ color: "var(--gray)" }}>{formatUsd(s.usd)}</span>
            <span style={{ color: "var(--ink)", width: 52, textAlign: "right" }}>{pct.toFixed(1)}%</span>
          </li>
        );
      })}
    </ul>
  );
}

const COL_LABEL: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--gray)",
};

function SectionHeader({ label, totalUsd }: { label: string; totalUsd: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 10,
      }}
    >
      <span style={COL_LABEL}>{label}</span>
      <span className="allocation-col-total">{formatUsd(totalUsd)}</span>
    </div>
  );
}

/** Portfolio allocation — by token and by protocol (Revalio-style), Hiro-themed. */
export function AllocationCard({ address }: Props) {
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

  const tokens = wallet.data?.tokens ?? [];
  const protocols = positions.data?.protocols ?? [];

  const tokenSlices = toSlices(tokens.map((t) => ({ label: t.symbol ?? "Unknown", usd: t.valueUsd ?? 0 })));
  const tokenTotal = tokenSlices.reduce((s, x) => s + x.usd, 0);

  const protoSlices = toSlices(
    protocols.map((p) => ({ label: friendlyProtocol(p.protocol), usd: p.valueUsd })),
  );
  const protoTotal = protoSlices.reduce((s, x) => s + x.usd, 0);

  if (wallet.isLoading || positions.isLoading) {
    return (
      <div className="card">
        <div className="card-header">Allocation</div>
        <div className="state">
          <div className="spinner" />
          Loading allocation…
        </div>
      </div>
    );
  }

  // Nothing priced — hide rather than show an empty card.
  if (tokenTotal === 0 && protoTotal === 0) return null;

  return (
    <div className="card">
      <div className="card-header">Allocation</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 28,
          padding: "18px 20px",
        }}
      >
        <div>
          <SectionHeader label="By token" totalUsd={tokenTotal} />
          <Bar slices={tokenSlices} total={tokenTotal} />
          <Legend slices={tokenSlices} total={tokenTotal} />
        </div>
        {protoTotal > 0 ? (
          <div>
            <SectionHeader label="By protocol" totalUsd={protoTotal} />
            <Bar slices={protoSlices} total={protoTotal} />
            <Legend slices={protoSlices} total={protoTotal} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

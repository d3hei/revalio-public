import { type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import { getAnalysis, getChanges, getStaking } from "../api/client.js";
import { formatUsd } from "../lib/format.js";

const MONO: CSSProperties = { fontFamily: "var(--font-mono)" };
const SEG_COLORS = ["var(--violet)", "var(--green)", "var(--orange)", "var(--ink)", "var(--gray)"];

function riskColor(v: number): string {
  if (v >= 66) return "var(--danger)";
  if (v >= 33) return "var(--orange)";
  return "var(--green)";
}

function Meter({ label, value, why, color }: { label: string; value: number; why: string; color?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ ...MONO, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "var(--ink)" }}>{label}</span>
        <span style={{ color: "var(--gray)" }}>{value}/100</span>
      </div>
      <div className="meter">
        <div className="meter-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color ?? "var(--violet)" }} />
      </div>
      <div style={{ ...MONO, fontSize: 11, color: "var(--gray-2)", lineHeight: 1.5 }}>{why}</div>
    </div>
  );
}

const COL_LABEL: CSSProperties = {
  ...MONO,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--gray)",
  marginBottom: 10,
};

/** Stage 4 — Smart Wallet Analysis: behaviour profile, scores, exposure, risk. */
export function AnalysisPage() {
  const { address } = useOutletContext<{ address: string }>();
  const q = useQuery({ queryKey: ["analysis", address], queryFn: () => getAnalysis(address) });
  const stakingQ = useQuery({ queryKey: ["staking", address], queryFn: () => getStaking(address) });
  const changesQ = useQuery({ queryKey: ["changes", address], queryFn: () => getChanges(address) });

  if (q.isLoading) {
    return (
      <div className="card">
        <div className="card-header">Smart Wallet Analysis</div>
        <div className="state">
          <div className="spinner" />
          Analyzing wallet…
        </div>
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="card">
        <div className="card-header">Smart Wallet Analysis</div>
        <div className="state error">
          Failed to analyze.
          <button className="retry" onClick={() => void q.refetch()}>Retry</button>
        </div>
      </div>
    );
  }

  const a = q.data;
  const expoTotal = a.exposure.reduce((s, e) => s + e.valueUsd, 0);

  return (
    <>
      {/* Profile label + behaviour tags */}
      <div className="card">
        <div className="card-header">Wallet Intelligence</div>
        <div style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
            <span style={{ ...MONO, fontSize: 22, fontWeight: 600, color: "var(--ink)" }}>
              {a.primaryLabel?.label ?? "Unclassified"}
            </span>
            <span style={{ ...MONO, fontSize: 13, color: "var(--gray)" }}>
              net worth {formatUsd(a.netWorthUsd)} · risk {a.riskScore}/100
            </span>
          </div>
          {a.primaryLabel && (
            <div style={{ ...MONO, fontSize: 12, color: "var(--gray-2)", marginTop: 6 }}>
              Why: {a.primaryLabel.why}
            </div>
          )}
          {a.labels.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
              {a.labels.map((l) => (
                <span key={l.key} title={l.why} className="chip" style={{ cursor: "help" }}>
                  {l.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {/* Scores + risk (explainable) */}
        <div className="card">
          <div className="card-header">Scores</div>
          <div style={{ padding: "18px 20px" }}>
            <Meter label="Risk" value={a.riskScore} why={a.riskWhy} color={riskColor(a.riskScore)} />
            {a.scores.map((s) => (
              <Meter key={s.key} label={s.label} value={s.value} why={s.why} />
            ))}
          </div>
        </div>

        {/* Exposure map by asset class */}
        <div className="card">
          <div className="card-header">Exposure</div>
          <div style={{ padding: "18px 20px" }}>
            <div style={COL_LABEL}>By asset class</div>
            <div style={{ display: "flex", height: 10, borderRadius: 4, overflow: "hidden", border: "1px solid var(--line)" }}>
              {a.exposure.map((e, i) => (
                <div
                  key={e.class}
                  title={`${e.label} · ${formatUsd(e.valueUsd)} · ${e.pct}%`}
                  style={{ width: `${expoTotal > 0 ? (e.valueUsd / expoTotal) * 100 : 0}%`, background: SEG_COLORS[i % SEG_COLORS.length] }}
                />
              ))}
            </div>
            <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, ...MONO, fontSize: 13 }}>
              {a.exposure.map((e, i) => (
                <li key={e.class} style={{ display: "flex", alignItems: "center", gap: 8, lineHeight: 1.9 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: SEG_COLORS[i % SEG_COLORS.length], flex: "0 0 auto" }} />
                  <span style={{ flex: 1, color: "var(--ink)" }}>{e.label}</span>
                  <span style={{ color: "var(--gray)" }}>{formatUsd(e.valueUsd)}</span>
                  <span style={{ color: "var(--ink)", width: 52, textAlign: "right" }}>{e.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {/* Biggest positions */}
        <div className="card">
          <div className="card-header">Biggest positions</div>
          <div style={{ padding: "14px 20px" }}>
            {a.biggest.length === 0 && (
              <div style={{ ...MONO, fontSize: 13, color: "var(--gray-2)" }}>No holdings to rank.</div>
            )}
            <ul style={{ listStyle: "none", margin: 0, padding: 0, ...MONO, fontSize: 13 }}>
              {a.biggest.map((h, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, lineHeight: 2.1, borderBottom: i < a.biggest.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <span style={{ flex: 1, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                  <span style={{ fontSize: 11, color: "var(--gray-2)", textTransform: "uppercase" }}>{h.kind}</span>
                  <span style={{ color: h.valueUsd < 0 ? "var(--danger)" : "var(--ink)", width: 90, textAlign: "right" }}>{formatUsd(h.valueUsd)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Risk summary stats */}
        <div className="card">
          <div className="card-header">Risk summary</div>
          <div style={{ padding: "14px 20px", ...MONO, fontSize: 13 }}>
            {[
              ["Top holding concentration", `${a.stats.largestHoldingPct}%`],
              ["Distinct assets", String(a.stats.distinctAssets)],
              ["Protocols used", String(a.stats.protocolCount)],
              ["Borrowed", formatUsd(a.stats.borrowUsd)],
              ["Collateral", formatUsd(a.stats.collateralUsd)],
              ["Leverage", `${a.stats.leveragePct}%`],
            ].map(([k, v], idx, rows) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", lineHeight: 2.1, borderBottom: idx < rows.length - 1 ? "1px solid var(--line)" : "none" }}>
                <span style={{ color: "var(--gray)" }}>{k}</span>
                <span style={{ color: "var(--ink)" }}>{v}</span>
              </div>
            ))}
            {a.protocols.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={COL_LABEL}>Protocol breakdown</div>
                {a.protocols.slice(0, 6).map((p) => (
                  <div key={p.protocol} style={{ display: "flex", justifyContent: "space-between", lineHeight: 1.9 }}>
                    <span style={{ color: "var(--ink)" }}>{p.protocol}</span>
                    <span style={{ color: "var(--gray)" }}>{formatUsd(p.valueUsd)} · {p.pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Native SUI staking by validator */}
      {stakingQ.data && stakingQ.data.validators.length > 0 && (
        <div className="card">
          <div className="card-header">Native SUI staking</div>
          <div className="mono" style={{ padding: "12px 20px 0", fontSize: 13, color: "var(--gray)" }}>
            {stakingQ.data.totalPrincipalSui.toFixed(2)} SUI staked
            {stakingQ.data.totalRewardSui > 0 ? ` · +${stakingQ.data.totalRewardSui.toFixed(4)} rewards` : ""}
            {stakingQ.data.totalValueUsd !== null ? ` · ${formatUsd(stakingQ.data.totalValueUsd)}` : ""}
          </div>
          <div className="table-scroll" style={{ padding: "8px 20px 14px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", ...MONO, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr style={{ color: "var(--gray)" }}>
                  <th scope="col" style={{ textAlign: "left", fontWeight: 400, padding: "8px 0" }}>Validator</th>
                  <th scope="col" style={{ textAlign: "right", fontWeight: 400, padding: "8px 0" }}>Principal</th>
                  <th scope="col" style={{ textAlign: "right", fontWeight: 400, padding: "8px 0" }}>Rewards</th>
                  <th scope="col" style={{ textAlign: "right", fontWeight: 400, padding: "8px 0" }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {stakingQ.data.validators.map((v) => (
                  <tr key={v.validator} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ color: "var(--ink)", padding: "9px 0", display: "flex", alignItems: "center", gap: 8 }}>
                      {v.imageUrl && <img src={v.imageUrl} alt="" width={16} height={16} style={{ borderRadius: 4 }} />}
                      <span>{v.name ?? `${v.validator.slice(0, 8)}…`}</span>
                      {v.stakes > 1 && <span style={{ color: "var(--gray-2)", fontSize: 11 }}>×{v.stakes}</span>}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--ink)", padding: "9px 0" }}>{v.principalSui.toFixed(3)}</td>
                    <td style={{ textAlign: "right", color: "var(--green)", padding: "9px 0" }}>{v.rewardSui > 0 ? `+${v.rewardSui.toFixed(4)}` : "—"}</td>
                    <td style={{ textAlign: "right", color: "var(--gray)", padding: "9px 0" }}>{v.valueUsd !== null ? formatUsd(v.valueUsd) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lending health / liquidation risk */}
      {a.lendingHealth.length > 0 && (
        <div className="card">
          <div className="card-header">Lending health · liquidation risk</div>
          <div style={{ padding: "14px 20px" }}>
            {a.lendingHealth.map((h) => {
              const color =
                h.status === "danger" ? "var(--danger)" : h.status === "caution" ? "var(--orange)" : "var(--green)";
              return (
                <div key={h.protocol} style={{ marginBottom: 16 }}>
                  <div style={{ ...MONO, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--ink)" }}>{h.protocol}</span>
                    <span style={{ color }}>HF {h.healthFactor.toFixed(2)} · {h.status}</span>
                  </div>
                  <div className="meter">
                    <div className="meter-fill" style={{ width: `${Math.max(3, Math.min(100, h.drawdownBufferPct))}%`, background: color }} />
                  </div>
                  <div style={{ ...MONO, fontSize: 11, color: "var(--gray-2)", lineHeight: 1.5 }}>
                    borrow {formatUsd(h.borrowUsd)} vs collateral {formatUsd(h.collateralUsd)} · collateral can fall ~
                    {h.drawdownBufferPct}% before liquidation (est., assumes {Math.round(h.liqThreshold * 100)}% liq. threshold)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Position changes over the last 7 days (from balance snapshots) */}
      {changesQ.data && (
        <div className="card">
          <div className="card-header">Recent changes · 7d</div>
          <div style={{ padding: "14px 20px", ...MONO, fontSize: 13 }}>
            {!changesQ.data.ready ? (
              <div style={{ color: "var(--gray-2)" }}>
                Collecting history — {changesQ.data.snapshots} snapshot{changesQ.data.snapshots === 1 ? "" : "s"} so far.
                Position changes appear once 2+ hourly snapshots exist.
              </div>
            ) : changesQ.data.changes.length === 0 ? (
              <div style={{ color: "var(--gray-2)" }}>No significant position changes in the last 7 days.</div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {changesQ.data.changes.map((c, i, arr) => {
                  // For debt, growing is bad / repaying is good — invert the sense.
                  const grew = c.deltaAmount >= 0;
                  const good = c.side === "liability" ? !grew : grew;
                  const color =
                    c.kind === "opened" ? (c.side === "liability" ? "var(--danger)" : "var(--green)")
                      : c.kind === "closed" ? (c.side === "liability" ? "var(--green)" : "var(--danger)")
                        : good ? "var(--green)" : "var(--orange)";
                  return (
                    <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, lineHeight: 2.1, borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none" }}>
                      <span style={{ color, width: 76, fontSize: 11, textTransform: "uppercase" }}>{c.kind}</span>
                      <span style={{ flex: 1, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.symbol ?? c.coinType.split("::").pop()}{c.side === "liability" ? " (debt)" : ""}
                      </span>
                      <span style={{ color, width: 110, textAlign: "right" }}>
                        {c.deltaAmount >= 0 ? "+" : ""}{c.deltaAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </span>
                      <span style={{ color: "var(--gray)", width: 90, textAlign: "right" }}>
                        {c.deltaUsd !== null ? formatUsd(c.deltaUsd) : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      <div style={{ ...MONO, fontSize: 11, color: "var(--gray-2)", textAlign: "center", padding: "4px 0 8px" }}>
        Derived from current holdings. Activity-over-time & trajectory land with the historical indexer (next phase).
      </div>
    </>
  );
}

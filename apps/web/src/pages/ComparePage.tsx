import { type CSSProperties, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { getAnalysis, type WalletAnalysis } from "../api/client.js";
import { formatUsd } from "../lib/format.js";
import { isValidSuiAddress, normalizeSuiAddress } from "../lib/sui.js";

const MONO: CSSProperties = { fontFamily: "var(--font-mono)" };
const inputStyle: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 13,
  padding: "10px 12px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--line)",
  background: "var(--white)",
  color: "var(--ink)",
  outline: "none",
};

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
function scoreOf(a: WalletAnalysis, key: string): number {
  return a.scores.find((s) => s.key === key)?.value ?? 0;
}

interface Row {
  k: string;
  a: string | number;
  b: string | number;
  // numeric comparison direction for the subtle highlight (omit = no judgement)
  higher?: "good" | "bad";
}

function CompareForm({ initialA, initialB }: { initialA: string; initialB: string }) {
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const navigate = useNavigate();
  const aBad = a.trim().length > 0 && !isValidSuiAddress(a.trim());
  const bBad = b.trim().length > 0 && !isValidSuiAddress(b.trim());
  const valid = isValidSuiAddress(a.trim()) && isValidSuiAddress(b.trim());
  return (
    <div className="card">
      <div className="card-header">Compare wallets</div>
      <form
        style={{ padding: "18px 20px", display: "grid", gap: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) navigate(`/compare/${normalizeSuiAddress(a.trim())}/${normalizeSuiAddress(b.trim())}`);
        }}
      >
        <input
          placeholder="First address (0x…)"
          value={a}
          onChange={(e) => setA(e.target.value)}
          aria-label="First address"
          style={{ ...inputStyle, borderColor: aBad ? "var(--danger)" : "var(--line)" }}
        />
        <input
          placeholder="Second address (0x…)"
          value={b}
          onChange={(e) => setB(e.target.value)}
          aria-label="Second address"
          style={{ ...inputStyle, borderColor: bBad ? "var(--danger)" : "var(--line)" }}
        />
        {(aBad || bBad) && (
          <div className="mono" style={{ fontSize: 12, color: "var(--danger)" }}>
            Invalid address — use 0x + 64 hex characters.
          </div>
        )}
        <button type="submit" className="btn-soft btn-soft--ink" disabled={!valid} style={{ justifySelf: "start" }}>
          Compare
        </button>
      </form>
    </div>
  );
}

/** Side-by-side wallet comparison built on the Smart Wallet Analysis profile. */
export function ComparePage() {
  const { a: rawA, b: rawB } = useParams();
  const validA = rawA && isValidSuiAddress(rawA);
  const validB = rawB && isValidSuiAddress(rawB);
  const addrA = validA ? normalizeSuiAddress(rawA) : "";
  const addrB = validB ? normalizeSuiAddress(rawB) : "";

  const qa = useQuery({ queryKey: ["analysis", addrA], queryFn: () => getAnalysis(addrA), enabled: Boolean(validA) });
  const qb = useQuery({ queryKey: ["analysis", addrB], queryFn: () => getAnalysis(addrB), enabled: Boolean(validB) });

  if (!validA || !validB) {
    return <CompareForm initialA={rawA ?? ""} initialB={rawB ?? ""} />;
  }
  if (qa.isLoading || qb.isLoading) {
    return (
      <div className="card">
        <div className="card-header">Compare wallets</div>
        <div className="state"><div className="spinner" />Analyzing both wallets…</div>
      </div>
    );
  }
  if (qa.isError || qb.isError || !qa.data || !qb.data) {
    return (
      <div className="card">
        <div className="card-header">Compare wallets</div>
        <div className="state error">Failed to analyze one of the wallets.</div>
      </div>
    );
  }

  const A = qa.data;
  const B = qb.data;
  const rows: Row[] = [
    { k: "Net worth", a: formatUsd(A.netWorthUsd), b: formatUsd(B.netWorthUsd) },
    { k: "Profile", a: A.primaryLabel?.label ?? "—", b: B.primaryLabel?.label ?? "—" },
    { k: "Risk score", a: A.riskScore, b: B.riskScore, higher: "bad" },
    { k: "Staking", a: scoreOf(A, "staking"), b: scoreOf(B, "staking"), higher: "good" },
    { k: "DeFi exposure", a: scoreOf(A, "defi"), b: scoreOf(B, "defi") },
    { k: "Stable buffer", a: scoreOf(A, "stable"), b: scoreOf(B, "stable"), higher: "good" },
    { k: "Diversification", a: scoreOf(A, "diversification"), b: scoreOf(B, "diversification"), higher: "good" },
    { k: "Top concentration", a: `${A.stats.largestHoldingPct}%`, b: `${B.stats.largestHoldingPct}%`, higher: "bad" },
    { k: "Leverage", a: `${A.stats.leveragePct}%`, b: `${B.stats.leveragePct}%`, higher: "bad" },
    { k: "Protocols", a: A.stats.protocolCount, b: B.stats.protocolCount, higher: "good" },
  ];

  const cellColor = (row: Row, side: "a" | "b"): string => {
    if (!row.higher || typeof row.a !== "number" || typeof row.b !== "number" || row.a === row.b) return "var(--ink)";
    const mine = side === "a" ? row.a : row.b;
    const other = side === "a" ? row.b : row.a;
    const isMax = mine > other;
    const good = row.higher === "good" ? isMax : !isMax;
    return good ? "var(--green)" : "var(--danger)";
  };

  return (
    <div className="card">
      <div className="card-header">Compare wallets</div>
      <div style={{ padding: "8px 20px 18px" }}>
        <div className="table-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", ...MONO, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: "left", color: "var(--gray)", fontWeight: 400, padding: "10px 0" }}>Metric</th>
                <th scope="col" style={{ textAlign: "right", color: "var(--ink)", padding: "10px 0", whiteSpace: "nowrap" }}>{shortAddr(addrA)}</th>
                <th scope="col" style={{ textAlign: "right", color: "var(--ink)", padding: "10px 0", whiteSpace: "nowrap" }}>{shortAddr(addrB)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.k} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ color: "var(--gray)", padding: "9px 0", whiteSpace: "nowrap" }}>{r.k}</td>
                  <td style={{ textAlign: "right", color: cellColor(r, "a"), padding: "9px 0", whiteSpace: "nowrap" }}>{r.a}</td>
                  <td style={{ textAlign: "right", color: cellColor(r, "b"), padding: "9px 0", whiteSpace: "nowrap" }}>{r.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginTop: 16 }}>
          {[A, B].map((w, idx) => (
            <div key={idx}>
              <div className="col-label" style={{ marginBottom: 8 }}>
                {shortAddr(idx === 0 ? addrA : addrB)} labels
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {w.labels.map((l) => (
                  <span key={l.key} title={l.why} className="chip" style={{ fontSize: 11, cursor: "help" }}>
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

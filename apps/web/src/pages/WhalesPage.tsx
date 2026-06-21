import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAnalysis, type WalletAnalysis } from "../api/client.js";
import { formatUsd } from "../lib/format.js";
import { shortenAddress } from "../lib/sui.js";

/** Curated set of known Sui mainnet wallets — NOT a global ranking. */
const WHALES: { address: string; label: string }[] = [
  { address: "0x5c03a18b15278713cdd1710a76a8dcbf0159a5739c743015868013c6aadaf984", label: "Bluefin Pro whale" },
  { address: "0x08beed3ebf0b5620ab5ea33be9ccd87e7b1ef590834fe3b7ac71e40c3f679ed1", label: "Cetus CLMM whale" },
  { address: "0x137c9e55eaee22f2f9495b98c65ccbb4ab8882a4c4988c115625f8c06d03fbdc", label: "AlphaLend lender" },
  { address: "0xb973681698db4e9fc7b27dff7b8c5ae2323728f5e1ccfb1380f6592972c3cf91", label: "Turbos LP" },
  { address: "0xdcd6463180d8a36ebfd3e30ce2ebac8e2a3bbad8d22a30976be917050e7bd139", label: "NAVI supplier" },
  { address: "0x4c04cb7126f22623cf3d97d29c936d6b9882a9b28a08cc863bdc9190284a8417", label: "Leveraged DeFi" },
];

function scoreOf(a: WalletAnalysis, key: string): number {
  return a.scores.find((s) => s.key === key)?.value ?? 0;
}

/** Smart-money heuristic: large + diversified + DeFi-active + not over-leveraged. */
function smartScore(a: WalletAnalysis): number {
  const size = Math.min(100, (Math.log10(Math.max(1, a.netWorthUsd)) / 6) * 100); // ~$1M -> 100
  const score = 0.4 * size + 0.3 * scoreOf(a, "diversification") + 0.3 * scoreOf(a, "defi") - 0.25 * a.riskScore;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function WhalesPage() {
  const results = useQueries({
    queries: WHALES.map((w) => ({
      queryKey: ["analysis", w.address],
      queryFn: () => getAnalysis(w.address),
      staleTime: 120_000,
    })),
  });

  const ranked = WHALES.map((w, i) => {
    const data = results[i]?.data;
    return {
      ...w,
      loading: results[i]?.isLoading ?? false,
      errored: results[i]?.isError ?? false,
      refetch: results[i]?.refetch,
      usd: data?.netWorthUsd ?? null,
      profile: data?.primaryLabel?.label ?? null,
      risk: data?.riskScore ?? null,
      smart: data ? smartScore(data) : null,
    };
  }).sort((a, b) => (b.usd ?? -1) - (a.usd ?? -1));
  const anySettled = ranked.some((w) => !w.loading);

  return (
    <div className="dashboard">
      <div className="card">
        <div className="card-header">Sui whales · smart money</div>
        <div style={{ padding: "4px 0" }}>
          {ranked.map((w, rank) => (
            <div className="token-row" key={w.address}>
              <div className="token-symbol">
                {/* Only assert a rank once data has started settling, so numbers don't jump. */}
                <span className="whale-rank">{anySettled && !w.loading ? `#${rank + 1}` : "·"}</span>
                <span>
                  <Link to={`/${w.address}`} className="activity-digest">{w.label}</Link>
                  <span className="token-type">
                    <span>
                      {shortenAddress(w.address)}
                      {w.profile ? ` · ${w.profile}` : ""}
                      {w.risk !== null ? ` · risk ${w.risk}` : ""}
                    </span>
                  </span>
                </span>
              </div>
              <div className="token-values" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {w.smart !== null && (
                  <span
                    className="chip"
                    title="Smart-money score: size + diversification + DeFi activity − risk"
                    style={{ fontSize: 11, color: w.smart >= 60 ? "var(--green)" : w.smart >= 35 ? "var(--orange)" : "var(--gray)" }}
                  >
                    SM {w.smart}
                  </span>
                )}
                {w.errored ? (
                  <button className="retry" onClick={() => void w.refetch?.()} title="Retry">
                    failed · retry
                  </button>
                ) : (
                  <span className="token-amount">
                    {w.loading ? "…" : w.usd !== null ? formatUsd(w.usd) : "—"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="hero-cta"># curated set ranked by net worth · SM = smart-money score (Sui has no on-demand global ranking).</p>
    </div>
  );
}

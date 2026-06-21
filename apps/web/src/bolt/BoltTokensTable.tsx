import { useMemo, useState } from "react";
import type { WalletToken } from "../api/client.js";
import { shortenCoinType, symbolFromCoinType } from "../lib/coinType.js";
import { formatAmount, formatUsd } from "../lib/format.js";

interface Props {
  tokens: WalletToken[];
  loading: boolean;
}

export function BoltTokensTable({ tokens, loading }: Props) {
  const [filter, setFilter] = useState("");

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const sorted = [...tokens].sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));
    if (!q) return sorted;
    return sorted.filter((t) => {
      const sym = (t.symbol ?? symbolFromCoinType(t.coinType) ?? "").toLowerCase();
      return sym.includes(q) || t.coinType.toLowerCase().includes(q);
    });
  }, [tokens, filter]);

  return (
    <div className="bolt-card bolt-table-card">
      <div className="bolt-card-head bolt-table-head">
        <div>
          <h3>Token holdings</h3>
          <p>{tokens.length} assets in wallet</p>
        </div>
        <div className="bolt-table-tools">
          <div className="bolt-table-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search tokens…"
              aria-label="Filter tokens"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bolt-empty">Loading tokens…</div>
      ) : rows.length === 0 ? (
        <div className="bolt-empty">No tokens match your search.</div>
      ) : (
        <table className="bolt-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Contract</th>
              <th>Balance</th>
              <th>Price</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 20).map((t) => {
              const sym = t.symbol ?? symbolFromCoinType(t.coinType) ?? "?";
              return (
                <tr key={t.coinType}>
                  <td>
                    <div className="bolt-token-cell">
                      <span className="bolt-token-icon">{sym.slice(0, 2)}</span>
                      <span className="bolt-table-primary">{sym}</span>
                    </div>
                  </td>
                  <td className="bolt-table-muted">{shortenCoinType(t.coinType)}</td>
                  <td>
                    {formatAmount(t.amount, t.decimals)} {sym}
                  </td>
                  <td className="bolt-table-muted">{formatUsd(t.priceUsd)}</td>
                  <td className="bolt-table-value">{formatUsd(t.valueUsd)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getPortfolio } from "../api/client.js";
import { useWatchlist } from "../hooks/useWatchlist.js";
import { formatUsd } from "../lib/format.js";
import { isValidSuiAddress, shortenAddress } from "../lib/sui.js";
import {
  addWatchlistAddress,
  removeWatchlistAddress,
} from "../lib/watchlist.js";

/** Multi-wallet bundle: track several Sui addresses and a combined net worth. */
export function WatchlistPage() {
  const list = useWatchlist();
  const [input, setInput] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const results = useQueries({
    queries: list.map((a) => ({
      queryKey: ["portfolio", a],
      queryFn: () => getPortfolio(a),
      staleTime: 60_000,
    })),
  });

  const total = results.reduce((s, r) => s + (r.data?.totalUsd ?? 0), 0);

  function add(e?: FormEvent) {
    e?.preventDefault();
    const t = input.trim();
    if (!isValidSuiAddress(t)) {
      setErr("Invalid address — use 0x + 64 hex characters.");
      return;
    }
    addWatchlistAddress(t);
    setInput("");
    setErr(null);
  }

  function remove(a: string) {
    removeWatchlistAddress(a);
  }

  return (
    <div className="dashboard">
      <div className="card">
        <div className="card-header portfolio-header">
          <span>Watchlist · {list.length} wallets</span>
          <span className="portfolio-total">{formatUsd(total)}</span>
        </div>

        <form className="watchlist-add" onSubmit={add}>
          <input
            className="site-search-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (err) setErr(null);
            }}
            placeholder="Add Sui address (0x…)"
            spellCheck={false}
            autoComplete="off"
          />
          <button type="submit" className="pagination-btn">+ Watch</button>
        </form>
        {err && <p className="site-search-error">{err}</p>}

        {list.length === 0 ? (
          <div className="state">No wallets yet. Add a 0x… address to track it.</div>
        ) : (
          list.map((a, i) => {
            const r = results[i];
            return (
              <div className="token-row" key={a}>
                <div className="token-symbol">
                  <Link to={`/${a}`} className="activity-digest">
                    {shortenAddress(a)}
                  </Link>
                </div>
                <div className="token-values">
                  <span className="token-amount">
                    {r?.isLoading ? "…" : formatUsd(r?.data?.totalUsd ?? 0)}
                  </span>
                  <button className="wallet-copy wallet-remove" onClick={() => remove(a)} aria-label="Remove from watchlist" title="Remove from watchlist">
                    ✕ remove
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

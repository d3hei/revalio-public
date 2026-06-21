import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { getPortfolio, getWalletProfile } from "../api/client.js";
import { formatUsd } from "../lib/format.js";
import {
  addSearchHistoryEntry,
  clearSearchHistory,
  readSearchHistory,
  SEARCH_HISTORY_KEY,
  SEARCH_HISTORY_VISIBLE,
  updateSearchHistoryEntry,
  type SearchHistoryEntry,
} from "../lib/searchHistory.js";
import { isValidSuiAddress, normalizeSuiAddress, shortenAddress } from "../lib/sui.js";
import { resolveWalletAvatarUrl } from "../lib/walletProfile.js";

interface Props {
  onSearch: (address: string | null) => void;
}

async function enrichHistoryEntry(address: string): Promise<void> {
  const [portfolioR, profileR] = await Promise.allSettled([
    getPortfolio(address),
    getWalletProfile(address),
  ]);

  updateSearchHistoryEntry(address, {
    totalUsd:
      portfolioR.status === "fulfilled" && Number.isFinite(portfolioR.value.totalUsd)
        ? portfolioR.value.totalUsd
        : null,
    nickname: profileR.status === "fulfilled" ? profileR.value.nickname : null,
    avatar: profileR.status === "fulfilled" ? profileR.value.avatar : null,
  });
}

export function SiteHeaderSearch({ onSearch }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistoryEntry[]>(() => readSearchHistory());
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const refreshHistory = useCallback(() => {
    setHistory(readSearchHistory());
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SEARCH_HISTORY_KEY) refreshHistory();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshHistory]);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return history;
    return history.filter((entry) => {
      const addressMatch = entry.address.toLowerCase().includes(trimmed);
      const nickMatch = entry.nickname?.toLowerCase().includes(trimmed) ?? false;
      return addressMatch || nickMatch;
    });
  }, [history, query]);

  const visibleEntries = expanded ? filtered : filtered.slice(0, SEARCH_HISTORY_VISIBLE);
  const hasMore = filtered.length > SEARCH_HISTORY_VISIBLE && !expanded;
  const showPanel = open && filtered.length > 0;

  function commitAddress(address: string) {
    const normalized = normalizeSuiAddress(address);
    setError(null);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    setExpanded(false);
    onSearch(normalized);
    setHistory(addSearchHistoryEntry(normalized));
    void enrichHistoryEntry(normalized).then(refreshHistory);
  }

  function submitSearch(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError(null);
      onSearch(null);
      return;
    }
    if (activeIndex >= 0 && activeIndex < visibleEntries.length) {
      commitAddress(visibleEntries[activeIndex].address);
      return;
    }
    if (!isValidSuiAddress(trimmed)) {
      setError("Invalid address — use 0x + 64 hex characters.");
      return;
    }
    commitAddress(trimmed);
  }

  function clearSearch() {
    setQuery("");
    setError(null);
    setActiveIndex(-1);
    onSearch(null);
    inputRef.current?.focus();
  }

  function handleClearHistory() {
    clearSearchHistory();
    refreshHistory();
    setActiveIndex(-1);
    if (filtered.length === 0) setOpen(false);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showPanel) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, visibleEntries.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="site-search-wrap" ref={wrapRef}>
      <form
        className="site-search"
        onSubmit={submitSearch}
        onFocus={() => {
          if (history.length > 0) setOpen(true);
        }}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (next && wrapRef.current?.contains(next)) return;
          window.setTimeout(() => setOpen(false), 120);
        }}
      >
        <span className="site-search-icon" aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <input
          ref={inputRef}
          className="site-search-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
            setExpanded(false);
            if (error) setError(null);
            if (history.length > 0) setOpen(true);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Search Sui address (0x…)"
          spellCheck={false}
          autoComplete="off"
          aria-label="Search Sui address"
          aria-invalid={error ? true : undefined}
          aria-expanded={showPanel}
          aria-controls="site-search-history"
          role="combobox"
        />
        {query.length > 0 && (
          <button
            type="button"
            className="site-search-clear"
            onClick={clearSearch}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
        <button type="submit" className="site-search-btn">
          Go
        </button>
      </form>

      {showPanel && (
        <div className="site-search-history" id="site-search-history" role="listbox">
          <div className="site-search-history-head">
            <span className="site-search-history-title">Recent</span>
            <button type="button" className="site-search-history-clear" onClick={handleClearHistory}>
              Clear all
            </button>
          </div>

          <ul className="site-search-history-list">
            {visibleEntries.map((entry, index) => {
              const label = entry.nickname?.trim() || shortenAddress(entry.address);
              const sublabel =
                entry.nickname?.trim() ? shortenAddress(entry.address) : null;
              const active = index === activeIndex;

              return (
                <li key={entry.address}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`site-search-history-item${active ? " is-active" : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commitAddress(entry.address)}
                  >
                    <img
                      className="site-search-history-avatar"
                      src={resolveWalletAvatarUrl(entry.avatar)}
                      alt=""
                      width={32}
                      height={32}
                    />
                    <span className="site-search-history-meta">
                      <span className="site-search-history-label">{label}</span>
                      {sublabel && (
                        <span className="site-search-history-sublabel">{sublabel}</span>
                      )}
                    </span>
                    <span className="site-search-history-value">{formatUsd(entry.totalUsd)}</span>
                    <span className="site-search-history-enter" aria-hidden>
                      ↵
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <button
              type="button"
              className="site-search-history-more"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setExpanded(true)}
            >
              Show more
              <span aria-hidden>▾</span>
            </button>
          )}
        </div>
      )}

      {error && <p className="site-search-error">{error}</p>}
    </div>
  );
}

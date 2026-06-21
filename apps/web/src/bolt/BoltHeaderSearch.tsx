import { useState, type FormEvent } from "react";
import { isValidSuiAddress, normalizeSuiAddress } from "../lib/sui.js";

interface Props {
  onSearch: (address: string | null) => void;
}

export function BoltHeaderSearch({ onSearch }: Props) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setError(null);
      onSearch(null);
      return;
    }
    if (!isValidSuiAddress(trimmed)) {
      setError("Invalid address");
      return;
    }
    setError(null);
    onSearch(normalizeSuiAddress(trimmed));
    setQuery("");
  }

  return (
    <div className="bolt-header-search-wrap">
      <form className="bolt-header-search" onSubmit={submit}>
        <svg className="bolt-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Search Sui address (0x…)"
          spellCheck={false}
          autoComplete="off"
          aria-label="Search Sui address"
        />
        {query.length > 0 && (
          <button
            type="button"
            className="bolt-search-clear"
            onClick={() => {
              setQuery("");
              setError(null);
              onSearch(null);
            }}
            aria-label="Clear"
          >
            ×
          </button>
        )}
      </form>
      {error ? <p className="bolt-search-error">{error}</p> : null}
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { isValidSuiAddress, normalizeSuiAddress } from "../lib/sui.js";

interface Props {
  onSearch: (address: string | null) => void;
}

export function LabHeaderSearch({ onSearch }: Props) {
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
      setError("Invalid address — use 0x + 64 hex.");
      return;
    }
    setError(null);
    onSearch(normalizeSuiAddress(trimmed));
    setQuery("");
  }

  return (
    <div className="lab-header-search-wrap">
      <form className="lab-header-search" onSubmit={submit}>
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
            className="lab-header-search-clear"
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
        <button type="submit" className="lab-pill lab-pill-sm">
          Go
        </button>
      </form>
      {error ? <p className="lab-header-search-error">{error}</p> : null}
    </div>
  );
}

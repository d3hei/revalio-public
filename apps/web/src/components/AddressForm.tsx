import { useState, type FormEvent } from "react";
import { isValidSuiAddress, normalizeSuiAddress } from "../lib/sui.js";

interface Props {
  onSubmit: (address: string) => void;
  pending?: boolean;
}

export function AddressForm({ onSubmit, pending }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!isValidSuiAddress(trimmed)) {
      setError("Enter the full Sui address (0x + 64 hex characters).");
      return;
    }
    setError(null);
    onSubmit(normalizeSuiAddress(trimmed));
  }

  return (
    <>
      <form className="address-form" onSubmit={handleSubmit}>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0x… Sui address"
          spellCheck={false}
          autoComplete="off"
          aria-label="Sui address"
        />
        <button type="submit" disabled={pending}>
          {pending ? "Loading…" : "Track"}
        </button>
      </form>
      {error && <p className="field-error">{error}</p>}
    </>
  );
}

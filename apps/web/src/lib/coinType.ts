/** Extract ticker from a Move coin type, e.g. `0x2::sui::SUI` → `SUI`. */
export function symbolFromCoinType(coinType: string): string | null {
  const trimmed = coinType.trim();
  const parts = trimmed.split("::");
  if (parts.length < 2) return null;
  const sym = parts[parts.length - 1];
  return sym ? sym.toUpperCase() : null;
}

/** Shorten a long coin type for display. */
export function shortenCoinType(coinType: string): string {
  if (coinType.length <= 28) return coinType;
  return `${coinType.slice(0, 12)}…${coinType.slice(-10)}`;
}

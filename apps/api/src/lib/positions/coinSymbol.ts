/** Extract ticker from a Move coin type, e.g. `0x2::sui::SUI` → `SUI`. */
export function symbolFromCoinType(coinType: string): string | null {
  const trimmed = coinType.trim();
  const parts = trimmed.split("::");
  if (parts.length < 2) return null;
  const sym = parts[parts.length - 1];
  return sym ? sym.toUpperCase() : null;
}

/** Map NAVI / bridge pool names to Pyth price tickers. */
export function priceSymbolForTicker(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s === "WUSDC" || s === "NUSDC") return "USDC";
  if (s === "WUSDT") return "USDT";
  if (s === "WETH") return "ETH";
  if (s === "WBTC" || s === "XBTC" || s === "MBTC" || s === "LBTC" || s === "YBTC") return "BTC";
  return s;
}

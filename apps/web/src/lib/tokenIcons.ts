import { symbolFromCoinType } from "./coinType.js";

/** Bundled token logos under /public/tokens (SVG preferred). */
const LOCAL_TOKEN_ICONS: Record<string, string> = {
  SUI: "/tokens/sui.svg",
  USDC: "/tokens/usdc.svg",
  HASUI: "/tokens/hasui.svg",
  DEEP: "/tokens/deep.png",
  WAL: "/tokens/walrus.png",
};

export function resolveTokenIconUrl(symbol: string | null | undefined): string | null {
  const key = symbol?.trim().toUpperCase();
  if (!key) return null;
  return LOCAL_TOKEN_ICONS[key] ?? null;
}

export function coinTypeFromDetails(details: Record<string, unknown>): string | null {
  const coinType = details.coinType;
  return typeof coinType === "string" && coinType.includes("::") ? coinType : null;
}

export function symbolFromDetails(details: Record<string, unknown>): string | null {
  if (typeof details.symbol === "string" && details.symbol.trim()) {
    return details.symbol.trim().toUpperCase();
  }
  const coinType = coinTypeFromDetails(details);
  return coinType ? symbolFromCoinType(coinType) : null;
}

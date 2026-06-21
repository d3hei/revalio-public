/**
 * Format a raw on-chain integer amount (as string) using the coin's decimals.
 * Uses BigInt to avoid precision loss on large balances.
 */
export function formatAmount(raw: string, decimals: number): string {
  let value: bigint;
  try {
    value = BigInt(raw);
  } catch {
    return raw;
  }
  if (decimals <= 0) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = value % base;

  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (frac === 0n) return wholeStr;

  const fracStr = frac
    .toString()
    .padStart(decimals, "0")
    .slice(0, 4)
    .replace(/0+$/, "");
  return fracStr ? `${wholeStr}.${fracStr}` : wholeStr;
}

/** Format a number as a USD currency string, or an em dash when unavailable. */
export function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value !== 0 && Math.abs(value) < 0.01 ? 6 : 2,
  }).format(value);
}

/** Format a unix-ms chart timestamp for tooltip / axis labels. */
export function formatChartDate(ms: number, range: "24h" | "7d" | "30d" | "1y"): string {
  const date = new Date(ms);
  if (range === "24h") {
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (range === "1y") {
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: range === "30d" ? "numeric" : undefined,
  });
}

/** Format a unix-millisecond timestamp (as string) as a short relative time. */
export function formatTimestamp(raw: string): string {
  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) return "—";

  const diffSec = Math.round((Date.now() - ms) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

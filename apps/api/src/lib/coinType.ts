/**
 * Canonical Sui Move coin type strings for metadata, DB, and pricing lookups.
 * On-chain TypeName fields often omit the `0x` prefix on address segments.
 */

const SUI_ALIAS_ADDR =
  "0000000000000000000000000000000000000000000000000000000000000002";
const SUI_CANONICAL = "0x2::sui::SUI";

/** Normalize a Move coin type to `0x<addr>::module::Struct` form. */
export function normalizeCoinType(coinType: string): string {
  const trimmed = coinType.trim();
  if (!trimmed.includes("::")) return trimmed;

  const parts = trimmed.split("::");
  if (parts.length < 3) return trimmed;

  const addr = parts[0]!;
  const module = parts[1]!;
  const symbol = parts.slice(2).join("::");

  const bare = (addr.startsWith("0x") ? addr.slice(2) : addr).toLowerCase();
  if (bare === "2" || bare === SUI_ALIAS_ADDR) {
    return SUI_CANONICAL;
  }

  const normalizedAddr = addr.startsWith("0x") ? addr : `0x${addr}`;
  return `${normalizedAddr}::${module}::${symbol}`;
}

/** Normalize optional coin type fields on position details. */
export function normalizeDetailsCoinTypes(
  details: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...details };
  for (const key of ["coinType", "coinTypeA", "coinTypeB"] as const) {
    const v = out[key];
    if (typeof v === "string" && v.includes("::")) {
      out[key] = normalizeCoinType(v);
    }
  }
  return out;
}

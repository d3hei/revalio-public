import { getCoinMetadata } from "./coinMetadata.js";
import { getCoinTypeUsdPrices } from "./prices.js";
import { getWalletHiddenCoinTypes } from "./protocolWalletCoins.js";
import type { WalletBalanceSource } from "./walletBalances.js";

const DUST_USD = 0.01;

function toFloat(raw: string, decimals: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return decimals > 0 ? n / 10 ** decimals : n;
}

function compareAmountDesc(a: string, b: string): number {
  if (a.length !== b.length) return b.length - a.length;
  return a < b ? 1 : a > b ? -1 : 0;
}

export interface WalletTokenPayload {
  coinType: string;
  symbol: string | null;
  name: string | null;
  decimals: number;
  iconUrl: string | null;
  amount: string;
  priceUsd: number | null;
  valueUsd: number | null;
}

export interface WalletPayload {
  address: string;
  totalUsd: number;
  tokens: WalletTokenPayload[];
  source: "indexer" | "rpc";
}

export async function buildWalletPayload(
  address: string,
  balanceSource: WalletBalanceSource,
): Promise<WalletPayload> {
  const rows = balanceSource.rows;
  const source: "indexer" | "rpc" = balanceSource.onDemandBalances ? "rpc" : "indexer";

  const hiddenCoinTypes = await getWalletHiddenCoinTypes();
  const visibleRows = rows.filter((r) => !hiddenCoinTypes.has(r.coin_type));

  const coinTypes = visibleRows.map((r) => r.coin_type);
  const metaMap = await getCoinMetadata(coinTypes);

  const priceMap = await getCoinTypeUsdPrices(
    coinTypes.map((coinType) => ({ coinType, symbol: metaMap.get(coinType)?.symbol ?? null })),
  );

  const allTokens = visibleRows.map((r) => {
    const meta = metaMap.get(r.coin_type);
    const decimals = meta?.decimals ?? 0;
    const priceUsd = priceMap.get(r.coin_type) ?? null;
    const valueUsd = priceUsd !== null ? toFloat(r.balance, decimals) * priceUsd : null;
    return {
      coinType: r.coin_type,
      symbol: meta?.symbol ?? null,
      name: meta?.name ?? null,
      decimals,
      iconUrl: meta?.iconUrl ?? null,
      amount: r.balance,
      priceUsd,
      valueUsd,
    };
  });

  // Hide priced dust (< $0.01) from the list and the total to match explorer
  // "hide low assets" behaviour; unpriced tokens are kept (shown as "—").
  const tokens = allTokens.filter((t) => !(t.valueUsd !== null && t.valueUsd < DUST_USD));
  let totalUsd = 0;
  for (const t of tokens) {
    if (typeof t.valueUsd === "number" && Number.isFinite(t.valueUsd)) totalUsd += t.valueUsd;
  }

  tokens.sort((a, b) => {
    const av = a.valueUsd ?? -1;
    const bv = b.valueUsd ?? -1;
    if (bv !== av) return bv - av;
    return compareAmountDesc(a.amount, b.amount);
  });

  return { address, totalUsd, tokens, source };
}

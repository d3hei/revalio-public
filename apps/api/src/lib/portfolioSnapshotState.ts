import { normalizeCoinType } from "./coinType.js";
import type { CoinMeta } from "./coinMetadata.js";
import { getCoinMetadata } from "./coinMetadata.js";
import type { WalletBalanceRow } from "./walletBalances.js";
import { defiHoldingContributions, parseRawBalance } from "./portfolioHoldings.js";
import { getWalletHiddenCoinTypes } from "./protocolWalletCoins.js";
import { symbolFromCoinType } from "./positions/coinSymbol.js";
import { sumNativeStakingPrincipal } from "./positions/sources/native/nativeStakingRpc.js";
import { query } from "../db.js";
import type { ResolvedPosition } from "./positions/types.js";
import type { PortfolioSnapshotState, SnapshotLine } from "./portfolioSnapshotStore.js";

const SUI_TYPE = "0x2::sui::SUI";

function defaultDecimals(coinType: string): number {
  const sym = symbolFromCoinType(coinType);
  if (sym === "USDC" || sym === "USDT") return 6;
  return 9;
}

function rawFrom(value: unknown, sourceDecimals: number): bigint | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (s.includes(".")) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return BigInt(Math.round(n * 10 ** sourceDecimals));
  }
  try {
    return BigInt(s);
  } catch {
    return null;
  }
}

function addToMap(map: Map<string, bigint>, coinType: string, raw: bigint): void {
  if (raw <= 0n) return;
  const key = normalizeCoinType(coinType);
  map.set(key, (map.get(key) ?? 0n) + raw);
}

function mapToLines(map: Map<string, bigint>): SnapshotLine[] {
  return [...map.entries()]
    .filter(([, bal]) => bal > 0n)
    .map(([coinType, balance]) => ({ coinType, balance: balance.toString() }));
}

/** Extract borrow / debt coin amounts from DeFi position rows. */
function defiLiabilityContributions(positions: ResolvedPosition[]): {
  coinType: string;
  raw: bigint;
  sourceDecimals: number;
}[] {
  const out: {
    coinType: string;
    raw: bigint;
    sourceDecimals: number;
  }[] = [];
  const push = (coinType: unknown, value: unknown, sourceDecimals: number): void => {
    if (typeof coinType !== "string" || value == null) return;
    const raw = rawFrom(value, sourceDecimals);
    if (raw === null || raw <= 0n) return;
    out.push({ coinType: normalizeCoinType(coinType), raw, sourceDecimals });
  };

  for (const pos of positions) {
    const d = pos.details;

    if (pos.positionType === "borrow") {
      const scale =
        typeof d.naviScaleDecimals === "number"
          ? d.naviScaleDecimals
          : typeof d.coinDecimals === "number"
            ? d.coinDecimals
            : defaultDecimals(String(d.coinType ?? ""));
      push(d.coinType, d.value, scale);
    }

    if (pos.positionType === "suilend-borrow" && d.amount != null) {
      const dec = typeof d.coinDecimals === "number" ? d.coinDecimals : defaultDecimals(String(d.coinType ?? ""));
      push(d.coinType, d.amount, dec);
    }

    if (pos.positionType === "scallop-borrow" && Array.isArray(d.debts)) {
      for (const row of d.debts) {
        if (!row || typeof row !== "object") continue;
        const coinType = (row as { coinType?: string }).coinType;
        const amount = (row as { amount?: string }).amount;
        if (typeof coinType !== "string" || amount == null) continue;
        push(coinType, amount, defaultDecimals(coinType));
      }
    }
  }

  return out;
}

function rescaleRaw(raw: bigint, from: number, to: number): bigint {
  if (from === to) return raw;
  return from > to ? raw / 10n ** BigInt(from - to) : raw * 10n ** BigInt(to - from);
}

/**
 * Build a point-in-time asset / liability snapshot from live wallet + DeFi resolution.
 * Used when persisting portfolio history — not for chart simulation with today's balances.
 */
export async function buildPortfolioSnapshotState(
  address: string,
  balanceRows: WalletBalanceRow[],
  defi: ResolvedPosition[],
): Promise<PortfolioSnapshotState> {
  const assets = new Map<string, bigint>();
  const liabilities = new Map<string, bigint>();
  const hidden = await getWalletHiddenCoinTypes();

  for (const row of balanceRows) {
    const coinType = normalizeCoinType(row.coin_type);
    if (hidden.has(coinType)) continue;
    addToMap(assets, coinType, parseRawBalance(row.balance, defaultDecimals(coinType)));
  }

  const rpcStaked = sumNativeStakingPrincipal(defi);
  if (rpcStaked === 0n) {
    try {
      const { rows: stakeRows } = await query<{ staked: string }>(
        `SELECT COALESCE(SUM((details->>'principal')::numeric), 0)::text AS staked
           FROM positions
          WHERE owner_address = $1 AND position_type = 'native-staking'`,
        [address],
      );
      const staked = stakeRows[0]?.staked ?? "0";
      addToMap(assets, SUI_TYPE, BigInt(staked || "0"));
    } catch {
      /* indexer offline */
    }
  }

  const assetContribs = defiHoldingContributions(defi);
  const liabilityContribs = defiLiabilityContributions(defi);
  const coinTypes = [
    ...new Set([
      ...assets.keys(),
      ...assetContribs.map((c) => c.coinType),
      ...liabilityContribs.map((c) => c.coinType),
    ]),
  ];
  const metaMap = await getCoinMetadata(coinTypes);

  for (const c of assetContribs) {
    const realDec = metaMap.get(c.coinType)?.decimals ?? defaultDecimals(c.coinType);
    addToMap(assets, c.coinType, rescaleRaw(c.raw, c.sourceDecimals, realDec));
  }

  for (const c of liabilityContribs) {
    const realDec = metaMap.get(c.coinType)?.decimals ?? defaultDecimals(c.coinType);
    addToMap(liabilities, c.coinType, rescaleRaw(c.raw, c.sourceDecimals, realDec));
  }

  // Suilend supply rows not covered by defiHoldingContributions
  for (const pos of defi) {
    if (pos.positionType !== "suilend-supply") continue;
    const d = pos.details;
    if (typeof d.coinType !== "string" || d.amount == null) continue;
    const dec = typeof d.coinDecimals === "number" ? d.coinDecimals : defaultDecimals(d.coinType);
    const raw = rawFrom(d.amount, dec);
    if (raw !== null) addToMap(assets, d.coinType, raw);
  }

  return { assets: mapToLines(assets), liabilities: mapToLines(liabilities) };
}

export function valueSnapshotAtPrices(
  state: PortfolioSnapshotState,
  pricesByCoinType: Map<string, number>,
  metaByCoinType: Map<string, CoinMeta>,
): { assetsUsd: number; debtUsd: number; netWorthUsd: number } {
  let assetsUsd = 0;
  let debtUsd = 0;

  for (const line of state.assets) {
    const px = pricesByCoinType.get(normalizeCoinType(line.coinType));
    if (px === undefined || !(px > 0)) continue;
    const dec = metaByCoinType.get(normalizeCoinType(line.coinType))?.decimals ?? defaultDecimals(line.coinType);
    const amount = Number(line.balance) / 10 ** dec;
    if (Number.isFinite(amount) && amount > 0) assetsUsd += amount * px;
  }

  for (const line of state.liabilities) {
    const px = pricesByCoinType.get(normalizeCoinType(line.coinType));
    if (px === undefined || !(px > 0)) continue;
    const dec = metaByCoinType.get(normalizeCoinType(line.coinType))?.decimals ?? defaultDecimals(line.coinType);
    const amount = Number(line.balance) / 10 ** dec;
    if (Number.isFinite(amount) && amount > 0) debtUsd += amount * px;
  }

  return { assetsUsd, debtUsd, netWorthUsd: assetsUsd - debtUsd };
}

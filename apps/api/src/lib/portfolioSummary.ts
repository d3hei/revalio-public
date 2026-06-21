import { query } from "../db.js";
import { getCoinMetadata } from "./coinMetadata.js";
import { valueHoldingsAtLivePrices } from "./chartValuation.js";
import { getCoinTypeUsdPrices, getUsdPrices } from "./prices.js";
import { getHoldingsForChart } from "./portfolioHoldings.js";
import { sumNativeStakingPrincipal } from "./positions/sources/native/nativeStakingRpc.js";
import { getCachedDefiPositions, getCachedWalletBalances, type WalletSnapshot } from "./walletSnapshot.js";

const SUI_DECIMALS = 9;
const DUST_USD = 0.01;

function toFloat(raw: string, decimals: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return decimals > 0 ? n / 10 ** decimals : n;
}

export interface PortfolioSummary {
  address: string;
  tokensUsd: number;
  positionsUsd: number;
  totalUsd: number;
  chartLiveUsd: number | null;
  sources: {
    indexerBalances: boolean;
    onDemandBalances: boolean;
    defiPositions: number;
  };
}

/** Single headline numbers: tokens + DeFi positions + chart live valuation. */
export async function getPortfolioSummary(
  address: string,
  snapshot?: WalletSnapshot,
): Promise<PortfolioSummary> {
  const balanceSource =
    snapshot?.balanceSource ?? (await getCachedWalletBalances(address));
  const defi = snapshot?.defi ?? (await getCachedDefiPositions(address));
  const balances = balanceSource.rows;

  const coinTypes = balances.map((r) => r.coin_type);
  const metaMap = await getCoinMetadata(coinTypes);
  const priceMap = await getCoinTypeUsdPrices(
    coinTypes.map((coinType) => ({ coinType, symbol: metaMap.get(coinType)?.symbol ?? null })),
  );

  let tokensUsd = 0;
  for (const row of balances) {
    const px = priceMap.get(row.coin_type);
    if (px === undefined) continue;
    const meta = metaMap.get(row.coin_type);
    const v = toFloat(row.balance, meta?.decimals ?? 0) * px;
    if (v < DUST_USD) continue; // hide dust (< $0.01) to match explorer totals
    tokensUsd += v;
  }

  let staked = "0";
  const rpcStakedMist = sumNativeStakingPrincipal(defi);
  if (rpcStakedMist === 0n) {
    try {
      const { rows: stakeRows } = await Promise.race([
        query<{ staked: string }>(
          `SELECT COALESCE(SUM((details->>'principal')::numeric), 0)::text AS staked
             FROM positions
            WHERE owner_address = $1 AND position_type = 'native-staking'`,
          [address],
        ),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("staking query timeout")), 3_000);
        }),
      ]);
      staked = stakeRows[0]?.staked ?? "0";
    } catch {
      /* indexer offline — skip staked SUI */
    }
    if (BigInt(staked || "0") > 0n) {
      const suiPrice = (await getUsdPrices(["SUI"])).get("SUI");
      if (suiPrice !== undefined) {
        tokensUsd += toFloat(staked, SUI_DECIMALS) * suiPrice;
      }
    }
  }

  let positionsUsd = 0;
  for (const p of defi) {
    if (p.valueUsd !== null && Number.isFinite(p.valueUsd)) positionsUsd += p.valueUsd;
  }

  const holdings = await getHoldingsForChart(address, defi, balances);
  const holdingMeta = await getCoinMetadata(holdings.map((h) => h.coinType));
  const headlineUsd = tokensUsd + positionsUsd;
  let chartLiveUsd = await valueHoldingsAtLivePrices(holdings, holdingMeta);
  // When LP is priced via positionsUsd but gross holdings miss a coin, align headline.
  if (
    chartLiveUsd === null ||
    (positionsUsd > 0 && chartLiveUsd < headlineUsd * 0.9)
  ) {
    chartLiveUsd = headlineUsd;
  }

  return {
    address,
    tokensUsd,
    positionsUsd,
    totalUsd: headlineUsd,
    chartLiveUsd,
    sources: {
      indexerBalances: balanceSource.indexerBalances,
      onDemandBalances: balanceSource.onDemandBalances,
      defiPositions: defi.length,
    },
  };
}

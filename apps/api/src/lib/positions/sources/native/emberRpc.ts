import { normalizeCoinType } from "../../../coinType.js";
import { getOnDemandBalances } from "../../../mainnetBalances.js";
import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import type { ResolvedPosition } from "../../types.js";
import {
  fetchEmberAccountPositions,
  getEmberVaultRegistry,
  positionValueUsdFromE9,
  type EmberAccountPosition,
  type EmberVaultMeta,
  underlyingFromShares,
} from "../ember/emberVaults.js";

function positionFromApi(
  row: EmberAccountPosition,
  meta: EmberVaultMeta | undefined,
): ResolvedPosition | null {
  const valueUsd = positionValueUsdFromE9(row.positionValueUsdE9);
  if (valueUsd === null || valueUsd < 0.01) return null;

  const depositDecimals = meta?.depositDecimals ?? 9;
  const underlyingRaw = row.positionValueInCoinAmount.includes(".")
    ? null
    : BigInt(row.positionValueInCoinAmount || "0");

  return {
    protocol: "Ember",
    category: "vault",
    positionType: "ember-vault",
    label: meta?.name ?? "Ember Vault",
    objectId: meta?.vaultObjectId ?? null,
    valueUsd,
    source: "native",
    details: {
      vaultId: row.vaultId,
      name: meta?.name,
      receiptCoinType: meta?.receiptCoinType,
      receiptSymbol: meta?.receiptSymbol,
      coinType: meta?.depositCoinType,
      depositSymbol: meta?.depositSymbol,
      symbol: meta?.depositSymbol,
      coinDecimals: depositDecimals,
      shares: row.shares,
      balance: underlyingRaw !== null ? underlyingRaw.toString() : row.positionValueInCoinAmount,
      rateE18: meta?.rateE18,
      unrealizedYieldUsd: row.unrealizedYieldUsdE9
        ? Number(row.unrealizedYieldUsdE9) / 1e9
        : undefined,
      syncStatus: row.status,
    },
  };
}

function positionFromReceiptBalance(
  balanceRaw: string,
  meta: EmberVaultMeta,
): ResolvedPosition | null {
  let shares: bigint;
  try {
    shares = BigInt(balanceRaw);
  } catch {
    return null;
  }
  if (shares <= 0n) return null;

  const underlying = underlyingFromShares(shares, meta.rateE18);
  if (underlying <= 0n) return null;

  return {
    protocol: "Ember",
    category: "vault",
    positionType: "ember-vault",
    label: meta.name,
    objectId: meta.vaultObjectId,
    valueUsd: null,
    source: "native",
    details: {
      vaultId: meta.vaultId,
      name: meta.name,
      receiptCoinType: meta.receiptCoinType,
      receiptSymbol: meta.receiptSymbol,
      coinType: meta.depositCoinType,
      depositSymbol: meta.depositSymbol,
      symbol: meta.depositSymbol,
      coinDecimals: meta.depositDecimals,
      shares: shares.toString(),
      balance: underlying.toString(),
      rateE18: meta.rateE18,
    },
  };
}

async function positionsFromWalletReceipts(
  address: string,
  registry: Awaited<ReturnType<typeof getEmberVaultRegistry>>,
): Promise<ResolvedPosition[]> {
  if (registry.byReceiptCoin.size === 0) return [];

  const balances = await getOnDemandBalances(address);
  const out: ResolvedPosition[] = [];

  for (const row of balances) {
    const coinType = normalizeCoinType(row.coin_type);
    const meta = registry.byReceiptCoin.get(coinType);
    if (!meta) continue;
    const pos = positionFromReceiptBalance(row.balance, meta);
    if (pos) out.push(pos);
  }

  return out;
}

/** Ember vaults: API account positions with wallet receipt-token fallback. */
export const nativeEmberAdapter: ProtocolPositionAdapter = {
  id: "native-ember",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const registry = await getEmberVaultRegistry();
    const apiRows = await fetchEmberAccountPositions(address);

    if (apiRows.length > 0) {
      const fromApi = apiRows
        .map((row) => positionFromApi(row, registry.byVaultId.get(row.vaultId)))
        .filter((p): p is ResolvedPosition => p !== null);
      if (fromApi.length > 0) return fromApi;
    }

    return positionsFromWalletReceipts(address, registry);
  },
};

export async function inspectNativeEmber(address: string): Promise<{
  vaultCount: number;
  positions: ResolvedPosition[];
}> {
  const positions = await nativeEmberAdapter.fetchPositions(address);
  return {
    vaultCount: positions.length,
    positions,
  };
}

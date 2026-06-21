import { normalizeCoinType } from "../../../coinType.js";
import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import { symbolFromCoinType } from "../../coinSymbol.js";
import type { ResolvedPosition } from "../../types.js";
import { NAVI_BALANCE_SCALE_DECIMALS, NAVI_MAINNET_POOLS } from "./naviPools.js";
import { defiRpcCall } from "./rpcClient.js";

const NAVI_POOL_CONCURRENCY = 8;

const NAVI_ACCOUNT_CAP_PACKAGE =
  "0x66aa3335901ce7e04b85ed6597ee42d4b479f7110bf98e8ebd474fa32a0027e1";

// Storage.reserves table (keyed by u8 assetId). Each reserve carries the live
// ray-scaled (1e27) supply/borrow indices: the per-user balance tables store the
// SCALED principal, and actual = scaled * index / 1e27 (accrued interest).
const NAVI_RESERVES_TABLE =
  "0xe6d4c6610b86ce7735ea754596d71d72d10c7980b5052fc3c8cdf8d09fea9b4b";
// Storage.user_info Table<address, UserInfo>. UserInfo has two u8 vectors —
// `collaterals` (supplied assetIds) and `loans` (borrowed assetIds) — so ONE read
// tells us exactly which pools to probe instead of all 33 (× supply+borrow = 66).
const NAVI_USER_INFO_TABLE =
  "0xabc6c3fbc89b96e3351fdbeb5730bcc5398648367260c6a4e201779e34694e04";
const RAY = 10n ** 27n;

interface DynamicFieldResult {
  result?: {
    data?: {
      content?: { fields?: { value?: string | number } };
    };
    error?: unknown;
  };
  error?: unknown;
}

interface ReserveResult {
  result?: {
    data?: {
      content?: {
        fields?: {
          value?: {
            fields?: { current_supply_index?: unknown; current_borrow_index?: unknown };
          };
        };
      };
    };
  };
  error?: unknown;
}

function bigOf(v: unknown): bigint {
  try {
    return BigInt(String(v ?? "0"));
  } catch {
    return 0n;
  }
}

interface UserInfoResult {
  result?: {
    data?: {
      content?: { fields?: { value?: { fields?: { collaterals?: number[]; loans?: number[] } } } };
    };
    error?: { code?: string };
  };
  error?: unknown;
}

/** Which assetIds the wallet supplies/borrows — one read instead of probing all pools. */
async function fetchHeldAssetIds(
  address: string,
): Promise<{ collaterals: Set<number>; loans: Set<number> }> {
  const body = await defiRpcCall<UserInfoResult>({
    jsonrpc: "2.0",
    id: 1,
    method: "suix_getDynamicFieldObject",
    params: [NAVI_USER_INFO_TABLE, { type: "address", value: address }, { showContent: true }],
  });
  const f = body?.result?.data?.content?.fields?.value?.fields;
  if (!f || body?.result?.error) {
    return { collaterals: new Set(), loans: new Set() };
  }
  return {
    collaterals: new Set((f.collaterals ?? []).map(Number)),
    loans: new Set((f.loans ?? []).map(Number)),
  };
}

/** Read a reserve's live supply/borrow indices (ray, 1e27) by assetId. */
async function fetchReserveIndices(
  assetId: number,
): Promise<{ supplyIndex: bigint; borrowIndex: bigint }> {
  const body = await defiRpcCall<ReserveResult>({
    jsonrpc: "2.0",
    id: 1,
    method: "suix_getDynamicFieldObject",
    params: [NAVI_RESERVES_TABLE, { type: "u8", value: assetId }, { showContent: true }],
  });
  const f = body?.result?.data?.content?.fields?.value?.fields;
  return {
    supplyIndex: bigOf(f?.current_supply_index),
    borrowIndex: bigOf(f?.current_borrow_index),
  };
}

async function fetchBalanceAtParent(
  parentId: string,
  ownerAddress: string,
): Promise<bigint> {
  const body = await defiRpcCall<DynamicFieldResult>({
    jsonrpc: "2.0",
    id: 1,
    method: "suix_getDynamicFieldObject",
    params: [
      parentId,
      { type: "address", value: ownerAddress },
      { showContent: true },
    ],
  });
  const value = body?.result?.data?.content?.fields?.value;
  if (value === undefined || value === null) return 0n;
  try {
    return BigInt(String(value));
  } catch {
    return 0n;
  }
}

async function mapPoolsWithConcurrency<T>(
  pools: typeof NAVI_MAINNET_POOLS,
  fn: (pool: (typeof NAVI_MAINNET_POOLS)[number]) => Promise<T[]>,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < pools.length; i += NAVI_POOL_CONCURRENCY) {
    const chunk = pools.slice(i, i + NAVI_POOL_CONCURRENCY);
    const rows = await Promise.all(chunk.map(fn));
    for (const row of rows) out.push(...row);
  }
  return out;
}

function naviPoolSymbol(pool: (typeof NAVI_MAINNET_POOLS)[number], coinType: string): string {
  const fromType = symbolFromCoinType(coinType);
  if (fromType && fromType !== "COIN") return fromType;
  return pool.name.toUpperCase();
}

function poolPositions(
  pool: (typeof NAVI_MAINNET_POOLS)[number],
  supplyRaw: bigint,
  borrowRaw: bigint,
): ResolvedPosition[] {
  const out: ResolvedPosition[] = [];
  const coinType = normalizeCoinType(pool.coinType);
  const sym = naviPoolSymbol(pool, coinType);

  if (supplyRaw > 0n) {
    out.push({
      protocol: "Navi",
      category: "lending",
      positionType: "supply",
      label: `Supply ${sym}`,
      objectId: null,
      valueUsd: null,
      source: "native",
      details: {
        coinType,
        value: supplyRaw.toString(),
        symbol: sym,
        assetId: pool.assetId,
        naviScaleDecimals: NAVI_BALANCE_SCALE_DECIMALS,
      },
    });
  }

  if (borrowRaw > 0n) {
    out.push({
      protocol: "Navi",
      category: "lending",
      positionType: "borrow",
      label: `Borrow ${sym}`,
      objectId: null,
      valueUsd: null,
      source: "native",
      details: {
        coinType,
        value: borrowRaw.toString(),
        symbol: sym,
        assetId: pool.assetId,
        naviScaleDecimals: NAVI_BALANCE_SCALE_DECIMALS,
      },
    });
  }

  return out;
}

/** Native NAVI supply/borrow via reserve balance tables (no BlockVision). */
export const nativeNaviAdapter: ProtocolPositionAdapter = {
  id: "native-navi",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    // One read of the user's held assetIds, then probe only those pools (and only
    // the side they use) — turns ~66 balance reads into a handful for most wallets.
    const { collaterals, loans } = await fetchHeldAssetIds(address);
    if (collaterals.size === 0 && loans.size === 0) return [];
    const heldPools = NAVI_MAINNET_POOLS.filter(
      (p) => collaterals.has(p.assetId) || loans.has(p.assetId),
    );

    return mapPoolsWithConcurrency(heldPools, async (pool) => {
      const needSupply = collaterals.has(pool.assetId);
      const needBorrow = loans.has(pool.assetId);
      const [supplyRaw, borrowRaw] = await Promise.all([
        needSupply ? fetchBalanceAtParent(pool.supplyBalanceParentId, address) : Promise.resolve(0n),
        needBorrow ? fetchBalanceAtParent(pool.borrowBalanceParentId, address) : Promise.resolve(0n),
      ]);
      if (supplyRaw === 0n && borrowRaw === 0n) return [];

      // The balance tables hold the scaled principal; apply the reserve index to
      // get the actual balance incl. accrued interest (e.g. USDC 587 -> 657).
      const { supplyIndex, borrowIndex } = await fetchReserveIndices(pool.assetId);
      const supplyActual = supplyIndex > 0n ? (supplyRaw * supplyIndex) / RAY : supplyRaw;
      const borrowActual = borrowIndex > 0n ? (borrowRaw * borrowIndex) / RAY : borrowRaw;
      return poolPositions(pool, supplyActual, borrowActual);
    });
  },
};

/** Debug: per-pool NAVI balances for a wallet. */
export async function inspectNativeNavi(address: string): Promise<{
  poolCount: number;
  nonZeroPools: number;
  supplyRows: number;
  borrowRows: number;
  positions: ResolvedPosition[];
}> {
  const positions = await nativeNaviAdapter.fetchPositions(address);
  const supplyRows = positions.filter((p) => p.positionType === "supply").length;
  const borrowRows = positions.filter((p) => p.positionType === "borrow").length;
  return {
    poolCount: NAVI_MAINNET_POOLS.length,
    nonZeroPools: new Set(positions.map((p) => p.details.assetId)).size,
    supplyRows,
    borrowRows,
    positions,
  };
}

export const NAVI_ACCOUNT_CAP_FILTER = {
  StructType: `${NAVI_ACCOUNT_CAP_PACKAGE}::account::AccountCap`,
};

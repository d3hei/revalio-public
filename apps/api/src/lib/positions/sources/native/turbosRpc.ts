import { mapWithConcurrency } from "../../../asyncPool.js";
import { normalizeCoinType } from "../../../coinType.js";
import { TURBOS_CLMM_PACKAGES } from "../../../protocols.js";
import { symbolFromCoinType } from "../../coinSymbol.js";
import type { PositionSource, ResolvedPosition } from "../../types.js";
import { getAmountByLiquidity } from "./clmmMath.js";
import type { CetusRpcDeps } from "./cetusRpc.js";
import * as rpc from "./rpcClient.js";
import type { SuiObjectData } from "./rpcClient.js";
import {
  isObjectId,
  parseI32,
  parseObjectId,
  parseTypeName,
  parseU128,
} from "./suiFields.js";

export type TurbosRpcDeps = CetusRpcDeps;

function productionDeps(): TurbosRpcDeps {
  return {
    fetchObject: (objectId) => rpc.fetchObject(objectId),
    fetchCoinDecimals: (coinType) => rpc.fetchCoinDecimals(coinType),
  };
}

function isTurbosNftType(type: string | null | undefined): boolean {
  if (!type) return false;
  return type.split("<")[0]?.trim().endsWith("::position_nft::TurbosPositionNFT") ?? false;
}

function isTurbosPositionType(type: string | null | undefined): boolean {
  if (!type) return false;
  return type.split("<")[0]?.trim().endsWith("::position_manager::Position") ?? false;
}

function isTurbosPoolType(type: string | null | undefined): boolean {
  if (!type) return false;
  const base = type.split("<")[0]?.trim() ?? "";
  if (!base.endsWith("::pool::Pool")) return false;
  return TURBOS_CLMM_PACKAGES.some((pkg) => base.startsWith(pkg));
}

/** Parse `Pool<CoinA, CoinB, FeeType>` generic coin types from a Move type string. */
export function parsePoolCoinTypes(type: string): { coinTypeA: string; coinTypeB: string } | null {
  const lt = type.indexOf("<");
  const gt = type.lastIndexOf(">");
  if (lt === -1 || gt <= lt) return null;

  const parts: string[] = [];
  const inner = type.slice(lt + 1, gt);
  let depth = 0;
  let start = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === "<") depth++;
    else if (ch === ">") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(inner.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(inner.slice(start).trim());
  if (parts.length < 2 || !parts[0]!.includes("::") || !parts[1]!.includes("::")) return null;
  return { coinTypeA: parts[0]!, coinTypeB: parts[1]! };
}

export function candidateTurbosIds(position: ResolvedPosition): string[] {
  const ids: string[] = [];
  if (isObjectId(position.objectId)) ids.push(position.objectId);
  if (isObjectId(position.details.position)) ids.push(String(position.details.position));
  if (isObjectId(position.details.pool)) ids.push(String(position.details.pool));
  return [...new Set(ids)];
}

export interface TurbosDecodeFailure {
  objectId: string;
  step: string;
  detail?: string | null;
}

export async function decodeTurbosClmmPositionWithDeps(
  position: ResolvedPosition,
  fetch: TurbosRpcDeps,
  failures?: TurbosDecodeFailure[],
): Promise<ResolvedPosition | null> {
  let poolIdHint = isObjectId(position.details.pool) ? String(position.details.pool) : null;
  let coinTypeAHint =
    typeof position.details.coinTypeA === "string" ? position.details.coinTypeA : null;
  let coinTypeBHint =
    typeof position.details.coinTypeB === "string" ? position.details.coinTypeB : null;

  for (const objectId of candidateTurbosIds(position)) {
    let obj = await fetch.fetchObject(objectId);
    if (!obj?.content?.fields) {
      failures?.push({ objectId, step: "no_content" });
      continue;
    }

    if (isTurbosNftType(obj.type)) {
      const fields = obj.content.fields;
      poolIdHint = parseObjectId(fields.pool_id) ?? poolIdHint;
      const linked = parseObjectId(fields.position_id);
      coinTypeAHint = parseTypeName(fields.coin_type_a) ?? coinTypeAHint;
      coinTypeBHint = parseTypeName(fields.coin_type_b) ?? coinTypeBHint;
      if (!linked) {
        failures?.push({ objectId, step: "nft_no_position_id" });
        continue;
      }
      obj = await fetch.fetchObject(linked);
      if (!obj?.content?.fields || !isTurbosPositionType(obj.type)) {
        failures?.push({
          objectId: linked,
          step: "linked_not_position",
          detail: obj?.type ?? null,
        });
        continue;
      }
    } else if (!isTurbosPositionType(obj.type)) {
      failures?.push({
        objectId,
        step: "not_position_type",
        detail: obj.type ?? null,
      });
      continue;
    }

    const fields = obj.content.fields;
    const poolId = poolIdHint ?? parseObjectId(position.details.pool);
    const tickLower =
      parseI32(fields.tick_lower_index) ??
      parseI32(fields.tick_lower) ??
      parseI32(fields.lower_tick_index);
    const tickUpper =
      parseI32(fields.tick_upper_index) ??
      parseI32(fields.tick_upper) ??
      parseI32(fields.upper_tick_index);
    const liquidity = parseU128(fields.liquidity);

    if (!poolId) failures?.push({ objectId: obj.objectId, step: "missing_pool_id" });
    if (tickLower === null) failures?.push({ objectId: obj.objectId, step: "missing_tick_lower" });
    if (tickUpper === null) failures?.push({ objectId: obj.objectId, step: "missing_tick_upper" });
    if (liquidity === null || liquidity === 0n) {
      failures?.push({
        objectId: obj.objectId,
        step: "missing_liquidity",
        detail: liquidity === null ? "unparsed" : "zero",
      });
    }

    if (
      !poolId ||
      tickLower === null ||
      tickUpper === null ||
      liquidity === null ||
      liquidity === 0n
    ) {
      continue;
    }

    const poolObj = await fetch.fetchObject(poolId);
    if (!poolObj?.content?.fields || !isTurbosPoolType(poolObj.type)) {
      failures?.push({
        objectId: poolId,
        step: "pool_fetch_failed",
        detail: poolObj?.type ?? null,
      });
      continue;
    }

    const poolFields = poolObj.content.fields;
    const currentSqrtPrice =
      parseU128(poolFields.sqrt_price) ??
      parseU128(poolFields.current_sqrt_price) ??
      parseU128(poolFields.sqrt_price_x64);
    const currentTick =
      parseI32(poolFields.tick_current_index) ??
      parseI32(poolFields.current_tick_index) ??
      parseI32(poolFields.tick_index);

    const fromPoolType = poolObj.type ? parsePoolCoinTypes(poolObj.type) : null;
    const coinTypeA = coinTypeAHint ?? fromPoolType?.coinTypeA ?? null;
    const coinTypeB = coinTypeBHint ?? fromPoolType?.coinTypeB ?? null;

    if (!coinTypeA || !coinTypeB) {
      failures?.push({ objectId: poolId, step: "missing_coin_types" });
      continue;
    }
    if (currentSqrtPrice === null || currentTick === null) {
      failures?.push({ objectId: poolId, step: "missing_pool_price_state" });
      continue;
    }

    const { amountA, amountB } = getAmountByLiquidity(
      tickLower,
      tickUpper,
      currentTick,
      currentSqrtPrice,
      liquidity,
    );

    const normalizedA = normalizeCoinType(coinTypeA);
    const normalizedB = normalizeCoinType(coinTypeB);
    const [decA, decB] = await Promise.all([
      fetch.fetchCoinDecimals(normalizedA),
      fetch.fetchCoinDecimals(normalizedB),
    ]);

    const symA = symbolFromCoinType(normalizedA);
    const symB = symbolFromCoinType(normalizedB);
    const label = symA && symB ? `CLMM ${symA}+${symB}` : position.label;

    return {
      ...position,
      protocol: "Turbos",
      positionType: "clmm_lp",
      label,
      objectId: obj.objectId,
      source: "native",
      valueUsd: null,
      details: {
        ...position.details,
        position: obj.objectId,
        pool: poolId,
        liquidity: liquidity.toString(),
        balanceA: amountA.toString(),
        balanceB: amountB.toString(),
        coinTypeA: normalizedA,
        coinTypeB: normalizedB,
        coinTypeADecimals: decA,
        coinTypeBDecimals: decB,
        tickLower,
        tickUpper,
        currentTick,
        currentSqrtPrice: currentSqrtPrice.toString(),
      },
    };
  }

  return null;
}

function needsNativeDecode(position: ResolvedPosition): boolean {
  return (
    position.protocol === "Turbos" &&
    position.category === "amm_lp" &&
    position.details.balanceA === undefined &&
    position.details.balanceB === undefined
  );
}

/** Enrich weak RPC Turbos LP rows with on-chain CLMM math. */
export async function enrichTurbosNativePositions(
  positions: ResolvedPosition[],
  deps: TurbosRpcDeps = productionDeps(),
): Promise<ResolvedPosition[]> {
  const targets = positions.filter(needsNativeDecode);
  if (targets.length === 0) return positions;

  const decoded = new Map<ResolvedPosition, ResolvedPosition>();
  const rows = await mapWithConcurrency(targets, 8, async (p) =>
    decodeTurbosClmmPositionWithDeps(p, deps),
  );
  for (let i = 0; i < targets.length; i++) {
    const row = rows[i];
    if (row) decoded.set(targets[i]!, row);
  }

  if (decoded.size === 0) return positions;
  return positions.map((p) => decoded.get(p) ?? p);
}

export async function inspectNativeTurbosDecode(
  position: ResolvedPosition,
): Promise<{
  attemptedIds: string[];
  objectTypes: { objectId: string; type: string | null }[];
  decoded: boolean;
  source: PositionSource | null;
  balanceA: string | null;
  balanceB: string | null;
  coinTypeA: string | null;
  coinTypeB: string | null;
  valueUsd: number | null;
  failures: TurbosDecodeFailure[];
}> {
  const fetch = productionDeps();
  const attemptedIds = candidateTurbosIds(position);
  const failures: TurbosDecodeFailure[] = [];
  const objectTypes = await Promise.all(
    attemptedIds.map(async (objectId) => {
      const obj = await fetch.fetchObject(objectId);
      return { objectId, type: obj?.type ?? null };
    }),
  );
  const row = await decodeTurbosClmmPositionWithDeps(position, fetch, failures);
  if (!row) {
    return {
      attemptedIds,
      objectTypes,
      decoded: false,
      source: null,
      balanceA: null,
      balanceB: null,
      coinTypeA: null,
      coinTypeB: null,
      valueUsd: null,
      failures,
    };
  }
  return {
    attemptedIds,
    objectTypes,
    decoded: true,
    source: row.source,
    balanceA: row.details.balanceA != null ? String(row.details.balanceA) : null,
    balanceB: row.details.balanceB != null ? String(row.details.balanceB) : null,
    coinTypeA: typeof row.details.coinTypeA === "string" ? row.details.coinTypeA : null,
    coinTypeB: typeof row.details.coinTypeB === "string" ? row.details.coinTypeB : null,
    valueUsd: row.valueUsd,
    failures,
  };
}

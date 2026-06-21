import { mapWithConcurrency } from "../../../asyncPool.js";
import { normalizeCoinType } from "../../../coinType.js";
import { symbolFromCoinType } from "../../coinSymbol.js";
import type { PositionSource, ResolvedPosition } from "../../types.js";
import { getAmountByLiquidity } from "./clmmMath.js";
import * as rpc from "./rpcClient.js";
import type { SuiObjectData } from "./rpcClient.js";
import {
  isCetusPositionType,
  isObjectId,
  parseI32,
  parseObjectId,
  parseTypeName,
  parseU128,
} from "./suiFields.js";

export type CetusRpcDeps = {
  fetchObject: (objectId: string) => Promise<SuiObjectData | null>;
  fetchCoinDecimals: (coinType: string) => Promise<number | undefined>;
};

function productionDeps(): CetusRpcDeps {
  return {
    fetchObject: (objectId) => rpc.fetchObject(objectId),
    fetchCoinDecimals: (coinType) => rpc.fetchCoinDecimals(coinType),
  };
}

function isCetusWrappedPositionType(type: string | null | undefined): boolean {
  if (!type) return false;
  return type.split("<")[0]?.trim().endsWith("::pool::WrappedPositionNFT") ?? false;
}

export function candidatePositionIds(position: ResolvedPosition): string[] {
  const ids: string[] = [];
  if (isObjectId(position.objectId)) ids.push(position.objectId);
  if (isObjectId(position.details.position)) ids.push(String(position.details.position));
  if (isObjectId(position.details.pool)) ids.push(String(position.details.pool));
  return [...new Set(ids)];
}

function isCetusPoolType(type: string | null | undefined): boolean {
  if (!type) return false;
  return type.split("<")[0]?.trim().endsWith("::pool::Pool") ?? false;
}

export interface CetusDecodeFailure {
  objectId: string;
  step: string;
  detail?: string | null;
}

function linkedPositionId(fields: Record<string, unknown>): string | null {
  return (
    parseObjectId(fields.position_id) ??
    parseObjectId(fields.position) ??
    parseObjectId(fields.pool)
  );
}

export async function decodeCetusClmmPositionWithDeps(
  position: ResolvedPosition,
  fetch: CetusRpcDeps,
  failures?: CetusDecodeFailure[],
): Promise<ResolvedPosition | null> {
  for (const objectId of candidatePositionIds(position)) {
    let obj = await fetch.fetchObject(objectId);
    if (!obj?.content?.fields) {
      failures?.push({ objectId, step: "no_content" });
      continue;
    }

    if (isCetusWrappedPositionType(obj.type)) {
      const linked = linkedPositionId(obj.content.fields);
      if (!linked) {
        failures?.push({ objectId, step: "wrapped_no_position_link" });
        continue;
      }
      obj = await fetch.fetchObject(linked);
      if (!obj?.content?.fields || !isCetusPositionType(obj.type)) {
        failures?.push({
          objectId: linked,
          step: "linked_not_position",
          detail: obj?.type ?? null,
        });
        continue;
      }
    } else if (!isCetusPositionType(obj.type)) {
      failures?.push({
        objectId,
        step: "not_position_type",
        detail: obj.type ?? null,
      });
      continue;
    }

    const fields = obj.content.fields;
    const poolId = parseObjectId(fields.pool);
    const tickLower =
      parseI32(fields.tick_lower_index) ??
      parseI32(fields.tick_lower) ??
      parseI32(fields.lower_tick_index);
    const tickUpper =
      parseI32(fields.tick_upper_index) ??
      parseI32(fields.tick_upper) ??
      parseI32(fields.upper_tick_index);
    const liquidity = parseU128(fields.liquidity);
    const coinTypeA = parseTypeName(fields.coin_type_a);
    const coinTypeB = parseTypeName(fields.coin_type_b);

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
    if (!coinTypeA || !coinTypeB) {
      failures?.push({ objectId: obj.objectId, step: "missing_coin_types" });
    }

    if (
      !poolId ||
      tickLower === null ||
      tickUpper === null ||
      liquidity === null ||
      !coinTypeA ||
      !coinTypeB
    ) {
      continue;
    }

    // A valid but closed position (all liquidity withdrawn) holds nothing. Value
    // it explicitly at $0 instead of leaving valueUsd null — otherwise the
    // payload's holdings fallback (positionsPayload.ts) treats the unpriced LP as
    // "needs estimate" and assigns it the wallet's ENTIRE token holdings,
    // producing absurd values (e.g. $587k on a closed USDC/SUI position).
    if (liquidity === 0n) {
      const nA = normalizeCoinType(coinTypeA);
      const nB = normalizeCoinType(coinTypeB);
      const sa = symbolFromCoinType(nA);
      const sb = symbolFromCoinType(nB);
      return {
        ...position,
        positionType: "clmm_lp",
        label: sa && sb ? `CLMM ${sa}+${sb}` : position.label,
        objectId: obj.objectId,
        source: "native",
        valueUsd: 0,
        details: {
          ...position.details,
          position: obj.objectId,
          pool: poolId,
          liquidity: "0",
          balanceA: "0",
          balanceB: "0",
          coinTypeA: nA,
          coinTypeB: nB,
        },
      };
    }

    const poolObj = await fetch.fetchObject(poolId);
    if (!poolObj?.content?.fields || !isCetusPoolType(poolObj.type)) {
      failures?.push({
        objectId: poolId,
        step: "pool_fetch_failed",
        detail: poolObj?.type ?? null,
      });
      continue;
    }

    const poolFields = poolObj.content.fields;
    const currentSqrtPrice =
      parseU128(poolFields.current_sqrt_price) ?? parseU128(poolFields.sqrt_price);
    const currentTick =
      parseI32(poolFields.current_tick_index) ?? parseI32(poolFields.tick_index);
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
    const label =
      symA && symB
        ? `CLMM ${symA}+${symB}`
        : typeof fields.name === "string"
          ? fields.name
          : position.label;

    return {
      ...position,
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
    position.protocol === "Cetus" &&
    position.category === "amm_lp" &&
    position.details.balanceA === undefined &&
    position.details.balanceB === undefined
  );
}

/** Enrich weak RPC Cetus LP rows with on-chain CLMM math (BlockVision fallback). */
export async function enrichCetusNativePositions(
  positions: ResolvedPosition[],
  deps: CetusRpcDeps = productionDeps(),
): Promise<ResolvedPosition[]> {
  const targets = positions.filter(needsNativeDecode);
  if (targets.length === 0) return positions;

  const fetch = deps;
  const decoded = new Map<ResolvedPosition, ResolvedPosition>();
  const rows = await mapWithConcurrency(targets, 8, async (p) =>
    decodeCetusClmmPositionWithDeps(p, fetch),
  );
  for (let i = 0; i < targets.length; i++) {
    const row = rows[i];
    if (row) decoded.set(targets[i]!, row);
  }

  if (decoded.size === 0) return positions;
  return positions.map((p) => decoded.get(p) ?? p);
}

/** Debug: try native CLMM decode for one RPC placeholder row. */
export async function inspectNativeCetusDecode(
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
  failures: CetusDecodeFailure[];
}> {
  const fetch = productionDeps();
  const attemptedIds = candidatePositionIds(position);
  const failures: CetusDecodeFailure[] = [];
  const objectTypes = await Promise.all(
    attemptedIds.map(async (objectId) => {
      const obj = await fetch.fetchObject(objectId);
      return { objectId, type: obj?.type ?? null };
    }),
  );
  const row = await decodeCetusClmmPositionWithDeps(position, fetch, failures);
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

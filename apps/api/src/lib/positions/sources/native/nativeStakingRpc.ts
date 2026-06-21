import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import { enrichPositionsWithPrices } from "../../positionValuation.js";
import type { ResolvedPosition } from "../../types.js";
import { fetchOwnedObjectsByFilter, type SuiObjectData } from "./rpcClient.js";
import { parseObjectId, parseU128 } from "./suiFields.js";

/** Sui system package — `StakedSui` is stable across network upgrades. */
export const STAKED_SUI_STRUCT =
  "0x3::staking_pool::StakedSui";

export function isStakedSuiType(type: string | null | undefined): boolean {
  if (!type) return false;
  const base = type.split("<")[0]?.trim() ?? "";
  return base.endsWith("::staking_pool::StakedSui");
}

export function parseStakedSuiFields(
  fields: Record<string, unknown>,
): { poolId: string | null; activationEpoch: number | null; principal: bigint } | null {
  const principal = parseU128(fields.principal) ?? 0n;
  if (principal <= 0n) return null;

  const poolId =
    parseObjectId(fields.pool_id) ??
    parseObjectId(fields.poolId) ??
    parseObjectId(fields.stake_pool_id);

  let activationEpoch: number | null = null;
  for (const key of ["stake_activation_epoch", "activationEpoch", "stakeActivationEpoch"]) {
    const raw = fields[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      activationEpoch = Math.trunc(raw);
      break;
    }
    if (typeof raw === "string" && raw.length > 0) {
      const n = Number(raw);
      if (Number.isFinite(n)) {
        activationEpoch = Math.trunc(n);
        break;
      }
    }
  }

  return { poolId, activationEpoch, principal };
}

function decodeStakedSui(obj: SuiObjectData): ResolvedPosition | null {
  if (!obj.content?.fields || !isStakedSuiType(obj.type)) return null;
  const parsed = parseStakedSuiFields(obj.content.fields);
  if (!parsed) return null;

  return {
    protocol: "sui-system",
    category: "staking",
    positionType: "native-staking",
    label: "Sui Staking",
    objectId: obj.objectId,
    valueUsd: null,
    source: "native",
    details: {
      poolId: parsed.poolId,
      activationEpoch: parsed.activationEpoch,
      principal: parsed.principal.toString(),
    },
  };
}

/** Native Sui staking via owned `StakedSui` objects (mainnet RPC, no indexer). */
export const nativeStakingAdapter: ProtocolPositionAdapter = {
  id: "native-staking",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const objects = await fetchOwnedObjectsByFilter(address, {
      StructType: STAKED_SUI_STRUCT,
    });
    const out: ResolvedPosition[] = [];
    for (const obj of objects) {
      const row = decodeStakedSui(obj);
      if (row) out.push(row);
    }
    return out;
  },
};

/** Debug: native `StakedSui` discovery summary. */
export async function inspectNativeStaking(address: string): Promise<{
  stakedObjects: number;
  totalPrincipalMist: string;
  positions: ResolvedPosition[];
}> {
  const raw = await nativeStakingAdapter.fetchPositions(address);
  const positions = await enrichPositionsWithPrices(raw);
  let total = 0n;
  for (const p of positions) {
    const principal = parseU128(p.details.principal) ?? 0n;
    total += principal;
  }
  return {
    stakedObjects: positions.length,
    totalPrincipalMist: total.toString(),
    positions,
  };
}

/** Sum staked principal (MIST) from resolved positions. */
export function sumNativeStakingPrincipal(positions: ResolvedPosition[]): bigint {
  let total = 0n;
  for (const p of positions) {
    if (p.positionType !== "native-staking") continue;
    total += parseU128(p.details.principal) ?? 0n;
  }
  return total;
}

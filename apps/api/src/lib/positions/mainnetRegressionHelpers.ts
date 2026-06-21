import type { DefiPosition } from "../defiPositions.js";
import { discoverOwnedByLabelPrefix } from "../defiPositions.js";
import type { ProtocolScope } from "./resolve.js";
import { mergePositions, resolveProtocolPositionsLite } from "./resolve.js";
import { enrichCetusNativePositions, inspectNativeCetusDecode } from "./sources/native/cetusRpc.js";
import { enrichPositionsWithPrices } from "./positionValuation.js";
import type { ResolvedPosition } from "./types.js";
import { rpcOwnedAdapter } from "./sources/rpcOwned.js";

function sumUsd(positions: ResolvedPosition[]): number {
  return positions.reduce((s, p) => s + (p.valueUsd ?? 0), 0);
}

function defiToResolved(row: DefiPosition): ResolvedPosition {
  return {
    protocol: row.protocol,
    category: row.category,
    positionType: row.positionType,
    label: row.label,
    objectId: row.objectId,
    details: row.details,
    valueUsd: row.valueUsd,
    source: "rpc",
  };
}

/** Protocol-scoped resolve — skips unrelated adapters (NAVI 32-pool scan, Scallop, etc.). */
export async function resolveProtocolPositionsUsd(
  address: string,
  protocol: ProtocolScope,
): Promise<number> {
  const priced = await resolveProtocolPositionsLite(address, protocol);
  return sumUsd(priced);
}

async function decodeCetusSample(
  rows: ResolvedPosition[],
  sampleSize: number,
): Promise<{ decodedCount: number; sampleUsd: number }> {
  const merged = mergePositions([rows]);
  const sample = merged.slice(0, sampleSize);
  let enriched = mergePositions([await enrichCetusNativePositions(sample)]);
  let decodedCount = enriched.filter((p) => p.details.balanceA != null).length;

  if (decodedCount > 0) {
    const priced = await enrichPositionsWithPrices(enriched);
    const sampleUsd = sumUsd(priced.filter((p) => (p.valueUsd ?? 0) > 0));
    return { decodedCount, sampleUsd };
  }

  for (const row of sample) {
    const direct = await inspectNativeCetusDecode(row);
    if (direct.decoded) {
      const priced = await enrichPositionsWithPrices([
        {
          ...row,
          details: {
            ...row.details,
            balanceA: direct.balanceA,
            balanceB: direct.balanceB,
            coinTypeA: direct.coinTypeA,
            coinTypeB: direct.coinTypeB,
          },
          valueUsd: direct.valueUsd,
          source: direct.source ?? "native",
        },
      ]);
      return { decodedCount: 1, sampleUsd: sumUsd(priced) };
    }
  }

  return { decodedCount: 0, sampleUsd: 0 };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/** Cetus whale: discover LPs (Cetus-only filters) or decode a known sample position. */
export async function cetusWhaleSmoke(
  address: string,
  options?: { sampleSize?: number },
): Promise<{
  discovered: number;
  decodedCount: number;
  sampleUsd: number;
  usedFallback: boolean;
}> {
  const sampleSize = options?.sampleSize ?? 3;
  let usedFallback = false;

  async function loadCetusRows(): Promise<ResolvedPosition[]> {
    const discovered = await discoverOwnedByLabelPrefix(address, "cetus");
    if (discovered.length > 0) return discovered.map(defiToResolved);

    const owned = await rpcOwnedAdapter.fetchPositions(address);
    const fromOwned = owned.filter((p) => p.protocol === "Cetus" && p.category === "amm_lp");
    if (fromOwned.length > 0) return fromOwned;

    await sleep(2_000);
    const retry = await discoverOwnedByLabelPrefix(address, "cetus");
    if (retry.length > 0) return retry.map(defiToResolved);

    usedFallback = true;
    return [];
  }

  let cetusRows = await loadCetusRows();
  const discoveredCount = cetusRows.length;

  const retryDelaysMs = [0, 2_000, 4_000, 6_000];
  let result = { decodedCount: 0, sampleUsd: 0 };
  for (const delay of retryDelaysMs) {
    if (delay > 0) await sleep(delay);
    if (cetusRows.length === 0) {
      cetusRows = await loadCetusRows();
    }
    if (cetusRows.length === 0) continue;

    result = await decodeCetusSample(cetusRows, sampleSize);
    if (result.decodedCount > 0) break;

    if (cetusRows.length > sampleSize) {
      result = await decodeCetusSample(cetusRows, Math.min(cetusRows.length, 10));
      if (result.decodedCount > 0) break;
    }
  }

  return {
    discovered: discoveredCount,
    decodedCount: result.decodedCount,
    sampleUsd: result.sampleUsd,
    usedFallback,
  };
}

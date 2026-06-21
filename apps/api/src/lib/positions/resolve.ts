import type { ProtocolPositionAdapter } from "./adapters/types.js";
import { enrichPositionsWithPrices } from "./positionValuation.js";
import { blockvisionCetusAdapter } from "./sources/blockvision/cetusAdapter.js";
import {
  cetusPayloadHasRows,
  fetchDefiPortfolio,
  isBlockVisionConfigured,
} from "./sources/blockvision/client.js";
import { blockvisionNaviAdapter } from "./sources/blockvision/naviAdapter.js";
import { blockvisionScallopAdapter } from "./sources/blockvision/scallopAdapter.js";
import { enrichCetusNativePositions } from "./sources/native/cetusRpc.js";
import { enrichTurbosNativePositions } from "./sources/native/turbosRpc.js";
import { nativeNaviAdapter } from "./sources/native/naviRpc.js";
import { nativeScallopAdapter } from "./sources/native/scallopRpc.js";
import { nativeScallopScoinAdapter } from "./sources/native/scallopScoinAdapter.js";
import { nativeStakingAdapter } from "./sources/native/nativeStakingRpc.js";
import { nativeEmberAdapter } from "./sources/native/emberRpc.js";
import { nativeBluefinPerpsAdapter } from "./sources/native/bluefinPerpsRpc.js";
import { nativeBucketAdapter } from "./sources/native/bucketRpc.js";
import { nativeHaedalAdapter } from "./sources/native/haedalRpc.js";
import { nativeAlphaLendAdapter } from "./sources/native/alphaLendRpc.js";
import { nativeDeepbookMarginAdapter } from "./sources/native/deepbookMarginRpc.js";
import { nativeMomentumAdapter } from "./sources/native/momentumRpc.js";
import { nativeSuilendAdapter } from "./sources/native/suilendRpc.js";
import { dropScallopVeScaPositions } from "./scallopVeSca.js";
import { rpcOwnedAdapter } from "./sources/rpcOwned.js";
import type { ResolvedPosition } from "./types.js";
import { normalizeDetailsCoinTypes } from "../coinType.js";
import { config } from "../../config.js";

function buildAdapters(): ProtocolPositionAdapter[] {
  const adapters: ProtocolPositionAdapter[] = [
    rpcOwnedAdapter,
    nativeStakingAdapter,
    nativeNaviAdapter,
    nativeScallopScoinAdapter,
    nativeScallopAdapter,
    nativeSuilendAdapter,
    nativeEmberAdapter,
    nativeBluefinPerpsAdapter,
    nativeBucketAdapter,
    nativeHaedalAdapter,
    nativeAlphaLendAdapter,
    nativeDeepbookMarginAdapter,
    nativeMomentumAdapter,
  ];

  if (!isBlockVisionConfigured()) return adapters;

  const enabled = new Set(config.blockvision.protocols);
  if (enabled.has("cetus")) adapters.push(blockvisionCetusAdapter);
  if (enabled.has("navi")) adapters.push(blockvisionNaviAdapter);
  if (enabled.has("scallop")) adapters.push(blockvisionScallopAdapter);

  return adapters;
}

function positionKey(p: ResolvedPosition): string {
  const linked =
    typeof p.details.pool === "string" && /^0x[0-9a-fA-F]{64}$/.test(p.details.pool)
      ? p.details.pool
      : null;
  if (linked) return `id:${linked}`;

  const coinType = typeof p.details.coinType === "string" ? p.details.coinType : "";
  if (p.objectId && coinType) {
    return `id:${p.objectId}:${p.positionType}:${coinType}`;
  }

  if (p.objectId) return `id:${p.objectId}`;
  return `anon:${p.protocol}:${p.category}:${p.positionType}:${p.label}`;
}

/** Merge rows from multiple adapters; prefer richer USD + BlockVision enrichment on ties. */
export function mergePositions(lists: ResolvedPosition[][]): ResolvedPosition[] {
  const byKey = new Map<string, ResolvedPosition>();

  for (const p of lists.flat()) {
    const key = positionKey(p);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, p);
      continue;
    }

    const existingUsd = existing.valueUsd ?? -1;
    const nextUsd = p.valueUsd ?? -1;
    if (nextUsd > existingUsd) {
      byKey.set(key, p);
      continue;
    }
    if (
      nextUsd === existingUsd &&
      (p.source === "blockvision" || p.source === "native") &&
      (existing.source === "rpc" || existing.source === "blockvision")
    ) {
      byKey.set(key, {
        ...existing,
        ...p,
        details: { ...existing.details, ...p.details },
        valueUsd: p.valueUsd ?? existing.valueUsd,
        source: p.source,
      });
    }
  }

  return [...byKey.values()];
}

/** RPC placeholder rows (NFT / liquidity only) when a richer LP source exists. */
function dropWeakRpcPlaceholders(positions: ResolvedPosition[]): ResolvedPosition[] {
  const hasRichLp = positions.some(
    (p) =>
      (p.source === "blockvision" || p.source === "native") &&
      p.category === "amm_lp" &&
      p.details.balanceA,
  );
  if (!hasRichLp) return positions;
  return positions.filter(
    (p) =>
      !(
        p.source === "rpc" &&
        p.category === "amm_lp" &&
        p.details.balanceA === undefined &&
        p.details.balanceB === undefined
      ),
  );
}

function dropWeakRpcLendingPlaceholders(positions: ResolvedPosition[]): ResolvedPosition[] {
  // A bare rpc-owned lending cap is only a redundant duplicate when a richer
  // (native/blockvision) lending row already covers that protocol. Detection-only
  // protocols (e.g. AlphaFi/AlphaLend) have no such row, so their owned cap is the
  // sole evidence of the position and must be kept.
  const richLendingProtocols = new Set(
    positions
      .filter(
        (p) =>
          (p.source === "native" || p.source === "blockvision") && p.category === "lending",
      )
      .map((p) => p.protocol),
  );
  // Owned-cap lending detections now fully covered by a dedicated native valuation
  // adapter: AlphaLend (PositionCap, registered under protocol "AlphaFi"/category
  // "lending"; the vaults are category "vault" so they are untouched) and DeepBook
  // Margin (SupplierCap). When the position holds funds the native row carries the
  // USD value; when it was withdrawn the native adapter emits nothing, so the bare
  // rpc placeholder is just an empty "$—" row — always drop it.
  const nativeValuedLendingCaps = new Set(["AlphaFi", "DeepBook"]);
  return positions.filter((p) => {
    if (p.source !== "rpc" || p.category !== "lending") return true;
    if (p.valueUsd !== null && Number.isFinite(p.valueUsd)) return true;
    if (typeof p.details.coinType === "string") return true;
    if (p.details.value != null || p.details.amount != null) return true;
    if (nativeValuedLendingCaps.has(p.protocol)) return false;
    return !richLendingProtocols.has(p.protocol);
  });
}

function dropPhantomLendingRows(positions: ResolvedPosition[]): ResolvedPosition[] {
  return positions.filter((p) => {
    if (p.protocol !== "Navi" || p.positionType !== "borrow") return true;
    const amount = Math.abs(Number(p.details.value ?? 0));
    return amount >= 0.01;
  });
}

/** If BlockVision missed, retry Cetus once (reads Redis cache; does not bust it). */
async function retryBlockvisionCetus(
  address: string,
  merged: ResolvedPosition[],
): Promise<ResolvedPosition[]> {
  if (!isBlockVisionConfigured()) return merged;
  if (!config.blockvision.protocols.includes("cetus")) return merged;
  if (merged.some((p) => p.source === "blockvision")) return merged;

  const rows = await blockvisionCetusAdapter.fetchPositions(address);
  if (rows.length === 0) return merged;
  return mergePositions([merged, rows]);
}

export type ProtocolScope =
  | "Navi"
  | "Turbos"
  | "Cetus"
  | "Scallop"
  | "Suilend"
  | "Ember"
  | "sui-system";

/** Fast protocol-scoped resolve (merge + native enrich + drop weak RPC duplicates). */
export async function resolveProtocolPositionsLite(
  address: string,
  protocol: ProtocolScope,
): Promise<ResolvedPosition[]> {
  if (protocol === "Navi") {
    const rows = await nativeNaviAdapter.fetchPositions(address);
    return enrichPositionsWithPrices(rows);
  }
  if (protocol === "Scallop") {
    const { fetchScallopScoinSupplyPositions } = await import(
      "./sources/native/scallopScoin.js"
    );
    const [obligationRows, scoinRows] = await Promise.all([
      nativeScallopAdapter.fetchPositions(address),
      fetchScallopScoinSupplyPositions(address),
    ]);
    return enrichPositionsWithPrices([...scoinRows, ...obligationRows]);
  }
  if (protocol === "Suilend") {
    const rows = await nativeSuilendAdapter.fetchPositions(address);
    return enrichPositionsWithPrices(rows);
  }
  if (protocol === "Ember") {
    const rows = await nativeEmberAdapter.fetchPositions(address);
    return enrichPositionsWithPrices(rows);
  }
  if (protocol === "sui-system") {
    const rows = await nativeStakingAdapter.fetchPositions(address);
    return enrichPositionsWithPrices(rows);
  }

  const owned = await rpcOwnedAdapter.fetchPositions(address);
  let rows = mergePositions([owned.filter((p) => p.protocol === protocol)]);
  if (protocol === "Cetus") rows = await enrichCetusNativePositions(rows);
  if (protocol === "Turbos") rows = await enrichTurbosNativePositions(rows);
  rows = mergePositions([rows]);
  rows = dropWeakRpcPlaceholders(rows);
  return enrichPositionsWithPrices(rows);
}

/** Resolve all DeFi positions for a wallet via registered protocol adapters. */
const NATIVE_ADAPTER_TIMEOUT_MS: Record<string, number> = {
  "native-staking": 4_000,
  "native-navi": 4_000,
  "native-scallop-scoin": 10_000,
  "native-scallop": 6_000,
  "native-suilend": 10_000,
  "native-ember": 5_000,
  // New native decoders each make multiple sequential RPC phases (owned scan ->
  // shared-storage reads -> price fetch). On the 5s default a transient retry
  // burst silently drops the whole adapter result ([]), hiding verified rows.
  "native-bluefin-perps": 8_000,
  "native-bucket": 8_000,
  "native-haedal": 6_000,
  "native-alphalend": 10_000,
  "native-deepbook-margin": 10_000,
  "native-momentum": 8_000,
};

async function fetchNativeAdapterPositions(
  adapter: ProtocolPositionAdapter,
  address: string,
): Promise<ResolvedPosition[]> {
  const ms = NATIVE_ADAPTER_TIMEOUT_MS[adapter.id] ?? 5_000;
  try {
    return await Promise.race([
      adapter.fetchPositions(address),
      new Promise<ResolvedPosition[]>((resolve) => {
        setTimeout(() => resolve([]), ms);
      }),
    ]);
  } catch {
    return [];
  }
}

export async function resolveDefiPositions(address: string): Promise<ResolvedPosition[]> {
  const adapters = buildAdapters();
  const otherAdapters = adapters.filter((a) => a.id !== "rpc-owned");

  // Run rpc-owned scan alongside native adapters so slow RPC does not eat adapter timeouts.
  const [rpcList, ...nativeLists] = await Promise.all([
    rpcOwnedAdapter.fetchPositions(address),
    ...otherAdapters.map((a) => fetchNativeAdapterPositions(a, address)),
  ]);

  const lists: ResolvedPosition[][] = [rpcList, ...nativeLists];

  let merged = mergePositions(lists);
  try {
    merged = await retryBlockvisionCetus(address, merged);
    merged = await enrichCetusNativePositions(merged);
    merged = await enrichTurbosNativePositions(merged);
    merged = mergePositions([merged]);
    merged = dropWeakRpcPlaceholders(merged);
    const enriched = await enrichPositionsWithPrices(merged);
    return dropScallopVeScaPositions(
      dropPhantomLendingRows(
        dropWeakRpcLendingPlaceholders(
          enriched.map((p) => ({
            ...p,
            details: normalizeDetailsCoinTypes(p.details),
          })),
        ),
      ),
    );
  } catch {
    return dropScallopVeScaPositions(
      dropPhantomLendingRows(
        dropWeakRpcLendingPlaceholders(
          merged.map((p) => ({
            ...p,
            details: normalizeDetailsCoinTypes(p.details),
          })),
        ),
      ),
    );
  }
}

/** Debug: BlockVision Cetus response metadata (no secrets). Uses cache unless bustCache=true. */
export async function inspectBlockvisionStatus(
  address: string,
  options?: { bustCache?: boolean },
): Promise<{ configured: boolean; code?: number; message?: string; hasRows: boolean }> {
  if (!isBlockVisionConfigured()) {
    return { configured: false, hasRows: false };
  }
  const envelope = await fetchDefiPortfolio(address, "cetus", {
    bustCache: options?.bustCache === true,
  });
  return {
    configured: true,
    code: envelope?.code,
    message: envelope?.message,
    hasRows: envelope ? cetusPayloadHasRows(envelope.result) : false,
  };
}

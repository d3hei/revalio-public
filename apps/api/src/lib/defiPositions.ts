import { config } from "../config.js";
import { fetchJson } from "./http.js";
import { normalizeCoinType } from "./coinType.js";
import {
  baseType,
  classifyType,
  listOwnedObjectFilters,
  type PositionCategory,
} from "./protocols.js";
import { parseStakedSuiFields } from "./positions/sources/native/nativeStakingRpc.js";

export interface DefiPosition {
  protocol: string;
  category: PositionCategory;
  positionType: string;
  label: string;
  objectId: string | null;
  details: Record<string, unknown>;
  valueUsd: number | null;
}

interface OwnedObject {
  data?: {
    objectId: string;
    type?: string;
    content?: { fields?: Record<string, unknown> };
  };
  error?: unknown;
}

interface GetOwnedObjectsResult {
  result?: {
    data?: OwnedObject[];
    hasNextPage?: boolean;
    nextCursor?: string | null;
  };
  error?: unknown;
}

interface GetAllBalancesResult {
  result?: { coinType: string; totalBalance: string }[];
  error?: unknown;
}

interface ObjectQuery {
  filter?: Record<string, unknown>;
  options: { showType: boolean; showContent: boolean };
}

const OBJECT_ID_RE = /^0x[0-9a-fA-F]{64}$/;

function parseObjectIdField(value: unknown): string | null {
  if (typeof value === "string" && OBJECT_ID_RE.test(value)) return value;
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.id === "string" && OBJECT_ID_RE.test(obj.id)) return obj.id;
  const fields = obj.fields as Record<string, unknown> | undefined;
  if (fields && typeof fields.id === "string" && OBJECT_ID_RE.test(fields.id)) return fields.id;
  const nested = fields?.id as Record<string, unknown> | undefined;
  if (nested && typeof nested.id === "string" && OBJECT_ID_RE.test(nested.id)) return nested.id;
  return null;
}

const PAGE_LIMIT = 50;
const MAX_PAGES = 8;
const FILTER_MAX_PAGES = 4;
const RPC_TIMEOUT_MS = 15_000;
const DEBUG_MAX_PAGES = 40;

function defiRpcUrls(): string[] {
  return [...new Set([config.sui.defiRpcUrl, ...config.sui.defiRpcFallbacks])];
}

async function rpcCall<T>(rpcUrl: string, body: unknown): Promise<T> {
  return fetchJson<T>(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    timeoutMs: RPC_TIMEOUT_MS,
    retries: 2,
  });
}

async function getOwnedObjectsPage(
  rpcUrl: string,
  address: string,
  cursor: string | null,
  query: ObjectQuery,
): Promise<GetOwnedObjectsResult> {
  return rpcCall<GetOwnedObjectsResult>(rpcUrl, {
    jsonrpc: "2.0",
    id: 1,
    method: "suix_getOwnedObjects",
    params: [address, query, cursor, PAGE_LIMIT],
  });
}

async function getAllBalances(rpcUrl: string, address: string): Promise<GetAllBalancesResult> {
  return rpcCall<GetAllBalancesResult>(rpcUrl, {
    jsonrpc: "2.0",
    id: 1,
    method: "suix_getAllBalances",
    params: [address],
  });
}

function extractDetails(
  category: PositionCategory,
  fields: Record<string, unknown> | undefined,
  objectType?: string,
): Record<string, unknown> {
  if (!fields) return {};
  const out: Record<string, unknown> = {};
  if (typeof fields.name === "string") out.name = fields.name;
  if (category === "staking") {
    const parsed = parseStakedSuiFields(fields);
    if (parsed) {
      if (parsed.poolId) out.poolId = parsed.poolId;
      if (parsed.activationEpoch !== null) out.activationEpoch = parsed.activationEpoch;
      out.principal = parsed.principal.toString();
    }
  }
  if (category === "amm_lp") {
    const poolId = parseObjectIdField(fields.pool) ?? parseObjectIdField(fields.pool_id);
    const positionId =
      parseObjectIdField(fields.position_id) ?? parseObjectIdField(fields.position);
    const isWrapped = objectType?.includes("::pool::WrappedPositionNFT") ?? false;

    if (isWrapped) {
      // Farms wrapper often stores the linked position id in `pool` or `position_id`.
      if (positionId) out.position = positionId;
      else if (poolId) out.position = poolId;
    } else {
      if (poolId) out.pool = poolId;
      if (positionId) out.position = positionId;
    }
    if (fields.liquidity !== undefined) out.liquidity = String(fields.liquidity);
    const coinA = fields.coin_type_a;
    const coinB = fields.coin_type_b;
    if (coinA && typeof coinA === "object") {
      const name = (coinA as { fields?: { name?: string } }).fields?.name;
      if (typeof name === "string" && name.includes("::")) out.coinTypeA = normalizeCoinType(name);
    }
    if (coinB && typeof coinB === "object") {
      const name = (coinB as { fields?: { name?: string } }).fields?.name;
      if (typeof name === "string" && name.includes("::")) out.coinTypeB = normalizeCoinType(name);
    }
  }
  return out;
}

function objectToPosition(obj: OwnedObject): DefiPosition | null {
  const type = obj.data?.type;
  if (!type) return null;
  if (type.includes("ve_sca::VeScaKey")) return null;
  const entry = classifyType(type);
  if (!entry) return null;
  const objectId = obj.data?.objectId ?? null;
  const details = extractDetails(entry.category, obj.data?.content?.fields, type);
  if (
    entry.category === "amm_lp" &&
    objectId &&
    !type.includes("::pool::WrappedPositionNFT") &&
    !type.includes("::position_nft::TurbosPositionNFT")
  ) {
    details.position = objectId;
  }
  return {
    protocol: entry.protocol,
    category: entry.category,
    positionType: entry.category === "staking" ? "native-staking" : entry.category,
    label: entry.label,
    objectId,
    details,
    valueUsd: null,
  };
}

async function collectFiltered(
  rpcUrl: string,
  address: string,
  filter: Record<string, unknown>,
): Promise<DefiPosition[]> {
  const positions: DefiPosition[] = [];
  let cursor: string | null = null;
  const query: ObjectQuery = {
    filter,
    options: { showType: true, showContent: true },
  };

  for (let page = 0; page < FILTER_MAX_PAGES; page++) {
    const body = await getOwnedObjectsPage(rpcUrl, address, cursor, query);
    if (body.error) break;
    const result = body.result;
    for (const obj of result?.data ?? []) {
      const pos = objectToPosition(obj);
      if (pos) positions.push(pos);
    }
    if (!result?.hasNextPage || !result.nextCursor) break;
    cursor = result.nextCursor;
  }
  return positions;
}

async function collectScanned(
  rpcUrl: string,
  address: string,
  maxPages: number,
): Promise<{
  positions: DefiPosition[];
  scanned: number;
  rawObjectCount: number;
  reachedPageCap: boolean;
  error: string | null;
}> {
  const positions: DefiPosition[] = [];
  const seen = new Set<string>();
  let scanned = 0;
  let rawObjectCount = 0;
  let reachedPageCap = false;
  let error: string | null = null;
  let cursor: string | null = null;
  const query: ObjectQuery = { options: { showType: true, showContent: true } };

  try {
    let page = 0;
    for (; page < maxPages; page++) {
      const body = await getOwnedObjectsPage(rpcUrl, address, cursor, query);
      if (body.error) {
        error = JSON.stringify(body.error);
        break;
      }
      const result = body.result;
      for (const obj of result?.data ?? []) {
        rawObjectCount++;
        const type = obj.data?.type;
        if (!type) continue;
        scanned++;
        const pos = objectToPosition(obj);
        if (!pos?.objectId || seen.has(pos.objectId)) continue;
        seen.add(pos.objectId);
        positions.push(pos);
      }
      if (!result?.hasNextPage || !result.nextCursor) break;
      cursor = result.nextCursor;
    }
    if (page >= maxPages) reachedPageCap = true;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return { positions, scanned, rawObjectCount, reachedPageCap, error };
}

function mergePositions(lists: DefiPosition[][]): DefiPosition[] {
  const out: DefiPosition[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const pos of list) {
      const key = pos.objectId ?? `${pos.protocol}:${pos.label}:${JSON.stringify(pos.details)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(pos);
    }
  }
  return out;
}

async function discoverWithFilters(address: string): Promise<{
  positions: DefiPosition[];
  rpcUrl: string;
  filterHits: { label: string; count: number; rpcUrl: string }[];
}> {
  const filterHits: { label: string; count: number; rpcUrl: string }[] = [];
  const lists: DefiPosition[][] = [];
  let winningRpc = config.sui.defiRpcUrl;

  for (const rpcUrl of defiRpcUrls()) {
    for (const { label, filter } of listOwnedObjectFilters()) {
      try {
        const hits = await collectFiltered(rpcUrl, address, filter);
        filterHits.push({ label, count: hits.length, rpcUrl });
        if (hits.length > 0) {
          lists.push(hits);
          winningRpc = rpcUrl;
        }
      } catch {
        filterHits.push({ label, count: -1, rpcUrl });
      }
    }
    if (lists.length > 0) break;
  }

  return { positions: mergePositions(lists), rpcUrl: winningRpc, filterHits };
}

/** Targeted owned-object discovery (e.g. labelPrefix `cetus` for whale smoke). */
export async function discoverOwnedByLabelPrefix(
  address: string,
  labelPrefix: string,
): Promise<DefiPosition[]> {
  const filters = listOwnedObjectFilters().filter((f) => f.label.startsWith(labelPrefix));
  const lists: DefiPosition[][] = [];

  for (const rpcUrl of defiRpcUrls()) {
    for (const { filter } of filters) {
      try {
        const hits = await collectFiltered(rpcUrl, address, filter);
        if (hits.length > 0) lists.push(hits);
      } catch {
        /* try next filter / rpc */
      }
    }
    if (lists.length > 0) break;
  }

  return mergePositions(lists);
}

const discoveryInflight = new Map<string, Promise<DefiPosition[]>>();

async function getDefiPositionsUncached(address: string): Promise<DefiPosition[]> {
  try {
    // Targeted filters are fast for big wallets, but an individual filter call can
    // be rate-limited under concurrent load and silently drop its protocol. So we
    // ALSO run a full owned-object scan (one getOwnedObjects pass classifies every
    // object) and MERGE — a protocol isn't lost just because one filter failed.
    const filtered = await discoverWithFilters(address);
    let scanned: DefiPosition[] = [];
    for (const rpcUrl of defiRpcUrls()) {
      const scan = await collectScanned(rpcUrl, address, MAX_PAGES);
      if (scan.positions.length > 0) {
        scanned = scan.positions;
        break;
      }
      if (!scan.error) break; // empty (not an error) -> nothing owned here
    }
    return mergePositions([filtered.positions, scanned]);
  } catch {
    return [];
  }
}

/** Deduplicate parallel discovery (rpc-owned + scallop native share one RPC round-trip). */
export async function getDefiPositions(address: string): Promise<DefiPosition[]> {
  const key = address.toLowerCase();
  const pending = discoveryInflight.get(key);
  if (pending) return pending;

  const promise = getDefiPositionsUncached(address).finally(() => {
    discoveryInflight.delete(key);
  });
  discoveryInflight.set(key, promise);
  return promise;
}

export interface OwnedInspection {
  address: string;
  rpcUrl: string;
  rpcUrlsTried: string[];
  balanceCount: number;
  rawObjectCount: number;
  scanned: number;
  reachedPageCap: boolean;
  matchedCount: number;
  matched: { type: string; protocol: string }[];
  filtered: { label: string; count: number; rpcUrl: string }[];
  types: { type: string; count: number }[];
  error: string | null;
}

export async function inspectOwnedObjects(address: string): Promise<OwnedInspection> {
  const rpcUrlsTried = defiRpcUrls();
  let error: string | null = null;
  let balanceCount = 0;
  let rpcUrl = config.sui.defiRpcUrl;

  for (const url of rpcUrlsTried) {
    try {
      const balances = await getAllBalances(url, address);
      if (balances.error) continue;
      balanceCount = balances.result?.length ?? 0;
      rpcUrl = url;
      break;
    } catch {
      /* try next rpc */
    }
  }

  const discovery = await discoverWithFilters(address);
  rpcUrl = discovery.rpcUrl;
  const matched = discovery.positions.map((p) => ({
    type: p.label,
    protocol: p.protocol,
  }));

  const scan = await collectScanned(rpcUrl, address, DEBUG_MAX_PAGES);
  if (!error && scan.error) error = scan.error;

  for (const pos of scan.positions) {
    if (pos.objectId && matched.some((m) => m.protocol === pos.protocol)) continue;
    matched.push({ type: pos.label, protocol: pos.protocol });
  }

  const counts = new Map<string, number>();
  let cursor: string | null = null;
  const query: ObjectQuery = { options: { showType: true, showContent: true } };
  try {
    for (let page = 0; page < DEBUG_MAX_PAGES; page++) {
      const body = await getOwnedObjectsPage(rpcUrl, address, cursor, query);
      if (body.error) break;
      const result = body.result;
      for (const obj of result?.data ?? []) {
        const type = obj.data?.type;
        if (!type) continue;
        const base = baseType(type.trim());
        counts.set(base, (counts.get(base) ?? 0) + 1);
      }
      if (!result?.hasNextPage || !result.nextCursor) break;
      cursor = result.nextCursor;
    }
  } catch {
    /* histogram is best-effort */
  }

  const types = [...counts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    address,
    rpcUrl,
    rpcUrlsTried,
    balanceCount,
    rawObjectCount: scan.rawObjectCount,
    scanned: scan.scanned,
    reachedPageCap: scan.reachedPageCap,
    matchedCount: matched.length,
    matched,
    filtered: discovery.filterHits,
    types,
    error,
  };
}

interface GetObjectResult {
  result?: {
    data?: {
      objectId: string;
      type?: string;
      owner?: unknown;
    };
    error?: unknown;
  };
  error?: unknown;
}

/** Fetch a single object from the DeFi RPC (debug: why owned-object scan missed a position). */
export async function lookupObjectOnDefiRpc(objectId: string): Promise<{
  objectId: string;
  rpcUrl: string;
  type: string | null;
  owner: unknown;
  error: string | null;
}> {
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "sui_getObject",
    params: [objectId, { showOwner: true, showType: true, showContent: true }],
  };

  for (const rpcUrl of defiRpcUrls()) {
    try {
      const body = await rpcCall<GetObjectResult>(rpcUrl, request);
      if (body.error) continue;
      const data = body.result?.data;
      if (!data) continue;
      return {
        objectId,
        rpcUrl,
        type: data.type ?? null,
        owner: data.owner ?? null,
        error: null,
      };
    } catch {
      /* try next rpc */
    }
  }

  return {
    objectId,
    rpcUrl: defiRpcUrls()[0] ?? config.sui.defiRpcUrl,
    type: null,
    owner: null,
    error: "object_not_found_on_any_rpc",
  };
}

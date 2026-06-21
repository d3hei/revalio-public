import { config } from "../../../../config.js";
import { fetchJson } from "../../../http.js";
import { normalizeCoinType } from "../../../coinType.js";

const RPC_TIMEOUT_MS = 15_000;

export interface SuiObjectData {
  objectId: string;
  type?: string;
  content?: { dataType?: string; fields?: Record<string, unknown> };
}

interface GetObjectResult {
  result?: { data?: SuiObjectData; error?: unknown };
  error?: unknown;
}

interface CoinMetadataResult {
  result?: { decimals?: number } | null;
  error?: unknown;
}

interface GetOwnedObjectsResult {
  result?: {
    data?: { data?: SuiObjectData }[];
    hasNextPage?: boolean;
    nextCursor?: string | null;
  };
  error?: unknown;
}

function defiRpcUrls(): string[] {
  return [...new Set([config.sui.defiRpcUrl, ...config.sui.defiRpcFallbacks])];
}

function isJsonRpcError(body: unknown): boolean {
  return Boolean(
    body &&
      typeof body === "object" &&
      "error" in body &&
      (body as { error?: unknown }).error != null,
  );
}

export async function defiRpcCall<T>(
  body: unknown,
  opts?: { timeoutMs?: number; retries?: number },
): Promise<T | null> {
  for (const rpcUrl of defiRpcUrls()) {
    try {
      const parsed = await fetchJson<T>(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        timeoutMs: opts?.timeoutMs ?? RPC_TIMEOUT_MS,
        retries: opts?.retries ?? 0,
      });
      if (isJsonRpcError(parsed)) continue;
      return parsed;
    } catch {
      /* try next rpc */
    }
  }
  return null;
}

function hasObjectContent(data: SuiObjectData | undefined): boolean {
  return Boolean(data?.content?.fields);
}

/** Prefer RPCs that index Cetus objects well for single-object reads. */
function objectFetchRpcUrls(): string[] {
  const preferred = config.sui.defiRpcUrl;
  const rest = defiRpcUrls().filter((url) => url !== preferred);
  return [preferred, ...rest];
}

export async function fetchObject(objectId: string): Promise<SuiObjectData | null> {
  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: "sui_getObject",
    params: [objectId, { showContent: true, showType: true }],
  };

  for (const rpcUrl of objectFetchRpcUrls()) {
    try {
      const body = await fetchJson<GetObjectResult>(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
        timeoutMs: RPC_TIMEOUT_MS,
        retries: 1,
      });
      if (!body || body.error || body.result?.error) continue;
      const data = body.result?.data;
      if (!data?.objectId) continue;
      if (hasObjectContent(data)) return data;
    } catch {
      /* try next rpc */
    }
  }

  return null;
}

export async function fetchOwnedObjectsByFilter(
  address: string,
  filter: Record<string, unknown>,
  maxPages = 4,
): Promise<SuiObjectData[]> {
  const out: SuiObjectData[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    const body: GetOwnedObjectsResult | null = await defiRpcCall<GetOwnedObjectsResult>({
      jsonrpc: "2.0",
      id: 1,
      method: "suix_getOwnedObjects",
      params: [
        address,
        { filter, options: { showType: true, showContent: true } },
        cursor,
        50,
      ],
    });
    if (!body || body.error) break;
    for (const row of body.result?.data ?? []) {
      if (row.data) out.push(row.data);
    }
    if (!body.result?.hasNextPage || !body.result.nextCursor) break;
    cursor = body.result.nextCursor;
  }

  return out;
}

export async function fetchCoinDecimals(coinType: string): Promise<number | undefined> {
  const normalized = normalizeCoinType(coinType);
  const sym = normalized.split("::").pop()?.toUpperCase();
  if (sym === "USDC" || sym === "USDT") return 6;
  if (sym === "SUI") return 9;
  if (sym === "DEEP") return 6;

  const body = await defiRpcCall<CoinMetadataResult>({
    jsonrpc: "2.0",
    id: 1,
    method: "suix_getCoinMetadata",
    params: [normalized],
  });
  const decimals = body?.result?.decimals;
  return typeof decimals === "number" ? decimals : undefined;
}

import { config } from "../config.js";
import { query } from "../db.js";
import { redis } from "../redis.js";
import { normalizeCoinType } from "./coinType.js";
import { fetchJson } from "./http.js";
import { symbolFromCoinType } from "./positions/coinSymbol.js";
import { fetchCoinDecimals } from "./positions/sources/native/rpcClient.js";

export interface CoinMeta {
  coinType: string;
  symbol: string | null;
  name: string | null;
  decimals: number;
  iconUrl: string | null;
}

// How long to remember that a coin type has no on-chain metadata, to avoid
// hammering the fullnode on every request for unknown coins.
const MISS_TTL_SECONDS = 3600;
const RPC_TIMEOUT_MS = 5000;

interface CoinRow {
  coin_type: string;
  symbol: string | null;
  name: string | null;
  decimals: number;
  icon_url: string | null;
}

interface SuiCoinMetadata {
  decimals: number;
  name: string | null;
  symbol: string | null;
  description: string | null;
  iconUrl: string | null;
  id: string | null;
}

function metadataRpcUrls(): string[] {
  return [...new Set([config.sui.defiRpcUrl, ...config.sui.defiRpcFallbacks, config.sui.rpcUrl])];
}

function isStaleMeta(meta: CoinMeta): boolean {
  return meta.decimals === 0 && !meta.symbol;
}

async function inferMeta(coinType: string): Promise<CoinMeta> {
  const normalized = normalizeCoinType(coinType);
  const symbol = symbolFromCoinType(normalized);
  const decimals = (await fetchCoinDecimals(normalized)) ?? 9;
  return {
    coinType: normalized,
    symbol,
    name: symbol,
    decimals,
    iconUrl: null,
  };
}

async function loadFromDb(coinTypes: string[]): Promise<Map<string, CoinMeta>> {
  const out = new Map<string, CoinMeta>();
  if (coinTypes.length === 0) return out;
  const { rows } = await query<CoinRow>(
    `SELECT coin_type, symbol, name, decimals, icon_url
       FROM coins
      WHERE coin_type = ANY($1)`,
    [coinTypes],
  );
  for (const r of rows) {
    out.set(r.coin_type, {
      coinType: r.coin_type,
      symbol: r.symbol,
      name: r.name,
      decimals: r.decimals,
      iconUrl: r.icon_url,
    });
  }
  return out;
}

// "ok": metadata found; "miss": fullnode definitively has none (cache it);
// "error": transient failure (do NOT cache as a miss, so we retry next time).
type RpcResult =
  | { kind: "ok"; meta: CoinMeta }
  | { kind: "miss" }
  | { kind: "error" };

async function fetchFromRpc(coinType: string): Promise<RpcResult> {
  const normalized = normalizeCoinType(coinType);
  for (const rpcUrl of metadataRpcUrls()) {
    try {
      const body = await fetchJson<{ result?: SuiCoinMetadata | null; error?: unknown }>(
        rpcUrl,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "suix_getCoinMetadata",
            params: [normalized],
          }),
          timeoutMs: RPC_TIMEOUT_MS,
          retries: 1,
        },
      );

      if (body.error) continue;
      const m = body.result;
      if (!m) continue;
      return {
        kind: "ok",
        meta: {
          coinType: normalized,
          symbol: m.symbol ?? symbolFromCoinType(normalized),
          name: m.name ?? m.symbol ?? symbolFromCoinType(normalized),
          decimals: typeof m.decimals === "number" ? m.decimals : 9,
          iconUrl: m.iconUrl ?? null,
        },
      };
    } catch {
      continue;
    }
  }
  return { kind: "miss" };
}

async function upsertCoin(meta: CoinMeta): Promise<void> {
  await query(
    `INSERT INTO coins (coin_type, symbol, name, decimals, icon_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (coin_type) DO UPDATE
       SET symbol = EXCLUDED.symbol,
           name = EXCLUDED.name,
           decimals = EXCLUDED.decimals,
           icon_url = EXCLUDED.icon_url`,
    [meta.coinType, meta.symbol, meta.name, meta.decimals, meta.iconUrl],
  );
}

async function cacheMiss(coinType: string): Promise<void> {
  try {
    await redis.set(`coinmeta:miss:${coinType}`, "1", "EX", MISS_TTL_SECONDS);
  } catch {
    /* cache is best-effort */
  }
}

/**
 * Resolve coin metadata for the given coin types. Reads the `coins` table first,
 * then lazily fetches from mainnet RPC. Always resolves (never throws).
 */
export async function getCoinMetadata(coinTypes: string[]): Promise<Map<string, CoinMeta>> {
  const unique = [...new Set(coinTypes.map(normalizeCoinType))];
  let result: Map<string, CoinMeta>;
  try {
    result = await loadFromDb(unique);
  } catch {
    result = new Map();
  }

  const missing = unique.filter((t) => {
    const row = result.get(t);
    return !row || isStaleMeta(row);
  });

  await Promise.all(
    missing.map(async (coinType) => {
      const fetched = await fetchFromRpc(coinType);
      if (fetched.kind === "ok") {
        try {
          await upsertCoin(fetched.meta);
        } catch {
          /* db optional */
        }
        result.set(coinType, fetched.meta);
        return;
      }

      const inferred = await inferMeta(coinType);
      result.set(coinType, inferred);
      if (fetched.kind === "miss") await cacheMiss(coinType);
    }),
  );

  return result;
}

import { query } from "../db.js";
import { redis } from "../redis.js";
import { defiRpcCall } from "./positions/sources/native/rpcClient.js";

const CACHE_TTL_SEC = 86_400;

interface QueryTxResult {
  result?: {
    data?: { timestampMs?: string | number | null }[];
  };
}

async function oldestRpcTxMs(
  address: string,
  filter: "FromAddress" | "ToAddress",
): Promise<number | null> {
  try {
    const body = await defiRpcCall<QueryTxResult>(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "suix_queryTransactionBlocks",
        params: [
          { filter: { [filter]: address }, options: { showInput: false } },
          null,
          1,
          false,
        ],
      },
      { timeoutMs: 2_500, retries: 0 },
    );
    const ts = body?.result?.data?.[0]?.timestampMs;
    if (ts == null || ts === "") return null;
    const ms = Number(ts);
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  } catch {
    return null;
  }
}

async function oldestIndexedTxMs(address: string): Promise<number | null> {
  try {
    const { rows } = await query<{ ts: string }>(
      `SELECT MIN(timestamp_ms)::text AS ts
         FROM transactions
        WHERE sender = $1`,
      [address],
    );
    const ms = Number(rows[0]?.ts ?? "0");
    return Number.isFinite(ms) && ms > 0 ? ms : null;
  } catch {
    return null;
  }
}

/**
 * Earliest on-chain activity for the wallet (sent or received). Used to avoid
 * charting portfolio history before the address existed.
 */
export async function getWalletActiveSinceMs(address: string): Promise<number | null> {
  const cacheKey = `wallet:activeSince:${address.toLowerCase()}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached === "null") return null;
    if (cached) {
      const ms = Number(cached);
      if (Number.isFinite(ms) && ms > 0) return ms;
    }
  } catch {
    /* cache miss */
  }

  const [fromMs, toMs, indexedMs] = await Promise.all([
    oldestRpcTxMs(address, "FromAddress"),
    oldestRpcTxMs(address, "ToAddress"),
    oldestIndexedTxMs(address),
  ]);

  const candidates = [fromMs, toMs, indexedMs].filter((t): t is number => t !== null);
  const result = candidates.length === 0 ? null : Math.min(...candidates);

  try {
    await redis.set(
      cacheKey,
      result === null ? "null" : String(result),
      "EX",
      CACHE_TTL_SEC,
    );
  } catch {
    /* best-effort */
  }

  return result;
}

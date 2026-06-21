import { redis } from "../redis.js";
import { normalizeCoinType } from "./coinType.js";
import { defiRpcCall } from "./positions/sources/native/rpcClient.js";

const PAGE_SIZE = 50;
const DEFAULT_MAX_PAGES_PER_FILTER = 40;
const DEFAULT_TX_FETCH_DEADLINE_MS = 2_500;
const CACHE_TTL_SEC = 600;

export interface FetchWalletBalanceEventsOptions {
  /** Cap RPC pagination per direction (From / To). */
  maxPagesPerFilter?: number;
  /** Stop paging once this wall-clock budget is exhausted. */
  deadlineMs?: number;
}

export interface TxBalanceEvent {
  timestampMs: number;
  digest: string;
  changes: { coinType: string; amount: bigint }[];
}

interface RpcBalanceChange {
  coinType?: string;
  amount?: string;
  owner?: { AddressOwner?: string };
}

interface RpcTxRow {
  digest?: string;
  timestampMs?: string | number | null;
  balanceChanges?: RpcBalanceChange[];
  errors?: string[];
}

interface QueryTxResult {
  result?: {
    data?: RpcTxRow[];
    nextCursor?: string | null;
    hasNextPage?: boolean;
  };
}

function parseChanges(address: string, rows: RpcBalanceChange[] | undefined): TxBalanceEvent["changes"] {
  const out: TxBalanceEvent["changes"] = [];
  for (const row of rows ?? []) {
    if (row.owner?.AddressOwner?.toLowerCase() !== address.toLowerCase()) continue;
    if (!row.coinType || row.amount == null) continue;
    let amount: bigint;
    try {
      amount = BigInt(row.amount);
    } catch {
      continue;
    }
    if (amount === 0n) continue;
    out.push({ coinType: normalizeCoinType(row.coinType), amount });
  }
  return out;
}

async function fetchTxPage(
  address: string,
  filter: "FromAddress" | "ToAddress",
  cursor: string | null,
): Promise<{ rows: RpcTxRow[]; nextCursor: string | null }> {
  const body = await defiRpcCall<QueryTxResult>(
    {
      jsonrpc: "2.0",
      id: 1,
      method: "suix_queryTransactionBlocks",
      params: [
        {
          filter: { [filter]: address },
          options: { showBalanceChanges: true },
        },
        cursor,
        PAGE_SIZE,
        true,
      ],
    },
    { timeoutMs: 3_000, retries: 0 },
  );

  const rows = body?.result?.data ?? [];
  const next = body?.result?.nextCursor;
  return {
    rows: rows.filter((r) => !r.errors?.length),
    nextCursor: typeof next === "string" && next.length > 0 ? next : null,
  };
}

async function fetchEventsForFilter(
  address: string,
  filter: "FromAddress" | "ToAddress",
  sinceMs: number,
  maxPages: number,
  deadlineAt: number,
): Promise<TxBalanceEvent[]> {
  const events: TxBalanceEvent[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    if (Date.now() >= deadlineAt) break;
    const { rows, nextCursor } = await fetchTxPage(address, filter, cursor);
    if (rows.length === 0) break;

    let stop = false;
    for (const row of rows) {
      const ts = Number(row.timestampMs ?? 0);
      if (!Number.isFinite(ts) || ts <= 0) continue;
      if (ts < sinceMs) {
        stop = true;
        continue;
      }
      const changes = parseChanges(address, row.balanceChanges);
      if (changes.length === 0) continue;
      if (typeof row.digest !== "string") continue;
      events.push({ timestampMs: ts, digest: row.digest, changes });
    }

    if (stop || !nextCursor) break;
    cursor = nextCursor;
  }

  return events;
}

/** On-chain balance change events for a wallet within a time window (From + To txs). */
export async function fetchWalletBalanceEvents(
  address: string,
  sinceMs: number,
  options?: FetchWalletBalanceEventsOptions,
): Promise<TxBalanceEvent[]> {
  const maxPages = options?.maxPagesPerFilter ?? DEFAULT_MAX_PAGES_PER_FILTER;
  const deadlineMs = options?.deadlineMs ?? DEFAULT_TX_FETCH_DEADLINE_MS;
  const cacheKey = `chart:txevents:${address.toLowerCase()}:${sinceMs}:${maxPages}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as TxBalanceEvent[];
  } catch {
    /* cache miss */
  }

  const deadlineAt = Date.now() + deadlineMs;
  const [fromEvents, toEvents] = await Promise.all([
    fetchEventsForFilter(address, "FromAddress", sinceMs, maxPages, deadlineAt),
    fetchEventsForFilter(address, "ToAddress", sinceMs, maxPages, deadlineAt),
  ]);

  const byDigest = new Map<string, TxBalanceEvent>();
  for (const ev of [...fromEvents, ...toEvents]) {
    const existing = byDigest.get(ev.digest);
    if (!existing) {
      byDigest.set(ev.digest, ev);
      continue;
    }
    const merged = new Map<string, bigint>();
    for (const ch of [...existing.changes, ...ev.changes]) {
      merged.set(ch.coinType, (merged.get(ch.coinType) ?? 0n) + ch.amount);
    }
    byDigest.set(ev.digest, {
      ...existing,
      changes: [...merged.entries()].map(([coinType, amount]) => ({ coinType, amount })),
    });
  }

  const events = [...byDigest.values()].sort((a, b) => a.timestampMs - b.timestampMs);

  try {
    await redis.set(cacheKey, JSON.stringify(events), "EX", CACHE_TTL_SEC);
  } catch {
    /* best-effort */
  }

  return events;
}

function reverseApplyChanges(
  holdings: Map<string, bigint>,
  changes: TxBalanceEvent["changes"],
): void {
  for (const { coinType, amount } of changes) {
    const next = (holdings.get(coinType) ?? 0n) - amount;
    if (next <= 0n) holdings.delete(coinType);
    else holdings.set(coinType, next);
  }
}

/** Reconstruct wallet coin holdings at each bucket by replaying tx balance changes backward from now. */
export function holdingsAtBucketTimes(input: {
  currentHoldings: Map<string, bigint>;
  txEvents: TxBalanceEvent[];
  bucketTimes: number[];
}): Map<number, Map<string, bigint>> {
  const txsDesc = [...input.txEvents].sort((a, b) => b.timestampMs - a.timestampMs);
  const holdings = new Map(input.currentHoldings);
  const out = new Map<number, Map<string, bigint>>();

  let txIdx = 0;
  for (const t of [...input.bucketTimes].sort((a, b) => b - a)) {
    while (txIdx < txsDesc.length && txsDesc[txIdx]!.timestampMs > t) {
      reverseApplyChanges(holdings, txsDesc[txIdx]!.changes);
      txIdx++;
    }
    out.set(t, new Map(holdings));
  }

  return out;
}

export function currentHoldingsFromBalances(
  rows: { coin_type: string; balance: string }[],
): Map<string, bigint> {
  const map = new Map<string, bigint>();
  for (const row of rows) {
    try {
      const bal = BigInt(row.balance);
      if (bal > 0n) map.set(normalizeCoinType(row.coin_type), bal);
    } catch {
      /* skip */
    }
  }
  return map;
}

export function holdingsMapToSnapshotLines(holdings: Map<string, bigint>): { coinType: string; balance: string }[] {
  return [...holdings.entries()]
    .filter(([, bal]) => bal > 0n)
    .map(([coinType, balance]) => ({ coinType, balance: balance.toString() }));
}

import { NAVI_MAINNET_POOLS } from "./sources/native/naviPools.js";
import { inspectNativeNavi } from "./sources/native/naviRpc.js";
import { inspectNativeScallop } from "./sources/native/scallopRpc.js";
import { inspectNativeSuilend } from "./sources/native/suilendRpc.js";
import { defiRpcCall, fetchOwnedObjectsByFilter } from "./sources/native/rpcClient.js";
import { suilendCapFilter } from "./sources/native/suilendPackages.js";
import {
  SCALLOP_PROTOCOL_PACKAGES,
  scallopObligationKeyFilter,
} from "./sources/native/scallopPackages.js";

const SUILEND_CAP_FILTER = suilendCapFilter();

const POOL_ALIASES: Record<string, string> = {
  USDC: "nUSDC",
};

interface DynamicFieldsResult {
  result?: {
    data?: { name?: { value?: string } }[];
    hasNextPage?: boolean;
    nextCursor?: string | null;
  };
}

interface QueryEventsResult {
  result?: {
    data?: {
      sender?: string;
      parsedJson?: { sender?: string };
    }[];
    hasNextPage?: boolean;
    nextCursor?: string | null;
  };
}

function resolvePoolName(name: string): string {
  return POOL_ALIASES[name] ?? name;
}

/** Sample wallet addresses with NAVI reserve balance dynamic fields. */
export async function sampleNaviDepositors(
  poolName = "SUI",
  limit = 24,
): Promise<string[]> {
  const resolved = resolvePoolName(poolName);
  const pool =
    NAVI_MAINNET_POOLS.find((p) => p.name === resolved) ?? NAVI_MAINNET_POOLS[0]!;
  const addrs: string[] = [];
  let cursor: string | null = null;

  while (addrs.length < limit) {
    const pageSize = Math.min(50, limit - addrs.length);
    const body: DynamicFieldsResult | null = await defiRpcCall<DynamicFieldsResult>({
      jsonrpc: "2.0",
      id: 1,
      method: "suix_getDynamicFields",
      params: [pool.supplyBalanceParentId, cursor, pageSize],
    });
    const rows = body?.result?.data ?? [];
    for (const row of rows) {
      const v = row.name?.value;
      if (typeof v === "string" && v.startsWith("0x")) addrs.push(v);
    }
    if (!body?.result?.hasNextPage || !body.result.nextCursor) break;
    cursor = body.result.nextCursor;
  }

  return [...new Set(addrs)];
}

/** Merge depositors from several NAVI pools (broader candidate set). */
export async function sampleAllNaviDepositors(perPool = 40): Promise<string[]> {
  const pools = ["SUI", "nUSDC", "USDT", "wUSDC"];
  const all: string[] = [];
  for (const pool of pools) {
    all.push(...(await sampleNaviDepositors(pool, perPool)));
  }
  return [...new Set(all)];
}

/** Recent wallets that opened a Scallop obligation (event senders). */
export async function sampleScallopOwnersFromEvents(limit = 100): Promise<string[]> {
  const addrs: string[] = [];

  for (const pkg of SCALLOP_PROTOCOL_PACKAGES) {
    let cursor: string | null = null;
    while (addrs.length < limit) {
      const pageSize = Math.min(50, limit - addrs.length);
      const body: QueryEventsResult | null = await defiRpcCall<QueryEventsResult>({
        jsonrpc: "2.0",
        id: 1,
        method: "suix_queryEvents",
        params: [
          {
            MoveEventModule: {
              package: pkg,
              module: "open_obligation",
            },
          },
          cursor,
          pageSize,
          true,
        ],
      });
      for (const ev of body?.result?.data ?? []) {
        const sender =
          ev.sender ??
          (ev.parsedJson && typeof ev.parsedJson.sender === "string"
            ? ev.parsedJson.sender
            : null);
        if (sender?.startsWith("0x")) addrs.push(sender);
      }
      if (!body?.result?.hasNextPage || !body.result.nextCursor) break;
      cursor = body.result.nextCursor;
    }
    if (addrs.length >= limit) break;
  }

  return [...new Set(addrs)];
}

function naviSupplyScore(navi: Awaited<ReturnType<typeof inspectNativeNavi>>): bigint {
  let total = 0n;
  for (const p of navi.positions) {
    if (p.positionType !== "supply") continue;
    try {
      total += BigInt(String(p.details.value ?? 0));
    } catch {
      /* skip */
    }
  }
  return total;
}

/** Prefer wallets with meaningful NAVI supply (9-dec scale); default ≥1 SUI equivalent. */
export async function discoverNaviWallet(minSupplyScore = 1_000_000_000n): Promise<string> {
  const candidates = await sampleAllNaviDepositors(60);
  let best: { addr: string; score: bigint } | null = null;

  for (const addr of candidates) {
    const navi = await inspectNativeNavi(addr);
    if (navi.supplyRows + navi.borrowRows === 0) continue;
    const score = naviSupplyScore(navi);
    if (score >= minSupplyScore) return addr;
    if (!best || score > best.score) best = { addr, score };
  }

  if (best && best.score > 0n) return best.addr;
  throw new Error("discoverNaviWallet: no NAVI positions in sampled depositors");
}

async function walletHasScallop(addr: string): Promise<boolean> {
  const keys = await fetchOwnedObjectsByFilter(addr, scallopObligationKeyFilter(), 1);
  if (keys.length === 0) return false;
  const scallop = await inspectNativeScallop(addr);
  return scallop.obligationKeys > 0;
}

export async function discoverScallopWallet(candidates?: string[]): Promise<string> {
  const eventOwners = await sampleScallopOwnersFromEvents(40);
  const batches = [candidates ?? [], eventOwners, await sampleAllNaviDepositors(20)];
  const seen = new Set<string>();
  const maxChecks = 120;
  let checks = 0;

  for (const batch of batches) {
    for (const addr of batch) {
      if (seen.has(addr)) continue;
      seen.add(addr);
      if (++checks > maxChecks) break;
      if (await walletHasScallop(addr)) return addr;
    }
    if (checks > maxChecks) break;
  }

  throw new Error("discoverScallopWallet: no Scallop obligation keys found");
}

export async function discoverSuilendWallet(candidates?: string[]): Promise<string> {
  const list = [
    ...(candidates ?? []),
    ...(await sampleScallopOwnersFromEvents(30)),
    ...(await sampleAllNaviDepositors(20)),
  ];
  const seen = new Set<string>();
  const maxChecks = 80;
  let checks = 0;

  for (const addr of list) {
    if (seen.has(addr)) continue;
    seen.add(addr);
    if (++checks > maxChecks) break;
    const caps = await fetchOwnedObjectsByFilter(addr, SUILEND_CAP_FILTER, 1);
    if (caps.length === 0) continue;
    const suilend = await inspectNativeSuilend(addr);
    if (suilend.caps > 0) return addr;
  }

  throw new Error("discoverSuilendWallet: no Suilend caps in sampled wallets");
}

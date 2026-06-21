import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import type { ResolvedPosition } from "../../types.js";
import { getUsdPrices } from "../../../prices.js";
import { defiRpcCall, fetchOwnedObjectsByFilter } from "./rpcClient.js";

// DeepBook Margin lending. Supplying liquidity to a `MarginPool<T>` mints a single
// `SupplierCap` (an owned object, bare `{id}`) that is reused as the key into EVERY
// pool the wallet supplies to: each pool tracks the supplier in its own
// `positions` Table<ID, SupplyPosition>, keyed by the cap id. The pools are shared
// storage, so we read the share balance per pool by cap id, then convert
// shares -> underlying with each pool's live index:
//   amount_raw = shares * state.total_supply / state.supply_shares
//   usd        = amount_raw / 10^decimals * price
// Verified live: USDC 1982829 shares -> $2.00; SUI 996023934 shares -> 1.000004 SUI.
//
// Reliability: one SupplierCap can hold positions in several pools at once, so the
// pool states are read in a SINGLE sui_multiGetObjects call (not 7 concurrent
// reads, which the RPC rate-limited and silently dropped) and each per-cap probe
// retries once on a transient null.
const SUPPLIER_CAP =
  "0x97d9473771b01f77b0940c589484184b49f6444627ec121314fae6a6d36fb86b::margin_pool::SupplierCap";

// All MarginPools (from margin_pool::MarginPoolCreated events). Stable assets are
// valued $1; the rest price via Pyth (priceSymbol). WAL has no feed -> null.
interface PoolDef {
  id: string;
  symbol: string;
  decimals: number;
  stable: boolean;
  priceSymbol?: string;
}
const POOLS: PoolDef[] = [
  { id: "0xba473d9ae278f10af75c50a8fa341e9c6a1c087dc91a3f23e8048baf67d0754f", symbol: "USDC", decimals: 6, stable: true },
  { id: "0x53041c6f86c4782aabbfc1d4fe234a6d37160310c7ee740c915f0a01b7127344", symbol: "SUI", decimals: 9, stable: false, priceSymbol: "SUI" },
  { id: "0x1d723c5cd113296868b55208f2ab5a905184950dd59c48eb7345607d6b5e6af7", symbol: "DEEP", decimals: 6, stable: false, priceSymbol: "DEEP" },
  { id: "0x38decd3dbb62bd4723144349bf57bc403b393aee86a51596846a824a1e0c2c01", symbol: "WAL", decimals: 9, stable: false, priceSymbol: "WAL" },
  { id: "0xbb990ca04a7743e6c0a25a7fb16f60fc6f6d8bf213624ff03a63f1bb04c3a12f", symbol: "USDE", decimals: 6, stable: true },
  { id: "0x14dfbf54400e0b97e892349310d392bef6d187c2b6709d9b246b8f41c9a13de4", symbol: "XBTC", decimals: 8, stable: false, priceSymbol: "BTC" },
  { id: "0x78a0ddd02745d9b500fb7e9aae2ff8b665d974f00fd1f6060d59f4a8e891402c", symbol: "USDSUI", decimals: 6, stable: true },
];

interface MultiGetResult {
  result?: Array<{ data?: { content?: { fields?: Record<string, unknown> } } }>;
}
interface DynFieldResult {
  result?: { data?: { content?: { fields?: Record<string, unknown> } } };
  error?: unknown;
}

interface PoolState {
  def: PoolDef;
  parent: string;
  supplyShares: bigint;
  totalSupply: bigint;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}
function bigOf(v: unknown): bigint {
  try {
    return BigInt(str(v) || "0");
  } catch {
    return 0n;
  }
}
function fieldsOf(v: unknown): Record<string, unknown> | undefined {
  return (v as { fields?: Record<string, unknown> } | undefined)?.fields;
}

/** Read every pool's share index + positions-table parent in one batched call (retried). */
async function readPoolStates(): Promise<PoolState[]> {
  let body: MultiGetResult | null = null;
  for (let attempt = 0; attempt < 2 && !body; attempt++) {
    body = await defiRpcCall<MultiGetResult>({
      jsonrpc: "2.0",
      id: 1,
      method: "sui_multiGetObjects",
      params: [POOLS.map((p) => p.id), { showContent: true }],
    });
  }
  const arr = body?.result ?? [];

  const out: PoolState[] = [];
  POOLS.forEach((def, i) => {
    const f = arr[i]?.data?.content?.fields;
    if (!f) return;
    const state = fieldsOf(f.state);
    const parent = (fieldsOf(fieldsOf(f.positions)?.positions)?.id as { id?: string } | undefined)
      ?.id;
    if (!state || !parent) return;
    out.push({
      def,
      parent,
      supplyShares: bigOf(state.supply_shares),
      totalSupply: bigOf(state.total_supply),
    });
  });
  return out;
}

/**
 * Read a cap's supplied shares in one pool. Returns 0n for a genuine "no position
 * in this pool", or null when the RPC is persistently unavailable across retries.
 * The null case must NOT collapse to 0n: that would make a transient infra failure
 * indistinguishable from a true absence and silently under-report a real position.
 */
async function probeShares(parent: string, capId: string): Promise<bigint | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const body = await defiRpcCall<DynFieldResult>({
      jsonrpc: "2.0",
      id: 1,
      method: "suix_getDynamicFieldObject",
      params: [parent, { type: "0x2::object::ID", value: capId }],
    });
    if (body === null) continue; // transient RPC failure -> retry
    if (body.error) return 0n; // dynamicFieldNotFound -> no position in this pool
    const entry = fieldsOf(body.result?.data?.content?.fields?.value);
    return bigOf(entry?.shares); // 0n here too if value absent -> treated as no position
  }
  return null; // persistent transient failure -> caller aborts the pass
}

/** Native DeepBook Margin: value every owned SupplierCap's supplied shares across all pools. */
export const nativeDeepbookMarginAdapter: ProtocolPositionAdapter = {
  id: "native-deepbook-margin",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const caps = await fetchOwnedObjectsByFilter(address, { StructType: SUPPLIER_CAP }, 10);
    if (caps.length === 0) return [];

    const states = await readPoolStates();
    if (states.length === 0) return [];

    const priceSymbols = [
      ...new Set(states.map((s) => s.def.priceSymbol).filter((s): s is string => Boolean(s))),
    ];
    const prices = priceSymbols.length
      ? await getUsdPrices(priceSymbols)
      : new Map<string, number>();

    const rows = await Promise.all(
      caps.flatMap((cap) =>
        states.map(async (st): Promise<ResolvedPosition | null> => {
          const shares = await probeShares(st.parent, cap.objectId);
          // Persistent RPC failure: abort the whole pass (fetchNativeAdapterPositions
          // catches this and returns []) rather than emit a silent under-count.
          if (shares === null) throw new Error("deepbook-margin: probe RPC unavailable");
          if (shares === 0n || st.supplyShares === 0n) return null;

          const amountRaw = (shares * st.totalSupply) / st.supplyShares;
          const tokens = Number(amountRaw) / 10 ** st.def.decimals;
          const price = st.def.stable
            ? 1
            : st.def.priceSymbol
              ? prices.get(st.def.priceSymbol)
              : undefined;
          const valueUsd = price !== undefined ? tokens * price : null;

          return {
            protocol: "DeepBook",
            category: "lending",
            positionType: "deepbook-margin-supply",
            label: `DeepBook Margin ${st.def.symbol}`,
            // Unique per (cap, pool) so a multi-pool supplier is not deduped to one row.
            objectId: `${cap.objectId}:${st.def.symbol}`,
            valueUsd,
            source: "native",
            details: {
              coinSymbol: st.def.symbol,
              shares: str(shares),
              suppliedTokens: tokens,
              suppliedUsd: valueUsd,
              supplierCap: cap.objectId,
              marginPool: st.def.id,
            },
          };
        }),
      ),
    );

    return rows.filter((r): r is ResolvedPosition => r !== null);
  },
};

export async function inspectNativeDeepbookMargin(address: string): Promise<{
  count: number;
  positions: ResolvedPosition[];
}> {
  const positions = await nativeDeepbookMarginAdapter.fetchPositions(address);
  return { count: positions.length, positions };
}

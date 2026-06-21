import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import type { ResolvedPosition } from "../../types.js";
import { getUsdPrices } from "../../../prices.js";
import { symbolFromCoinType } from "../../coinSymbol.js";
import { defiRpcCall } from "./rpcClient.js";

// Bucket v2 CDP. A "Bottle" (collateral + USDB debt) is NOT an owned object —
// each per-collateral Vault<T> keeps a LinkedTable<address, Position> in shared
// storage, so we read the user's Position by address. Verified live on mainnet:
// Vault<0x2::sui::SUI> -> position_table parent -> Field<address,
// linked_table::Node<address, vault::Position{coll_amount, debt_amount, interest_unit}>>.
//
// USD value (formula verified against vault::get_position_data devInspect, ±1 unit):
//   debt accrues via an ADDITIVE per-unit interest index (double::Double, 1e18):
//   vault_iu_now = vault.interest_unit + interest_rate * (now - vault.timestamp) / YEAR_MS
//   debt_units   = debt_amount * (1e18 + vault_iu_now - position.interest_unit) / 1e18
//   debt_usd     = debt_units / 1e6        (USDB, 6 decimals)
//   coll_usd     = coll_amount / 10^vault.decimal * collateral_price
//   value_usd    = coll_usd - debt_usd
const BUCKET_VAULTS = [
  "0x542eff36534bc5d7d07808953ebb8c580c23f047b41c094601d40a0fc7e99238", // SUI
  "0x94f785bda085beb012e9e96d16a36cf16b6729f776e620ef8c3b37d1e06c2d82", // wBTC
  "0xd3ef65a1dec4b5c5f0e0bb7caf29f4a425bd04ad43bce942ec6e1c70385b79de", // SCA
];

const DOUBLE = 10n ** 18n;
const YEAR_MS = 365n * 24n * 3600n * 1000n;
const USDB_DECIMALS = 6;

interface VaultInfo {
  vaultId: string;
  parent: string;
  coinType: string;
  decimals: number;
  interestUnit: bigint;
  interestRate: bigint;
  timestampMs: bigint;
}

interface GetObjectResult {
  result?: { data?: { type?: string; content?: { fields?: Record<string, unknown> } } };
}

interface DynFieldResult {
  result?: { data?: { content?: { fields?: Record<string, unknown> } } };
  error?: unknown;
}

let vaultCache: Promise<VaultInfo[]> | null = null;

function genericOf(type: string | undefined): string {
  const m = type?.match(/<(.+)>$/);
  return m ? m[1] : "";
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

/** double::Double {fields:{value}} (or a bare value) -> bigint scaled by 1e18. */
function doubleVal(field: unknown): bigint {
  const f = field as { fields?: { value?: unknown }; value?: unknown } | undefined;
  return bigOf(f?.fields?.value ?? f?.value);
}

/**
 * Read each known Vault once: position_table parent, decimals, interest index/rate/timestamp.
 *
 * All-or-nothing and parallel: the reads are independent (collapse 3 round-trips
 * to ~1), and a transient failure on ANY vault THROWS rather than returning a
 * partial set. getVaults()'s `.catch` then resets the cache so the next call
 * retries, instead of memoizing a short list that would silently hide a whole
 * collateral type (e.g. all SUI CDPs) for the lifetime of the process.
 */
async function buildVaults(): Promise<VaultInfo[]> {
  return Promise.all(
    BUCKET_VAULTS.map(async (vaultId): Promise<VaultInfo> => {
      const body = await defiRpcCall<GetObjectResult>({
        jsonrpc: "2.0",
        id: 1,
        method: "sui_getObject",
        params: [vaultId, { showType: true, showContent: true }],
      });
      const data = body?.result?.data;
      const f = data?.content?.fields;
      if (!f) throw new Error(`bucket: vault ${vaultId} returned no content`);
      const parent = (f.position_table as { fields?: { id?: { id?: string } } } | undefined)?.fields
        ?.id?.id;
      if (!parent) throw new Error(`bucket: vault ${vaultId} missing position_table parent`);
      return {
        vaultId,
        parent,
        coinType: genericOf(data?.type),
        decimals: Number(f.decimal ?? 9),
        interestUnit: doubleVal(f.interest_unit),
        interestRate: doubleVal(f.interest_rate),
        timestampMs: bigOf(f.timestamp),
      };
    }),
  );
}

function getVaults(): Promise<VaultInfo[]> {
  if (!vaultCache) {
    vaultCache = buildVaults().catch(() => {
      vaultCache = null;
      return [];
    });
  }
  return vaultCache;
}

/** Native Bucket CDP: read the user's Position (collateral + USDB debt) per vault, with USD valuation. */
export const nativeBucketAdapter: ProtocolPositionAdapter = {
  id: "native-bucket",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const vaults = await getVaults();

    const raw = await Promise.all(
      vaults.map(async (v) => {
        const body = await defiRpcCall<DynFieldResult>({
          jsonrpc: "2.0",
          id: 1,
          method: "suix_getDynamicFieldObject",
          params: [v.parent, { type: "address", value: address }],
        });
        if (!body || body.error) return null;

        // Field<address, Node<address, Position>> -> value.fields.value.fields = Position.
        const node = body.result?.data?.content?.fields?.value as
          | { fields?: { value?: { fields?: Record<string, unknown> } } }
          | undefined;
        const pos = node?.fields?.value?.fields;
        if (!pos) return null;

        const coll = bigOf(pos.coll_amount);
        const debt = bigOf(pos.debt_amount);
        if (coll === 0n && debt === 0n) return null;
        return { v, pos, coll, debt };
      }),
    );

    const hits = raw.filter((r): r is NonNullable<typeof r> => r !== null);
    if (hits.length === 0) return [];

    const symbols = [
      ...new Set(hits.map((h) => symbolFromCoinType(h.v.coinType)).filter((s): s is string => !!s)),
    ];
    const prices = await getUsdPrices(symbols);
    const nowMs = BigInt(Date.now());

    return hits.map(({ v, pos, coll, debt }): ResolvedPosition => {
      // Accrue the vault interest index to "now", then the per-position debt.
      const accrued =
        v.timestampMs > 0n && nowMs > v.timestampMs
          ? (v.interestRate * (nowMs - v.timestampMs)) / YEAR_MS
          : 0n;
      const vaultIuNow = v.interestUnit + accrued;
      const posIu = doubleVal(pos.interest_unit);
      const debtUnits = (debt * (DOUBLE + vaultIuNow - posIu)) / DOUBLE;
      const debtUsd = Number(debtUnits) / 10 ** USDB_DECIMALS;

      const sym = symbolFromCoinType(v.coinType);
      const px = sym ? prices.get(sym) : undefined;
      const collTokens = Number(coll) / 10 ** v.decimals;
      const collUsd = px !== undefined ? collTokens * px : null;
      const valueUsd = collUsd !== null ? collUsd - debtUsd : null;

      return {
        protocol: "Bucket",
        category: "cdp",
        positionType: "cdp",
        label: `Bucket ${sym ?? v.coinType.split("::").pop() ?? "?"} CDP`,
        objectId: v.vaultId,
        valueUsd,
        source: "native",
        details: {
          collateralCoinType: v.coinType,
          collateralDecimals: v.decimals,
          collAmount: str(coll),
          collateralTokens: collTokens,
          collateralUsd: collUsd,
          debtAmount: str(debt),
          debtUsdb: Number(debtUnits) / 10 ** USDB_DECIMALS,
          debtCoin: "USDB",
        },
      };
    });
  },
};

export async function inspectNativeBucket(address: string): Promise<{
  count: number;
  positions: ResolvedPosition[];
}> {
  const positions = await nativeBucketAdapter.fetchPositions(address);
  return { count: positions.length, positions };
}

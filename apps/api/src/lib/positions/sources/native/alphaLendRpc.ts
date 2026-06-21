import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import type { ResolvedPosition } from "../../types.js";
import { getUsdPrices } from "../../../prices.js";
import { priceSymbolForTicker, symbolFromCoinType } from "../../coinSymbol.js";
import { defiRpcCall, fetchOwnedObjectsByFilter } from "./rpcClient.js";

// AlphaLend (alphalend) lending. A user owns a `PositionCap` whose `position_id`
// points at a `Position` in shared storage (Table<ID, Position>). The Position
// stores raw per-market balances, NOT a usable USD total: total_collateral_usd /
// total_loan_usd are only written when the position is "refreshed" on-chain, so a
// fresh add_collateral leaves them at 0 (last_refreshed = 0). We therefore value
// from the raw balances + the live market indices, which is refresh-independent:
//
//   markets[id] (Table<u64, Market>) -> { coin_type, xtoken_ratio (Number 1e18),
//                                         compounded_interest (Number 1e18),
//                                         decimal_digit = 1e18 * 10^coin_decimals }
//   collateral: underlying = xtoken * xtoken_ratio / decimal_digit ; usd = underlying * price
//   loan:       owed = amount * market.compounded_interest / loan.borrow_compounded_interest
//               usd  = owed / 10^coin_decimals * price          (10^dec = decimal_digit / 1e18)
//   net_usd = collateral_usd - loan_usd
// Verified live: whale 0x137c9e55 ~ $13.5k net; yoshi's fresh deposit ~ $1.25
// (954427266 SUI-xtoken ~1.0 SUI + 464219 USDC-xtoken ~0.50 USDC), which the
// total_collateral_usd path reported as $0.
const ALPHALEND_POSITION_CAP =
  "0xd631cd66138909636fc3f73ed75820d0c5b76332d1644608ed1c85ea2b8219b4::position::PositionCap";
const POSITION_TABLE =
  "0x9923cec7b613e58cc3feec1e8651096ad7970c0b4ef28b805c7d97fe58ff91ba";
const MARKETS_TABLE =
  "0x2326d387ba8bb7d24aa4cfa31f9a1e58bf9234b097574afb06c5dfb267df4c2e";

const DOUBLE = 10n ** 18n;
const AMT_SCALE = 10n ** 9n; // keep 9 fractional digits when converting BigInt -> Number

interface DynFieldResult {
  result?: { data?: { content?: { fields?: Record<string, unknown> } } };
  error?: unknown;
}

interface MarketInfo {
  coinType: string;
  priceSymbol: string;
  xtokenRatio: bigint;
  compoundedInterest: bigint;
  decimalDigit: bigint;
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
/** math::Number {fields:{value}} (or bare value) -> bigint scaled by 1e18. */
function numberVal(field: unknown): bigint {
  const f = field as { fields?: { value?: unknown }; value?: unknown } | undefined;
  return bigOf(f?.fields?.value ?? f?.value);
}
function fieldsOf(v: unknown): Record<string, unknown> | undefined {
  return (v as { fields?: Record<string, unknown> } | undefined)?.fields;
}
function vecMapEntries(v: unknown): Record<string, unknown>[] {
  const contents = fieldsOf(v)?.contents;
  if (!Array.isArray(contents)) return [];
  return contents.map((e) => fieldsOf(e)).filter((f): f is Record<string, unknown> => !!f);
}

// AlphaLend markets are global (same for every wallet) and their indices drift
// only slowly, so cache reads at module scope with a short TTL to dedup across
// wallets / WhalesPage fan-out / cache rebuilds (within the 45s snapshot budget).
const marketCache = new Map<string, { at: number; info: MarketInfo | null }>();
const MARKET_TTL_MS = 45_000;

/** Read one AlphaLend market (module-cached, short TTL). */
async function readMarket(marketId: string): Promise<MarketInfo | null> {
  const cached = marketCache.get(marketId);
  if (cached && Date.now() - cached.at < MARKET_TTL_MS) return cached.info;

  const body = await defiRpcCall<DynFieldResult>({
    jsonrpc: "2.0",
    id: 1,
    method: "suix_getDynamicFieldObject",
    params: [MARKETS_TABLE, { type: "u64", value: marketId }],
  });
  const m = fieldsOf(body?.result?.data?.content?.fields?.value);
  if (!m || body?.error) {
    // Don't cache a transient miss for long — let the next call retry.
    return null;
  }
  const coinType = str((fieldsOf(m.coin_type)?.name ?? m.coin_type) as unknown);
  const ticker = symbolFromCoinType(coinType);
  const info: MarketInfo = {
    coinType,
    priceSymbol: ticker ? priceSymbolForTicker(ticker) : "",
    xtokenRatio: numberVal(m.xtoken_ratio),
    compoundedInterest: numberVal(m.compounded_interest),
    decimalDigit: numberVal(m.decimal_digit),
  };
  marketCache.set(marketId, { at: Date.now(), info });
  return info;
}

/** Native AlphaLend: value each owned position from its raw balances + live market indices. */
export const nativeAlphaLendAdapter: ProtocolPositionAdapter = {
  id: "native-alphalend",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const caps = await fetchOwnedObjectsByFilter(
      address,
      { StructType: ALPHALEND_POSITION_CAP },
      5,
    );
    if (caps.length === 0) return [];

    const rows = await Promise.all(
      caps.map(async (cap): Promise<ResolvedPosition | null> => {
        const positionId = str(cap.content?.fields?.position_id);
        if (!positionId) return null;

        const body = await defiRpcCall<DynFieldResult>({
          jsonrpc: "2.0",
          id: 1,
          method: "suix_getDynamicFieldObject",
          params: [POSITION_TABLE, { type: "0x2::object::ID", value: positionId }],
        });
        if (!body || body.error) return null;
        const pos = fieldsOf(body.result?.data?.content?.fields?.value);
        if (!pos) return null;

        const collaterals = vecMapEntries(pos.collaterals).map((e) => ({
          marketId: str(e.key),
          xtoken: bigOf(e.value),
        }));
        const loans = (Array.isArray(pos.loans) ? pos.loans : [])
          .map((l) => fieldsOf(l))
          .filter((f): f is Record<string, unknown> => !!f)
          .map((f) => ({
            marketId: str(f.market_id),
            amount: bigOf(f.amount),
            borrowCi: numberVal(f.borrow_compounded_interest),
          }));

        if (collaterals.length === 0 && loans.length === 0) return null;

        // Resolve every referenced market, then price.
        const marketIds = [
          ...new Set([
            ...collaterals.map((c) => c.marketId),
            ...loans.map((l) => l.marketId),
          ]),
        ];
        const markets = new Map<string, MarketInfo>();
        await Promise.all(
          marketIds.map(async (id) => {
            const m = await readMarket(id);
            if (m) markets.set(id, m);
          }),
        );
        const symbols = [
          ...new Set([...markets.values()].map((m) => m.priceSymbol).filter(Boolean)),
        ];
        const prices = await getUsdPrices(symbols);

        let collateralUsd = 0;
        let loanUsd = 0;
        let fullyPriced = true;

        for (const c of collaterals) {
          if (c.xtoken === 0n) continue;
          const m = markets.get(c.marketId);
          const px = m ? prices.get(m.priceSymbol) : undefined;
          if (!m || m.decimalDigit === 0n || px === undefined) {
            fullyPriced = false;
            continue;
          }
          const tokens = Number((c.xtoken * m.xtokenRatio * AMT_SCALE) / m.decimalDigit) / 1e9;
          collateralUsd += tokens * px;
        }

        for (const l of loans) {
          if (l.amount === 0n) continue;
          const m = markets.get(l.marketId);
          const px = m ? prices.get(m.priceSymbol) : undefined;
          if (!m || m.decimalDigit === 0n || px === undefined) {
            fullyPriced = false;
            continue;
          }
          const owed = l.borrowCi > 0n ? (l.amount * m.compoundedInterest) / l.borrowCi : l.amount;
          const tenPowDec = m.decimalDigit / DOUBLE; // = 10^coin_decimals
          const tokens = tenPowDec > 0n ? Number((owed * AMT_SCALE) / tenPowDec) / 1e9 : 0;
          loanUsd += tokens * px;
        }

        const net = collateralUsd - loanUsd;

        return {
          protocol: "AlphaLend",
          category: "lending",
          positionType: "alphalend-position",
          label: "AlphaLend Lending",
          objectId: cap.objectId,
          valueUsd: net,
          source: "native",
          details: {
            positionId,
            collateralUsd,
            loanUsd,
            fullyPriced,
          },
        };
      }),
    );

    return rows.filter((r): r is ResolvedPosition => r !== null);
  },
};

export async function inspectNativeAlphaLend(address: string): Promise<{
  count: number;
  positions: ResolvedPosition[];
}> {
  const positions = await nativeAlphaLendAdapter.fetchPositions(address);
  return { count: positions.length, positions };
}

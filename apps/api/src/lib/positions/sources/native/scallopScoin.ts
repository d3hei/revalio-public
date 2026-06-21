import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeCoinType } from "../../../coinType.js";
import { getOnDemandBalances } from "../../../mainnetBalances.js";
import { symbolFromCoinType } from "../../coinSymbol.js";
import type { ResolvedPosition } from "../../types.js";
import { fetchCoinDecimals } from "./rpcClient.js";
import { SCALLOP_SCOIN_UNDERLYING } from "./scallopPackages.js";

const SCALLOP_MARKET_ID =
  "0xa757975255146dc9686aa823b7838b507f315d704f428cbadad2f4ea061939d9";
const SCALLOP_QUERY_PACKAGE =
  "0xbd4f1adbef14cf6ddf31cf637adaa7227050424286d733dc44e6fd3318fc6ba3";
const DEVINSPECT_SENDER =
  "0x0000000000000000000000000000000000000000000000000000000000000001";

const RATE_CACHE_TTL_MS = 5 * 60 * 1000;

let rateCache: { fetchedAt: number; byAsset: Map<string, bigint> } | null = null;

export function isScallopMarketCoin(coinType: string): boolean {
  const base = normalizeCoinType(coinType.split("<")[0] ?? coinType);
  if (SCALLOP_SCOIN_UNDERLYING[base]) return true;
  return /::scallop_[a-z0-9_]+::/i.test(base);
}

function underlyingCoinTypeForScoin(scoinType: string): string | null {
  const base = normalizeCoinType(scoinType.split("<")[0] ?? scoinType);
  const mapped = SCALLOP_SCOIN_UNDERLYING[base];
  if (mapped) return normalizeCoinType(mapped);
  return null;
}

function parseTypeName(value: unknown): string | null {
  if (typeof value === "string" && value.includes("::")) return normalizeCoinType(value);
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.name === "string" && obj.name.includes("::")) {
    return normalizeCoinType(obj.name);
  }
  const fields = (value as { fields?: { name?: unknown } }).fields;
  if (typeof fields?.name === "string" && fields.name.includes("::")) {
    return normalizeCoinType(fields.name);
  }
  return null;
}

function parseU64(value: unknown): bigint | null {
  if (typeof value === "string" && value.length > 0) {
    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  return null;
}

/** underlying_raw = scoin_raw * rate / 1e18 (Compound-style exchange rate). */
function underlyingFromScoin(scoinRaw: bigint, rateE18: bigint): bigint {
  if (scoinRaw <= 0n || rateE18 <= 0n) return 0n;
  return (scoinRaw * rateE18) / 10n ** 18n;
}

async function fetchScoinExchangeRates(): Promise<Map<string, bigint>> {
  if (rateCache && Date.now() - rateCache.fetchedAt < RATE_CACHE_TTL_MS) {
    return rateCache.byAsset;
  }

  const byAsset = new Map<string, bigint>();
  const prevSupply = new Map<string, bigint>();
  try {
    const client = new SuiClient({ url: "https://fullnode.mainnet.sui.io:443" });
    const tx = new Transaction();
    tx.moveCall({
      target: `${SCALLOP_QUERY_PACKAGE}::market_query::market_data`,
      arguments: [tx.object(SCALLOP_MARKET_ID)],
    });
    const inspected = await client.devInspectTransactionBlock({
      sender: DEVINSPECT_SENDER,
      transactionBlock: tx,
    });

    for (const event of inspected.events ?? []) {
      if (!event.parsedJson || typeof event.parsedJson !== "object") continue;
      const pools = (event.parsedJson as { pools?: unknown[] }).pools;
      if (!Array.isArray(pools)) continue;
      for (const pool of pools) {
        if (!pool || typeof pool !== "object") continue;
        const assetType = parseTypeName((pool as { type?: unknown }).type);
        const cash = parseU64((pool as { cash?: unknown }).cash);
        const debt = parseU64((pool as { debt?: unknown }).debt);
        const reserve = parseU64((pool as { reserve?: unknown }).reserve);
        const supply = parseU64((pool as { marketCoinSupply?: unknown }).marketCoinSupply);
        if (!assetType || !cash || !debt || !reserve || !supply || supply === 0n) continue;
        const underlying = cash + debt - reserve;
        if (underlying <= 0n) continue;
        const rateE18 = (underlying * 10n ** 18n) / supply;
        if (rateE18 <= 0n) continue;
        const prev = byAsset.get(assetType);
        if (prev === undefined || supply > (prevSupply.get(assetType) ?? 0n)) {
          byAsset.set(assetType, rateE18);
          prevSupply.set(assetType, supply);
        }
      }
    }
  } catch {
    /* fall back to 1:1 below */
  }

  rateCache = { fetchedAt: Date.now(), byAsset };
  return byAsset;
}

export async function getScallopMarketCoinTypes(): Promise<Set<string>> {
  return new Set(Object.keys(SCALLOP_SCOIN_UNDERLYING).map(normalizeCoinType));
}

/** Wallet-held Scallop sCoins (pure lending supply, not obligation collateral). */
export async function fetchScallopScoinSupplyPositions(
  address: string,
): Promise<ResolvedPosition[]> {
  const [balances, rates] = await Promise.all([
    getOnDemandBalances(address),
    fetchScoinExchangeRates(),
  ]);

  const out: ResolvedPosition[] = [];
  for (const row of balances) {
    const scoinType = normalizeCoinType(row.coin_type);
    if (!isScallopMarketCoin(scoinType)) continue;

    const underlyingType = underlyingCoinTypeForScoin(scoinType);
    if (!underlyingType) continue;

    let scoinRaw: bigint;
    try {
      scoinRaw = BigInt(row.balance);
    } catch {
      continue;
    }
    if (scoinRaw <= 0n) continue;

    const rateE18 = rates.get(underlyingType) ?? 10n ** 18n;
    const underlyingRaw = underlyingFromScoin(scoinRaw, rateE18);
    if (underlyingRaw <= 0n) continue;

    const sym = symbolFromCoinType(underlyingType) ?? "?";
    const decimals =
      sym === "USDC" || sym === "USDT" ? 6 : sym === "SUI" ? 9 : await fetchCoinDecimals(underlyingType);

    out.push({
      protocol: "Scallop",
      category: "lending",
      positionType: "scallop-supply",
      label: `Supply ${sym}`,
      objectId: null,
      valueUsd: null,
      source: "native",
      details: {
        coinType: underlyingType,
        marketCoinType: scoinType,
        suppliedCoin: underlyingRaw.toString(),
        coinDecimals: decimals,
        symbol: sym,
        scoinBalance: scoinRaw.toString(),
        exchangeRateE18: rateE18.toString(),
      },
    });
  }

  return out;
}

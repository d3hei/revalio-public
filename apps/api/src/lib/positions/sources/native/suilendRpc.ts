import { normalizeCoinType } from "../../../coinType.js";
import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import { symbolFromCoinType } from "../../coinSymbol.js";
import type { ResolvedPosition } from "../../types.js";
import { fetchCoinDecimals, fetchObject, fetchOwnedObjectsByFilter } from "./rpcClient.js";
import { suilendCapFilter } from "./suilendPackages.js";
import { parseDecimal, parseObjectId, parseTypeName, parseVectorContents } from "./suiFields.js";

function isSuilendCapType(type: string | null | undefined): boolean {
  return Boolean(type?.includes("lending_market::ObligationOwnerCap"));
}

function isSuilendObligationType(type: string | null | undefined): boolean {
  return Boolean(type?.includes("obligation::Obligation"));
}

function parseObligationIdFromCap(fields: Record<string, unknown>): string | null {
  return (
    parseObjectId(fields.obligation_id) ??
    parseObjectId((fields.obligation_id as { fields?: unknown } | undefined)?.fields)
  );
}

// The lending market (~400KB, reserves inlined) is a single shared mainnet object,
// identical for every Suilend user, and its reserve ratios drift only on chain
// interaction — so cache it briefly (within the 45s snapshot budget) instead of
// re-fetching per wallet / per obligation cap / per cache rebuild.
let lmReservesCache: { id: string; at: number; reserves: Record<string, unknown>[] } | null = null;
const LM_TTL_MS = 45_000;

async function getLendingMarketReserves(lendingMarketId: string): Promise<Record<string, unknown>[]> {
  if (lmReservesCache && lmReservesCache.id === lendingMarketId && Date.now() - lmReservesCache.at < LM_TTL_MS) {
    return lmReservesCache.reserves;
  }
  const lm = await fetchObject(lendingMarketId);
  const reserves = parseVectorContents(lm?.content?.fields?.reserves);
  if (reserves.length > 0) lmReservesCache = { id: lendingMarketId, at: Date.now(), reserves };
  return reserves;
}

/**
 * cToken -> underlying ratio for a Suilend reserve (cTokens accrue interest, so a
 * deposit's underlying = ctoken_amount * ratio). Returns null when unavailable.
 * ratio = (available + borrowed - unclaimed_spread_fees) / ctoken_supply.
 */
function reserveCtokenRatio(r: Record<string, unknown>): number | null {
  const avail = Number(r.available_amount);
  const supply = Number(r.ctoken_supply);
  if (!Number.isFinite(avail) || !Number.isFinite(supply) || supply === 0) return null;
  const borrowed = parseDecimal(r.borrowed_amount) ?? 0;
  const fees = parseDecimal(r.unclaimed_spread_fees) ?? 0;
  return (avail + borrowed - fees) / supply;
}

async function decodeObligation(
  cap: { objectId: string; obligationId: string },
): Promise<ResolvedPosition[]> {
  const obligation = await fetchObject(cap.obligationId);
  if (!obligation?.content?.fields || !isSuilendObligationType(obligation.type)) return [];

  const fields = obligation.content.fields;
  const rows: ResolvedPosition[] = [];

  // Resolve the cToken exchange rate per deposit from the (cached) lending market.
  const lendingMarketId = parseObjectId(fields.lending_market_id);
  const reserves = lendingMarketId ? await getLendingMarketReserves(lendingMarketId) : [];

  for (const deposit of parseVectorContents(fields.deposits)) {
    const coinType = parseTypeName(deposit.coin_type);
    const ctoken = deposit.deposited_ctoken_amount;
    if (!coinType) continue;
    const ctokenRaw = typeof ctoken === "string" || typeof ctoken === "number" ? String(ctoken) : null;
    if (!ctokenRaw || ctokenRaw === "0") continue;

    // Convert cTokens to underlying via the reserve ratio (interest accrual).
    const idx = Number(deposit.reserve_array_index);
    const reserve = Number.isInteger(idx) ? reserves[idx] : undefined;
    const ratio = reserve ? reserveCtokenRatio(reserve) : null;
    const amountRaw = ratio !== null ? String(Math.floor(Number(ctokenRaw) * ratio)) : ctokenRaw;

    const normalized = normalizeCoinType(coinType);
    const sym = symbolFromCoinType(normalized) ?? "?";
    const marketValueUsd = parseDecimal(deposit.market_value);
    const decimals = await fetchCoinDecimals(normalized);

    // The obligation's stored `market_value` is only refreshed on interaction and
    // is frequently stale (observed $634 vs a live $401). Value live instead from
    // the cToken amount * spot price in enrichPositionsWithPrices (the suilend-supply
    // fallback); keep the stale figure only for reference.
    rows.push({
      protocol: "Suilend",
      category: "lending",
      positionType: "suilend-supply",
      label: `Supply ${sym}`,
      objectId: cap.obligationId,
      valueUsd: null,
      source: "native",
      details: {
        obligationId: cap.obligationId,
        capId: cap.objectId,
        coinType: normalized,
        amount: amountRaw,
        symbol: sym,
        coinDecimals: decimals,
        marketValueUsd: null,
        staleMarketValueUsd: marketValueUsd,
        reserveArrayIndex: deposit.reserve_array_index,
      },
    });
  }

  for (const borrow of parseVectorContents(fields.borrows)) {
    const coinType = parseTypeName(borrow.coin_type);
    if (!coinType) continue;
    const normalized = normalizeCoinType(coinType);
    const sym = symbolFromCoinType(normalized) ?? "?";
    const marketValueUsd = parseDecimal(borrow.market_value);
    // borrowed_amount is a Decimal (1e18) of the raw coin amount (already incl.
    // accrued interest). parseDecimal removes the 1e18 scale, leaving raw base
    // units; floor to an integer so the valuation divides by the coin decimals.
    const borrowed = parseDecimal(borrow.borrowed_amount);
    const decimals = await fetchCoinDecimals(normalized);

    // Stored market_value is stale (observed $377 vs a live $230); value live from
    // the borrowed amount * spot price via the suilend-borrow fallback.
    rows.push({
      protocol: "Suilend",
      category: "lending",
      positionType: "suilend-borrow",
      label: `Borrow ${sym}`,
      objectId: cap.obligationId,
      valueUsd: null,
      source: "native",
      details: {
        obligationId: cap.obligationId,
        capId: cap.objectId,
        coinType: normalized,
        amount: borrowed !== null ? String(Math.floor(borrowed)) : null,
        symbol: sym,
        coinDecimals: decimals,
        marketValueUsd: null,
        staleMarketValueUsd: marketValueUsd,
        reserveArrayIndex: borrow.reserve_array_index,
      },
    });
  }

  if (rows.length === 0) {
    const depositedUsd = parseDecimal(fields.deposited_value_usd);
    const borrowedUsd = parseDecimal(fields.unweighted_borrowed_value_usd);
    if ((depositedUsd ?? 0) > 0 || (borrowedUsd ?? 0) > 0) {
      rows.push({
        protocol: "Suilend",
        category: "lending",
        positionType: "lending",
        label: "Suilend Lending",
        objectId: cap.obligationId,
        valueUsd:
          depositedUsd !== null && borrowedUsd !== null ? depositedUsd - borrowedUsd : null,
        source: "native",
        details: {
          capId: cap.objectId,
          obligationId: cap.obligationId,
          depositedValueUsd: depositedUsd,
          borrowedValueUsd: borrowedUsd,
        },
      });
    }
  }

  return rows;
}

/** Native Suilend: ObligationOwnerCap → obligation deposits/borrows. */
export const nativeSuilendAdapter: ProtocolPositionAdapter = {
  id: "native-suilend",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const caps = await fetchOwnedObjectsByFilter(address, suilendCapFilter(), 4);

    const decoded = await Promise.all(
      caps.map(async (cap) => {
        if (!cap.content?.fields || !isSuilendCapType(cap.type)) return [];
        const obligationId = parseObligationIdFromCap(cap.content.fields);
        if (!obligationId) return [];
        return decodeObligation({ objectId: cap.objectId, obligationId });
      }),
    );

    return decoded.flat();
  },
};

export async function inspectNativeSuilend(address: string): Promise<{
  caps: number;
  supplyRows: number;
  borrowRows: number;
  positions: ResolvedPosition[];
}> {
  const positions = await nativeSuilendAdapter.fetchPositions(address);
  return {
    caps: new Set(positions.map((p) => p.details.capId)).size,
    supplyRows: positions.filter((p) => p.positionType === "suilend-supply").length,
    borrowRows: positions.filter((p) => p.positionType === "suilend-borrow").length,
    positions,
  };
}

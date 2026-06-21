import { getCoinTypeUsdPrices, getUsdPrices } from "../prices.js";
import { symbolFromCoinType, priceSymbolForTicker } from "./coinSymbol.js";
import type { ResolvedPosition } from "./types.js";

function decimalsForSymbol(sym: string): number {
  if (sym === "USDC" || sym === "USDT" || sym === "DEEP") return 6;
  return 9;
}

function parseHumanAmount(raw: unknown, symbol: string, explicitDecimals?: number): number {
  if (raw === undefined || raw === null) return 0;
  const s = String(raw);
  if (s.includes(".")) {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return n / 10 ** (explicitDecimals ?? decimalsForSymbol(symbol));
}

function lpValueFromDetails(
  details: Record<string, unknown>,
  prices: Map<string, number>,
): number | null {
  const coinTypeA = typeof details.coinTypeA === "string" ? details.coinTypeA : null;
  const coinTypeB = typeof details.coinTypeB === "string" ? details.coinTypeB : null;
  const symA = coinTypeA ? symbolFromCoinType(coinTypeA) : null;
  const symB = coinTypeB ? symbolFromCoinType(coinTypeB) : null;
  if (!symA && !symB) return null;

  let total = 0;
  let hasPrice = false;
  const decA =
    typeof details.coinTypeADecimals === "number" ? details.coinTypeADecimals : undefined;
  const decB =
    typeof details.coinTypeBDecimals === "number" ? details.coinTypeBDecimals : undefined;

  if (symA && details.balanceA != null) {
    const px = prices.get(symA);
    if (px !== undefined) {
      total += parseHumanAmount(details.balanceA, symA, decA) * px;
      hasPrice = true;
    }
  }
  if (symB && details.balanceB != null) {
    const px = prices.get(symB);
    if (px !== undefined) {
      total += parseHumanAmount(details.balanceB, symB, decB) * px;
      hasPrice = true;
    }
  }
  return hasPrice ? total : null;
}

/** Collect ticker symbols needed to price position rows (single batched Pyth call). */
export function collectSymbolsFromPositions(positions: ResolvedPosition[]): string[] {
  const syms = new Set<string>();
  for (const p of positions) {
    const d = p.details;
    if (typeof d.symbol === "string" && d.symbol.length > 0) {
      const upper = d.symbol.toUpperCase();
      syms.add(upper);
      syms.add(priceSymbolForTicker(upper));
    }
    if (typeof d.coinType === "string") {
      const sym = symbolFromCoinType(d.coinType);
      if (sym) syms.add(sym);
    }
    if (typeof d.depositSymbol === "string" && d.depositSymbol.length > 0) {
      syms.add(d.depositSymbol.toUpperCase());
    }
    if (typeof d.coinTypeA === "string") {
      const sym = symbolFromCoinType(d.coinTypeA);
      if (sym) syms.add(sym);
    }
    if (typeof d.coinTypeB === "string") {
      const sym = symbolFromCoinType(d.coinTypeB);
      if (sym) syms.add(sym);
    }
    if (Array.isArray(d.debts)) {
      for (const row of d.debts) {
        if (!row || typeof row !== "object") continue;
        const coinType = (row as { coinType?: string }).coinType;
        if (typeof coinType === "string") {
          const sym = symbolFromCoinType(coinType);
          if (sym) syms.add(sym);
        }
      }
    }
    if (p.positionType === "native-staking") {
      syms.add("SUI");
    }
  }
  return [...syms];
}

export function resolvePositionValueUsd(
  p: ResolvedPosition,
  prices: Map<string, number>,
): number | null {
  const d = p.details;

  if (p.positionType === "scallop-supply") {
    if (typeof d.suppliedValue === "number" && d.suppliedValue > 0) return d.suppliedValue;
    if (typeof d.coinType === "string" && d.suppliedCoin != null) {
      const sym =
        (typeof d.symbol === "string" ? d.symbol.toUpperCase() : null) ??
        symbolFromCoinType(d.coinType);
      if (!sym) return null;
      const px = prices.get(sym);
      if (px === undefined) return null;
      const dec = typeof d.coinDecimals === "number" ? d.coinDecimals : undefined;
      return parseHumanAmount(d.suppliedCoin, sym, dec) * px;
    }
  }
  if (p.positionType === "ve-sca") {
    if (typeof d.lockedScaInUsd === "number" && d.lockedScaInUsd > 0) return d.lockedScaInUsd;
    if (typeof d.coinType === "string" && d.lockedScaAmount != null) {
      const sym = symbolFromCoinType(d.coinType) ?? "SCA";
      const px = prices.get(sym);
      if (px === undefined) return null;
      const dec = typeof d.coinDecimals === "number" ? d.coinDecimals : 9;
      return parseHumanAmount(d.lockedScaAmount, sym, dec) * px;
    }
  }
  if (p.positionType === "scallop-borrow") {
    if (typeof d.totalCollateralInUsd === "number" || typeof d.totalDebtsInUsd === "number") {
      const collateral = Number(d.totalCollateralInUsd ?? 0);
      const debt = Number(d.totalDebtsInUsd ?? 0);
      if (collateral < 0.01 && debt < 0.01) return null;
      return collateral - debt;
    }
    const debts = Array.isArray(d.debts) ? d.debts : [];
    let debtUsd = 0;
    let hasDebtPrice = false;
    for (const row of debts) {
      if (!row || typeof row !== "object") continue;
      const coinType = typeof (row as { coinType?: string }).coinType === "string"
        ? (row as { coinType: string }).coinType
        : null;
      const amount = (row as { amount?: string }).amount;
      if (!coinType || amount == null) continue;
      const sym = symbolFromCoinType(coinType);
      if (!sym) continue;
      const px = prices.get(sym);
      if (px === undefined) continue;
      debtUsd += parseHumanAmount(amount, sym) * px;
      hasDebtPrice = true;
    }
    return hasDebtPrice ? -debtUsd : null;
  }
  if (p.positionType === "suilend-supply" || p.positionType === "suilend-borrow") {
    const marketUsd = typeof d.marketValueUsd === "number" ? d.marketValueUsd : null;
    if (marketUsd !== null && marketUsd > 0) {
      return p.positionType === "suilend-borrow" ? -marketUsd : marketUsd;
    }
    if (typeof d.coinType === "string" && d.amount != null) {
      const sym = symbolFromCoinType(d.coinType);
      if (!sym) return null;
      const px = prices.get(sym);
      if (px === undefined) return null;
      const dec = typeof d.coinDecimals === "number" ? d.coinDecimals : undefined;
      const amount = parseHumanAmount(d.amount, sym, dec);
      const gross = amount * px;
      return p.positionType === "suilend-borrow" ? -gross : gross;
    }
  }
  if (p.positionType === "native-staking" && d.principal != null) {
    const px = prices.get("SUI");
    if (px === undefined) return null;
    return parseHumanAmount(d.principal, "SUI", 9) * px;
  }
  if (p.positionType === "supply" || p.positionType === "borrow") {
    const sym =
      (typeof d.symbol === "string" ? d.symbol.toUpperCase() : null) ??
      (typeof d.coinType === "string" ? symbolFromCoinType(d.coinType) : null);
    if (!sym || d.value == null) return null;
    const dec =
      typeof d.naviScaleDecimals === "number"
        ? d.naviScaleDecimals
        : typeof d.coinDecimals === "number"
          ? d.coinDecimals
          : undefined;
    const amount = parseHumanAmount(d.value, sym, dec);
    if (!Number.isFinite(amount) || Math.abs(amount) < 1e-12) return null;
    const px = prices.get(sym) ?? prices.get(priceSymbolForTicker(sym));
    if (px === undefined) return null;
    const gross = amount * px;
    return p.positionType === "borrow" ? -gross : gross;
  }
  if (typeof d.coinTypeA === "string" && d.balanceA != null) {
    return lpValueFromDetails(d, prices);
  }
  if (p.positionType === "ember-vault") {
    if (typeof p.valueUsd === "number" && p.valueUsd > 0) return p.valueUsd;
    if (typeof d.coinType === "string" && d.balance != null) {
      const sym =
        (typeof d.depositSymbol === "string" ? d.depositSymbol.toUpperCase() : null) ??
        symbolFromCoinType(d.coinType);
      if (!sym) return null;
      const px = prices.get(sym);
      if (px === undefined) return null;
      const dec = typeof d.coinDecimals === "number" ? d.coinDecimals : undefined;
      return parseHumanAmount(d.balance, sym, dec) * px;
    }
  }
  if (typeof d.coinType === "string" && d.balance != null) {
    const sym = symbolFromCoinType(d.coinType);
    if (!sym) return null;
    const px = prices.get(sym);
    if (px === undefined) return null;
    return parseHumanAmount(d.balance, sym) * px;
  }
  return p.valueUsd;
}

/** Collect every coin type referenced by position rows, paired with its symbol. */
function collectCoinPricingFromPositions(
  positions: ResolvedPosition[],
): { coinType: string; symbol: string | null }[] {
  const seen = new Map<string, { coinType: string; symbol: string | null }>();
  const add = (coinType: unknown): void => {
    if (typeof coinType !== "string" || !coinType.includes("::") || seen.has(coinType)) return;
    seen.set(coinType, { coinType, symbol: symbolFromCoinType(coinType) });
  };
  for (const p of positions) {
    const d = p.details;
    add(d.coinType);
    add(d.coinTypeA);
    add(d.coinTypeB);
    if (Array.isArray(d.debts)) {
      for (const row of d.debts) {
        if (row && typeof row === "object") add((row as { coinType?: string }).coinType);
      }
    }
  }
  return [...seen.values()];
}

/**
 * Fills missing USD on adapter rows. Prices via Pyth where a feed exists, plus a
 * GeckoTerminal market-price fallback (keyed by coin type) so long-tail assets —
 * LSTs, stables and meme coins in lending/LP rows (USDY, vSUI, IKA, SEND, …) — are
 * valued instead of silently counting as $0.
 */
export async function enrichPositionsWithPrices(
  positions: ResolvedPosition[],
): Promise<ResolvedPosition[]> {
  if (positions.length === 0) return positions;

  const prices = await getUsdPrices(collectSymbolsFromPositions(positions));
  const coins = collectCoinPricingFromPositions(positions);
  if (coins.length > 0) {
    const byCoinType = await getCoinTypeUsdPrices(coins);
    for (const c of coins) {
      if (!c.symbol) continue;
      const px = byCoinType.get(c.coinType);
      if (px !== undefined && !prices.has(c.symbol)) prices.set(c.symbol, px);
    }
  }

  return positions.map((p) => {
    const computed = resolvePositionValueUsd(p, prices);
    if (computed !== null) return { ...p, valueUsd: computed };
    return p;
  });
}

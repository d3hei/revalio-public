import { getUsdPrices } from "../../../prices.js";
import { symbolFromCoinType } from "../../coinSymbol.js";
import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import type { ResolvedPosition } from "../../types.js";
import { fetchDefiPortfolio } from "./client.js";
import { unwrapProtocolResult } from "./unwrap.js";

interface NaviSideRow {
  coinType?: string;
  value?: number;
  balance?: number;
  symbol?: string;
  apy?: string | number;
  type?: string;
  logo?: string;
  [key: string]: unknown;
}

interface NaviPortfolio {
  supply?: NaviSideRow[];
  borrow?: NaviSideRow[];
  navi?: NaviSideRow[];
}

async function rowValueUsd(row: NaviSideRow): Promise<number | null> {
  const amount = row.value ?? row.balance;
  if (amount === undefined || !Number.isFinite(amount)) return null;

  const sym =
    (typeof row.symbol === "string" ? row.symbol.toUpperCase() : null) ??
    (typeof row.coinType === "string" ? symbolFromCoinType(row.coinType) : null);
  if (!sym) return null;

  const prices = await getUsdPrices([sym]);
  const px = prices.get(sym);
  if (px === undefined) return null;
  return amount * px;
}

function normalizeNaviRows(portfolio: NaviPortfolio): { supply: NaviSideRow[]; borrow: NaviSideRow[] } {
  if (Array.isArray(portfolio.navi)) {
    const supply: NaviSideRow[] = [];
    const borrow: NaviSideRow[] = [];
    for (const row of portfolio.navi) {
      const kind = String(row.type ?? "").toLowerCase();
      if (kind === "borrow") borrow.push(row);
      else supply.push(row);
    }
    return { supply, borrow };
  }
  return {
    supply: portfolio.supply ?? [],
    borrow: portfolio.borrow ?? [],
  };
}

/** BlockVision NAVI supply / borrow (MVP; replace with native decoder later). */
export const blockvisionNaviAdapter: ProtocolPositionAdapter = {
  id: "blockvision-navi",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const envelope = await fetchDefiPortfolio<NaviPortfolio>(address, "navi");
    if (envelope?.code !== undefined && envelope.code !== 200) return [];
    const portfolio = unwrapProtocolResult<NaviPortfolio>(envelope, "navi", [
      "supply",
      "borrow",
      "navi",
    ]);
    const { supply, borrow } = normalizeNaviRows(portfolio);
    const out: ResolvedPosition[] = [];

    for (const row of supply) {
      if (typeof row.coinType !== "string" || (row.value ?? row.balance ?? 0) === 0) continue;
      const sym =
        (typeof row.symbol === "string" ? row.symbol : null) ??
        symbolFromCoinType(row.coinType) ??
        "?";
      const amount = row.value ?? row.balance ?? 0;
      const valueUsd = await rowValueUsd(row);
      out.push({
        protocol: "Navi",
        category: "lending",
        positionType: "supply",
        label: `Supply ${sym}`,
        objectId: null,
        valueUsd,
        source: "blockvision",
        details: {
          coinType: row.coinType,
          value: amount,
          symbol: sym,
          apy: row.apy,
          logo: row.logo,
        },
      });
    }

    for (const row of borrow) {
      const amount = row.value ?? row.balance ?? 0;
      if (
        typeof row.coinType !== "string" ||
        amount === 0 ||
        Math.abs(amount) < 0.01
      ) {
        continue;
      }
      const sym =
        (typeof row.symbol === "string" ? row.symbol : null) ??
        symbolFromCoinType(row.coinType) ??
        "?";
      const gross = await rowValueUsd(row);
      const valueUsd = gross !== null ? -gross : null;
      out.push({
        protocol: "Navi",
        category: "lending",
        positionType: "borrow",
        label: `Borrow ${sym}`,
        objectId: null,
        valueUsd,
        source: "blockvision",
        details: {
          coinType: row.coinType,
          value: amount,
          symbol: sym,
          apy: row.apy,
          logo: row.logo,
        },
      });
    }

    return out;
  },
};

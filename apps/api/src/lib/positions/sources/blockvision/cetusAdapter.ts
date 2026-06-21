import { normalizeCoinType } from "../../../coinType.js";
import { getUsdPrices } from "../../../prices.js";
import { symbolFromCoinType } from "../../coinSymbol.js";
import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import type { ResolvedPosition } from "../../types.js";
import { fetchDefiPortfolio, isBlockVisionConfigured } from "./client.js";

interface CetusLpRow {
  position?: string;
  pool?: string;
  balanceA?: string;
  balanceB?: string;
  coinTypeA?: string;
  coinTypeB?: string;
  coinTypeADecimals?: number;
  coinTypeBDecimals?: number;
  decimalsA?: number;
  decimalsB?: number;
  apr?: string | number;
  name?: string;
  [key: string]: unknown;
}

interface CetusFarmRow extends CetusLpRow {
  rewards?: unknown;
}

interface CetusVaultRow {
  position?: string;
  vault?: string;
  balance?: string;
  coinType?: string;
  [key: string]: unknown;
}

interface CetusPortfolio {
  lps?: CetusLpRow[];
  farms?: CetusFarmRow[];
  vaults?: CetusVaultRow[];
}

function decimalsForSymbol(sym: string): number {
  if (sym === "USDC" || sym === "USDT") return 6;
  return 9;
}

function parseTokenAmount(raw: string | undefined, symbol: string, explicitDecimals?: number): number {
  if (!raw) return 0;
  if (raw.includes(".")) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  const decimals = explicitDecimals ?? decimalsForSymbol(symbol);
  return n / 10 ** decimals;
}

function rowString(
  row: CetusLpRow,
  key: "coinTypeA" | "coinTypeB" | "balanceA" | "balanceB",
): string | undefined {
  const v = row[key];
  return typeof v === "string" ? v : undefined;
}

function rowNumber(
  row: CetusLpRow,
  key: "coinTypeADecimals" | "coinTypeBDecimals" | "decimalsA" | "decimalsB",
): number | undefined {
  const v = row[key];
  return typeof v === "number" ? v : undefined;
}

async function lpValueUsd(row: CetusLpRow): Promise<number | null> {
  const coinTypeA = rowString(row, "coinTypeA");
  const coinTypeB = rowString(row, "coinTypeB");
  const symA = coinTypeA ? symbolFromCoinType(coinTypeA) : null;
  const symB = coinTypeB ? symbolFromCoinType(coinTypeB) : null;
  const symbols = [symA, symB].filter((s): s is string => Boolean(s));
  if (symbols.length === 0) return null;

  const prices = await getUsdPrices(symbols);
  let total = 0;
  let hasPrice = false;

  const balanceA = rowString(row, "balanceA");
  const balanceB = rowString(row, "balanceB");
  if (symA && balanceA) {
    const px = prices.get(symA);
    if (px !== undefined) {
      total += parseTokenAmount(
        balanceA,
        symA,
        rowNumber(row, "coinTypeADecimals") ?? rowNumber(row, "decimalsA"),
      ) * px;
      hasPrice = true;
    }
  }
  if (symB && balanceB) {
    const px = prices.get(symB);
    if (px !== undefined) {
      total += parseTokenAmount(
        balanceB,
        symB,
        rowNumber(row, "coinTypeBDecimals") ?? rowNumber(row, "decimalsB"),
      ) * px;
      hasPrice = true;
    }
  }
  return hasPrice ? total : null;
}

function poolLabel(row: CetusLpRow): string {
  const coinTypeA = rowString(row, "coinTypeA");
  const coinTypeB = rowString(row, "coinTypeB");
  const symA = coinTypeA ? symbolFromCoinType(coinTypeA) : "?";
  const symB = coinTypeB ? symbolFromCoinType(coinTypeB) : "?";
  return `${symA ?? "?"}+${symB ?? "?"}`;
}

export function unwrapCetusResult(
  envelope: { result?: CetusPortfolio & { cetus?: CetusPortfolio } } | null,
): CetusPortfolio {
  if (!envelope?.result) return {};
  const r = envelope.result;
  if (r.cetus && typeof r.cetus === "object" && !Array.isArray(r.cetus)) return r.cetus;
  if (Array.isArray(r)) return {};
  if (r.lps || r.farms || r.vaults) return r as CetusPortfolio;
  return r as CetusPortfolio;
}

/** Debug helper: raw BlockVision Cetus envelope + parsed counts. */
export async function inspectBlockVisionCetus(address: string): Promise<{
  configured: boolean;
  code: number | undefined;
  message: string | undefined;
  resultKeys: string[];
  counts: { lps: number; farms: number; vaults: number };
  samplePositionIds: (string | undefined)[];
}> {
  const configured = isBlockVisionConfigured();
  const envelope = await fetchDefiPortfolio<CetusPortfolio & { cetus?: CetusPortfolio }>(
    address,
    "cetus",
  );
  const portfolio = unwrapCetusResult(envelope);
  const result = envelope?.result;
  return {
    configured,
    code: envelope?.code,
    message: envelope?.message,
    resultKeys:
      result && typeof result === "object" && !Array.isArray(result)
        ? Object.keys(result)
        : [],
    counts: {
      lps: portfolio.lps?.length ?? 0,
      farms: portfolio.farms?.length ?? 0,
      vaults: portfolio.vaults?.length ?? 0,
    },
    samplePositionIds: (portfolio.lps ?? []).slice(0, 3).map((r) => r.position),
  };
}

/** BlockVision-backed Cetus CLMM / farms / vaults (MVP; replace with native decoder later). */
export const blockvisionCetusAdapter: ProtocolPositionAdapter = {
  id: "blockvision-cetus",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const envelope = await fetchDefiPortfolio<CetusPortfolio & { cetus?: CetusPortfolio }>(
      address,
      "cetus",
    );
    if (envelope?.code !== undefined && envelope.code !== 200) return [];
    const portfolio = unwrapCetusResult(envelope);
    const out: ResolvedPosition[] = [];

    for (const row of portfolio.lps ?? []) {
      const valueUsd = await lpValueUsd(row);
      const coinTypeA = rowString(row, "coinTypeA");
      const coinTypeB = rowString(row, "coinTypeB");
      out.push({
        protocol: "Cetus",
        category: "amm_lp",
        positionType: "clmm_lp",
        label: row.name ? String(row.name) : `CLMM ${poolLabel(row)}`,
        objectId: typeof row.position === "string" ? row.position : null,
        valueUsd,
        source: "blockvision",
        details: {
          pool: row.pool,
          balanceA: row.balanceA,
          balanceB: row.balanceB,
          coinTypeA: coinTypeA ? normalizeCoinType(coinTypeA) : undefined,
          coinTypeB: coinTypeB ? normalizeCoinType(coinTypeB) : undefined,
          coinTypeADecimals: rowNumber(row, "coinTypeADecimals") ?? rowNumber(row, "decimalsA"),
          coinTypeBDecimals: rowNumber(row, "coinTypeBDecimals") ?? rowNumber(row, "decimalsB"),
          apr: row.apr,
        },
      });
    }

    for (const row of portfolio.farms ?? []) {
      const valueUsd = await lpValueUsd(row);
      const coinTypeA = rowString(row, "coinTypeA");
      const coinTypeB = rowString(row, "coinTypeB");
      out.push({
        protocol: "Cetus",
        category: "amm_lp",
        positionType: "farm",
        label: `Farm ${poolLabel(row)}`,
        objectId: typeof row.position === "string" ? row.position : null,
        valueUsd,
        source: "blockvision",
        details: {
          pool: row.pool,
          balanceA: row.balanceA,
          balanceB: row.balanceB,
          coinTypeA: coinTypeA ? normalizeCoinType(coinTypeA) : undefined,
          coinTypeB: coinTypeB ? normalizeCoinType(coinTypeB) : undefined,
          coinTypeADecimals: rowNumber(row, "coinTypeADecimals") ?? rowNumber(row, "decimalsA"),
          coinTypeBDecimals: rowNumber(row, "coinTypeBDecimals") ?? rowNumber(row, "decimalsB"),
          apr: row.apr,
          rewards: row.rewards,
        },
      });
    }

    for (const row of portfolio.vaults ?? []) {
      const vaultCoinType = typeof row.coinType === "string" ? row.coinType : null;
      const vaultBalance = typeof row.balance === "string" ? row.balance : undefined;
      const sym = vaultCoinType ? symbolFromCoinType(vaultCoinType) : null;
      let valueUsd: number | null = null;
      if (sym && vaultBalance) {
        const prices = await getUsdPrices([sym]);
        const px = prices.get(sym);
        if (px !== undefined) valueUsd = parseTokenAmount(vaultBalance, sym) * px;
      }
      out.push({
        protocol: "Cetus",
        category: "vault",
        positionType: "vault",
        label: sym ? `Vault ${sym}` : "Vault",
        objectId: typeof row.position === "string" ? row.position : null,
        valueUsd,
        source: "blockvision",
        details: {
          vault: row.vault,
          balance: vaultBalance,
          coinType: vaultCoinType ? normalizeCoinType(vaultCoinType) : undefined,
        },
      });
    }

    return out;
  },
};

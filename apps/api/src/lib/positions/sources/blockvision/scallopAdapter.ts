import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import type { ResolvedPosition } from "../../types.js";
import { fetchDefiPortfolio } from "./client.js";
import { unwrapProtocolResult } from "./unwrap.js";

interface ScallopLendingRow {
  coinType?: string;
  symbol?: string;
  coinName?: string;
  suppliedCoin?: number;
  suppliedValue?: number;
  supplyApy?: number;
  supplyApr?: number;
  coinDecimals?: number;
  [key: string]: unknown;
}

interface ScallopCollateralRow {
  coinType?: string;
  symbol?: string;
  depositedCoin?: number;
  depositedValueInUsd?: number;
  [key: string]: unknown;
}

interface ScallopBorrowPoolRow {
  coinType?: string;
  symbol?: string;
  borrowedCoin?: number;
  borrowedValueInUsd?: number;
  [key: string]: unknown;
}

interface ScallopBorrowingRow {
  obligationId?: string;
  totalDebtsInUsd?: number;
  totalCollateralInUsd?: number;
  riskLevel?: number;
  collaterals?: ScallopCollateralRow[];
  borrowedPools?: ScallopBorrowPoolRow[];
  [key: string]: unknown;
}

interface ScallopPortfolio {
  lendings?: ScallopLendingRow[];
  borrowings?: ScallopBorrowingRow[];
  totalSupplyValue?: number;
  totalDebtValue?: number;
}

/** BlockVision Scallop lending / borrow (MVP). */
export const blockvisionScallopAdapter: ProtocolPositionAdapter = {
  id: "blockvision-scallop",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const envelope = await fetchDefiPortfolio<ScallopPortfolio>(address, "scallop");
    if (envelope?.code !== undefined && envelope.code !== 200) return [];
    const portfolio = unwrapProtocolResult<ScallopPortfolio>(envelope, "scallop", [
      "lendings",
      "borrowings",
    ]);
    const out: ResolvedPosition[] = [];

    for (const row of portfolio.lendings ?? []) {
      if (typeof row.coinType !== "string" || (row.suppliedCoin ?? 0) === 0) continue;
      const sym =
        (typeof row.symbol === "string" ? row.symbol : null) ??
        (typeof row.coinName === "string" ? row.coinName : null) ??
        "?";
      out.push({
        protocol: "Scallop",
        category: "lending",
        positionType: "scallop-supply",
        label: `Supply ${sym}`,
        objectId: null,
        valueUsd:
          row.suppliedValue !== undefined && Number.isFinite(row.suppliedValue)
            ? row.suppliedValue
            : null,
        source: "blockvision",
        details: {
          coinType: row.coinType,
          suppliedCoin: row.suppliedCoin,
          suppliedValue: row.suppliedValue,
          symbol: sym,
          supplyApy: row.supplyApy,
          supplyApr: row.supplyApr,
          coinDecimals: row.coinDecimals,
        },
      });
    }

    for (const row of portfolio.borrowings ?? []) {
      if (typeof row.obligationId !== "string") continue;
      const collateral = row.totalCollateralInUsd ?? 0;
      const debt = row.totalDebtsInUsd ?? 0;
      const net = collateral - debt;
      if (debt < 0.01 && collateral < 0.01) continue;

      out.push({
        protocol: "Scallop",
        category: "lending",
        positionType: "scallop-borrow",
        label: row.obligationId ? `Borrow obligation` : "Borrow obligation",
        objectId: row.obligationId,
        valueUsd: Number.isFinite(net) ? net : null,
        source: "blockvision",
        details: {
          obligationId: row.obligationId,
          totalCollateralInUsd: collateral,
          totalDebtsInUsd: debt,
          riskLevel: row.riskLevel,
          collaterals: row.collaterals,
          borrowedPools: row.borrowedPools,
        },
      });
    }

    return out;
  },
};

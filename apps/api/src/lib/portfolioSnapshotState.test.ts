import { describe, expect, it } from "vitest";
import { valueSnapshotAtPrices } from "./portfolioSnapshotState.js";
import type { PortfolioSnapshotState } from "./portfolioSnapshotStore.js";

describe("valueSnapshotAtPrices", () => {
  const SUI = "0x2::sui::SUI";
  const USDC =
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";

  it("computes net worth as assets minus liabilities at historical prices", () => {
    const state: PortfolioSnapshotState = {
      assets: [
        { coinType: SUI, balance: "100000000000" },
        { coinType: USDC, balance: "50000000" },
      ],
      liabilities: [{ coinType: USDC, balance: "20000000" }],
    };
    const prices = new Map([
      [SUI, 1.0],
      [USDC, 1.0],
    ]);
    const meta = new Map([
      [SUI, { coinType: SUI, symbol: "SUI", name: "Sui", decimals: 9, iconUrl: null }],
      [USDC, { coinType: USDC, symbol: "USDC", name: "USDC", decimals: 6, iconUrl: null }],
    ]);

    const out = valueSnapshotAtPrices(state, prices, meta);
    expect(out.assetsUsd).toBeCloseTo(150, 2);
    expect(out.debtUsd).toBeCloseTo(20, 2);
    expect(out.netWorthUsd).toBeCloseTo(130, 2);
  });

  it("uses different prices per timestamp without changing balances", () => {
    const state: PortfolioSnapshotState = {
      assets: [{ coinType: SUI, balance: "100000000000" }],
      liabilities: [],
    };
    const meta = new Map([
      [SUI, { coinType: SUI, symbol: "SUI", name: "Sui", decimals: 9, iconUrl: null }],
    ]);

    const weekAgo = valueSnapshotAtPrices(state, new Map([[SUI, 1.0]]), meta);
    const today = valueSnapshotAtPrices(state, new Map([[SUI, 0.8]]), meta);

    expect(weekAgo.netWorthUsd).toBeCloseTo(100, 2);
    expect(today.netWorthUsd).toBeCloseTo(80, 2);
  });
});

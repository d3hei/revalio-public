import { describe, expect, it } from "vitest";
import { resolvePositionValueUsd } from "./positionValuation.js";
import type { ResolvedPosition } from "./types.js";

describe("resolvePositionValueUsd", () => {
  it("uses naviScaleDecimals for NAVI supply rows", () => {
    const p: ResolvedPosition = {
      protocol: "Navi",
      category: "lending",
      positionType: "supply",
      label: "Supply USDC",
      objectId: null,
      valueUsd: null,
      source: "native",
      details: {
        coinType: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
        value: "1000000000",
        symbol: "USDC",
        naviScaleDecimals: 9,
      },
    };
    const usd = resolvePositionValueUsd(p, new Map([["USDC", 1]]));
    expect(usd).toBe(1);
  });

  it("prices Turbos CLMM row with DEEP leg (out-of-range, all token A)", () => {
    const p: ResolvedPosition = {
      protocol: "Turbos",
      category: "amm_lp",
      positionType: "clmm_lp",
      label: "CLMM DEEP+USDC",
      objectId: "0xa073ce500d7f0b65a8f6f64717868616baad6e729c7c150785c3e5965226c37f",
      valueUsd: null,
      source: "native",
      details: {
        coinTypeA: "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
        coinTypeB: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
        balanceA: "28133539167",
        balanceB: "0",
        coinTypeADecimals: 6,
        coinTypeBDecimals: 6,
      },
    };
    const usd = resolvePositionValueUsd(p, new Map([["DEEP", 0.08], ["USDC", 1]]));
    expect(usd).toBeCloseTo(2250.68, 0);
  });

  it("uses marketValueUsd for Suilend deposits", () => {
    const p: ResolvedPosition = {
      protocol: "Suilend",
      category: "lending",
      positionType: "suilend-supply",
      label: "Supply SUI",
      objectId: "0x1",
      valueUsd: null,
      source: "native",
      details: { marketValueUsd: 42.5 },
    };
    expect(resolvePositionValueUsd(p, new Map())).toBe(42.5);
  });

  it("prices NAVI wUSDC borrow via USDC feed alias", () => {
    const p: ResolvedPosition = {
      protocol: "Navi",
      category: "lending",
      positionType: "borrow",
      label: "Borrow wUSDC",
      objectId: null,
      valueUsd: null,
      source: "native",
      details: {
        coinType: "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN",
        value: "1000000000",
        symbol: "WUSDC",
        naviScaleDecimals: 9,
      },
    };
    const usd = resolvePositionValueUsd(p, new Map([["USDC", 1]]));
    expect(usd).toBe(-1);
  });

  it("prices Scallop sCoin supply from suppliedCoin + coinDecimals", () => {
    const p: ResolvedPosition = {
      protocol: "Scallop",
      category: "lending",
      positionType: "scallop-supply",
      label: "Supply SUI",
      objectId: null,
      valueUsd: null,
      source: "native",
      details: {
        coinType: "0x2::sui::SUI",
        suppliedCoin: "1000000000",
        coinDecimals: 9,
        symbol: "SUI",
      },
    };
    const usd = resolvePositionValueUsd(p, new Map([["SUI", 0.78]]));
    expect(usd).toBeCloseTo(0.78, 2);
  });
});

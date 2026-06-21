import { describe, expect, it } from "vitest";
import { NAVI_BALANCE_SCALE_DECIMALS, NAVI_MAINNET_POOLS } from "./naviPools.js";

describe("NAVI_MAINNET_POOLS", () => {
  it("includes the navi-sdk mainnet pools (0-31) plus USDSUI (assetId 34)", () => {
    expect(NAVI_MAINNET_POOLS).toHaveLength(33);
    const assetIds = NAVI_MAINNET_POOLS.map((p) => p.assetId).sort((a, b) => a - b);
    expect(assetIds).toEqual([...Array(32).keys(), 34]);
  });

  it("uses fixed 9-decimal balance scale", () => {
    expect(NAVI_BALANCE_SCALE_DECIMALS).toBe(9);
  });

  it("has unique supply/borrow parent ids per pool", () => {
    const parents = NAVI_MAINNET_POOLS.flatMap((p) => [
      p.supplyBalanceParentId,
      p.borrowBalanceParentId,
    ]);
    expect(new Set(parents).size).toBe(parents.length);
  });
});

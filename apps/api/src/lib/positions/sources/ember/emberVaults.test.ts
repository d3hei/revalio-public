import { describe, expect, it } from "vitest";
import {
  positionValueUsdFromE9,
  underlyingFromShares,
} from "./emberVaults.js";

describe("underlyingFromShares", () => {
  it("converts receipt shares to underlying at rate 1.0", () => {
    const shares = 1_000_000_000n; // 1 SUI with 9 decimals
    const rateE18 = "1000000000000000000";
    expect(underlyingFromShares(shares, rateE18)).toBe(1_000_000_000n);
  });

  it("converts receipt shares when rate exceeds 1.0", () => {
    const shares = 1_000_000n; // 1 USDC
    const rateE18 = "941761527000000000"; // ~0.942 from egUSDC vault
    const underlying = underlyingFromShares(shares, rateE18);
    expect(underlying).toBeGreaterThan(1_000_000n);
  });
});

describe("positionValueUsdFromE9", () => {
  it("parses e9 USD strings", () => {
    expect(positionValueUsdFromE9("1500000000")).toBe(1.5);
    expect(positionValueUsdFromE9("not-a-number")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { parseRawBalance } from "./portfolioHoldings.js";

describe("parseRawBalance", () => {
  it("parses raw integer mist", () => {
    expect(parseRawBalance("1000000000", 9)).toBe(1000000000n);
  });

  it("parses human decimal amounts", () => {
    expect(parseRawBalance("30224.856", 6)).toBe(30224856000n);
  });
});

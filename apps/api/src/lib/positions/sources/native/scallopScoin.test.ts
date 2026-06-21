import { describe, expect, it } from "vitest";
import { isScallopMarketCoin } from "./scallopScoin.js";

describe("isScallopMarketCoin", () => {
  it("detects mainnet sSUI", () => {
    expect(
      isScallopMarketCoin(
        "0xaafc4f740de0dd0dde642a31148fb94517087052f19afb0f7bed1dc41a50c77b::scallop_sui::SCALLOP_SUI",
      ),
    ).toBe(true);
  });

  it("ignores plain SUI", () => {
    expect(isScallopMarketCoin("0x2::sui::SUI")).toBe(false);
  });
});

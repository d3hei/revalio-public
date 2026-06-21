import { describe, expect, it } from "vitest";
import { normalizeCoinType } from "./coinType.js";

describe("portfolio pipeline helpers", () => {
  it("normalizes coin types used by chart holdings", () => {
    expect(normalizeCoinType("0x2::sui::SUI")).toBe("0x2::sui::SUI");
    expect(
      normalizeCoinType(
        "dba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
      ),
    ).toContain("0xdba34672");
  });
});

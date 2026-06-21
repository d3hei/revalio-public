import { describe, expect, it } from "vitest";
import { normalizeCoinType } from "./coinType.js";

describe("normalizeCoinType", () => {
  it("adds 0x prefix to bare address", () => {
    expect(
      normalizeCoinType(
        "dba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
      ),
    ).toBe(
      "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
    );
  });

  it("normalizes SUI alias to 0x2", () => {
    expect(normalizeCoinType(SUI_ALIAS)).toBe("0x2::sui::SUI");
    expect(normalizeCoinType(`0x${SUI_ALIAS}`)).toBe("0x2::sui::SUI");
    expect(normalizeCoinType("0x2::sui::SUI")).toBe("0x2::sui::SUI");
  });
});

const SUI_ALIAS_ADDR =
  "0000000000000000000000000000000000000000000000000000000000000002";
const SUI_ALIAS = `${SUI_ALIAS_ADDR}::sui::SUI`;

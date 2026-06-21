import { describe, expect, it, vi, beforeEach } from "vitest";

describe("blockvisionNaviAdapter", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("maps supply and borrow rows", async () => {
    vi.doMock("../../../../config.js", () => ({
      config: { blockvision: { apiKey: "k", baseUrl: "https://api.blockvision.org/v2" } },
    }));
    vi.doMock("../../../http.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({
        code: 200,
        result: {
          supply: [
            {
              coinType: "0x2::sui::SUI",
              value: 10,
              symbol: "SUI",
              apy: "3.5",
            },
          ],
          borrow: [
            {
              coinType:
                "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
              value: 100,
              symbol: "USDC",
              apy: "5.1",
            },
          ],
        },
      }),
      HttpError: class HttpError extends Error {},
    }));
    vi.doMock("../../../prices.js", () => ({
      getUsdPrices: vi.fn().mockResolvedValue(new Map([["SUI", 2], ["USDC", 1]])),
    }));

    const { blockvisionNaviAdapter } = await import("./naviAdapter.js");
    const rows = await blockvisionNaviAdapter.fetchPositions("0x" + "a".repeat(64));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ protocol: "Navi", positionType: "supply", valueUsd: 20 });
    expect(rows[1]).toMatchObject({ protocol: "Navi", positionType: "borrow", valueUsd: -100 });
  });
});

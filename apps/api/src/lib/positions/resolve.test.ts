import { describe, expect, it, vi, beforeEach } from "vitest";
import { mergePositions } from "./resolve.js";
import type { ResolvedPosition } from "./types.js";

describe("mergePositions", () => {
  it("dedupes by objectId and prefers higher USD", () => {
    const rpc: ResolvedPosition = {
      protocol: "Cetus",
      category: "amm_lp",
      positionType: "clmm_lp",
      label: "Cetus LP",
      objectId: "0xabc",
      details: {},
      valueUsd: null,
      source: "rpc",
    };
    const bv: ResolvedPosition = {
      ...rpc,
      label: "CLMM USDC+SUI",
      valueUsd: 130_000,
      source: "blockvision",
    };
    const merged = mergePositions([[rpc], [bv]]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.valueUsd).toBe(130_000);
    expect(merged[0]?.source).toBe("blockvision");
  });

  it("prefers native enrichment over rpc placeholder on same pool id", () => {
    const rpc: ResolvedPosition = {
      protocol: "Cetus",
      category: "amm_lp",
      positionType: "amm_lp",
      label: "Cetus CLMM LP",
      objectId: "0xwrapper",
      details: { pool: "0xposition" },
      valueUsd: null,
      source: "rpc",
    };
    const native: ResolvedPosition = {
      ...rpc,
      label: "CLMM USDC+SUI",
      details: {
        pool: "0xposition",
        balanceA: "1000000",
        balanceB: "2000000000",
        coinTypeA: "0xusdc",
        coinTypeB: "0x2::sui::SUI",
      },
      valueUsd: null,
      source: "native",
    };
    const merged = mergePositions([[rpc], [native]]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.source).toBe("native");
    expect(merged[0]?.details.balanceA).toBe("1000000");
  });

  it("keeps multiple Suilend rows that share the same obligation objectId", () => {
    const obligationId = "0xobligation";
    const sui: ResolvedPosition = {
      protocol: "Suilend",
      category: "lending",
      positionType: "suilend-supply",
      label: "Supply SUI",
      objectId: obligationId,
      details: { coinType: "0x2::sui::SUI", amount: "1000" },
      valueUsd: 1.2,
      source: "native",
    };
    const usdc: ResolvedPosition = {
      ...sui,
      positionType: "suilend-supply",
      label: "Supply USDC",
      details: {
        coinType: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
        amount: "2000",
      },
      valueUsd: 2.4,
    };
    const merged = mergePositions([[sui, usdc]]);
    expect(merged).toHaveLength(2);
  });
});

describe("blockvisionCetusAdapter", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("maps lps[] to unified positions", async () => {
    vi.doMock("../../config.js", () => ({
      config: {
        blockvision: {
          apiKey: "test-key",
          baseUrl: "https://api.blockvision.org/v2",
          protocols: [],
        },
        redisUrl: "redis://localhost:6379",
        sui: { defiRpcUrl: "https://rpc.example", defiRpcFallbacks: [] },
      },
    }));
    vi.doMock("../../redis.js", () => ({
      redis: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue("OK"),
        del: vi.fn().mockResolvedValue(0),
      },
    }));
    vi.doMock("../http.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({
        code: 200,
        result: {
          lps: [
            {
              position: "0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105",
              pool: "0xpool",
              balanceA: "30224856000",
              balanceB: "111942996000000000",
              coinTypeA:
                "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
              coinTypeB: "0x2::sui::SUI",
              apr: "40.31",
            },
          ],
          farms: [],
          vaults: [],
        },
      }),
      HttpError: class HttpError extends Error {
        status: number;
        constructor(status: number, message: string) {
          super(message);
          this.status = status;
        }
      },
    }));
    vi.doMock("../prices.js", () => ({
      getUsdPrices: vi.fn().mockResolvedValue(new Map([["USDC", 1], ["SUI", 2]])),
    }));

    const { blockvisionCetusAdapter } = await import("./sources/blockvision/cetusAdapter.js");
    const rows = await blockvisionCetusAdapter.fetchPositions(
      "0x08beed3ebf0b5620ab5ea33be9ccd87e7b1ef590834fe3b7ac71e40c3f679ed1",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      protocol: "Cetus",
      category: "amm_lp",
      objectId: "0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105",
      source: "blockvision",
    });
    expect(rows[0]?.valueUsd).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import {
  alignLastChartPoint,
  appendLiveChartPoint,
  buildHistoricalChartPoints,
  sanitizeTickPrice,
  trimChartPointsBefore,
} from "./chartValuation.js";

describe("sanitizeTickPrice", () => {
  it("replaces outlier tick with spot", () => {
    expect(sanitizeTickPrice(0.8, 9.16)).toBe(0.8);
    expect(sanitizeTickPrice(0.8, 0.75)).toBe(0.75);
  });
});

describe("buildHistoricalChartPoints", () => {
  it("values wallet SUI + staking principal without gross LP inflation", () => {
    const suiType = "0x2::sui::SUI";
    const t = new Date("2026-06-15T12:00:00Z").getTime();
    const points = buildHistoricalChartPoints({
      tickRows: [{ bucket: new Date(t), coin_type: suiType, price: 0.8 }],
      walletHoldings: [{ coinType: suiType, balance: 30_000_000n, decimals: 9 }],
      stakingPrincipalMist: 929_000_000_000n,
      nonStakingPositionsUsd: 0,
      spotBySymbol: new Map([["SUI", 0.8]]),
      metaByCoinType: new Map([
        [suiType, { coinType: suiType, symbol: "SUI", name: "Sui", decimals: 9, iconUrl: null }],
      ]),
    });
    expect(points).toHaveLength(1);
    // 0.03 liquid + 929 staked @ $0.8 ≈ 743.22
    expect(points[0]?.valueUsd).toBeCloseTo(743.22, 0);
  });
});

describe("alignLastChartPoint", () => {
  it("pulls an inflated last bucket down to headline", () => {
    const out = alignLastChartPoint([{ t: 1, valueUsd: 8501 }, { t: 2, valueUsd: 8501 }], 739.83);
    expect(out[1]?.valueUsd).toBeCloseTo(739.83, 2);
  });

  it("pulls an understated last bucket up to headline", () => {
    const out = alignLastChartPoint([{ t: 1, valueUsd: 13.7 }, { t: 2, valueUsd: 15.34 }], 17.81);
    expect(out[1]?.valueUsd).toBeCloseTo(17.81, 2);
  });
});

describe("trimChartPointsBefore", () => {
  it("drops buckets before wallet activity", () => {
    const since = new Date("2026-06-16T00:00:00Z").getTime();
    const out = trimChartPointsBefore(
      [
        { t: since - 86_400_000, valueUsd: 10 },
        { t: since + 3_600_000, valueUsd: 17 },
      ],
      since,
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.valueUsd).toBe(17);
  });
});

describe("appendLiveChartPoint", () => {
  it("appends live point when last bucket is older than current hour", () => {
    const hour = 3_600_000;
    const now = Date.now();
    const points = [{ t: now - 2 * hour, valueUsd: 40_000 }];
    const out = appendLiveChartPoint(points, 91_000);
    expect(out).toHaveLength(2);
    expect(out[1]?.valueUsd).toBe(91_000);
  });

  it("replaces last point in the current hour", () => {
    const now = Date.now();
    const points = [
      { t: now - 3_600_000, valueUsd: 40_000 },
      { t: now - 60_000, valueUsd: 38_000 },
    ];
    const out = appendLiveChartPoint(points, 91_737);
    expect(out).toHaveLength(2);
    expect(out[1]?.valueUsd).toBe(91_737);
  });
});

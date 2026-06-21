import { beforeEach, describe, expect, it, vi } from "vitest";

describe("buildPositionsPayload", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("hides indexed Scallop veSCA rows", async () => {
    vi.doMock("../db.js", () => ({
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            protocol: "Scallop",
            position_type: "ve-sca",
            object_id: "0x" + "1".repeat(64),
            details: { lockedScaInCoin: "123" },
          },
          {
            protocol: "Scallop",
            position_type: "scallop-supply",
            object_id: null,
            details: { symbol: "SUI" },
          },
        ],
      }),
    }));
    vi.doMock("./prices.js", () => ({
      getUsdPrices: vi.fn().mockResolvedValue(new Map([["SUI", 1]])),
    }));

    const { buildPositionsPayload } = await import("./positionsPayload.js");
    const payload = await buildPositionsPayload("0x" + "a".repeat(64), []);

    expect(payload.positions).toHaveLength(1);
    expect(payload.positions[0]).toMatchObject({
      protocol: "Scallop",
      positionType: "scallop-supply",
    });
  });

  it("hides misclassified Scallop veSCA native-staking rows", async () => {
    vi.doMock("../db.js", () => ({
      query: vi.fn().mockResolvedValue({ rows: [] }),
    }));
    vi.doMock("./prices.js", () => ({
      getUsdPrices: vi.fn().mockResolvedValue(new Map([["SUI", 1], ["SCA", 1]])),
    }));

    const { buildPositionsPayload } = await import("./positionsPayload.js");
    const payload = await buildPositionsPayload("0x" + "c".repeat(64), [
      {
        protocol: "Scallop",
        category: "staking",
        positionType: "native-staking",
        label: "Scallop veSCA",
        objectId: "0x" + "3".repeat(64),
        details: { principal: "0" },
        valueUsd: null,
        source: "rpc",
      },
      {
        protocol: "Scallop",
        category: "lending",
        positionType: "scallop-supply",
        label: "Supply SUI",
        objectId: null,
        details: { symbol: "SUI", suppliedCoin: 10 },
        valueUsd: 10,
        source: "native",
      },
    ] as never);

    expect(payload.positions).toHaveLength(1);
    expect(payload.positions[0]).toMatchObject({
      protocol: "Scallop",
      positionType: "scallop-supply",
    });
  });
});

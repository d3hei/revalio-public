import { describe, expect, it, vi, beforeEach } from "vitest";

describe("blockvisionScallopAdapter", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("maps lendings and borrowings", async () => {
    vi.doMock("../../../../config.js", () => ({
      config: { blockvision: { apiKey: "k", baseUrl: "https://api.blockvision.org/v2" } },
    }));
    vi.doMock("../../../http.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({
        code: 200,
        result: {
          lendings: [
            {
              coinType: "0x2::sui::SUI",
              symbol: "SUI",
              suppliedCoin: 5,
              suppliedValue: 20,
            },
          ],
          borrowings: [
            {
              obligationId: "0xobligation",
              totalCollateralInUsd: 100,
              totalDebtsInUsd: 30,
            },
          ],
          veScas: [
            {
              veScaKey: "0xvesca",
              lockedScaInCoin: 123,
              lockedScaInUsd: 456,
            },
          ],
        },
      }),
      HttpError: class HttpError extends Error {},
    }));

    const { blockvisionScallopAdapter } = await import("./scallopAdapter.js");
    const rows = await blockvisionScallopAdapter.fetchPositions("0x" + "b".repeat(64));

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      protocol: "Scallop",
      positionType: "scallop-supply",
      valueUsd: 20,
    });
    expect(rows[1]).toMatchObject({
      protocol: "Scallop",
      positionType: "scallop-borrow",
      valueUsd: 70,
      objectId: "0xobligation",
    });
  });
});

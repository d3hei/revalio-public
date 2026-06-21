import { describe, expect, it } from "vitest";
import { dropScallopVeScaPositions, isScallopVeScaPosition } from "./scallopVeSca.js";

describe("scallopVeSca", () => {
  it("detects ve-sca position type", () => {
    expect(
      isScallopVeScaPosition({
        protocol: "Scallop",
        positionType: "ve-sca",
        label: "veSCA",
      }),
    ).toBe(true);
  });

  it("detects misclassified rpc-owned native-staking rows", () => {
    expect(
      isScallopVeScaPosition({
        protocol: "Scallop",
        positionType: "native-staking",
        category: "staking",
        label: "Scallop veSCA",
      }),
    ).toBe(true);
  });

  it("keeps Scallop lending supply rows", () => {
    expect(
      isScallopVeScaPosition({
        protocol: "Scallop",
        positionType: "scallop-supply",
        category: "lending",
        label: "Supply SUI",
      }),
    ).toBe(false);
  });

  it("drops only veSCA rows from a mixed list", () => {
    const rows = dropScallopVeScaPositions([
      {
        protocol: "Scallop",
        positionType: "native-staking",
        category: "staking",
        label: "Scallop veSCA",
      },
      {
        protocol: "Scallop",
        positionType: "scallop-supply",
        category: "lending",
        label: "Supply SUI",
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.positionType).toBe("scallop-supply");
  });
});

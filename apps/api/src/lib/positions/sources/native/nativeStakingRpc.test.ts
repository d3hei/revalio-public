import { describe, expect, it } from "vitest";
import { parseStakedSuiFields, isStakedSuiType } from "./nativeStakingRpc.js";

describe("nativeStakingRpc", () => {
  it("recognizes StakedSui type", () => {
    expect(isStakedSuiType("0x3::staking_pool::StakedSui")).toBe(true);
    expect(isStakedSuiType("0x2::coin::Coin<0x2::sui::SUI>")).toBe(false);
  });

  it("parses snake_case RPC fields", () => {
    const poolId = `0x${"b".repeat(64)}`;
    const parsed = parseStakedSuiFields({
      pool_id: poolId,
      stake_activation_epoch: 420,
      principal: "1500000000",
    });
    expect(parsed).toEqual({
      poolId,
      activationEpoch: 420,
      principal: 1_500_000_000n,
    });
  });

  it("parses camelCase indexer-shaped fields", () => {
    const parsed = parseStakedSuiFields({
      poolId: `0x${"c".repeat(64)}`,
      activationEpoch: "99",
      principal: "1000000000",
    });
    expect(parsed?.activationEpoch).toBe(99);
    expect(parsed?.principal).toBe(1_000_000_000n);
  });

  it("returns null for zero principal", () => {
    expect(parseStakedSuiFields({ principal: "0" })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { getAmountByLiquidity, getSqrtPriceAtTick } from "./clmmMath.js";

describe("clmmMath", () => {
  it("returns positive sqrt price at tick 0", () => {
    const price = getSqrtPriceAtTick(0);
    expect(price).toBeGreaterThan(0n);
  });

  it("computes non-zero token amounts for in-range liquidity", () => {
    const tickLower = -443636;
    const tickUpper = 443636;
    const currentTick = 0;
    const currentSqrtPrice = getSqrtPriceAtTick(currentTick);
    const liquidity = 1_163_244_856_569_621n;

    const { amountA, amountB } = getAmountByLiquidity(
      tickLower,
      tickUpper,
      currentTick,
      currentSqrtPrice,
      liquidity,
    );

    expect(amountA).toBeGreaterThan(0n);
    expect(amountB).toBeGreaterThan(0n);
  });
});

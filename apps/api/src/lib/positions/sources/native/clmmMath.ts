/**
 * Cetus CLMM math (ported from cetus_clmm::clmm_math + tick_math).
 * Uses bigint to mirror on-chain u64/u128 arithmetic.
 */

const TICK_BOUND = 443636;
const MIN_SQRT_PRICE = 4295048016n;
const MAX_SQRT_PRICE = 79226673515401279992447579055n;
const Q64 = 1n << 64n;
const U64_MAX = (1n << 64n) - 1n;
const U128_MAX = (1n << 128n) - 1n;

function absTick(tick: number): number {
  return tick < 0 ? -tick : tick;
}

function mulShr96(a: bigint, b: bigint): bigint {
  return (a * b) >> 96n;
}

function mulShr64(a: bigint, b: bigint): bigint {
  return (a * b) >> 64n;
}

function getSqrtPriceAtNegativeTick(tick: number): bigint {
  let abs = absTick(tick);
  let ratio =
    (abs & 0x1) !== 0 ? 18445821805675392311n : 18446744073709551616n;

  if ((abs & 0x2) !== 0) ratio = mulShr64(ratio, 18444899583751176498n);
  if ((abs & 0x4) !== 0) ratio = mulShr64(ratio, 18443055278223354162n);
  if ((abs & 0x8) !== 0) ratio = mulShr64(ratio, 18439367220385604838n);
  if ((abs & 0x10) !== 0) ratio = mulShr64(ratio, 18431993317065449817n);
  if ((abs & 0x20) !== 0) ratio = mulShr64(ratio, 18417254355718160513n);
  if ((abs & 0x40) !== 0) ratio = mulShr64(ratio, 18387811781193591352n);
  if ((abs & 0x80) !== 0) ratio = mulShr64(ratio, 18329067761203520168n);
  if ((abs & 0x100) !== 0) ratio = mulShr64(ratio, 18212142134806087854n);
  if ((abs & 0x200) !== 0) ratio = mulShr64(ratio, 17980523815641551639n);
  if ((abs & 0x400) !== 0) ratio = mulShr64(ratio, 17526086738831147013n);
  if ((abs & 0x800) !== 0) ratio = mulShr64(ratio, 16651378430235024244n);
  if ((abs & 0x1000) !== 0) ratio = mulShr64(ratio, 15030750278693429944n);
  if ((abs & 0x2000) !== 0) ratio = mulShr64(ratio, 12247334978882834399n);
  if ((abs & 0x4000) !== 0) ratio = mulShr64(ratio, 8131365268884726200n);
  if ((abs & 0x8000) !== 0) ratio = mulShr64(ratio, 3584323654723342297n);
  if ((abs & 0x10000) !== 0) ratio = mulShr64(ratio, 696457651847595233n);
  if ((abs & 0x20000) !== 0) ratio = mulShr64(ratio, 26294789957452057n);
  if ((abs & 0x40000) !== 0) ratio = mulShr64(ratio, 37481735321082n);

  return ratio;
}

function getSqrtPriceAtPositiveTick(tick: number): bigint {
  let abs = absTick(tick);
  let ratio =
    (abs & 0x1) !== 0 ? 79232123823359799118286999567n : 79228162514264337593543950336n;

  if ((abs & 0x2) !== 0) ratio = mulShr96(ratio, 79236085330515764027303304731n);
  if ((abs & 0x4) !== 0) ratio = mulShr96(ratio, 79244008939048815603706035061n);
  if ((abs & 0x8) !== 0) ratio = mulShr96(ratio, 79259858533276714757314932305n);
  if ((abs & 0x10) !== 0) ratio = mulShr96(ratio, 79291567232598584799939703904n);
  if ((abs & 0x20) !== 0) ratio = mulShr96(ratio, 79355022692464371645785046466n);
  if ((abs & 0x40) !== 0) ratio = mulShr96(ratio, 79482085999252804386437311141n);
  if ((abs & 0x80) !== 0) ratio = mulShr96(ratio, 79736823300114093921829183326n);
  if ((abs & 0x100) !== 0) ratio = mulShr96(ratio, 80248749790819932309965073892n);
  if ((abs & 0x200) !== 0) ratio = mulShr96(ratio, 81282483887344747381513967011n);
  if ((abs & 0x400) !== 0) ratio = mulShr96(ratio, 83390072131320151908154831281n);
  if ((abs & 0x800) !== 0) ratio = mulShr96(ratio, 87770609709833776024991924138n);
  if ((abs & 0x1000) !== 0) ratio = mulShr96(ratio, 97234110755111693312479820773n);
  if ((abs & 0x2000) !== 0) ratio = mulShr96(ratio, 119332217159966728226237229890n);
  if ((abs & 0x4000) !== 0) ratio = mulShr96(ratio, 179736315981702064433883588727n);
  if ((abs & 0x8000) !== 0) ratio = mulShr96(ratio, 407748233172238350107850275304n);
  if ((abs & 0x10000) !== 0) ratio = mulShr96(ratio, 2098478828474011932436660412517n);
  if ((abs & 0x20000) !== 0) ratio = mulShr96(ratio, 55581415166113811149459800483533n);
  if ((abs & 0x40000) !== 0) ratio = mulShr96(ratio, 38992368544603139932233054999993551n);

  return ratio >> 32n;
}

export function getSqrtPriceAtTick(tick: number): bigint {
  if (tick < -TICK_BOUND || tick > TICK_BOUND) {
    throw new Error(`tick_out_of_bounds:${tick}`);
  }
  return tick < 0 ? getSqrtPriceAtNegativeTick(tick) : getSqrtPriceAtPositiveTick(tick);
}

function divRound(numerator: bigint, denominator: bigint, roundUp: boolean): bigint {
  if (denominator === 0n) return 0n;
  const q = numerator / denominator;
  if (!roundUp) return q;
  const r = numerator % denominator;
  return r === 0n ? q : q + 1n;
}

export function getDeltaA(
  sqrtPrice0: bigint,
  sqrtPrice1: bigint,
  liquidity: bigint,
  roundUp: boolean,
): bigint {
  const sqrtPriceDiff =
    sqrtPrice0 > sqrtPrice1 ? sqrtPrice0 - sqrtPrice1 : sqrtPrice1 - sqrtPrice0;
  if (sqrtPriceDiff === 0n || liquidity === 0n) return 0n;

  const numerator = liquidity * sqrtPriceDiff * Q64;
  const denominator = sqrtPrice0 * sqrtPrice1;
  const quotient = divRound(numerator, denominator, roundUp);
  if (quotient > U64_MAX) return U64_MAX;
  return quotient;
}

export function getDeltaB(
  sqrtPrice0: bigint,
  sqrtPrice1: bigint,
  liquidity: bigint,
  roundUp: boolean,
): bigint {
  const sqrtPriceDiff =
    sqrtPrice0 > sqrtPrice1 ? sqrtPrice0 - sqrtPrice1 : sqrtPrice1 - sqrtPrice0;
  if (sqrtPriceDiff === 0n || liquidity === 0n) return 0n;

  const product = liquidity * sqrtPriceDiff;
  const lo64Mask = (1n << 64n) - 1n;
  const shouldRoundUp = roundUp && (product & lo64Mask) > 0n;
  const shifted = product >> 64n;
  const result = shouldRoundUp ? shifted + 1n : shifted;
  if (result > U64_MAX) return U64_MAX;
  return result;
}

/** Mirror cetus_clmm::clmm_math::get_amount_by_liquidity. */
export function getAmountByLiquidity(
  tickLower: number,
  tickUpper: number,
  currentTick: number,
  currentSqrtPrice: bigint,
  liquidity: bigint,
): { amountA: bigint; amountB: bigint } {
  if (liquidity === 0n) return { amountA: 0n, amountB: 0n };
  if (tickLower >= tickUpper) return { amountA: 0n, amountB: 0n };

  const lowerPrice = getSqrtPriceAtTick(tickLower);
  const upperPrice = getSqrtPriceAtTick(tickUpper);

  if (currentSqrtPrice < MIN_SQRT_PRICE || currentSqrtPrice > MAX_SQRT_PRICE) {
    return { amountA: 0n, amountB: 0n };
  }

  if (currentTick < tickLower) {
    return {
      amountA: getDeltaA(lowerPrice, upperPrice, liquidity, true),
      amountB: 0n,
    };
  }
  if (currentTick < tickUpper) {
    return {
      amountA: getDeltaA(currentSqrtPrice, upperPrice, liquidity, true),
      amountB: getDeltaB(lowerPrice, currentSqrtPrice, liquidity, true),
    };
  }
  return {
    amountA: 0n,
    amountB: getDeltaB(lowerPrice, upperPrice, liquidity, true),
  };
}

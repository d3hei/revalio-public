import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import type { ResolvedPosition } from "../../types.js";
import { normalizeCoinType } from "../../../coinType.js";
import { getCoinTypeUsdPrices } from "../../../prices.js";
import { symbolFromCoinType } from "../../coinSymbol.js";
import { getAmountByLiquidity } from "./clmmMath.js";
import { parseI32, parseTypeName, parseU128 } from "./suiFields.js";
import { fetchCoinDecimals, fetchObject, fetchOwnedObjectsByFilter } from "./rpcClient.js";

// Momentum (MMT Finance) concentrated-liquidity DEX. Position NFTs are owned and
// structurally identical to Cetus: { pool_id, liquidity, tick_lower/upper_index
// (i32), type_x/type_y }, with the pool holding the current sqrt_price (Q64.64)
// and tick_index. So the same CLMM math (getAmountByLiquidity) values them.
const MOMENTUM_POSITION =
  "0x70285592c97965e811e0c6f98dccc3a9c2b4ad854b3594faab9597ada267b860::position::Position";

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

/** Native Momentum: value owned CLMM positions from on-chain pool price + liquidity. */
export const nativeMomentumAdapter: ProtocolPositionAdapter = {
  id: "native-momentum",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const positions = await fetchOwnedObjectsByFilter(
      address,
      { StructType: MOMENTUM_POSITION },
      5,
    );
    if (positions.length === 0) return [];

    const rows = await Promise.all(
      positions.map(async (obj): Promise<ResolvedPosition | null> => {
        const f = obj.content?.fields;
        if (!f) return null;

        const poolId = str(f.pool_id);
        const liquidity = parseU128(f.liquidity);
        const tickLower = parseI32(f.tick_lower_index);
        const tickUpper = parseI32(f.tick_upper_index);
        const coinTypeA = parseTypeName(f.type_x);
        const coinTypeB = parseTypeName(f.type_y);
        if (!poolId || !coinTypeA || !coinTypeB) return null;

        const nA = normalizeCoinType(coinTypeA);
        const nB = normalizeCoinType(coinTypeB);
        const symA = symbolFromCoinType(nA);
        const symB = symbolFromCoinType(nB);
        const label = symA && symB ? `CLMM ${symA}+${symB}` : "Momentum LP";
        const base = {
          protocol: "Momentum",
          category: "amm_lp" as const,
          positionType: "clmm_lp",
          label,
          objectId: obj.objectId,
          source: "native" as const,
        };

        // Closed position (liquidity withdrawn) holds nothing.
        if (liquidity === null || liquidity === 0n || tickLower === null || tickUpper === null) {
          return {
            ...base,
            valueUsd: 0,
            details: { pool: poolId, liquidity: "0", balanceA: "0", balanceB: "0", coinTypeA: nA, coinTypeB: nB },
          };
        }

        const pool = await fetchObject(poolId);
        const pf = pool?.content?.fields;
        const sqrtPrice = parseU128(pf?.sqrt_price);
        const currentTick = parseI32(pf?.tick_index);
        if (!pf || sqrtPrice === null || currentTick === null) return null;

        const { amountA, amountB } = getAmountByLiquidity(
          tickLower,
          tickUpper,
          currentTick,
          sqrtPrice,
          liquidity,
        );

        const [decA, decB] = await Promise.all([fetchCoinDecimals(nA), fetchCoinDecimals(nB)]);
        const dA = decA ?? 9;
        const dB = decB ?? 9;
        const prices = await getCoinTypeUsdPrices([
          { coinType: nA, symbol: symA },
          { coinType: nB, symbol: symB },
        ]);
        const pxA = prices.get(nA);
        const pxB = prices.get(nB);

        let value = 0;
        let priced = false;
        if (pxA !== undefined) {
          value += (Number(amountA) / 10 ** dA) * pxA;
          priced = true;
        }
        if (pxB !== undefined) {
          value += (Number(amountB) / 10 ** dB) * pxB;
          priced = true;
        }

        return {
          ...base,
          valueUsd: priced ? value : null,
          details: {
            pool: poolId,
            liquidity: liquidity.toString(),
            balanceA: amountA.toString(),
            balanceB: amountB.toString(),
            coinTypeA: nA,
            coinTypeB: nB,
            coinTypeADecimals: dA,
            coinTypeBDecimals: dB,
          },
        };
      }),
    );

    return rows.filter((r): r is ResolvedPosition => r !== null);
  },
};

export async function inspectNativeMomentum(address: string): Promise<{
  count: number;
  positions: ResolvedPosition[];
}> {
  const positions = await nativeMomentumAdapter.fetchPositions(address);
  return { count: positions.length, positions };
}

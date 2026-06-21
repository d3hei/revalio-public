import { describe, expect, it } from "vitest";
import type { ResolvedPosition } from "../../types.js";
import type { CetusDecodeFailure, CetusRpcDeps } from "./cetusRpc.js";
import {
  candidatePositionIds,
  decodeCetusClmmPositionWithDeps,
  enrichCetusNativePositions,
} from "./cetusRpc.js";

/** Real mainnet Cetus CLMM position NFT (whale wallet). */
const POSITION_NFT_ID =
  "0xb2241f1d7ae6f59a8af4bdac05768acb6c1f56cbcbe33fe0722b25a1ead21b9c";
/** Real mainnet pool object behind that position. */
const POOL_ID = "0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105";
/** Cetus Farms wrapped LP NFT (synthetic id, valid 32-byte hex). */
const WRAPPER_ID = "0xfccc3ccde52ede9a3975fe97938f426aa3996d8024a76dda8d030f640cbf6d53";

function positionFields(poolId: string) {
  return {
    pool: poolId,
    tick_lower_index: { fields: { bits: 4294966296 } }, // i32 -1000
    tick_upper_index: { fields: { bits: 2000 } },
    liquidity: "1163244856569621",
    coin_type_a: {
      fields: {
        name: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
      },
    },
    coin_type_b: { fields: { name: "0x2::sui::SUI" } },
    name: "Cetus LP | Pool3137-1856567",
  };
}

function cetusClmmMocks(): CetusRpcDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async fetchObject(objectId: string) {
      calls.push(objectId);
      if (objectId === WRAPPER_ID) {
        return {
          objectId: WRAPPER_ID,
          type: "0x11ea791d82b5742cc8cab0bf7946035c97d9001d7c3803a93f119753da66f526::pool::WrappedPositionNFT",
          content: { fields: { position_id: POSITION_NFT_ID } },
        };
      }
      if (objectId === POSITION_NFT_ID) {
        return {
          objectId: POSITION_NFT_ID,
          type: "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::position::Position",
          content: { fields: positionFields(POOL_ID) },
        };
      }
      if (objectId === POOL_ID) {
        return {
          objectId: POOL_ID,
          type: "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::pool::Pool",
          content: {
            fields: {
              current_sqrt_price: "79228162514264337593543950336",
              current_tick_index: { fields: { bits: 0 } },
            },
          },
        };
      }
      return null;
    },
    async fetchCoinDecimals(coinType: string) {
      return String(coinType).toLowerCase().includes("usdc") ? 6 : 9;
    },
  };
}

const weakRpcRow = (overrides: Partial<ResolvedPosition> = {}): ResolvedPosition => ({
  protocol: "Cetus",
  category: "amm_lp",
  positionType: "amm_lp",
  label: "Cetus CLMM LP",
  objectId: WRAPPER_ID,
  details: {
    position: POSITION_NFT_ID,
    liquidity: "1163244856569621",
    name: "Cetus LP | Pool3137-1856567",
  },
  valueUsd: null,
  source: "rpc",
  ...overrides,
});

describe("enrichCetusNativePositions", () => {
  it("enriches weak RPC row via wrapped NFT → position → pool chain", async () => {
    const fetch = cetusClmmMocks();
    const failures: CetusDecodeFailure[] = [];

    const decoded = await decodeCetusClmmPositionWithDeps(weakRpcRow(), fetch, failures);
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
    expect(fetch.calls.length).toBeGreaterThan(0);
    expect(decoded?.source).toBe("native");
    expect(decoded?.details.balanceA).toBeDefined();
    expect(decoded?.details.balanceB).toBeDefined();
    expect(decoded?.details.coinTypeA).toContain("usdc");
    expect(decoded?.details.coinTypeB).toContain("sui");
    expect(decoded?.objectId).toBe(POSITION_NFT_ID);
    expect(decoded?.details.pool).toBe(POOL_ID);

    const [enriched] = await enrichCetusNativePositions([weakRpcRow()], fetch);
    expect(enriched?.source).toBe("native");
    expect(enriched?.details.balanceA).toBeDefined();
    expect(enriched?.details.balanceB).toBeDefined();
  });

  it("enriches weak RPC row when wallet owns the position NFT directly", async () => {
    const fetch = cetusClmmMocks();
    const row = weakRpcRow({
      objectId: POSITION_NFT_ID,
      details: { position: POSITION_NFT_ID, pool: POOL_ID },
    });

    const [enriched] = await enrichCetusNativePositions([row], fetch);
    expect(enriched?.source).toBe("native");
    expect(candidatePositionIds(row)[0]).toBe(POSITION_NFT_ID);
    expect(enriched?.objectId).toBe(POSITION_NFT_ID);
    expect(enriched?.details.pool).toBe(POOL_ID);
  });

  it("leaves already-enriched rows unchanged", async () => {
    const native: ResolvedPosition = {
      protocol: "Cetus",
      category: "amm_lp",
      positionType: "clmm_lp",
      label: "CLMM USDC+SUI",
      objectId: POSITION_NFT_ID,
      details: { balanceA: "1", balanceB: "2" },
      valueUsd: 100,
      source: "native",
    };
    const [out] = await enrichCetusNativePositions([native]);
    expect(out).toBe(native);
  });
});

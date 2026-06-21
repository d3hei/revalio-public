import { describe, expect, it } from "vitest";
import type { ResolvedPosition } from "../../types.js";
import type { TurbosDecodeFailure, TurbosRpcDeps } from "./turbosRpc.js";
import {
  candidateTurbosIds,
  decodeTurbosClmmPositionWithDeps,
  enrichTurbosNativePositions,
  parsePoolCoinTypes,
} from "./turbosRpc.js";

const NFT_ID = "0xfccc3ccde52ede9a3975fe97938f426aa3996d8024a76dda8d030f640cbf6d53";
const POSITION_ID = "0xb8d7d9e66a60c239e7a60110efcf8de6c705580ed924d0dde141f4a0e2c90105";
const POOL_ID = "0xa0000000000000000000000000000000000000000000000000000000000000001";

function positionFields() {
  return {
    tick_lower_index: { fields: { bits: 4294966296 } },
    tick_upper_index: { fields: { bits: 2000 } },
    liquidity: "1163244856569621",
  };
}

function turbosMocks(): TurbosRpcDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    async fetchObject(objectId: string) {
      calls.push(objectId);
      if (objectId === NFT_ID) {
        return {
          objectId: NFT_ID,
          type: "0xa5a0c25c79e428eba04fb98b3fb2a34db45ab26d4c8faf0d7e39d66a63891e64::position_nft::TurbosPositionNFT",
          content: {
            fields: {
              position_id: POSITION_ID,
              pool_id: POOL_ID,
              coin_type_a: {
                fields: {
                  name: "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
                },
              },
              coin_type_b: { fields: { name: "0x2::sui::SUI" } },
            },
          },
        };
      }
      if (objectId === POSITION_ID) {
        return {
          objectId: POSITION_ID,
          type: "0xa5a0c25c79e428eba04fb98b3fb2a34db45ab26d4c8faf0d7e39d66a63891e64::position_manager::Position",
          content: { fields: positionFields() },
        };
      }
      if (objectId === POOL_ID) {
        return {
          objectId: POOL_ID,
          type: "0xa5a0c25c79e428eba04fb98b3fb2a34db45ab26d4c8faf0d7e39d66a63891e64::pool::Pool<0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC, 0x2::sui::SUI, 0x49dcf28ac3b5480e65bee812ad2d6e60108ab8037d5a815c3c11bbe7bc47c270::fee500bps::FEE500BPS>",
          content: {
            fields: {
              sqrt_price: "79228162514264337593543950336",
              tick_current_index: { fields: { bits: 0 } },
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

const rpcRow: ResolvedPosition = {
  protocol: "Turbos",
  category: "amm_lp",
  positionType: "amm_lp",
  label: "Turbos LP",
  objectId: NFT_ID,
  details: {
    position: POSITION_ID,
    pool: POOL_ID,
    name: "Turbos CLMM",
  },
  valueUsd: null,
  source: "rpc",
};

describe("parsePoolCoinTypes", () => {
  it("parses coin generics from Turbos pool type", () => {
    const parsed = parsePoolCoinTypes(
      "0xpkg::pool::Pool<0xusdc::USDC, 0x2::sui::SUI, 0xfee::FEE500BPS>",
    );
    expect(parsed?.coinTypeA).toContain("usdc");
    expect(parsed?.coinTypeB).toContain("sui");
  });
});

describe("enrichTurbosNativePositions", () => {
  it("decodes TurbosPositionNFT → position_manager::Position → pool", async () => {
    const fetch = turbosMocks();
    const failures: TurbosDecodeFailure[] = [];

    const decoded = await decodeTurbosClmmPositionWithDeps(rpcRow, fetch, failures);
    expect(failures).toEqual([]);
    expect(decoded?.source).toBe("native");
    expect(decoded?.details.balanceA).toBeDefined();
    expect(decoded?.details.coinTypeA).toContain("usdc");
    expect(decoded?.objectId).toBe(POSITION_ID);
    expect(decoded?.details.pool).toBe(POOL_ID);

    const [enriched] = await enrichTurbosNativePositions([rpcRow], fetch);
    expect(enriched?.source).toBe("native");
    expect(candidateTurbosIds(rpcRow)[0]).toBe(NFT_ID);
  });
});

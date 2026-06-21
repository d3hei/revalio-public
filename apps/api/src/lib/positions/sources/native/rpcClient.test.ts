import { afterEach, describe, expect, it, vi } from "vitest";
import * as http from "../../../http.js";

vi.mock("../../../http.js", () => ({
  fetchJson: vi.fn(),
}));

vi.mock("../../../../config.js", () => ({
  config: {
    sui: {
      defiRpcUrl: "https://rpc-mainnet.suiscan.xyz:443",
      defiRpcFallbacks: ["https://fullnode.mainnet.sui.io:443"],
    },
  },
}));

const { fetchJson } = vi.mocked(http);

describe("fetchObject", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("skips RPC responses without content and uses the next endpoint", async () => {
    const { fetchObject } = await import("./rpcClient.js");
    const objectId =
      "0xb2241f1d7ae6f59a8af4bdac05768acb6c1f56cbcbe33fe0722b25a1ead21b9c";

    fetchJson
      .mockResolvedValueOnce({
        result: {
          data: {
            objectId,
            type: "0xpkg::position::Position",
          },
        },
      })
      .mockResolvedValueOnce({
        result: {
          data: {
            objectId,
            type: "0xpkg::position::Position",
            content: { fields: { pool: "0xpool", liquidity: "1" } },
          },
        },
      });

    const obj = await fetchObject(objectId);
    expect(fetchJson).toHaveBeenCalledTimes(2);
    expect(obj?.content?.fields?.liquidity).toBe("1");
  });

  it("returns null when no RPC returns object content", async () => {
    const { fetchObject } = await import("./rpcClient.js");
    fetchJson.mockResolvedValue({
      result: { data: { objectId: "0xabc", type: "0xpkg::x::X" } },
    });

    const obj = await fetchObject(
      "0xb2241f1d7ae6f59a8af4bdac05768acb6c1f56cbcbe33fe0722b25a1ead21b9c",
    );
    expect(obj).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { isTrustedNft } from "./nftTrustList.js";

describe("isTrustedNft", () => {
  it("matches suifrens type marker", () => {
    expect(
      isTrustedNft(
        "0xee49::suifrens::SuiFren<0x8894::bullshark::Bullshark>",
        null,
        null,
      ),
    ).toBe(true);
  });

  it("matches collection text marker", () => {
    expect(isTrustedNft("0xabc::nft::Item", "DeepBook OG #1", null)).toBe(true);
  });

  it("returns false for unrelated nft", () => {
    expect(isTrustedNft("0xabc::random::Item", "Random Art", "Unknown")).toBe(false);
  });
});

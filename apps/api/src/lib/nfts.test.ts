import { describe, expect, it } from "vitest";
import { extractKioskIdFromCapFields, extractNftItems, type RawOwnedObjectRow } from "./nfts.js";

function row(input: RawOwnedObjectRow): RawOwnedObjectRow {
  return input;
}

describe("extractNftItems", () => {
  it("keeps NFT-like objects with non-empty display", () => {
    const items = extractNftItems([
      row({
        data: {
          objectId: "0x1",
          type: "0xabc::my_collection::Avatar",
          display: {
            data: {
              name: "Avatar #1",
              image_url: "https://example.com/a1.png",
              collection: "My Collection",
            },
          },
        },
      }),
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      objectId: "0x1",
      type: "0xabc::my_collection::Avatar",
      name: "Avatar #1",
      imageUrl: "https://example.com/a1.png",
      collection: "My Collection",
      kioskId: null,
      source: "wallet",
      verified: false,
    });
  });

  it("drops coin objects", () => {
    const items = extractNftItems([
      row({
        data: {
          objectId: "0x2",
          type: "0x2::coin::Coin<0x2::sui::SUI>",
          display: { data: { name: "SUI Coin" } },
        },
      }),
    ]);
    expect(items).toHaveLength(0);
  });

  it("drops position NFTs recognized by classifyType", () => {
    const items = extractNftItems([
      row({
        data: {
          objectId: "0x3",
          type: "0x3::staking_pool::StakedSui",
          display: { data: { name: "Staking Position" } },
        },
      }),
    ]);
    expect(items).toHaveLength(0);
  });

  it("drops objects with empty display", () => {
    const items = extractNftItems([
      row({
        data: {
          objectId: "0x4",
          type: "0xabc::collection::Art",
          display: { data: {} },
        },
      }),
      row({
        data: {
          objectId: "0x5",
          type: "0xabc::collection::Art",
          display: { data: { name: "   " } },
        },
      }),
    ]);
    expect(items).toHaveLength(0);
  });

  it("normalizes ipfs image urls", () => {
    const items = extractNftItems([
      row({
        data: {
          objectId: "0x9",
          type: "0xabc::collection::Art",
          display: { data: { name: "Art", image_url: "ipfs://bafy123/image.png" } },
        },
      }),
    ]);
    expect(items[0]?.imageUrl).toBe("https://ipfs.io/ipfs/bafy123/image.png");
  });

  it("marks verified nft by metadata flag", () => {
    const items = extractNftItems([
      row({
        data: {
          objectId: "0x10",
          type: "0xabc::collection::Art",
          content: { fields: { is_verified: true } },
          display: { data: { name: "Verified NFT" } },
        },
      }),
    ]);
    expect(items[0]?.verified).toBe(true);
  });

  it("marks trusted seed-list collections as verified", () => {
    const items = extractNftItems([
      row({
        data: {
          objectId: "0x11",
          type: "0xee49::suifrens::SuiFren<0x8894::bullshark::Bullshark>",
          display: { data: { name: "Suifrens: Bullsharks" } },
        },
      }),
    ]);
    expect(items[0]?.verified).toBe(true);
  });

  it("infers Suifren display names from type generics", () => {
    const items = extractNftItems([
      row({
        data: {
          objectId: "0x12",
          type: "0xee49::suifrens::SuiFren<0xee49::capy::Capy>",
          display: { data: { image_url: "https://example.com/capy.svg" } },
        },
      }),
    ]);
    expect(items[0]?.name).toBe("SuiFrens: Capys");
  });
});

describe("extractKioskIdFromCapFields", () => {
  it("reads kiosk id from a standard KioskOwnerCap", () => {
    expect(
      extractKioskIdFromCapFields({
        for: "0x5bcb2eb9ad2043fc0ba12804421afc0bba199736e937cfcc8351fb58b3ddc408",
      }),
    ).toBe("0x5bcb2eb9ad2043fc0ba12804421afc0bba199736e937cfcc8351fb58b3ddc408");
  });

  it("reads kiosk id from nested PersonalKioskCap.cap.for", () => {
    expect(
      extractKioskIdFromCapFields({
        cap: {
          type: "0x2::kiosk::KioskOwnerCap",
          fields: {
            for: "0x5bcb2eb9ad2043fc0ba12804421afc0bba199736e937cfcc8351fb58b3ddc408",
          },
        },
      }),
    ).toBe("0x5bcb2eb9ad2043fc0ba12804421afc0bba199736e937cfcc8351fb58b3ddc408");
  });

  it("ignores unrelated owner caps", () => {
    expect(
      extractKioskIdFromCapFields({
        id: { id: "0x896022c028b552854bbd56a601d32f22fd9ecff4b8e0ed4c62b2fb293a406b6b" },
      }),
    ).toBeNull();
  });
});


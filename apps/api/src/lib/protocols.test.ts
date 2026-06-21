import { describe, expect, it } from "vitest";
import { baseType, classifyType } from "./protocols.js";

const CETUS_POSITION =
  "0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666::position::Position";

describe("baseType", () => {
  it("strips generic type parameters", () => {
    expect(baseType("0xabc::lending_market::ObligationOwnerCap<0xdef::pool::MAIN>")).toBe(
      "0xabc::lending_market::ObligationOwnerCap",
    );
  });
  it("leaves non-generic types unchanged", () => {
    expect(baseType(CETUS_POSITION)).toBe(CETUS_POSITION);
  });
});

describe("classifyType", () => {
  it("matches Cetus LP by exact origin package type", () => {
    const e = classifyType(CETUS_POSITION);
    expect(e).toMatchObject({ protocol: "Cetus", category: "amm_lp", label: "Cetus CLMM LP" });
  });

  it("matches Cetus LP by position::Position suffix", () => {
    const e = classifyType("0xdeadbeef::position::Position");
    expect(e).toMatchObject({ protocol: "Cetus", category: "amm_lp" });
  });

  it("matches Cetus Farms wrapped position NFT", () => {
    const e = classifyType(
      "0x11ea791d82b5742cc8cab0bf7946035c97d9001d7c3803a93f119753da66f526::pool::WrappedPositionNFT",
    );
    expect(e).toMatchObject({ protocol: "Cetus", category: "amm_lp", label: "Cetus Farms LP" });
  });

  it("matches Turbos LP by TurbosPositionNFT suffix", () => {
    const e = classifyType(
      "0xa5a0c25c79e428eba04fb98b3fb2a34db45ab26d4c8faf0d7e39d66a63891e64::position_nft::TurbosPositionNFT",
    );
    expect(e).toMatchObject({ protocol: "Turbos", category: "amm_lp", label: "Turbos LP" });
  });

  it("matches lending protocols by module::Struct suffix regardless of package id", () => {
    const scallop = classifyType("0xDEADBEEF::obligation::ObligationKey");
    expect(scallop).toMatchObject({ protocol: "Scallop", category: "lending" });

    const suilend = classifyType(
      "0xCAFE::lending_market::ObligationOwnerCap<0x1::suilend::MAIN_POOL>",
    );
    expect(suilend).toMatchObject({ protocol: "Suilend", category: "lending" });
  });

  it("returns null for unknown and malformed types", () => {
    expect(classifyType("0x2::coin::Coin<0x2::sui::SUI>")).toBeNull();
    expect(classifyType("not-a-type")).toBeNull();
    expect(classifyType("")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { isValidSuiAddress, normalizeSuiAddress } from "./sui.js";

const FULL = "0x" + "a".repeat(64);

describe("normalizeSuiAddress", () => {
  it("lowercases input", () => {
    expect(normalizeSuiAddress(FULL.toUpperCase())).toBe(FULL);
  });
});

describe("isValidSuiAddress", () => {
  it("accepts full 64-hex addresses", () => {
    expect(isValidSuiAddress(FULL)).toBe(true);
  });

  it("rejects truncated or malformed input", () => {
    expect(isValidSuiAddress("0x2")).toBe(false);
    expect(isValidSuiAddress("0x" + "a".repeat(57))).toBe(false);
    expect(isValidSuiAddress("nope")).toBe(false);
    expect(isValidSuiAddress("0x" + "a".repeat(65))).toBe(false);
    expect(isValidSuiAddress("0xZZ")).toBe(false);
  });
});

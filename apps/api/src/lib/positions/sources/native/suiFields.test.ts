import { describe, expect, it } from "vitest";
import { parseDecimal, parseObjectId, parseU128, parseVectorContents } from "./suiFields.js";

describe("parseObjectId", () => {
  it("reads ownership.fields.of and pads short hex", () => {
    const id = parseObjectId({ fields: { of: "0xabc" } });
    expect(id).toBe(`0x${"0".repeat(61)}abc`);
  });
});

describe("parseU128", () => {
  it("reads nested value fields for u128", () => {
    expect(parseU128({ fields: { value: "1163244856569621" } })).toBe(1163244856569621n);
  });
});

describe("parseDecimal", () => {
  it("parses Suilend Decimal fields", () => {
    expect(parseDecimal({ fields: { value: "1500000000000000000" } })).toBe(1.5);
  });
});

describe("parseVectorContents", () => {
  it("extracts deposit rows from obligation vector", () => {
    const rows = parseVectorContents({
      fields: {
        contents: [
          {
            fields: {
              coin_type: { fields: { name: "0x2::sui::SUI" } },
              deposited_ctoken_amount: "1000",
            },
          },
        ],
      },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.deposited_ctoken_amount).toBe("1000");
  });

  it("extracts rows from plain RPC arrays", () => {
    const rows = parseVectorContents([
      {
        fields: {
          coin_type: { fields: { name: "0x2::sui::SUI" } },
          deposited_ctoken_amount: "955364544",
        },
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.deposited_ctoken_amount).toBe("955364544");
  });
});

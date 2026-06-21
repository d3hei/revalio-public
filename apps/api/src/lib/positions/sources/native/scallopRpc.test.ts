import { describe, expect, it } from "vitest";
import { parseObjectId } from "./suiFields.js";

/** Mirrors ObligationKey ownership parsing in scallopRpc.ts */
function parseObligationIdFromKey(fields: Record<string, unknown>): string | null {
  const ownership = fields.ownership;
  if (!ownership || typeof ownership !== "object") return null;
  const o = ownership as Record<string, unknown>;
  const nested = (o.fields as Record<string, unknown> | undefined) ?? o;
  return (
    parseObjectId(nested.of) ??
    parseObjectId(o.of) ??
    parseObjectId(o.inner) ??
    parseObjectId(nested.inner) ??
    parseObjectId(o.fields) ??
    parseObjectId(ownership)
  );
}

describe("Scallop ObligationKey ownership", () => {
  const obligationId = `0x${"a".repeat(64)}`;

  it("reads ownership.fields.of (Scallop SDK shape)", () => {
    const id = parseObligationIdFromKey({
      ownership: { fields: { of: obligationId } },
    });
    expect(id).toBe(obligationId);
  });

  it("falls back to ownership.of", () => {
    const id = parseObligationIdFromKey({
      ownership: { of: obligationId },
    });
    expect(id).toBe(obligationId);
  });
});

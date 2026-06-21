/** Parse common Sui RPC Move field shapes into plain values. */

const OBJECT_ID_RE = /^0x[0-9a-fA-F]{64}$/;

export function isObjectId(value: unknown): value is string {
  return typeof value === "string" && OBJECT_ID_RE.test(value);
}

function normalizeObjectIdHex(value: string): string | null {
  const hex = value.toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{1,64}$/.test(hex)) return null;
  return `0x${hex.padStart(64, "0")}`;
}

/** Extract a 32-byte object id from string / ID / nested UID shapes. */
export function parseObjectId(value: unknown): string | null {
  if (typeof value === "string") {
    return isObjectId(value) ? value : normalizeObjectIdHex(value);
  }
  if (!value || typeof value !== "object") return null;

  const obj = value as Record<string, unknown>;
  if (typeof obj.id === "string") {
    const id = isObjectId(obj.id) ? obj.id : normalizeObjectIdHex(obj.id);
    if (id) return id;
  }
  if (typeof obj.of === "string") {
    const id = isObjectId(obj.of) ? obj.of : normalizeObjectIdHex(obj.of);
    if (id) return id;
  }

  const fields = obj.fields as Record<string, unknown> | undefined;
  if (!fields) return null;

  if (typeof fields.id === "string") {
    const id = isObjectId(fields.id) ? fields.id : normalizeObjectIdHex(fields.id);
    if (id) return id;
  }
  if (typeof fields.of === "string") {
    const id = isObjectId(fields.of) ? fields.of : normalizeObjectIdHex(fields.of);
    if (id) return id;
  }
  if (typeof fields.bytes === "string") {
    const id = isObjectId(fields.bytes) ? fields.bytes : normalizeObjectIdHex(fields.bytes);
    if (id) return id;
  }

  const nested = fields.id as Record<string, unknown> | undefined;
  if (nested && typeof nested.id === "string") {
    const id = isObjectId(nested.id) ? nested.id : normalizeObjectIdHex(nested.id);
    if (id) return id;
  }

  return null;
}

/** integer_mate::i32::I32 is serialized as `{ fields: { bits: u32 } }`. */
export function parseI32(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.length > 0) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  if (!value || typeof value !== "object") return null;

  const fields = (value as { fields?: { bits?: unknown } }).fields;
  if (!fields || fields.bits === undefined) return null;

  const bits = Number(fields.bits);
  if (!Number.isFinite(bits)) return null;
  if (bits > 0x7fffffff) return bits - 0x1_0000_0000;
  return bits;
}

/** 0x1::type_name::TypeName → full coin type string. */
export function parseTypeName(value: unknown): string | null {
  if (typeof value === "string" && value.includes("::")) return value;
  if (!value || typeof value !== "object") return null;

  const fields = (value as { fields?: { name?: unknown } }).fields;
  if (fields && typeof fields.name === "string" && fields.name.includes("::")) {
    return fields.name;
  }
  return null;
}

/** Suilend / protocol Decimal (18-decimal fixed point in RPC). */
export function parseDecimal(value: unknown, scale = 18): number | null {
  let raw: string | null = null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length > 0) raw = value;
  if (!raw && value && typeof value === "object") {
    const fields = (value as { fields?: { value?: unknown } }).fields;
    if (fields?.value !== undefined) raw = String(fields.value);
  }
  if (!raw) return null;
  try {
    const n = Number(raw) / 10 ** scale;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Parse Move vector serialized as `{ fields: { contents: [...] } }` or a plain RPC array. */
export function parseVectorContents(value: unknown): Record<string, unknown>[] {
  const normalizeRow = (row: unknown): Record<string, unknown> | null => {
    if (!row || typeof row !== "object") return null;
    const rf = (row as { fields?: Record<string, unknown> }).fields ?? row;
    return rf as Record<string, unknown>;
  };

  if (Array.isArray(value)) {
    return value
      .map(normalizeRow)
      .filter((row): row is Record<string, unknown> => row !== null);
  }

  if (!value || typeof value !== "object") return [];
  const root = value as Record<string, unknown>;
  const fields = (root.fields as Record<string, unknown> | undefined) ?? root;
  const contents = fields.contents;
  if (!Array.isArray(contents)) return [];
  return contents
    .map(normalizeRow)
    .filter((row): row is Record<string, unknown> => row !== null);
}

export function parseU128(value: unknown): bigint | null {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    if (!Number.isSafeInteger(value)) return null;
    return BigInt(value);
  }
  if (typeof value === "string" && value.length > 0) {
    try {
      return BigInt(value);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== "object") return null;
  const fields = (value as { fields?: Record<string, unknown> }).fields;
  if (!fields) return null;
  if (fields.value !== undefined) return parseU128(fields.value);
  if (fields.bits !== undefined) return parseU128(fields.bits);
  return null;
}

export function isCetusPositionType(type: string | null | undefined): boolean {
  if (!type) return false;
  const base = type.split("<")[0]?.trim() ?? "";
  return base.endsWith("::position::Position");
}

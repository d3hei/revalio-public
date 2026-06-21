/** Unwrap BlockVision `result` for protocol-specific portfolio payloads. */
export function unwrapProtocolResult<T extends object>(
  envelope: { result?: unknown } | null | undefined,
  protocolKey: string,
  keys: string[],
): T {
  const raw = envelope?.result;
  if (!raw || typeof raw !== "object") return {} as T;
  const r = raw as Record<string, unknown>;

  const nested = r[protocolKey];
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as T;
  }

  if (!Array.isArray(r) && keys.some((k) => r[k as string] !== undefined)) {
    return r as T;
  }

  if (Array.isArray(r)) {
    return { [protocolKey]: r } as T;
  }

  return {} as T;
}

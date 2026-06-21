import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson, HttpError } from "./http.js";

// Minimal Response-like stub matching what fetchJson reads (ok/status/json/headers.get).
function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
  } as unknown as Response;
}

// Fast retries so tests don't actually wait.
const FAST = { retryBaseMs: 1, retryMaxMs: 5, timeoutMs: 50 };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchJson", () => {
  it("returns parsed JSON on a 2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { hello: "world" }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await fetchJson<{ hello: string }>("https://x.test", FAST);

    expect(data).toEqual({ hello: "world" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sets a default Accept header but lets callers override it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await fetchJson("https://x.test", { ...FAST, headers: { "x-custom": "1" } });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ accept: "application/json", "x-custom": "1" });
  });

  it("retries transient 5xx then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { err: true }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await fetchJson<{ ok: boolean }>("https://x.test", FAST);

    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 and honors a Retry-After header", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(429, {}, { "retry-after": "0" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await fetchJson<{ ok: number }>("https://x.test", FAST);

    expect(data).toEqual({ ok: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry non-retryable statuses (404) and throws HttpError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(404, { err: "nope" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchJson("https://x.test", FAST)).rejects.toBeInstanceOf(HttpError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on network errors then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await fetchJson<{ ok: boolean }>("https://x.test", FAST);

    expect(data).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after exhausting retries and throws the last error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500, {}));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchJson("https://x.test", { ...FAST, retries: 2 })).rejects.toBeInstanceOf(
      HttpError,
    );
    // initial attempt + 2 retries = 3 calls
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("exposes the HTTP status on the thrown HttpError", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(418, {}));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchJson("https://x.test", FAST)).rejects.toMatchObject({ status: 418 });
  });
});

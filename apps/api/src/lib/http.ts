/**
 * Small resilient JSON fetch helper for upstream services (Pyth, CoinGecko,
 * Sui RPC). Adds a request timeout plus retries with exponential backoff and
 * jitter on transient failures (network errors, HTTP 429 and 5xx), and honors
 * a `Retry-After` header when the upstream provides one.
 *
 * On success it returns the parsed JSON body. On a non-retryable response or
 * once retries are exhausted it throws (an `HttpError` for HTTP statuses), so
 * callers can distinguish "definitive" failures from transient ones.
 */

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export type UpstreamOutcome = "success" | "retry" | "error";

// Optional observability hook. Decoupled so this module stays dependency-free
// (and unit-testable without pulling in the metrics registry). The metrics
// module installs a real recorder at server startup; otherwise it's a no-op.
let recordOutcome: (host: string, outcome: UpstreamOutcome) => void = () => {};

export function setUpstreamRecorder(fn: (host: string, outcome: UpstreamOutcome) => void): void {
  recordOutcome = fn;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}

export interface FetchJsonOptions extends Omit<RequestInit, "signal"> {
  /** Per-attempt timeout in milliseconds. */
  timeoutMs?: number;
  /** Number of retries AFTER the initial attempt. */
  retries?: number;
  /** Base backoff delay; doubles each attempt (with jitter). */
  retryBaseMs?: number;
  /** Upper bound for any single backoff / Retry-After wait. */
  retryMaxMs?: number;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with full jitter, capped at `maxMs`. */
function backoffMs(attempt: number, baseMs: number, maxMs: number): number {
  const exp = Math.min(baseMs * 2 ** attempt, maxMs);
  return Math.round(Math.random() * exp);
}

/** Parse a `Retry-After` header (seconds or HTTP-date) into a capped delay. */
function retryAfterMs(res: Response, maxMs: number): number | null {
  const header = res.headers.get("retry-after");
  if (!header) return null;
  const seconds = Number(header);
  let ms: number;
  if (Number.isFinite(seconds)) {
    ms = seconds * 1000;
  } else {
    const date = Date.parse(header);
    if (Number.isNaN(date)) return null;
    ms = date - Date.now();
  }
  if (ms <= 0) return 0;
  return Math.min(ms, maxMs);
}

export async function fetchJson<T>(url: string, opts: FetchJsonOptions = {}): Promise<T> {
  const {
    timeoutMs = 5000,
    retries = 2,
    retryBaseMs = 300,
    retryMaxMs = 4000,
    headers,
    ...rest
  } = opts;

  const host = hostOf(url);
  let lastErr: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...rest,
        headers: { accept: "application/json", ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) {
        const parsed = (await res.json()) as T;
        recordOutcome(host, "success");
        return parsed;
      }

      // Non-2xx: retry only transient statuses, and only if attempts remain.
      if (!isRetryableStatus(res.status) || attempt === retries) {
        throw new HttpError(res.status, `HTTP ${res.status} for ${url}`);
      }
      lastErr = new HttpError(res.status, `HTTP ${res.status} for ${url}`);
      recordOutcome(host, "retry");
      const wait = retryAfterMs(res, retryMaxMs) ?? backoffMs(attempt, retryBaseMs, retryMaxMs);
      await sleep(wait);
      continue;
    } catch (err) {
      // A non-retryable HTTP status should bubble up immediately.
      if (err instanceof HttpError && !isRetryableStatus(err.status)) {
        recordOutcome(host, "error");
        throw err;
      }
      lastErr = err;
      if (attempt === retries) break;
      recordOutcome(host, "retry");
      await sleep(backoffMs(attempt, retryBaseMs, retryMaxMs));
    }
  }

  recordOutcome(host, "error");
  throw lastErr ?? new Error(`fetchJson failed for ${url}`);
}

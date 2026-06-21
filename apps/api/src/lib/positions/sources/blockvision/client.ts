import { config } from "../../../../config.js";
import { redis } from "../../../../redis.js";
import { fetchJson, HttpError } from "../../../http.js";

const BV_CACHE_TTL_SECONDS = 120;

export interface BlockVisionEnvelope<T> {
  code?: number;
  message?: string;
  result?: T;
}

export interface FetchDefiPortfolioOptions {
  /** Skip Redis cache read/write (use after empty/error to retry live). */
  bustCache?: boolean;
}

export function isBlockVisionConfigured(): boolean {
  return config.blockvision.apiKey.length > 0;
}

function cacheKey(address: string, protocol: string): string {
  return `bv:defi:${protocol}:${address.toLowerCase()}`;
}

/** Drop cached BlockVision row for one protocol (e.g. stale empty payload). */
export async function clearDefiPortfolioCache(
  address: string,
  protocol: string,
): Promise<void> {
  try {
    await redis.del(cacheKey(address, protocol));
  } catch {
    /* best-effort */
  }
}

/** True when a Cetus-shaped payload actually contains positions. */
export function cetusPayloadHasRows(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const r = result as Record<string, unknown>;
  const nested = r.cetus;
  const body =
    nested && typeof nested === "object" && !Array.isArray(nested)
      ? (nested as Record<string, unknown>)
      : r;
  const count =
    (Array.isArray(body.lps) ? body.lps.length : 0) +
    (Array.isArray(body.farms) ? body.farms.length : 0) +
    (Array.isArray(body.vaults) ? body.vaults.length : 0);
  return count > 0;
}

function shouldCache(protocol: string, body: BlockVisionEnvelope<unknown>): boolean {
  if (body.code !== undefined && body.code !== 200) return false;
  if (protocol === "cetus") return cetusPayloadHasRows(body.result);
  // Other protocols: cache non-error responses (adapter filters empties).
  return body.result !== undefined;
}

/**
 * Fetch DeFi portfolio for one protocol from BlockVision.
 * @see https://docs.blockvision.org/reference/retrieve-account-defi-portfolio
 */
export async function fetchDefiPortfolio<T>(
  address: string,
  protocol: string,
  options?: FetchDefiPortfolioOptions,
): Promise<BlockVisionEnvelope<T> | null> {
  if (!isBlockVisionConfigured()) return null;

  const key = cacheKey(address, protocol);
  if (!options?.bustCache) {
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached) as BlockVisionEnvelope<T>;
    } catch {
      /* cache miss */
    }
  } else {
    await clearDefiPortfolioCache(address, protocol);
  }

  const url = new URL(`${config.blockvision.baseUrl}/sui/account/defiPortfolio`);
  url.searchParams.set("address", address);
  url.searchParams.set("protocol", protocol);

  try {
    const body = await fetchJson<BlockVisionEnvelope<T>>(url.toString(), {
      headers: { "x-api-key": config.blockvision.apiKey },
      timeoutMs: 12_000,
      retries: 1,
    });
    if (shouldCache(protocol, body as BlockVisionEnvelope<unknown>)) {
      try {
        await redis.set(key, JSON.stringify(body), "EX", BV_CACHE_TTL_SECONDS);
      } catch {
        /* cache write is best-effort */
      }
    }
    return body;
  } catch (e) {
    const message =
      e instanceof HttpError
        ? `upstream_http_${e.status}`
        : e instanceof Error
          ? e.message
          : "blockvision_fetch_failed";
    return { code: -1, message, result: undefined };
  }
}

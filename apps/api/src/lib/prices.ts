import { config } from "../config.js";
import { redis } from "../redis.js";
import { fetchJson } from "./http.js";

// Pyth price-feed IDs for the *underlying* asset (mainnet pricing). Keyed by
// coin SYMBOL so that testnet coin-type variants resolve via their metadata
// symbol (e.g. several testnet USDC deployments all map to USDC/USD).
const PYTH_FEEDS: Record<string, string> = {
  SUI: "0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744",
  USDC: "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
  USDT: "0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
  ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  WETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  WBTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  DEEP: "0x29bdd5248234e33bd93d3b81100b5fa32eaa5997843847e2c2cb16d7c6d9f7ff",
};

const PRICE_TTL_SECONDS = 30;
const HERMES_TIMEOUT_MS = 5000;

interface HermesParsedPrice {
  id: string;
  price: { price: string; expo: number; conf: string; publish_time: number };
}
interface HermesResponse {
  parsed?: HermesParsedPrice[];
}

function normalizeFeedId(id: string): string {
  return id.replace(/^0x/, "").toLowerCase();
}

/** Reverse index: normalized feed id -> the symbols that use it. */
function feedIdToSymbols(): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [symbol, feed] of Object.entries(PYTH_FEEDS)) {
    const key = normalizeFeedId(feed);
    const list = map.get(key) ?? [];
    list.push(symbol);
    map.set(key, list);
  }
  return map;
}

const GECKO_URL =
  "https://api.geckoterminal.com/api/v2/simple/networks/sui-network/token_price";
const GECKO_TTL_SECONDS = 120;
const GECKO_BATCH = 30;
const GECKO_TIMEOUT_MS = 6000;

interface GeckoResponse {
  data?: { attributes?: { token_prices?: Record<string, string> } };
}

/**
 * Market prices for coins WITHOUT a Pyth feed, by full coin type, via the public
 * GeckoTerminal Sui endpoint (no key). Redis-cached (incl. a 0 for "no market" so
 * we don't hammer it). Network errors leave coins unpriced — never throws.
 */
async function geckoTokenPrices(coinTypes: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const unique = [...new Set(coinTypes.filter(Boolean))];
  if (unique.length === 0) return out;

  const uncached: string[] = [];
  await Promise.all(
    unique.map(async (ct) => {
      try {
        const cached = await redis.get(`gtprice:${ct}`);
        const n = cached === null ? NaN : Number(cached);
        if (Number.isFinite(n)) {
          if (n > 0) out.set(ct, n);
        } else {
          uncached.push(ct);
        }
      } catch {
        uncached.push(ct);
      }
    }),
  );
  if (uncached.length === 0) return out;

  for (let i = 0; i < uncached.length; i += GECKO_BATCH) {
    const batch = uncached.slice(i, i + GECKO_BATCH);
    try {
      const body = await fetchJson<GeckoResponse>(
        `${GECKO_URL}/${batch.map((c) => encodeURIComponent(c)).join(",")}`,
        { timeoutMs: GECKO_TIMEOUT_MS, retries: 1 },
      );
      const prices = body.data?.attributes?.token_prices ?? {};
      for (const ct of batch) {
        const raw = prices[ct];
        const px = raw == null ? NaN : Number(raw);
        const valid = Number.isFinite(px) && px > 0;
        if (valid) out.set(ct, px);
        try {
          await redis.set(`gtprice:${ct}`, valid ? String(px) : "0", "EX", GECKO_TTL_SECONDS);
        } catch {
          /* cache best-effort */
        }
      }
    } catch {
      /* leave this batch unpriced */
    }
  }
  return out;
}

/**
 * USD prices keyed by coin TYPE: Pyth where a feed exists (via the coin's symbol),
 * otherwise the GeckoTerminal market price. Lets stablecoins, LSTs and long-tail
 * tokens (WAL, haSUI, FUD, USDY, vSUI, …) be valued instead of showing as "—".
 */
export async function getCoinTypeUsdPrices(
  coins: { coinType: string; symbol?: string | null }[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const symbols = coins.map((c) => c.symbol).filter((s): s is string => Boolean(s));
  const pyth = symbols.length ? await getUsdPrices(symbols) : new Map<string, number>();

  const needGecko: string[] = [];
  for (const c of coins) {
    if (!c.coinType) continue;
    const px = c.symbol ? pyth.get(c.symbol) : undefined;
    if (px !== undefined) out.set(c.coinType, px);
    else needGecko.push(c.coinType);
  }
  if (needGecko.length > 0) {
    const gecko = await geckoTokenPrices(needGecko);
    for (const [ct, px] of gecko) out.set(ct, px);
  }
  return out;
}

/**
 * Best-effort USD spot prices keyed by coin symbol. Symbols without a known
 * feed are omitted. Network/Pyth errors yield an empty map (never throws), so
 * valuation degrades gracefully to "price unavailable".
 */
export async function getUsdPrices(symbols: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const wanted = [...new Set(symbols.filter((s) => PYTH_FEEDS[s]))];
  if (wanted.length === 0) return out;

  // Serve from the short-lived Redis cache where possible.
  const uncached: string[] = [];
  await Promise.all(
    wanted.map(async (symbol) => {
      try {
        const cached = await redis.get(`price:${symbol}`);
        const n = cached === null ? NaN : Number(cached);
        if (Number.isFinite(n)) out.set(symbol, n);
        else uncached.push(symbol);
      } catch {
        uncached.push(symbol);
      }
    }),
  );
  if (uncached.length === 0) return out;

  const feeds = [...new Set(uncached.map((s) => PYTH_FEEDS[s]))];
  const params = new URLSearchParams();
  for (const feed of feeds) params.append("ids[]", feed);

  try {
    const body = await fetchJson<HermesResponse>(
      `${config.prices.hermesUrl}/v2/updates/price/latest?${params.toString()}`,
      { timeoutMs: HERMES_TIMEOUT_MS, retries: 2 },
    );
    const bySymbol = feedIdToSymbols();

    for (const parsed of body.parsed ?? []) {
      const symbolsForFeed = bySymbol.get(normalizeFeedId(parsed.id));
      if (!symbolsForFeed) continue;
      const price = Number(parsed.price.price) * 10 ** parsed.price.expo;
      if (!Number.isFinite(price)) continue;
      for (const symbol of symbolsForFeed) {
        out.set(symbol, price);
        try {
          await redis.set(`price:${symbol}`, String(price), "EX", PRICE_TTL_SECONDS);
        } catch {
          /* cache is best-effort */
        }
      }
    }
  } catch {
    /* leave `out` with whatever the cache provided */
  }

  return out;
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildPortfolioHistory } from "../lib/portfolioHistory.js";
import { loadWalletSnapshot } from "../lib/walletSnapshot.js";
import { suiAddressSchema } from "../lib/sui.js";
import { redis } from "../redis.js";

const CHART_CACHE_TTL_SEC = 120;

const paramsSchema = z.object({ address: suiAddressSchema });
const querySchema = z.object({ range: z.enum(["24h", "7d", "30d", "1y"]).default("7d") });

export async function chartRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/wallets/:address/chart?range=24h|7d|30d|1y
  // Points = historical balance snapshots × historical prices (never current prices for past buckets).
  app.get("/api/v1/wallets/:address/chart", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: "invalid_query" });
    }

    const { address } = params.data;
    const { range } = parsedQuery.data;

    const cacheKey = `chart:response:v5:${address.toLowerCase()}:${range}`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      /* cache miss */
    }

    const snapshot = await loadWalletSnapshot(address);
    const { points, liveTotalUsd, activeSinceMs, historyStartMs, source } =
      await buildPortfolioHistory({
      address,
      range,
      snapshot,
    });

    const payload = {
      address,
      range,
      points,
      liveTotalUsd,
      activeSinceMs,
      historyStartMs,
      source,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(payload), "EX", CHART_CACHE_TTL_SEC);
    } catch {
      /* best-effort */
    }

    return payload;
  });
}

import type { FastifyInstance } from "fastify";
import { pingDb } from "../db.js";
import { pingRedis } from "../redis.js";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => ({
    service: "revalio-api",
    health: "/health",
    example: "/api/v1/wallets/{address}/portfolio",
    positions: "/api/v1/wallets/{address}/positions",
    debug: "/api/v1/wallets/{address}/debug/blockvision",
  }));

  app.get("/health", async () => ({ status: "ok", uptime: process.uptime() }));

  app.get("/api/health", async () => ({ status: "ok", uptime: process.uptime() }));

  app.get("/health/deep", async () => {
    const [db, cache] = await Promise.all([pingDb(), pingRedis()]);
    const healthy = db && cache;
    return {
      status: healthy ? "ok" : "degraded",
      checks: { postgres: db, redis: cache },
    };
  });
}

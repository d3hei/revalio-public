import type { FastifyInstance } from "fastify";
import { registry } from "../lib/metrics.js";

export async function metricsRoutes(app: FastifyInstance): Promise<void> {
  // Prometheus scrape endpoint. Exempt from the global rate limit so scrapes
  // never get throttled.
  app.get("/metrics", { config: { rateLimit: false } }, async (_request, reply) => {
    reply.header("content-type", registry.contentType);
    return registry.metrics();
  });
}

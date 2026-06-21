import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { httpRequestDuration } from "./lib/metrics.js";
import { healthRoutes } from "./routes/health.js";
import { metricsRoutes } from "./routes/metrics.js";
import { walletRoutes } from "./routes/wallets.js";
import { activityRoutes } from "./routes/activity.js";
import { chartRoutes } from "./routes/chart.js";
import { portfolioRoutes } from "./routes/portfolio.js";
import { positionRoutes } from "./routes/positions.js";
import { overviewRoutes } from "./routes/overview.js";
import { analysisRoutes } from "./routes/analysis.js";
import { stakingRoutes } from "./routes/staking.js";
import { changesRoutes } from "./routes/changes.js";
import { profileRoutes } from "./routes/profile.js";
import { nftRoutes } from "./routes/nfts.js";
import { ageRoutes } from "./routes/age.js";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === "production" ? "info" : "debug",
      transport:
        config.nodeEnv === "development"
          ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
          : undefined,
    },
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  // Record request latency by route (uses the matched route pattern, not the
  // raw URL, to keep label cardinality bounded).
  app.addHook("onResponse", async (request, reply) => {
    const route = request.routeOptions.url ?? request.url;
    if (route === "/metrics") return;
    httpRequestDuration
      .labels(request.method, route, String(reply.statusCode))
      .observe(reply.elapsedTime / 1000);
  });

  await app.register(healthRoutes);
  await app.register(metricsRoutes);
  await app.register(overviewRoutes);
  await app.register(analysisRoutes);
  await app.register(stakingRoutes);
  await app.register(changesRoutes);
  await app.register(walletRoutes);
  await app.register(activityRoutes);
  await app.register(chartRoutes);
  await app.register(portfolioRoutes);
  await app.register(positionRoutes);
  await app.register(profileRoutes);
  await app.register(nftRoutes);
  await app.register(ageRoutes);

  return app;
}

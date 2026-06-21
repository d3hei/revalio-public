import { buildServer } from "./server.js";
import { config } from "./config.js";
import { startPortfolioSnapshotCollector } from "./portfolioSnapshotCollector.js";
import { startPriceCollector } from "./priceCollector.js";

async function main(): Promise<void> {
  const app = await buildServer();

  const stopPriceCollector = startPriceCollector(app.log);
  const stopPortfolioSnapshots = startPortfolioSnapshotCollector(app.log);

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down");
    stopPriceCollector();
    stopPortfolioSnapshots();
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await app.listen({ host: config.api.host, port: config.api.port });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();

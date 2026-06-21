import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPortfolioSummary } from "../lib/portfolioSummary.js";
import { suiAddressSchema } from "../lib/sui.js";

const paramsSchema = z.object({ address: suiAddressSchema });

export async function portfolioRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/wallets/:address/portfolio — unified headline totals
  app.get("/api/v1/wallets/:address/portfolio", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    return getPortfolioSummary(parsed.data.address);
  });
}

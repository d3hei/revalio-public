import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildWalletAnalysis } from "../lib/walletAnalysis.js";
import { suiAddressSchema } from "../lib/sui.js";

const paramsSchema = z.object({ address: suiAddressSchema });

export async function analysisRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/wallets/:address/analysis
  // Smart Wallet Analysis: exposure classes, explainable scores, labels, risk.
  app.get("/api/v1/wallets/:address/analysis", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    return buildWalletAnalysis(parsed.data.address);
  });
}

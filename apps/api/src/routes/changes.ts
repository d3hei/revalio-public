import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildWalletChanges } from "../lib/walletChanges.js";
import { suiAddressSchema } from "../lib/sui.js";

const paramsSchema = z.object({ address: suiAddressSchema });

export async function changesRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/wallets/:address/changes — position changes over the last 7 days.
  app.get("/api/v1/wallets/:address/changes", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    return buildWalletChanges(parsed.data.address);
  });
}

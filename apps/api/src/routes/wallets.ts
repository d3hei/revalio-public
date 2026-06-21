import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { suiAddressSchema } from "../lib/sui.js";
import { buildWalletPayload } from "../lib/walletPayload.js";
import { getCachedWalletBalances } from "../lib/walletSnapshot.js";

const paramsSchema = z.object({ address: suiAddressSchema });

export async function walletRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/wallets/:address
  // Aggregated coin balances enriched with coin metadata and USD valuation.
  app.get("/api/v1/wallets/:address", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    const { address } = parsed.data;
    const balanceSource = await getCachedWalletBalances(address);
    return buildWalletPayload(address, balanceSource);
  });
}

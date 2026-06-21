import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { buildWalletStaking } from "../lib/walletStaking.js";
import { suiAddressSchema } from "../lib/sui.js";

const paramsSchema = z.object({ address: suiAddressSchema });

export async function stakingRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/wallets/:address/staking — native SUI staking by validator.
  app.get("/api/v1/wallets/:address/staking", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    return buildWalletStaking(parsed.data.address);
  });
}

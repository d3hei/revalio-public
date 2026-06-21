import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getOwnedNfts } from "../lib/nfts.js";
import { suiAddressSchema } from "../lib/sui.js";

const paramsSchema = z.object({ address: suiAddressSchema });
const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(50),
});

export async function nftRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/wallets/:address/nfts", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }

    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: "invalid_query" });
    }

    const page = await getOwnedNfts(params.data.address, query.data.cursor, query.data.limit);
    return {
      address: params.data.address,
      items: page.items,
      nextCursor: page.nextCursor,
      kioskIds: page.kioskIds,
    };
  });
}


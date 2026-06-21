import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { suiAddressSchema } from "../lib/sui.js";
import { defiRpcCall } from "../lib/positions/sources/native/rpcClient.js";

const paramsSchema = z.object({ address: suiAddressSchema });

interface QueryTxResult {
  result?: {
    data?: { digest?: string; timestampMs?: string | number | null }[];
  };
  error?: unknown;
}

export async function ageRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/wallets/:address/age — first (oldest) transaction sent by the
  // address, used to derive a Revalio-style "wallet age". Read on-demand from
  // mainnet RPC (ascending order, limit 1).
  app.get("/api/v1/wallets/:address/age", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }

    const body = await defiRpcCall<QueryTxResult>({
      jsonrpc: "2.0",
      id: 1,
      method: "suix_queryTransactionBlocks",
      params: [
        { filter: { FromAddress: parsed.data.address }, options: { showInput: true } },
        null,
        1,
        false, // ascending → oldest first
      ],
    });

    const first = body?.result?.data?.[0];
    const ts = first?.timestampMs != null && first.timestampMs !== "" ? String(first.timestampMs) : null;

    return {
      address: parsed.data.address,
      firstTimestampMs: ts,
      firstDigest: first?.digest ?? null,
    };
  });
}

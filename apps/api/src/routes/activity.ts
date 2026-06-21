import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db.js";
import {
  decodeRpcActivityCursor,
  encodeRpcActivityCursor,
  getOnDemandActivity,
  isRpcActivityCursor,
} from "../lib/mainnetActivity.js";
import { suiAddressSchema } from "../lib/sui.js";

const paramsSchema = z.object({ address: suiAddressSchema });
const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

interface ActivityRow {
  tx_digest: string;
  kind: string | null;
  sender: string | null;
  checkpoint: string;
  timestamp_ms: string;
}

// Cursor encodes the last row's (timestamp_ms, tx_digest) for stable keyset
// pagination. tx_digest breaks ties between txs sharing a timestamp.
function encodeCursor(timestampMs: string, txDigest: string): string {
  return Buffer.from(`${timestampMs}|${txDigest}`).toString("base64url");
}

function decodeCursor(cursor: string): { timestampMs: string; txDigest: string } | null {
  try {
    const [timestampMs, txDigest] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
    if (!timestampMs || !txDigest || !/^\d+$/.test(timestampMs)) return null;
    return { timestampMs, txDigest };
  } catch {
    return null;
  }
}

export async function activityRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/wallets/:address/activity?limit=&cursor=
  // Recent transactions sent by the address, newest first, keyset-paginated.
  app.get("/api/v1/wallets/:address/activity", async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: "invalid_query" });
    }

    const { address } = params.data;
    const { limit, cursor } = parsedQuery.data;

    if (cursor && isRpcActivityCursor(cursor)) {
      const rpcCursor = decodeRpcActivityCursor(cursor);
      if (!rpcCursor) {
        return reply.code(400).send({ error: "invalid_cursor" });
      }
      const rpcPage = await getOnDemandActivity(address, limit + 1, rpcCursor);
      const hasMore = rpcPage.items.length > limit;
      const page = hasMore ? rpcPage.items.slice(0, limit) : rpcPage.items;
      return {
        address,
        source: "rpc" as const,
        items: page,
        nextCursor:
          hasMore && rpcPage.nextCursor ? encodeRpcActivityCursor(rpcPage.nextCursor) : null,
      };
    }

    const decoded = cursor ? decodeCursor(cursor) : null;
    if (cursor && !decoded) {
      return reply.code(400).send({ error: "invalid_cursor" });
    }

    const conditions = ["sender = $1"];
    const args: unknown[] = [address];
    if (decoded) {
      args.push(decoded.timestampMs, decoded.txDigest);
      conditions.push("(timestamp_ms, tx_digest) < ($2, $3)");
    }

    // Fetch one extra row to determine whether another page exists.
    const { rows } = await query<ActivityRow>(
      `SELECT tx_digest,
              kind,
              sender,
              checkpoint::text   AS checkpoint,
              timestamp_ms::text AS timestamp_ms
         FROM transactions
        WHERE ${conditions.join(" AND ")}
        ORDER BY timestamp_ms DESC, tx_digest DESC
        LIMIT ${limit + 1}`,
      args,
    );

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    const nextCursor = hasMore && last ? encodeCursor(last.timestamp_ms, last.tx_digest) : null;

    if (page.length > 0 || cursor) {
      return {
        address,
        source: "indexer" as const,
        items: page.map((r) => ({
          txDigest: r.tx_digest,
          kind: r.kind,
          sender: r.sender,
          checkpoint: r.checkpoint,
          timestampMs: r.timestamp_ms,
        })),
        nextCursor,
      };
    }

    const rpcPage = await getOnDemandActivity(address, limit + 1);
    const rpcHasMore = rpcPage.items.length > limit;
    const rpcItems = rpcHasMore ? rpcPage.items.slice(0, limit) : rpcPage.items;
    return {
      address,
      source: "rpc" as const,
      items: rpcItems,
      nextCursor:
        rpcHasMore && rpcPage.nextCursor ? encodeRpcActivityCursor(rpcPage.nextCursor) : null,
    };
  });
}

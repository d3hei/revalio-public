import { defiRpcCall } from "./positions/sources/native/rpcClient.js";

export interface RpcActivityItem {
  txDigest: string;
  kind: string | null;
  sender: string | null;
  checkpoint: string;
  timestampMs: string;
}

interface QueryTxBlocksResult {
  result?: {
    data?: {
      digest?: string;
      timestampMs?: string | number | null;
      checkpoint?: string | number | null;
      transaction?: { data?: { sender?: string } };
    }[];
    nextCursor?: string | null;
    hasNextPage?: boolean;
  };
  error?: unknown;
}

/** On-demand mainnet sent transactions when the indexer has no rows. */
export async function getOnDemandActivity(
  address: string,
  limit: number,
  cursor?: string | null,
): Promise<{ items: RpcActivityItem[]; nextCursor: string | null }> {
  const body = await defiRpcCall<QueryTxBlocksResult>({
    jsonrpc: "2.0",
    id: 1,
    method: "suix_queryTransactionBlocks",
    params: [
      {
        filter: { FromAddress: address },
        options: {
          showInput: true,
          showEffects: false,
          showEvents: false,
        },
      },
      cursor ?? null,
      limit,
      true,
    ],
  });

  const rows = body?.result?.data ?? [];
  const items: RpcActivityItem[] = rows
    .filter((row) => typeof row.digest === "string")
    .map((row) => ({
      txDigest: row.digest!,
      kind: "Transaction",
      sender: row.transaction?.data?.sender ?? address,
      checkpoint: row.checkpoint != null ? String(row.checkpoint) : "0",
      timestampMs:
        row.timestampMs != null && row.timestampMs !== ""
          ? String(row.timestampMs)
          : "0",
    }));

  const next = body?.result?.nextCursor;
  return {
    items,
    nextCursor: typeof next === "string" && next.length > 0 ? next : null,
  };
}

const RPC_CURSOR_PREFIX = "rpc:";

export function encodeRpcActivityCursor(cursor: string): string {
  return `${RPC_CURSOR_PREFIX}${Buffer.from(cursor, "utf8").toString("base64url")}`;
}

export function decodeRpcActivityCursor(cursor: string): string | null {
  if (!cursor.startsWith(RPC_CURSOR_PREFIX)) return null;
  try {
    return Buffer.from(cursor.slice(RPC_CURSOR_PREFIX.length), "base64url").toString("utf8");
  } catch {
    return null;
  }
}

export function isRpcActivityCursor(cursor: string): boolean {
  return cursor.startsWith(RPC_CURSOR_PREFIX);
}

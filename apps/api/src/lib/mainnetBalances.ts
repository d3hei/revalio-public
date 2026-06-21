import { normalizeCoinType } from "./coinType.js";
import { defiRpcCall } from "./positions/sources/native/rpcClient.js";

interface BalanceEntry {
  coinType: string;
  totalBalance: string;
}

interface GetAllBalancesResult {
  result?: BalanceEntry[];
  error?: unknown;
}

/** On-demand mainnet coin balances when the indexer has no rows for this address. */
export async function getOnDemandBalances(
  address: string,
): Promise<{ coin_type: string; balance: string }[]> {
  const body = await defiRpcCall<GetAllBalancesResult>({
    jsonrpc: "2.0",
    id: 1,
    method: "suix_getAllBalances",
    params: [address],
  });
  if (!body?.result) return [];

  return body.result
    .filter((b) => b.coinType && b.totalBalance && b.totalBalance !== "0")
    .map((b) => ({
      coin_type: normalizeCoinType(b.coinType),
      balance: b.totalBalance,
    }));
}

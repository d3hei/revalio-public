import { query } from "../db.js";
import { getOnDemandBalances } from "./mainnetBalances.js";

export interface WalletBalanceRow {
  coin_type: string;
  balance: string;
}

export interface WalletBalanceSource {
  rows: WalletBalanceRow[];
  indexerBalances: boolean;
  onDemandBalances: boolean;
}

async function queryIndexerBalances(address: string): Promise<WalletBalanceRow[]> {
  try {
    const { rows } = await Promise.race([
      query<WalletBalanceRow>(
        `SELECT coin_type, balance::text AS balance FROM balances WHERE owner_address = $1`,
        [address],
      ),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("indexer balance query timeout")), 1_200);
      }),
    ]);
    return rows;
  } catch {
    return [];
  }
}

/** Indexed balances with on-demand mainnet fallback when the indexer is empty. */
export async function resolveWalletBalances(address: string): Promise<WalletBalanceSource> {
  const balanceRows = await queryIndexerBalances(address);

  if (balanceRows.length > 0) {
    return { rows: balanceRows, indexerBalances: true, onDemandBalances: false };
  }

  const onDemand = await getOnDemandBalances(address);
  if (onDemand.length > 0) {
    return { rows: onDemand, indexerBalances: false, onDemandBalances: true };
  }

  return { rows: [], indexerBalances: false, onDemandBalances: false };
}

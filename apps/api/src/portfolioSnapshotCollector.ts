import { query } from "./db.js";
import { buildPortfolioSnapshotState } from "./lib/portfolioSnapshotState.js";
import { savePortfolioSnapshotHourly } from "./lib/portfolioSnapshotStore.js";
import { loadWalletSnapshot } from "./lib/walletSnapshot.js";

const INTERVAL_MS = 3_600_000;
const INITIAL_DELAY_MS = 120_000;

interface Logger {
  error: (obj: unknown, msg?: string) => void;
}

/** Hourly snapshots for wallets that already have history (keeps chart building over time). */
async function collectOnce(): Promise<void> {
  const { rows } = await query<{ owner_address: string }>(
    `SELECT DISTINCT owner_address
       FROM portfolio_snapshots
      WHERE ts > now() - interval '7 days'`,
  );
  if (rows.length === 0) return;

  for (const { owner_address } of rows) {
    try {
      const snapshot = await loadWalletSnapshot(owner_address);
      const state = await buildPortfolioSnapshotState(
        owner_address,
        snapshot.balanceSource.rows,
        snapshot.defi,
      );
      if (state.assets.length === 0 && state.liabilities.length === 0) continue;
      await savePortfolioSnapshotHourly(owner_address, state);
    } catch {
      /* best-effort per wallet */
    }
  }
}

export function startPortfolioSnapshotCollector(log: Logger): () => void {
  const tick = () => {
    collectOnce().catch((err) => log.error(err, "portfolio snapshot collector tick failed"));
  };

  const initial = setTimeout(tick, INITIAL_DELAY_MS);
  const interval = setInterval(tick, INTERVAL_MS);
  initial.unref?.();
  interval.unref?.();

  return () => {
    clearTimeout(initial);
    clearInterval(interval);
  };
}

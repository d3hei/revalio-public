import type { ResolvedPosition } from "./positions/types.js";
import { resolveDefiPositions } from "./positions/resolve.js";
import type { WalletBalanceSource } from "./walletBalances.js";
import { resolveWalletBalances } from "./walletBalances.js";

const SNAPSHOT_TTL_MS = 45_000;

interface CacheEntry<T> {
  value?: T;
  expiresAt: number;
  inflight?: Promise<T>;
}

const balanceCache = new Map<string, CacheEntry<WalletBalanceSource>>();
const defiCache = new Map<string, CacheEntry<ResolvedPosition[]>>();

const EMPTY_BALANCE_SOURCE: WalletBalanceSource = {
  rows: [],
  indexerBalances: false,
  onDemandBalances: false,
};

async function cachedLoad<T>(
  store: Map<string, CacheEntry<T>>,
  key: string,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit?.value !== undefined && hit.expiresAt > now) return hit.value;
  if (hit?.inflight) return hit.inflight;

  const inflight = loader()
    .then((value) => {
      const ttl =
        Array.isArray(value) && value.length === 0 ? 10_000 : SNAPSHOT_TTL_MS;
      store.set(key, { value, expiresAt: Date.now() + ttl });
      return value;
    })
    .catch((err) => {
      store.delete(key);
      throw err;
    });

  store.set(key, { expiresAt: 0, inflight });
  return inflight;
}

export function getCachedWalletBalances(address: string): Promise<WalletBalanceSource> {
  return cachedLoad(balanceCache, address.toLowerCase(), () => resolveWalletBalances(address)).then(
    (value) => {
      const hit = balanceCache.get(address.toLowerCase());
      if (
        hit?.value &&
        value.rows.length === 0 &&
        !value.indexerBalances &&
        hit.expiresAt - Date.now() > 5_000
      ) {
        balanceCache.set(address.toLowerCase(), {
          value,
          expiresAt: Date.now() + 5_000,
        });
      }
      return value;
    },
  );
}

export function getCachedDefiPositions(address: string): Promise<ResolvedPosition[]> {
  return cachedLoad(defiCache, address.toLowerCase(), () => resolveDefiPositions(address));
}

export interface WalletSnapshot {
  balanceSource: WalletBalanceSource;
  defi: ResolvedPosition[];
}

const CHART_DEFI_TIMEOUT_MS = 1_500;

/** Chart path: cap DeFi resolution so first paint stays under ~2s on prod RPC. */
export async function loadWalletSnapshotForChart(address: string): Promise<WalletSnapshot> {
  const [balResult, defiResult] = await Promise.allSettled([
    getCachedWalletBalances(address),
    Promise.race([
      getCachedDefiPositions(address),
      new Promise<ResolvedPosition[]>((resolve) => {
        setTimeout(() => resolve([]), CHART_DEFI_TIMEOUT_MS);
      }),
    ]),
  ]);

  const balanceSource =
    balResult.status === "fulfilled" ? balResult.value : EMPTY_BALANCE_SOURCE;
  const defi = defiResult.status === "fulfilled" ? defiResult.value : [];

  return { balanceSource, defi };
}

/** One RPC round-trip per address; reused across wallet / portfolio / positions / chart. */
export async function loadWalletSnapshot(address: string): Promise<WalletSnapshot> {
  const [balResult, defiResult] = await Promise.allSettled([
    getCachedWalletBalances(address),
    getCachedDefiPositions(address),
  ]);

  const balanceSource =
    balResult.status === "fulfilled" ? balResult.value : EMPTY_BALANCE_SOURCE;
  const defi = defiResult.status === "fulfilled" ? defiResult.value : [];

  return { balanceSource, defi };
}

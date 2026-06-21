import { getCoinMetadata } from "./coinMetadata.js";
import { normalizeCoinType } from "./coinType.js";
import { getCoinTypeUsdPrices } from "./prices.js";
import { loadPortfolioSnapshots, type SnapshotLine } from "./portfolioSnapshotStore.js";

// Position-change tracking (project Stage 6, "watch changes"): diff the oldest and
// newest balance snapshots in a window to surface what a wallet opened / closed /
// grew / trimmed. Snapshots are collected hourly, so this fills in over time.

const WINDOW_MS = 7 * 24 * 3600 * 1000;
const MIN_USD = 0.5; // ignore noise below this

export interface WalletChange {
  coinType: string;
  symbol: string | null;
  side: "asset" | "liability";
  kind: "opened" | "closed" | "increased" | "decreased";
  beforeAmount: number;
  afterAmount: number;
  deltaAmount: number;
  deltaUsd: number | null;
}
export interface WalletChanges {
  address: string;
  ready: boolean;
  fromTs: number | null;
  toTs: number | null;
  snapshots: number;
  changes: WalletChange[];
}

function bigOf(v: unknown): bigint {
  try {
    return BigInt(String(v ?? "0"));
  } catch {
    return 0n;
  }
}
function toMap(lines: SnapshotLine[]): Map<string, bigint> {
  const m = new Map<string, bigint>();
  for (const l of lines) {
    const ct = normalizeCoinType(l.coinType);
    m.set(ct, (m.get(ct) ?? 0n) + bigOf(l.balance));
  }
  return m;
}

export async function buildWalletChanges(address: string): Promise<WalletChanges> {
  const snaps = await loadPortfolioSnapshots(address, new Date(Date.now() - WINDOW_MS));
  if (snaps.length < 2) {
    return {
      address,
      ready: false,
      fromTs: snaps[0]?.ts ?? null,
      toTs: snaps[snaps.length - 1]?.ts ?? null,
      snapshots: snaps.length,
      changes: [],
    };
  }

  const first = snaps[0]!;
  const last = snaps[snaps.length - 1]!;
  const sides: { side: "asset" | "liability"; before: Map<string, bigint>; after: Map<string, bigint> }[] = [
    { side: "asset", before: toMap(first.assets), after: toMap(last.assets) },
    { side: "liability", before: toMap(first.liabilities), after: toMap(last.liabilities) },
  ];

  const coinTypes = [
    ...new Set(sides.flatMap((s) => [...s.before.keys(), ...s.after.keys()])),
  ];
  const meta = await getCoinMetadata(coinTypes);
  const prices = await getCoinTypeUsdPrices(
    coinTypes.map((coinType) => ({ coinType, symbol: meta.get(coinType)?.symbol ?? null })),
  );

  const changes: WalletChange[] = [];
  for (const { side, before, after } of sides) {
    for (const ct of new Set([...before.keys(), ...after.keys()])) {
      const b = before.get(ct) ?? 0n;
      const a = after.get(ct) ?? 0n;
      if (b === a) continue;
      const dec = meta.get(ct)?.decimals ?? 9;
      const beforeAmount = Number(b) / 10 ** dec;
      const afterAmount = Number(a) / 10 ** dec;
      const deltaAmount = afterAmount - beforeAmount;
      const px = prices.get(ct);
      const deltaUsd = px !== undefined ? deltaAmount * px : null;
      if (deltaUsd !== null && Math.abs(deltaUsd) < MIN_USD) continue;
      const kind = b === 0n ? "opened" : a === 0n ? "closed" : afterAmount > beforeAmount ? "increased" : "decreased";
      changes.push({
        coinType: ct,
        symbol: meta.get(ct)?.symbol ?? null,
        side,
        kind,
        beforeAmount,
        afterAmount,
        deltaAmount,
        deltaUsd,
      });
    }
  }
  changes.sort((x, y) => Math.abs(y.deltaUsd ?? 0) - Math.abs(x.deltaUsd ?? 0));

  return {
    address,
    ready: true,
    fromTs: first.ts,
    toTs: last.ts,
    snapshots: snaps.length,
    changes: changes.slice(0, 20),
  };
}

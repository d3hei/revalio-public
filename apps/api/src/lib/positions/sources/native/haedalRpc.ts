import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import type { ResolvedPosition } from "../../types.js";
import { getUsdPrices } from "../../../prices.js";
import { fetchOwnedObjectsByFilter } from "./rpcClient.js";

// Haedal delayed-unstake tickets are owned objects whose own fields carry the
// claimable amount (rate-adjusted at request time). Verified vs the protocol's
// UserNormalUnstaked event + Staking exchange-rate math.
//   SUI ticket: USD = sui_amount / 1e9 * SUI_price
//   WAL ticket: USD = wal_amount / 1e9 * WAL_price (WAL price often unavailable -> null)
const SUI_UNSTAKE_TICKET =
  "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::staking::UnstakeTicket";
const WAL_UNSTAKE_TICKET =
  "0x8b4d553839b219c3fd47608a0cc3d5fcc572cb25d41b7df3833208586a8d2470::walstaking::UnstakeTicket";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Native Haedal: value delayed-unstake tickets (claimable SUI / WAL). */
export const nativeHaedalAdapter: ProtocolPositionAdapter = {
  id: "native-haedal",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const [suiTickets, walTickets] = await Promise.all([
      fetchOwnedObjectsByFilter(address, { StructType: SUI_UNSTAKE_TICKET }, 3),
      fetchOwnedObjectsByFilter(address, { StructType: WAL_UNSTAKE_TICKET }, 3),
    ]);
    if (suiTickets.length === 0 && walTickets.length === 0) return [];

    const prices = await getUsdPrices(["SUI", "WAL"]);
    const rows: ResolvedPosition[] = [];

    for (const t of suiTickets) {
      const f = t.content?.fields;
      const sui = num(f?.sui_amount) / 1e9;
      if (!(sui > 0)) continue;
      const px = prices.get("SUI");
      rows.push({
        protocol: "Haedal",
        category: "staking",
        positionType: "haedal-unstaking",
        label: "Haedal Unstaking (SUI)",
        objectId: t.objectId,
        valueUsd: px !== undefined ? sui * px : null,
        source: "native",
        details: {
          claimableSui: sui,
          suiAmount: String(f?.sui_amount ?? "0"),
          claimEpoch: String(f?.claim_epoch ?? ""),
        },
      });
    }

    for (const t of walTickets) {
      const f = t.content?.fields;
      const wal = num(f?.wal_amount) / 1e9;
      if (!(wal > 0)) continue;
      const px = prices.get("WAL");
      rows.push({
        protocol: "Haedal",
        category: "staking",
        positionType: "haedal-unstaking",
        label: "Haedal Unstaking (WAL)",
        objectId: t.objectId,
        valueUsd: px !== undefined ? wal * px : null,
        source: "native",
        details: {
          claimableWal: wal,
          walAmount: String(f?.wal_amount ?? "0"),
          claimEpoch: String(f?.claim_epoch ?? ""),
        },
      });
    }

    return rows;
  },
};

export async function inspectNativeHaedal(address: string): Promise<{
  count: number;
  positions: ResolvedPosition[];
}> {
  const positions = await nativeHaedalAdapter.fetchPositions(address);
  return { count: positions.length, positions };
}

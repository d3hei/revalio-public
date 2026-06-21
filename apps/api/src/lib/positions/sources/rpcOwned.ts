import { getDefiPositions } from "../../defiPositions.js";
import type { ProtocolPositionAdapter } from "../adapters/types.js";
import type { ResolvedPosition } from "../types.js";

/** On-chain owned-object discovery via Sui RPC + local protocol registry. */
export const rpcOwnedAdapter: ProtocolPositionAdapter = {
  id: "rpc-owned",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const rows = await getDefiPositions(address);
    return rows.map(
      (p): ResolvedPosition => ({
        protocol: p.protocol,
        category: p.category,
        positionType: p.positionType,
        label: p.label,
        objectId: p.objectId,
        details: p.details,
        valueUsd: p.valueUsd,
        source: "rpc",
      }),
    );
  },
};

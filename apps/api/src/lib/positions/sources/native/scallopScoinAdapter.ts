import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import type { ResolvedPosition } from "../../types.js";
import { fetchScallopScoinSupplyPositions } from "./scallopScoin.js";

/** Scallop lending pool supply via wallet-held sCoins (sSUI, sUSDC, …). */
export const nativeScallopScoinAdapter: ProtocolPositionAdapter = {
  id: "native-scallop-scoin",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    return fetchScallopScoinSupplyPositions(address);
  },
};

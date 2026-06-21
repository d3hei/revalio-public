import type { ProtocolPositionAdapter } from "../../adapters/types.js";

/**
 * DeepBook — post-MVP (V1: open orders). Not registered in resolve.ts until after grant.
 * @see docs/deepbook-post-mvp.md
 */
export const deepbookAdapter: ProtocolPositionAdapter = {
  id: "native-deepbook",
  async fetchPositions(_address: string) {
    return [];
  },
};

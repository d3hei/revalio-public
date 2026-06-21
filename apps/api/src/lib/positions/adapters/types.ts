import type { ResolvedPosition } from "../types.js";

/** Pluggable protocol position source (RPC registry, BlockVision, future native decoders). */
export interface ProtocolPositionAdapter {
  readonly id: string;
  fetchPositions(address: string): Promise<ResolvedPosition[]>;
}

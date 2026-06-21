import type { PositionCategory } from "../protocols.js";

/** Where this position row was resolved (for debugging and future migration). */
export type PositionSource = "indexer" | "rpc" | "blockvision" | "native";

/**
 * Semantic position kinds (product-level). Maps to `PositionCategory` + `positionType` today.
 * `order` / `trade` reserved for DeepBook post-MVP — see docs/deepbook-post-mvp.md.
 */
export type PositionKind =
  | "spot"
  | "staking"
  | "lending"
  | "lp"
  | "order"
  | "trade";

/**
 * Unified position model returned by protocol adapters and the positions API.
 * Frontend and routes should depend on this shape only — not on BlockVision or RPC types.
 */
export interface ResolvedPosition {
  protocol: string;
  category: PositionCategory;
  positionType: string;
  label: string;
  objectId: string | null;
  details: Record<string, unknown>;
  valueUsd: number | null;
  source: PositionSource;
}

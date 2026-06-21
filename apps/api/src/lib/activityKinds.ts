/**
 * Activity event kinds for the wallet feed.
 * Indexer/API may emit a subset today; trading kinds are reserved for DeepBook (post-MVP V1+).
 * @see docs/deepbook-post-mvp.md
 */

/** Generic on-chain transaction (current default). */
export const ACTIVITY_TX = "TX" as const;

/** DeepBook V1+ — not emitted yet. */
export const ACTIVITY_TRADE = "TRADE" as const;
export const ACTIVITY_ORDER_CREATED = "ORDER_CREATED" as const;
export const ACTIVITY_ORDER_FILLED = "ORDER_FILLED" as const;
export const ACTIVITY_ORDER_CANCELLED = "ORDER_CANCELLED" as const;

export type ActivityKind =
  | typeof ACTIVITY_TX
  | typeof ACTIVITY_TRADE
  | typeof ACTIVITY_ORDER_CREATED
  | typeof ACTIVITY_ORDER_FILLED
  | typeof ACTIVITY_ORDER_CANCELLED;

/** Kinds we plan to surface once DeepBook adapter lands. */
export const DEEPBOOK_ACTIVITY_KINDS = [
  ACTIVITY_TRADE,
  ACTIVITY_ORDER_CREATED,
  ACTIVITY_ORDER_FILLED,
  ACTIVITY_ORDER_CANCELLED,
] as const;

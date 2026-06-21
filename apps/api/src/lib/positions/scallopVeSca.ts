/** Scallop veSCA rows we intentionally hide from portfolio UI (not a lending position). */
export function isScallopVeScaPosition(row: {
  protocol: string;
  positionType: string;
  category?: string;
  label?: string;
}): boolean {
  if (row.protocol !== "Scallop") return false;
  if (row.positionType === "ve-sca") return true;
  // rpc-owned registry used to classify VeScaKey as generic staking -> native-staking.
  if (row.positionType === "native-staking" || row.category === "staking") return true;
  const label = (row.label ?? "").toLowerCase();
  return label.includes("vesca");
}

export function dropScallopVeScaPositions<
  T extends {
    protocol: string;
    positionType: string;
    category?: string;
    label?: string;
  },
>(positions: T[]): T[] {
  return positions.filter((p) => !isScallopVeScaPosition(p));
}

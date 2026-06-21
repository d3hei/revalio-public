/** Known Suilend mainnet package publishes (ObligationOwnerCap lives in lending_market). */
export const SUILEND_LENDING_PACKAGES = [
  // Current mainnet (2025+ upgrade)
  "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf",
  // Legacy publish still referenced in older wallets/tests
  "0xf95b06117ed8152101ce7e73ef9cb86c5e8400da331c03de259da89f7c455e0",
] as const;

export function suilendCapFilter(): Record<string, unknown> {
  const modules = SUILEND_LENDING_PACKAGES.map((packageId) => ({
    MoveModule: { package: packageId, module: "lending_market" },
  }));
  if (modules.length === 1) return modules[0]!;
  return { MatchAny: modules };
}

/**
 * B1 — list positions with null valueUsd (mainnet RPC, no API server).
 *
 *   pnpm --filter @revalio/api exec tsx scripts/audit-null-value-usd.ts
 */
import "dotenv/config";
import baselines from "../src/lib/positions/mainnetBaselines.json" with { type: "json" };
import { resolveDefiPositions, resolveProtocolPositionsLite } from "../src/lib/positions/resolve.js";
import type { ProtocolScope } from "../src/lib/positions/resolve.js";
import wallets from "../src/lib/positions/mainnetWallets.json" with { type: "json" };

const SCOIN_WALLET =
  "0x65cfe14bdf5fdcba512a2f20586c2738f8d2e2e277e3fdb880619ed2b4edf73d";

function collectAddresses(): { address: string; label: string }[] {
  const seen = new Set<string>();
  const out: { address: string; label: string }[] = [];

  function add(address: string, label: string) {
    const key = address.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ address, label });
  }

  for (const [address, row] of Object.entries(wallets)) {
    add(address, (row as { label: string }).label);
  }
  for (const [address, row] of Object.entries(baselines)) {
    add(address, (row as { label: string }).label);
  }
  add(SCOIN_WALLET, "Scallop sCoin supply (fixed)");
  return out;
}

async function auditAddress(address: string, label: string): Promise<void> {
  console.log(`\n=== ${label} ===`);
  console.log(address);

  const positions = await resolveDefiPositions(address);
  const nullRows = positions.filter((p) => p.valueUsd === null || !Number.isFinite(p.valueUsd));
  const priced = positions.filter((p) => p.valueUsd !== null && Number.isFinite(p.valueUsd));

  console.log(`positions: ${positions.length} priced: ${priced.length} null-usd: ${nullRows.length}`);
  console.log(
    `positionsUsd: $${priced.reduce((s, p) => s + (p.valueUsd ?? 0), 0).toFixed(2)}`,
  );

  if (nullRows.length > 0) {
    console.log("null valueUsd:");
    for (const p of nullRows) {
      console.log(`  - ${p.protocol} / ${p.positionType} / ${p.label}`);
    }
  }
}

async function auditProtocolScopes(): Promise<void> {
  console.log("\n=== Protocol-scoped spot checks ===");
  const scopes: ProtocolScope[] = ["Navi", "Scallop", "Suilend", "Cetus", "Turbos"];
  const sample = collectAddresses()[0]?.address;
  if (!sample) return;

  for (const protocol of scopes) {
    const rows = await resolveProtocolPositionsLite(sample, protocol);
    const nullCount = rows.filter((p) => p.valueUsd === null).length;
    if (rows.length > 0) {
      console.log(`${protocol}: ${rows.length} rows, ${nullCount} null-usd (wallet ${sample.slice(0, 10)}…)`);
    }
  }
}

async function main(): Promise<void> {
  for (const { address, label } of collectAddresses()) {
    await auditAddress(address, label);
  }
  await auditProtocolScopes();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

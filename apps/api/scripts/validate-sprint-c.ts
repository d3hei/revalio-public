/**
 * Sprint C mainnet validation — run against live RPC (no API server required).
 *
 *   pnpm --filter @revalio/api exec tsx scripts/validate-sprint-c.ts
 */
import "dotenv/config";
import { getPortfolioSummary } from "../src/lib/portfolioSummary.js";
import { inspectNativeNavi } from "../src/lib/positions/sources/native/naviRpc.js";
import { inspectNativeScallop } from "../src/lib/positions/sources/native/scallopRpc.js";
import { inspectNativeSuilend } from "../src/lib/positions/sources/native/suilendRpc.js";
import { resolveDefiPositions } from "../src/lib/positions/resolve.js";
import {
  discoverNaviWallet,
  discoverScallopWallet,
  discoverSuilendWallet,
} from "../src/lib/positions/mainnetDiscovery.js";
import wallets from "../src/lib/positions/mainnetWallets.json" with { type: "json" };

type WalletRow = {
  label: string;
  protocols: string[];
};

function sumProtocolUsd(
  positions: Awaited<ReturnType<typeof resolveDefiPositions>>,
  protocol: string,
): number {
  return positions
    .filter((p) => p.protocol === protocol)
    .reduce((s, p) => s + (p.valueUsd ?? 0), 0);
}

async function validateWallet(address: string, row: WalletRow): Promise<void> {
  console.log(`\n=== ${row.label} ===`);
  console.log(address);

  const [portfolio, defi, navi, scallop, suilend] = await Promise.all([
    getPortfolioSummary(address),
    resolveDefiPositions(address),
    inspectNativeNavi(address),
    inspectNativeScallop(address),
    inspectNativeSuilend(address),
  ]);

  console.log("portfolio:", {
    tokensUsd: portfolio.tokensUsd,
    positionsUsd: portfolio.positionsUsd,
    totalUsd: portfolio.totalUsd,
    sources: portfolio.sources,
  });

  if (row.protocols.includes("Navi")) {
    console.log("navi debug:", {
      supplyRows: navi.supplyRows,
      borrowRows: navi.borrowRows,
      nonZeroPools: navi.nonZeroPools,
      positionsUsd: sumProtocolUsd(defi, "Navi"),
    });
  }
  if (row.protocols.includes("Scallop")) {
    console.log("scallop debug:", {
      obligationKeys: scallop.obligationKeys,
      collateralRows: scallop.collateralRows,
      borrowRows: scallop.borrowRows,
      positionsUsd: sumProtocolUsd(defi, "Scallop"),
    });
  }
  if (row.protocols.includes("Suilend")) {
    console.log("suilend debug:", {
      caps: suilend.caps,
      supplyRows: suilend.supplyRows,
      borrowRows: suilend.borrowRows,
      positionsUsd: sumProtocolUsd(defi, "Suilend"),
    });
  }

  const byProtocol = new Map<string, number>();
  for (const p of defi) {
    byProtocol.set(p.protocol, (byProtocol.get(p.protocol) ?? 0) + (p.valueUsd ?? 0));
  }
  console.log(
    "defi protocols:",
    [...byProtocol.entries()].map(([k, v]) => `${k}: $${v.toFixed(2)}`).join(", ") || "(none)",
  );
  if (row.note) console.log("note:", row.note);
}

async function resolveWalletEntries(): Promise<[string, WalletRow][]> {
  const out: [string, WalletRow][] = [];
  for (const [address, row] of Object.entries(wallets)) {
    out.push([address, row as WalletRow]);
  }

  try {
    const navi = await discoverNaviWallet();
    out.push([navi, { label: "NAVI (discovered)", protocols: ["Navi"] }]);
  } catch (e) {
    console.warn("NAVI discovery skipped:", (e as Error).message);
  }

  try {
    const scallop = await discoverScallopWallet();
    out.push([scallop, { label: "Scallop (discovered)", protocols: ["Scallop"] }]);
  } catch (e) {
    console.warn("Scallop discovery skipped:", (e as Error).message);
  }

  try {
    const suilend = await discoverSuilendWallet();
    out.push([suilend, { label: "Suilend (discovered)", protocols: ["Suilend"] }]);
  } catch (e) {
    console.warn("Suilend discovery skipped:", (e as Error).message);
  }

  return out;
}

async function main(): Promise<void> {
  const entries = await resolveWalletEntries();
  for (const [address, row] of entries) {
    await validateWallet(address, row);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

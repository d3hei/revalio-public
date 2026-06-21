/**
 * Discover mainnet NAVI / Scallop / Suilend wallets via RPC.
 *
 *   pnpm --filter @revalio/api run discover:lending
 */
import "dotenv/config";
import {
  discoverNaviWallet,
  discoverScallopWallet,
  discoverSuilendWallet,
} from "../src/lib/positions/mainnetDiscovery.js";
import { inspectNativeNavi } from "../src/lib/positions/sources/native/naviRpc.js";
import { inspectNativeScallop } from "../src/lib/positions/sources/native/scallopRpc.js";
import { inspectNativeSuilend } from "../src/lib/positions/sources/native/suilendRpc.js";
import { getPortfolioSummary } from "../src/lib/portfolioSummary.js";
import { resolveDefiPositions } from "../src/lib/positions/resolve.js";

const TURBOS_WALLET =
  "0xb973681698db4e9fc7b27dff7b8c5ae2323728f5e1ccfb1380f6592972c3cf91";

function sumProtocol(
  positions: Awaited<ReturnType<typeof resolveDefiPositions>>,
  protocol: string,
): number {
  return positions
    .filter((p) => p.protocol === protocol)
    .reduce((s, p) => s + (p.valueUsd ?? 0), 0);
}

const REPORT_TIMEOUT_MS = 90_000;

async function withTimeout<T>(label: string, promise: Promise<T>, ms = REPORT_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function report(label: string, address: string): Promise<void> {
  const [portfolio, defi] = await withTimeout(
    `${label} portfolio`,
    Promise.all([getPortfolioSummary(address), resolveDefiPositions(address)]),
  );
  console.log(`\n${label}`);
  console.log(address);
  console.log({
    positionsUsd: portfolio.positionsUsd,
    totalUsd: portfolio.totalUsd,
    protocols: [...new Set(defi.map((p) => p.protocol))],
    byProtocol: Object.fromEntries(
      [...new Set(defi.map((p) => p.protocol))].map((proto) => [
        proto,
        sumProtocol(defi, proto),
      ]),
    ),
  });
}

async function tryDiscover(
  label: string,
  fn: () => Promise<string>,
  inspect: (addr: string) => Promise<Record<string, unknown>>,
): Promise<void> {
  try {
    const addr = await fn();
    const summary = await inspect(addr);
    console.log(`${label} discovered`, addr, summary);
    await report(label, addr);
  } catch (e) {
    console.warn(`${label} discovery failed:`, (e as Error).message);
  }
}

async function main(): Promise<void> {
  await tryDiscover("NAVI", () => discoverNaviWallet(), async (addr) => {
    const navi = await inspectNativeNavi(addr);
    return {
      supplyRows: navi.supplyRows,
      borrowRows: navi.borrowRows,
      nonZeroPools: navi.nonZeroPools,
    };
  });

  await tryDiscover("SCALLOP", () => discoverScallopWallet(), async (addr) => {
    const scallop = await inspectNativeScallop(addr);
    return {
      obligationKeys: scallop.obligationKeys,
      collateralRows: scallop.collateralRows,
      borrowRows: scallop.borrowRows,
    };
  });

  await tryDiscover("SUILEND", () => discoverSuilendWallet(), async (addr) => {
    const suilend = await inspectNativeSuilend(addr);
    return { caps: suilend.caps, supplyRows: suilend.supplyRows };
  });

  console.log("\n--- Turbos probe (Suilend fallback) ---");
  const suilendProbe = await inspectNativeSuilend(TURBOS_WALLET);
  console.log(TURBOS_WALLET, suilendProbe);
  try {
    await report("Turbos probe", TURBOS_WALLET);
  } catch (e) {
    console.warn("Turbos probe report skipped:", (e as Error).message);
  }

  console.log("\nDone.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

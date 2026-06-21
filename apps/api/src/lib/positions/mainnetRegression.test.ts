import { describe, expect, it } from "vitest";
import baselines from "./mainnetBaselines.json";
import {
  discoverScallopWallet,
  discoverSuilendWallet,
} from "./mainnetDiscovery.js";
import {
  cetusWhaleSmoke,
  resolveProtocolPositionsUsd,
} from "./mainnetRegressionHelpers.js";
import type { ProtocolScope } from "./resolve.js";
import { inspectNativeScallop } from "./sources/native/scallopRpc.js";
import { inspectNativeStaking } from "./sources/native/nativeStakingRpc.js";
import { inspectNativeSuilend } from "./sources/native/suilendRpc.js";

const RUN = process.env.MAINNET_REGRESSION === "1";
const STRICT = process.env.MAINNET_STRICT === "1";
/** Discovery tests are slow/flaky on public RPC — opt in with MAINNET_DISCOVER=1 */
const RUN_DISCOVER = process.env.MAINNET_DISCOVER === "1";

function effectiveTolerance(
  baseline: { tolerance: number; protocol?: string },
): number {
  if (!STRICT) return baseline.tolerance;
  const lending = new Set(["Navi", "Scallop", "Suilend"]);
  if (baseline.protocol && lending.has(baseline.protocol)) return 0.01;
  return baseline.tolerance;
}

function withinTolerance(actual: number, expected: number, tolerance: number): boolean {
  if (expected <= 0) return actual > 0;
  return Math.abs(actual - expected) / expected <= tolerance;
}

describe.skipIf(!RUN)("mainnet Suivision regression", () => {
  for (const [address, row] of Object.entries(baselines)) {
    const baseline = row as {
      label: string;
      mode?: "smoke" | "staking";
      protocol?: ProtocolScope;
      minDiscovered?: number;
      minDecodedUsd?: number;
      stakedObjects?: number;
      principalMist?: string;
      positionsUsd: number;
      positionsUsdMin?: number;
      tolerance: number;
    };

    it(`${baseline.label} (${address.slice(0, 10)}…) within ±${(effectiveTolerance(baseline) * 100).toFixed(0)}%`, async () => {
      const tolerance = effectiveTolerance(baseline);

      if (baseline.mode === "smoke") {
        const smoke = await cetusWhaleSmoke(address);
        if (!smoke.usedFallback) {
          expect(smoke.discovered, `discovered ${smoke.discovered} Cetus LP rows`).toBeGreaterThanOrEqual(
            baseline.minDiscovered ?? 1,
          );
        }
        expect(smoke.decodedCount, `decoded ${smoke.decodedCount} sample rows`).toBeGreaterThan(0);
        expect(smoke.sampleUsd, `sampleUsd ${smoke.sampleUsd}`).toBeGreaterThan(
          baseline.minDecodedUsd ?? 0,
        );
        return;
      }

      if (baseline.mode === "staking") {
        const inspect = await inspectNativeStaking(address);
        expect(inspect.stakedObjects).toBe(baseline.stakedObjects);
        expect(inspect.totalPrincipalMist).toBe(baseline.principalMist);
        const positionsUsd = await resolveProtocolPositionsUsd(address, "sui-system");
        if (baseline.positionsUsdMin != null) {
          expect(positionsUsd).toBeGreaterThanOrEqual(baseline.positionsUsdMin);
        } else {
          expect(
            withinTolerance(positionsUsd, baseline.positionsUsd, tolerance),
            `staking positionsUsd ${positionsUsd} vs ${baseline.positionsUsd}`,
          ).toBe(true);
        }
        return;
      }

      const protocol = baseline.protocol ?? inferProtocol(baseline.label);
      const positionsUsd = await resolveProtocolPositionsUsd(address, protocol);

      if (baseline.positionsUsdMin != null) {
        expect(
          positionsUsd >= baseline.positionsUsdMin,
          `positionsUsd ${positionsUsd} < min ${baseline.positionsUsdMin}`,
        ).toBe(true);
      } else {
        expect(
          withinTolerance(positionsUsd, baseline.positionsUsd, tolerance),
          `positionsUsd ${positionsUsd} vs baseline ${baseline.positionsUsd}`,
        ).toBe(true);
      }
    }, 180_000);
  }
});

describe.skipIf(!RUN || !RUN_DISCOVER)("mainnet discovery regression (opt-in)", () => {
  it("discovers Scallop wallet with obligation + USD", async () => {
    const address = await discoverScallopWallet();
    const scallop = await inspectNativeScallop(address);
    expect(scallop.obligationKeys).toBeGreaterThan(0);
    expect(scallop.collateralRows + scallop.borrowRows).toBeGreaterThan(0);
    const usd = await resolveProtocolPositionsUsd(address, "Scallop");
    expect(usd).toBeGreaterThan(0);
  }, 180_000);

  it("discovers Suilend wallet with caps + USD", async () => {
    const address = await discoverSuilendWallet();
    const suilend = await inspectNativeSuilend(address);
    expect(suilend.caps).toBeGreaterThan(0);
    expect(suilend.supplyRows + suilend.borrowRows).toBeGreaterThan(0);
    const usd = await resolveProtocolPositionsUsd(address, "Suilend");
    expect(usd).toBeGreaterThan(0);
  }, 180_000);
});

function inferProtocol(label: string): ProtocolScope {
  const lower = label.toLowerCase();
  if (lower.includes("navi")) return "Navi";
  if (lower.includes("turbos")) return "Turbos";
  if (lower.includes("scallop")) return "Scallop";
  if (lower.includes("suilend")) return "Suilend";
  if (lower.includes("staking")) return "sui-system";
  return "Cetus";
}

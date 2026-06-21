/**
 * Record mainnet regression baselines from live RPC.
 *
 *   pnpm --filter @revalio/api run record:baselines          # print JSON
 *   MAINNET_RECORD_BASELINES=1 pnpm --filter @revalio/api run record:baselines  # write file
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  discoverScallopWallet,
  discoverSuilendWallet,
} from "../src/lib/positions/mainnetDiscovery.js";
import {
  cetusWhaleSmoke,
  resolveProtocolPositionsUsd,
} from "../src/lib/positions/mainnetRegressionHelpers.js";
import { inspectNativeStaking } from "../src/lib/positions/sources/native/nativeStakingRpc.js";
import wallets from "../src/lib/positions/mainnetWallets.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINES_PATH = join(__dirname, "../src/lib/positions/mainnetBaselines.json");

const STAKING_WALLET =
  "0x67cf8792f7c029af45ab26c6becb5000f34cc57fcf413e30943523eac553dca8";

type BaselineRow = Record<string, unknown>;

async function recordFixedWallets(): Promise<Record<string, BaselineRow>> {
  const out: Record<string, BaselineRow> = {};

  for (const [address, row] of Object.entries(wallets)) {
    const meta = row as { label: string; protocols: string[] };
    const protocol = meta.protocols[0] as "Cetus" | "Turbos" | "Navi" | "Scallop";

    if (protocol === "Cetus") {
      const smoke = await cetusWhaleSmoke(address);
      out[address] = {
        label: meta.label,
        mode: "smoke",
        positionsUsd: 0,
        minDiscovered: 1,
        minDecodedUsd: 1,
        tolerance: 0.05,
        note: `Recorded ${new Date().toISOString().slice(0, 10)}: discovered=${smoke.discovered} decoded=${smoke.decodedCount} sampleUsd=${smoke.sampleUsd.toFixed(2)}`,
      };
      continue;
    }

    const positionsUsd = await resolveProtocolPositionsUsd(address, protocol);
    out[address] = {
      label: meta.label,
      protocol,
      positionsUsd: Math.round(positionsUsd * 100) / 100,
      tolerance: protocol === "Navi" || protocol === "Scallop" ? 0.05 : 0.12,
      note: `Recorded ${new Date().toISOString().slice(0, 10)}`,
    };
  }

  return out;
}

async function recordStaking(): Promise<Record<string, BaselineRow>> {
  const inspect = await inspectNativeStaking(STAKING_WALLET);
  const positionsUsd = await resolveProtocolPositionsUsd(STAKING_WALLET, "sui-system");
  return {
    [STAKING_WALLET]: {
      label: "Native SUI staking",
      mode: "staking",
      stakedObjects: inspect.stakedObjects,
      principalMist: inspect.totalPrincipalMist,
      positionsUsd: Math.round(positionsUsd * 100) / 100,
      tolerance: 0.12,
      note: `Recorded ${new Date().toISOString().slice(0, 10)}: principal exact, USD ±12% (SUI spot)`,
    },
  };
}

async function recordDiscovered(
  label: string,
  protocol: "Scallop" | "Suilend",
  discover: () => Promise<string>,
): Promise<Record<string, BaselineRow>> {
  const address = await discover();
  const positionsUsd = await resolveProtocolPositionsUsd(address, protocol);
  return {
    [address]: {
      label,
      protocol,
      positionsUsd: Math.round(positionsUsd * 100) / 100,
      positionsUsdMin: 0.01,
      tolerance: 0.05,
      note: `Discovered ${new Date().toISOString().slice(0, 10)}`,
    },
  };
}

async function main(): Promise<void> {
  console.log("Recording mainnet baselines (live RPC)…\n");

  const baselines: Record<string, BaselineRow> = {
    ...(await recordFixedWallets()),
    ...(await recordStaking()),
  };

  try {
    Object.assign(baselines, await recordDiscovered("Scallop (discovered)", "Scallop", discoverScallopWallet));
    console.log("Scallop: OK");
  } catch (e) {
    console.warn("Scallop discovery skipped:", (e as Error).message);
  }

  try {
    Object.assign(baselines, await recordDiscovered("Suilend (discovered)", "Suilend", discoverSuilendWallet));
    console.log("Suilend: OK");
  } catch (e) {
    console.warn("Suilend discovery skipped:", (e as Error).message);
  }

  const json = `${JSON.stringify(baselines, null, 2)}\n`;

  if (process.env.MAINNET_RECORD_BASELINES === "1") {
    writeFileSync(BASELINES_PATH, json, "utf8");
    console.log(`\nWrote ${BASELINES_PATH}`);
  } else {
    console.log("\n--- mainnetBaselines.json preview ---\n");
    console.log(json);
    console.log("Set MAINNET_RECORD_BASELINES=1 to write the file.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

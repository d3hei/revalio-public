import { describe, expect, it } from "vitest";
import {
  discoverScallopWallet,
  discoverSuilendWallet,
} from "./mainnetDiscovery.js";
import { resolveProtocolPositionsUsd } from "./mainnetRegressionHelpers.js";
import { inspectNativeNavi } from "./sources/native/naviRpc.js";
import { inspectNativeScallop } from "./sources/native/scallopRpc.js";
import { inspectNativeStaking } from "./sources/native/nativeStakingRpc.js";
import { inspectNativeSuilend } from "./sources/native/suilendRpc.js";

const RUN = process.env.MAINNET_REGRESSION === "1";
const RUN_DISCOVER = process.env.MAINNET_DISCOVER === "1";

const NAVI_WALLET =
  "0xdcd6463180d8a36ebfd3e30ce2ebac8e2a3bbad8d22a30976be917050e7bd139";
const TURBOS_WALLET =
  "0xb973681698db4e9fc7b27dff7b8c5ae2323728f5e1ccfb1380f6592972c3cf91";
const STAKING_WALLET =
  "0x67cf8792f7c029af45ab26c6becb5000f34cc57fcf413e30943523eac553dca8";

describe.skipIf(!RUN)("Sprint C — lending validation (mainnet RPC)", () => {
  it("validates NAVI wallet with supply/borrow rows", async () => {
    const navi = await inspectNativeNavi(NAVI_WALLET);
    expect(navi.supplyRows + navi.borrowRows).toBeGreaterThan(0);

    const naviUsd = await resolveProtocolPositionsUsd(NAVI_WALLET, "Navi");
    expect(naviUsd).toBeGreaterThan(0);
  }, 120_000);

  it("validates native SUI staking (principal + USD)", async () => {
    const staking = await inspectNativeStaking(STAKING_WALLET);
    expect(staking.stakedObjects).toBe(2);
    expect(staking.totalPrincipalMist).toBe("929000000000");

    const stakingUsd = await resolveProtocolPositionsUsd(STAKING_WALLET, "sui-system");
    expect(stakingUsd).toBeGreaterThan(100);
  }, 90_000);

  it.skipIf(!RUN_DISCOVER)("discovers Scallop wallet with obligation keys", async () => {
    const address = await discoverScallopWallet();
    const scallop = await inspectNativeScallop(address);
    expect(scallop.obligationKeys).toBeGreaterThan(0);
    expect(scallop.collateralRows + scallop.borrowRows).toBeGreaterThan(0);
    const usd = await resolveProtocolPositionsUsd(address, "Scallop");
    expect(usd).toBeGreaterThan(0);
  }, 180_000);

  it.skipIf(!RUN_DISCOVER)("discovers Suilend wallet with obligation caps", async () => {
    const address = await discoverSuilendWallet();
    const suilend = await inspectNativeSuilend(address);
    expect(suilend.caps).toBeGreaterThan(0);
    expect(suilend.supplyRows + suilend.borrowRows).toBeGreaterThan(0);
    const usd = await resolveProtocolPositionsUsd(address, "Suilend");
    expect(usd).toBeGreaterThan(0);
  }, 180_000);

  it("Turbos probe wallet keeps native Turbos positions", async () => {
    const turbosUsd = await resolveProtocolPositionsUsd(TURBOS_WALLET, "Turbos");
    expect(turbosUsd).toBeGreaterThan(0);
  }, 90_000);
});

import { describe, expect, it } from "vitest";
import { sampleNaviDepositors, sampleScallopOwnersFromEvents } from "./mainnetDiscovery.js";

const RUN = process.env.MAINNET_REGRESSION === "1";

describe.skipIf(!RUN)("mainnetDiscovery", () => {
  it("resolves USDC alias to nUSDC pool", async () => {
    const usdc = await sampleNaviDepositors("USDC", 3);
    const nusdc = await sampleNaviDepositors("nUSDC", 3);
    expect(usdc.length).toBeGreaterThan(0);
    expect(nusdc.length).toBeGreaterThan(0);
  }, 30_000);

  it("samples Scallop open_obligation event senders", async () => {
    const owners = await sampleScallopOwnersFromEvents(10);
    expect(owners.length).toBeGreaterThan(0);
    expect(owners[0]).toMatch(/^0x[0-9a-f]+$/i);
  }, 30_000);
});

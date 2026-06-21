import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { getPortfolioSummary } from "../lib/portfolioSummary.js";
import { buildPositionsPayload } from "../lib/positionsPayload.js";
import { suiAddressSchema } from "../lib/sui.js";
import { getWalletProfile } from "../lib/walletProfileStore.js";
import { buildWalletPayload } from "../lib/walletPayload.js";
import { loadWalletSnapshot } from "../lib/walletSnapshot.js";
import type { WalletBalanceSource } from "../lib/walletBalances.js";

const paramsSchema = z.object({ address: suiAddressSchema });

const EMPTY_BALANCES: WalletBalanceSource = {
  rows: [],
  indexerBalances: false,
  onDemandBalances: false,
};

export async function overviewRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/wallets/:address/overview
  // Single round-trip: tokens + portfolio totals + positions + profile.
  app.get("/api/v1/wallets/:address/overview", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    const { address } = parsed.data;

    let snapshot;
    try {
      snapshot = await loadWalletSnapshot(address);
    } catch (err) {
      request.log.warn({ err, address }, "overview snapshot failed");
      snapshot = { balanceSource: EMPTY_BALANCES, defi: [] };
    }

    const [wallet, portfolio, positions, profileRow] = await Promise.all([
      buildWalletPayload(address, snapshot.balanceSource).catch((err) => {
        request.log.warn({ err, address }, "overview wallet payload failed");
        return { address, totalUsd: 0, tokens: [], source: "rpc" as const };
      }),
      getPortfolioSummary(address, snapshot).catch((err) => {
        request.log.warn({ err, address }, "overview portfolio summary failed");
        return {
          address,
          tokensUsd: 0,
          positionsUsd: 0,
          totalUsd: 0,
          chartLiveUsd: null,
          sources: { indexerBalances: false, onDemandBalances: false, defiPositions: 0 },
        };
      }),
      buildPositionsPayload(address, snapshot.defi).catch((err) => {
        request.log.warn({ err, address }, "overview positions payload failed");
        return { address, totalUsd: 0, positions: [], protocols: [] };
      }),
      getWalletProfile(address).catch(() => null),
    ]);

    const profile = profileRow
      ? {
          address: profileRow.address,
          nickname: profileRow.nickname,
          avatar: profileRow.avatar,
          bio: profileRow.bio,
          updatedAt:
            profileRow.updated_at instanceof Date
              ? profileRow.updated_at.toISOString()
              : String(profileRow.updated_at),
        }
      : null;

    return { wallet, portfolio, positions, profile };
  });
}

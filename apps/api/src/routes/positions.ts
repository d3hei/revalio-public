import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db.js";
import { suiAddressSchema } from "../lib/sui.js";
import { getUsdPrices } from "../lib/prices.js";
import {
  inspectOwnedObjects,
  lookupObjectOnDefiRpc,
} from "../lib/defiPositions.js";
import { valueHoldingsAtLivePrices } from "../lib/chartValuation.js";
import { getCoinMetadata } from "../lib/coinMetadata.js";
import { getHoldingsForChart } from "../lib/portfolioHoldings.js";
import { resolveDefiPositions } from "../lib/positions/resolve.js";
import { getCachedDefiPositions } from "../lib/walletSnapshot.js";
import { buildPositionsPayload } from "../lib/positionsPayload.js";
import { isBlockVisionConfigured } from "../lib/positions/sources/blockvision/client.js";
import { inspectBlockvisionStatus } from "../lib/positions/resolve.js";
import { inspectNativeCetusDecode } from "../lib/positions/sources/native/cetusRpc.js";
import { inspectNativeTurbosDecode } from "../lib/positions/sources/native/turbosRpc.js";
import { inspectNativeNavi } from "../lib/positions/sources/native/naviRpc.js";
import { inspectNativeScallop } from "../lib/positions/sources/native/scallopRpc.js";
import { inspectNativeSuilend } from "../lib/positions/sources/native/suilendRpc.js";
import { inspectNativeStaking } from "../lib/positions/sources/native/nativeStakingRpc.js";
import { inspectNativeVeSca } from "../lib/positions/sources/native/veScaRpc.js";
import type { PositionSource } from "../lib/positions/types.js";

const paramsSchema = z.object({ address: suiAddressSchema });

interface PositionRow {
  protocol: string;
  position_type: string;
  object_id: string | null;
  details: Record<string, unknown> | null;
}

interface ApiPosition {
  protocol: string;
  category: string;
  positionType: string;
  label: string;
  objectId: string | null;
  details: Record<string, unknown>;
  valueUsd: number | null;
  source?: PositionSource;
}

const SUI_DECIMALS = 9;

const PROTOCOL_LABELS: Record<string, string> = {
  "sui-system": "Sui Staking",
};

export async function positionRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/v1/wallets/:address/debug/positions
  // Diagnostic: which RPC was queried, how many owned objects were scanned, the
  // distinct object types present, and which the registry matched. Open in a
  // browser to discover real on-chain type strings for the protocol registry.
  app.get("/api/v1/wallets/:address/debug/blockvision", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    const protocol =
      typeof request.query === "object" &&
      request.query !== null &&
      "protocol" in request.query &&
      typeof (request.query as { protocol?: unknown }).protocol === "string"
        ? (request.query as { protocol: string }).protocol
        : "cetus";
    const bustCache =
      typeof request.query === "object" &&
      request.query !== null &&
      "bustCache" in request.query &&
      String((request.query as { bustCache?: unknown }).bustCache).toLowerCase() === "true";
    const status = await inspectBlockvisionStatus(parsed.data.address, { bustCache });
    return {
      address: parsed.data.address,
      protocol,
      blockvisionConfigured: isBlockVisionConfigured(),
      cacheBusted: bustCache,
      ...status,
    };
  });

  app.get("/api/v1/wallets/:address/debug/native-navi", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_address" });
    return { address: parsed.data.address, ...(await inspectNativeNavi(parsed.data.address)) };
  });

  app.get("/api/v1/wallets/:address/debug/native-scallop", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_address" });
    const [scallop, veSca] = await Promise.all([
      inspectNativeScallop(parsed.data.address),
      inspectNativeVeSca(parsed.data.address),
    ]);
    return { address: parsed.data.address, veSca, ...scallop };
  });

  app.get("/api/v1/wallets/:address/debug/native-staking", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_address" });
    return { address: parsed.data.address, ...(await inspectNativeStaking(parsed.data.address)) };
  });

  app.get("/api/v1/wallets/:address/debug/native-suilend", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_address" });
    return { address: parsed.data.address, ...(await inspectNativeSuilend(parsed.data.address)) };
  });

  app.get("/api/v1/wallets/:address/debug/native-cetus", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    const { address } = parsed.data;
    const positionId =
      typeof request.query === "object" &&
      request.query !== null &&
      "positionId" in request.query &&
      typeof (request.query as { positionId?: unknown }).positionId === "string"
        ? (request.query as { positionId: string }).positionId
        : undefined;

    const [defi, rpcRows] = await Promise.all([
      resolveDefiPositions(address),
      import("../lib/defiPositions.js").then((m) => m.getDefiPositions(address)),
    ]);

    const resolvedCetus = defi.find((p) => p.protocol === "Cetus" && p.category === "amm_lp");
    const rpcCetus = rpcRows.find((p) => p.protocol === "Cetus" && p.category === "amm_lp");
    const probeSource = rpcCetus ?? resolvedCetus;

    const decodeProbe = probeSource
      ? await inspectNativeCetusDecode({
          protocol: probeSource.protocol,
          category: probeSource.category,
          positionType: probeSource.positionType,
          label: probeSource.label,
          objectId: probeSource.objectId,
          details: probeSource.details,
          valueUsd: probeSource.valueUsd,
          source: "rpc",
        })
      : null;

    const directProbe = positionId
      ? await inspectNativeCetusDecode({
          protocol: "Cetus",
          category: "amm_lp",
          positionType: "amm_lp",
          label: "Direct position probe",
          objectId: positionId,
          details: { position: positionId },
          valueUsd: null,
          source: "rpc",
        })
      : null;

    const inspection = rpcRows.length === 0 ? await inspectOwnedObjects(address) : null;

    return {
      address,
      rpcDiscoveryCount: rpcRows.length,
      defiResolvedCount: defi.length,
      resolved: resolvedCetus
        ? {
            source: resolvedCetus.source,
            valueUsd: resolvedCetus.valueUsd,
            balanceA: resolvedCetus.details.balanceA ?? null,
            balanceB: resolvedCetus.details.balanceB ?? null,
          }
        : null,
      rpcPlaceholder: rpcCetus
        ? {
            objectId: rpcCetus.objectId,
            pool: rpcCetus.details.pool ?? null,
            position: rpcCetus.details.position ?? null,
          }
        : null,
      nativeDecode: decodeProbe,
      directDecode: directProbe,
      discovery:
        inspection && rpcRows.length === 0
          ? {
              rpcUrl: inspection.rpcUrl,
              error: inspection.error,
              balanceCount: inspection.balanceCount,
              matchedCount: inspection.matchedCount,
              filtered: inspection.filtered,
              reachedPageCap: inspection.reachedPageCap,
            }
          : null,
      rpcPlaceholderDetails: rpcCetus?.details ?? null,
    };
  });

  app.get("/api/v1/wallets/:address/debug/native-turbos", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    const { address } = parsed.data;
    const positionId =
      typeof request.query === "object" &&
      request.query !== null &&
      "positionId" in request.query &&
      typeof (request.query as { positionId?: unknown }).positionId === "string"
        ? (request.query as { positionId: string }).positionId
        : undefined;

    const [defi, rpcRows] = await Promise.all([
      resolveDefiPositions(address),
      import("../lib/defiPositions.js").then((m) => m.getDefiPositions(address)),
    ]);

    const resolvedTurbos = defi.find((p) => p.protocol === "Turbos" && p.category === "amm_lp");
    const rpcTurbos = rpcRows.find((p) => p.protocol === "Turbos" && p.category === "amm_lp");
    const probeSource = rpcTurbos ?? resolvedTurbos;

    const decodeProbe = probeSource
      ? await inspectNativeTurbosDecode({
          protocol: probeSource.protocol,
          category: probeSource.category,
          positionType: probeSource.positionType,
          label: probeSource.label,
          objectId: probeSource.objectId,
          details: probeSource.details,
          valueUsd: probeSource.valueUsd,
          source: "rpc",
        })
      : null;

    const directProbe = positionId
      ? await inspectNativeTurbosDecode({
          protocol: "Turbos",
          category: "amm_lp",
          positionType: "amm_lp",
          label: "Direct Turbos probe",
          objectId: positionId,
          details: { position: positionId },
          valueUsd: null,
          source: "rpc",
        })
      : null;

    return {
      address,
      rpcDiscoveryCount: rpcRows.filter((p) => p.protocol === "Turbos").length,
      defiResolvedCount: defi.filter((p) => p.protocol === "Turbos").length,
      resolved: resolvedTurbos
        ? {
            source: resolvedTurbos.source,
            valueUsd: resolvedTurbos.valueUsd,
            balanceA: resolvedTurbos.details.balanceA ?? null,
            balanceB: resolvedTurbos.details.balanceB ?? null,
          }
        : null,
      rpcPlaceholder: rpcTurbos
        ? {
            objectId: rpcTurbos.objectId,
            pool: rpcTurbos.details.pool ?? null,
            position: rpcTurbos.details.position ?? null,
          }
        : null,
      nativeDecode: decodeProbe,
      directDecode: directProbe,
      rpcPlaceholderDetails: rpcTurbos?.details ?? null,
    };
  });

  app.get("/api/v1/wallets/:address/debug/positions", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    const objectId =
      typeof request.query === "object" &&
      request.query !== null &&
      "objectId" in request.query &&
      typeof (request.query as { objectId?: unknown }).objectId === "string"
        ? (request.query as { objectId: string }).objectId
        : undefined;
    const inspection = await inspectOwnedObjects(parsed.data.address);
    if (objectId) {
      return { ...inspection, objectLookup: await lookupObjectOnDefiRpc(objectId) };
    }
    return inspection;
  });

  // GET /api/v1/wallets/:address/positions
  // DeFi positions held by the address (currently native SUI staking).
  app.get("/api/v1/wallets/:address/positions", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_address" });
    }
    const { address } = parsed.data;

    const defi = await getCachedDefiPositions(address);
    return buildPositionsPayload(address, defi);
  });
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { suiAddressSchema } from "../lib/sui.js";
import { getWalletProfile, upsertWalletProfile } from "../lib/walletProfileStore.js";

const paramsSchema = z.object({ address: suiAddressSchema });

const AVATAR_DATA_URL_RE = /^data:image\/(png|jpe?g|webp);base64,/i;
const MAX_NICKNAME_LEN = 32;
const MAX_BIO_LEN = 160;
const MAX_AVATAR_BYTES = 512_000;

function normalizeBio(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, MAX_BIO_LEN);
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNickname(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().slice(0, MAX_NICKNAME_LEN);
  return trimmed.length > 0 ? trimmed : null;
}

function validateAvatar(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return null;
  if (!AVATAR_DATA_URL_RE.test(raw)) return null;
  if (raw.length > MAX_AVATAR_BYTES) return null;
  return raw;
}

function buildProfileMessage(address: string, timestampMs: number): string {
  return `Revalio profile update\nAddress: ${address}\nTimestamp: ${timestampMs}`;
}

async function verifyOwnerSignature(
  address: string,
  messageB64: string,
  signatureB64: string,
): Promise<boolean> {
  try {
    const message = Uint8Array.from(Buffer.from(messageB64, "base64"));
    await verifyPersonalMessageSignature(message, signatureB64, { address });
    return true;
  } catch {
    return false;
  }
}

const putBodySchema = z.object({
  nickname: z.string().max(MAX_NICKNAME_LEN).optional().nullable(),
  avatar: z.string().max(MAX_AVATAR_BYTES).optional().nullable(),
  bio: z.string().max(MAX_BIO_LEN).optional().nullable(),
  message: z.string().min(1),
  signature: z.string().min(1),
  timestampMs: z.number().int().positive(),
});

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/wallets/:address/profile", async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_address" });

    try {
      const row = await getWalletProfile(parsed.data.address);
      return {
        address: parsed.data.address,
        nickname: row?.nickname ?? null,
        avatar: row?.avatar ?? null,
        bio: row?.bio ?? null,
        updatedAt: row?.updated_at ?? null,
      };
    } catch {
      return {
        address: parsed.data.address,
        nickname: null,
        avatar: null,
        bio: null,
        updatedAt: null,
      };
    }
  });

  app.put("/api/v1/wallets/:address/profile", async (request, reply) => {
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) return reply.code(400).send({ error: "invalid_address" });

    const parsedBody = putBodySchema.safeParse(request.body);
    if (!parsedBody.success) return reply.code(400).send({ error: "invalid_body" });

    const { address } = parsedParams.data;
    const { message, signature, timestampMs } = parsedBody.data;

    const expected = buildProfileMessage(address, timestampMs);
    const decoded = Buffer.from(message, "base64").toString("utf8");
    if (decoded !== expected) {
      return reply.code(400).send({ error: "invalid_message" });
    }

    const ageMs = Math.abs(Date.now() - timestampMs);
    if (ageMs > 5 * 60_000) {
      return reply.code(400).send({ error: "message_expired" });
    }

    const ok = await verifyOwnerSignature(address, message, signature);
    if (!ok) return reply.code(403).send({ error: "invalid_signature" });

    const nickname = normalizeNickname(parsedBody.data.nickname);
    const avatar = validateAvatar(parsedBody.data.avatar);
    const bio = normalizeBio(parsedBody.data.bio);
    if (parsedBody.data.avatar && avatar === null) {
      return reply.code(400).send({ error: "invalid_avatar" });
    }

    try {
      const row = await upsertWalletProfile(address, nickname, avatar, bio);
      return {
        address: row.address,
        nickname: row.nickname,
        avatar: row.avatar,
        bio: row.bio,
        updatedAt: row.updated_at,
      };
    } catch {
      return reply.code(503).send({ error: "profile_store_unavailable" });
    }
  });
}

import { normalizeCoinType } from "../../../coinType.js";
import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import type { ResolvedPosition } from "../../types.js";
import { defiRpcCall, fetchOwnedObjectsByFilter } from "./rpcClient.js";
import { parseU128 } from "./suiFields.js";

const VE_SCA_KEY_TYPE =
  "0xcfe2d87aa5712b67cad2732edb6a2201bfdf592377e5c0968b7cb02099bd8e21::ve_sca::VeScaKey";
const VE_SCA_TABLE_ID =
  "0x0a0b7f749baeb61e3dfee2b42245e32d0e6b484063f0a536b33e771d573d7246";
const SCA_COIN_TYPE =
  "0x7016ffcb1500dcff057e1c9eceb2087dd62777b6b31fb4f1f99c472b6039c643::sca::SCA";
const SCA_DECIMALS = 9;

interface DynamicFieldResult {
  result?: {
    data?: { content?: { fields?: Record<string, unknown> } };
    error?: unknown;
  };
  error?: unknown;
}

async function fetchVeScaData(
  veScaKeyId: string,
): Promise<{ lockedSca: bigint; unlockAt: number | null } | null> {
  const body = await defiRpcCall<DynamicFieldResult>({
    jsonrpc: "2.0",
    id: 1,
    method: "suix_getDynamicFieldObject",
    params: [
      VE_SCA_TABLE_ID,
      { type: "0x2::object::ID", value: veScaKeyId },
      { showContent: true },
    ],
  });
  const fields = body?.result?.data?.content?.fields;
  if (!fields) return null;
  const valueFields = (fields.value as { fields?: Record<string, unknown> } | undefined)?.fields ?? fields;
  const locked = parseU128(valueFields.locked_sca_amount) ?? 0n;
  const unlockRaw = valueFields.unlock_at;
  const unlockAt =
    typeof unlockRaw === "number"
      ? unlockRaw
      : typeof unlockRaw === "string"
        ? Number(unlockRaw)
        : null;
  if (locked <= 0n) return null;
  return { lockedSca: locked, unlockAt: Number.isFinite(unlockAt) ? unlockAt : null };
}

/** Native Scallop veSCA via VeScaKey + dynamic field table (no BlockVision). */
export const nativeVeScaAdapter: ProtocolPositionAdapter = {
  id: "native-ve-sca",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const keys = await fetchOwnedObjectsByFilter(address, { StructType: VE_SCA_KEY_TYPE });
    const out: ResolvedPosition[] = [];

    for (const key of keys) {
      const data = await fetchVeScaData(key.objectId);
      if (!data) continue;
      out.push({
        protocol: "Scallop",
        category: "staking",
        positionType: "ve-sca",
        label: "veSCA",
        objectId: key.objectId,
        valueUsd: null,
        source: "native",
        details: {
          veScaKey: key.objectId,
          coinType: normalizeCoinType(SCA_COIN_TYPE),
          lockedScaAmount: data.lockedSca.toString(),
          coinDecimals: SCA_DECIMALS,
          unlockAt: data.unlockAt,
        },
      });
    }

    return out;
  },
};

export async function inspectNativeVeSca(address: string): Promise<{
  veScaKeys: number;
  positions: ResolvedPosition[];
}> {
  const positions = await nativeVeScaAdapter.fetchPositions(address);
  return { veScaKeys: positions.length, positions };
}

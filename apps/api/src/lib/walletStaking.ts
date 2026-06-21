import { defiRpcCall } from "./positions/sources/native/rpcClient.js";
import { getUsdPrices } from "./prices.js";

// Native SUI staking breakdown (project Stage 4 §C). suix_getStakes returns the
// wallet's delegations grouped by validator with principal + accrued reward +
// status; suix_getLatestSuiSystemState maps the validator address to its name.

interface StakeEntry {
  stakedSuiId?: string;
  principal?: string; // MIST
  estimatedReward?: string; // MIST, only present when status === "Active"
  status?: string;
  stakeActiveEpoch?: string;
  stakeRequestEpoch?: string;
}
interface StakeGroup {
  validatorAddress?: string;
  stakingPool?: string;
  stakes?: StakeEntry[];
}
interface GetStakesResult {
  result?: StakeGroup[];
}
interface ValidatorMeta {
  suiAddress?: string;
  name?: string;
  imageUrl?: string;
}
interface SystemStateResult {
  result?: { activeValidators?: ValidatorMeta[] };
}

export interface WalletStakeValidator {
  validator: string;
  name: string | null;
  imageUrl: string | null;
  apy: number | null;
  principalSui: number;
  rewardSui: number;
  valueUsd: number | null;
  stakes: number;
}
export interface WalletStaking {
  address: string;
  totalPrincipalSui: number;
  totalRewardSui: number;
  totalValueUsd: number | null;
  suiPriceUsd: number | null;
  validators: WalletStakeValidator[];
}

function bigOf(v: unknown): bigint {
  try {
    return BigInt(String(v ?? "0"));
  } catch {
    return 0n;
  }
}

// The validator set changes ~once per epoch (~24h); cache the 129-entry payload.
let validatorCache: { at: number; map: Map<string, { name: string; imageUrl: string | null }> } | null = null;
const VALIDATOR_TTL_MS = 5 * 60 * 1000;

async function validatorMap(now: number): Promise<Map<string, { name: string; imageUrl: string | null }>> {
  if (validatorCache && now - validatorCache.at < VALIDATOR_TTL_MS) return validatorCache.map;
  const body = await defiRpcCall<SystemStateResult>({
    jsonrpc: "2.0",
    id: 1,
    method: "suix_getLatestSuiSystemState",
    params: [],
  });
  const map = new Map<string, { name: string; imageUrl: string | null }>();
  for (const v of body?.result?.activeValidators ?? []) {
    if (v.suiAddress) map.set(v.suiAddress, { name: v.name ?? v.suiAddress, imageUrl: v.imageUrl ?? null });
  }
  if (map.size > 0) validatorCache = { at: now, map };
  return map;
}

/** Per-validator native staking breakdown for a wallet. */
export async function buildWalletStaking(address: string): Promise<WalletStaking> {
  const now = Date.now();
  const [stakesBody, vmap, prices] = await Promise.all([
    defiRpcCall<GetStakesResult>({ jsonrpc: "2.0", id: 1, method: "suix_getStakes", params: [address] }),
    validatorMap(now),
    getUsdPrices(["SUI"]),
  ]);
  const suiPrice = prices.get("SUI") ?? null;

  const validators: WalletStakeValidator[] = [];
  let totalPrincipalMist = 0n;
  let totalRewardMist = 0n;

  for (const g of stakesBody?.result ?? []) {
    let pMist = 0n;
    let rMist = 0n;
    for (const s of g.stakes ?? []) {
      pMist += bigOf(s.principal);
      rMist += bigOf(s.estimatedReward);
    }
    if (pMist === 0n && rMist === 0n) continue;
    totalPrincipalMist += pMist;
    totalRewardMist += rMist;
    const principalSui = Number(pMist) / 1e9;
    const rewardSui = Number(rMist) / 1e9;
    const vinfo = g.validatorAddress ? vmap.get(g.validatorAddress) : undefined;
    validators.push({
      validator: g.validatorAddress ?? g.stakingPool ?? `group-${validators.length}`,
      name: vinfo?.name ?? null,
      imageUrl: vinfo?.imageUrl ?? null,
      apy: null,
      principalSui,
      rewardSui,
      valueUsd: suiPrice !== null ? (principalSui + rewardSui) * suiPrice : null,
      stakes: (g.stakes ?? []).length,
    });
  }
  validators.sort((a, b) => b.principalSui - a.principalSui);

  const totalPrincipalSui = Number(totalPrincipalMist) / 1e9;
  const totalRewardSui = Number(totalRewardMist) / 1e9;
  return {
    address,
    totalPrincipalSui,
    totalRewardSui,
    totalValueUsd: suiPrice !== null ? (totalPrincipalSui + totalRewardSui) * suiPrice : null,
    suiPriceUsd: suiPrice,
    validators,
  };
}

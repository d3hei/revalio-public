import { normalizeCoinType } from "../../../coinType.js";
import { fetchJson } from "../../../http.js";
import { config } from "../../../../config.js";

const CACHE_TTL_MS = 60 * 60 * 1000;

export interface EmberAsset {
  address: string;
  decimals: number;
  symbol: string;
  name?: string;
}

export interface EmberVaultChainDetails {
  id: string;
  address: string;
  receiptCoin: EmberAsset;
  baseDepositCoin: EmberAsset;
}

export interface EmberVaultDetail {
  id: string;
  name: string;
  longName?: string;
  category?: string;
  rateE18?: string;
  detailsByChain?: { sui?: EmberVaultChainDetails };
}

export interface EmberAccountPosition {
  vaultId: string;
  positionValueUsdE9: string;
  positionValueInCoinAmount: string;
  shares: string;
  unrealizedYieldUsdE9?: string;
  status?: string;
}

export interface EmberVaultMeta {
  vaultId: string;
  name: string;
  vaultObjectId: string;
  receiptCoinType: string;
  receiptSymbol: string;
  receiptDecimals: number;
  depositCoinType: string;
  depositSymbol: string;
  depositDecimals: number;
  rateE18: string;
}

interface VaultRegistryCache {
  fetchedAt: number;
  byVaultId: Map<string, EmberVaultMeta>;
  byReceiptCoin: Map<string, EmberVaultMeta>;
}

let registryCache: VaultRegistryCache | null = null;

function apiBase(): string {
  return config.ember.apiBase.replace(/\/+$/, "");
}

function suiDetails(vault: EmberVaultDetail): EmberVaultChainDetails | null {
  return vault.detailsByChain?.sui ?? null;
}

function toVaultMeta(vault: EmberVaultDetail): EmberVaultMeta | null {
  const sui = suiDetails(vault);
  if (!sui?.receiptCoin?.address || !sui.baseDepositCoin?.address) return null;
  return {
    vaultId: vault.id,
    name: vault.longName || vault.name,
    vaultObjectId: sui.address,
    receiptCoinType: normalizeCoinType(sui.receiptCoin.address),
    receiptSymbol: sui.receiptCoin.symbol,
    receiptDecimals: sui.receiptCoin.decimals,
    depositCoinType: normalizeCoinType(sui.baseDepositCoin.address),
    depositSymbol: sui.baseDepositCoin.symbol,
    depositDecimals: sui.baseDepositCoin.decimals,
    rateE18: vault.rateE18 ?? "1000000000000000000",
  };
}

function buildRegistry(vaults: EmberVaultDetail[]): VaultRegistryCache {
  const byVaultId = new Map<string, EmberVaultMeta>();
  const byReceiptCoin = new Map<string, EmberVaultMeta>();
  for (const vault of vaults) {
    const meta = toVaultMeta(vault);
    if (!meta) continue;
    byVaultId.set(meta.vaultId, meta);
    byReceiptCoin.set(meta.receiptCoinType, meta);
  }
  return { fetchedAt: Date.now(), byVaultId, byReceiptCoin };
}

/** Ember vault registry (receipt coin ↔ vault metadata), cached ~1h. */
export async function getEmberVaultRegistry(): Promise<VaultRegistryCache> {
  if (registryCache && Date.now() - registryCache.fetchedAt < CACHE_TTL_MS) {
    return registryCache;
  }
  try {
    const vaults = await fetchJson<EmberVaultDetail[]>(
      `${apiBase()}/api/v2/vaults?chain=sui`,
      { timeoutMs: 8_000, retries: 1 },
    );
    registryCache = buildRegistry(Array.isArray(vaults) ? vaults : []);
  } catch {
    if (registryCache) return registryCache;
    registryCache = buildRegistry([]);
  }
  return registryCache;
}

/** Receipt coin types for all Sui Ember vaults (dedupe wallet chart holdings). */
export async function getEmberReceiptCoinTypes(): Promise<Set<string>> {
  const { byReceiptCoin } = await getEmberVaultRegistry();
  return new Set(byReceiptCoin.keys());
}

/** Account vault positions from Ember API (includes lending-deployed shares). */
export async function fetchEmberAccountPositions(
  address: string,
): Promise<EmberAccountPosition[]> {
  try {
    const rows = await fetchJson<EmberAccountPosition[]>(
      `${apiBase()}/api/v2/vaults/positions/account/${encodeURIComponent(address)}`,
      { timeoutMs: 8_000, retries: 1 },
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/** Underlying deposit amount (raw units) from receipt shares and vault rate (e18). */
export function underlyingFromShares(sharesRaw: bigint, rateE18: string): bigint {
  const rate = BigInt(rateE18 || "1000000000000000000");
  if (rate <= 0n || sharesRaw <= 0n) return 0n;
  return (sharesRaw * 10n ** 18n) / rate;
}

export function positionValueUsdFromE9(valueE9: string): number | null {
  const n = Number(valueE9);
  if (!Number.isFinite(n)) return null;
  return n / 1e9;
}

import { normalizeSuiAddress } from "./sui.js";

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface MintedBadge {
  badgeId: string;
  mintedAt: number;
}

export const REVALIO_MAINNET_BADGE_ID = "revalio-mainnet";

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: REVALIO_MAINNET_BADGE_ID,
    name: "Revalio mainnet",
    description: "Portfolio intelligence on Sui mainnet — claimed by early explorers.",
    imageUrl: "/badges/revalio-mainnet.png",
  },
];

export const BADGES_STORAGE_KEY = "revalio:wallet-badges";
export const BADGES_CHANGED_EVENT = "revalio:wallet-badges-changed";

type BadgeStore = Record<string, MintedBadge[]>;

function readStore(): BadgeStore {
  try {
    const raw = localStorage.getItem(BADGES_STORAGE_KEY);
    const parsed = JSON.parse(raw ?? "{}") as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as BadgeStore;
  } catch {
    return {};
  }
}

function writeStore(store: BadgeStore): void {
  localStorage.setItem(BADGES_STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(BADGES_CHANGED_EVENT));
}

export function getBadgeDefinition(badgeId: string): BadgeDefinition | undefined {
  return BADGE_CATALOG.find((badge) => badge.id === badgeId);
}

export function readWalletBadges(address: string): MintedBadge[] {
  const normalized = normalizeSuiAddress(address);
  return readStore()[normalized] ?? [];
}

export function hasWalletBadge(address: string, badgeId: string): boolean {
  return readWalletBadges(address).some((badge) => badge.badgeId === badgeId);
}

export function mintWalletBadge(address: string, badgeId: string): boolean {
  const normalized = normalizeSuiAddress(address);
  const store = readStore();
  const existing = store[normalized] ?? [];
  if (existing.some((badge) => badge.badgeId === badgeId)) return false;
  store[normalized] = [...existing, { badgeId, mintedAt: Date.now() }];
  writeStore(store);
  return true;
}

export function buildBadgeMintMessage(
  address: string,
  badgeId: string,
  timestampMs: number,
): string {
  return `Revalio badge mint\nBadge: ${badgeId}\nAddress: ${address}\nTimestamp: ${timestampMs}`;
}

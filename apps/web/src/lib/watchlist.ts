import { normalizeSuiAddress } from "./sui.js";

export const WATCHLIST_STORAGE_KEY = "revalio:watchlist";
export const WATCHLIST_CHANGED_EVENT = "revalio:watchlist-changed";

export function readWatchlist(): string[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
    const parsed = JSON.parse(raw ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function writeWatchlist(list: string[]): void {
  localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(WATCHLIST_CHANGED_EVENT));
}

export function isWatchlisted(address: string): boolean {
  const normalized = normalizeSuiAddress(address);
  return readWatchlist().includes(normalized);
}

export function addWatchlistAddress(address: string, ownerAddress?: string | null): boolean {
  const normalized = normalizeSuiAddress(address);
  if (ownerAddress && normalizeSuiAddress(ownerAddress) === normalized) return false;
  const list = readWatchlist();
  if (list.includes(normalized)) return false;
  writeWatchlist([...list, normalized]);
  return true;
}

export function removeWatchlistAddress(address: string): boolean {
  const normalized = normalizeSuiAddress(address);
  const list = readWatchlist();
  const next = list.filter((item) => item !== normalized);
  if (next.length === list.length) return false;
  writeWatchlist(next);
  return true;
}

export function toggleWatchlistAddress(address: string): boolean {
  if (isWatchlisted(address)) {
    removeWatchlistAddress(address);
    return false;
  }
  addWatchlistAddress(address);
  return true;
}

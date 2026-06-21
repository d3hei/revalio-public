import { normalizeSuiAddress } from "./sui.js";

export interface SearchHistoryEntry {
  address: string;
  totalUsd: number | null;
  nickname: string | null;
  avatar: string | null;
  searchedAt: number;
}

export const SEARCH_HISTORY_KEY = "revalio:search-history";
export const SEARCH_HISTORY_MAX = 20;
export const SEARCH_HISTORY_VISIBLE = 5;

function parseHistory(raw: string | null): SearchHistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SearchHistoryEntry =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as SearchHistoryEntry).address === "string" &&
          typeof (item as SearchHistoryEntry).searchedAt === "number",
      )
      .map((item) => ({
        address: item.address,
        totalUsd: typeof item.totalUsd === "number" ? item.totalUsd : null,
        nickname: typeof item.nickname === "string" ? item.nickname : null,
        avatar: typeof item.avatar === "string" ? item.avatar : null,
        searchedAt: item.searchedAt,
      }));
  } catch {
    return [];
  }
}

export function readSearchHistory(): SearchHistoryEntry[] {
  if (typeof window === "undefined") return [];
  return parseHistory(window.localStorage.getItem(SEARCH_HISTORY_KEY));
}

function writeSearchHistory(entries: SearchHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(entries));
}

export function addSearchHistoryEntry(address: string): SearchHistoryEntry[] {
  const normalized = normalizeSuiAddress(address);
  const current = readSearchHistory();
  const prior = current.find((e) => e.address === normalized);
  const next: SearchHistoryEntry = {
    address: normalized,
    totalUsd: prior?.totalUsd ?? null,
    nickname: prior?.nickname ?? null,
    avatar: prior?.avatar ?? null,
    searchedAt: Date.now(),
  };
  const entries = [next, ...current.filter((e) => e.address !== normalized)].slice(
    0,
    SEARCH_HISTORY_MAX,
  );
  writeSearchHistory(entries);
  return entries;
}

export function updateSearchHistoryEntry(
  address: string,
  patch: Partial<Pick<SearchHistoryEntry, "totalUsd" | "nickname" | "avatar">>,
): SearchHistoryEntry[] {
  const normalized = normalizeSuiAddress(address);
  const entries = readSearchHistory().map((entry) =>
    entry.address === normalized ? { ...entry, ...patch } : entry,
  );
  writeSearchHistory(entries);
  return entries;
}

export function clearSearchHistory(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SEARCH_HISTORY_KEY);
}

import { baseType } from "./protocols.js";

/**
 * Curated NFT trust list (seed).
 * Suivision-style "Verified" uses a similar allowlist — on-chain flags alone are incomplete.
 *
 * Extend by adding package/type markers or collection/name text markers.
 */
export const NFT_TRUST_TYPE_MARKERS: readonly string[] = [
  "::suifrens::",
  "::bullshark::bullshark",
  "::suins",
  "::name_service",
  "::deepbook",
  "::deep_book",
  "::stamp::",
  "::pass2::",
  "::alphalend",
  "::deep::",
];

export const NFT_TRUST_TEXT_MARKERS: readonly string[] = [
  "suifrens",
  "bullshark",
  "sui name service",
  "suins",
  "deepbook og",
  "deep airdrop",
  "welcome to overflow",
  "alphalend",
  "pass2",
];

export function isTrustedNft(
  type: string,
  name: string | null,
  collection: string | null,
): boolean {
  const typeLower = baseType(type).toLowerCase();
  if (NFT_TRUST_TYPE_MARKERS.some((marker) => typeLower.includes(marker))) return true;

  const text = `${name ?? ""} ${collection ?? ""}`.toLowerCase();
  if (!text.trim()) return false;
  return NFT_TRUST_TEXT_MARKERS.some((marker) => text.includes(marker));
}

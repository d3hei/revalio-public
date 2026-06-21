import { normalizeSuiAddress } from "./sui.js";

/** Static image MIME types allowed for wallet avatars (no GIF / SVG / video). */
export const ALLOWED_AVATAR_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export const ALLOWED_AVATAR_ACCEPT = "image/png,image/jpeg,image/webp";

export const MAX_AVATAR_BYTES = 512_000;

export const DEFAULT_WALLET_DISPLAY_NAME = "No ID";

/** Bundled placeholder when the wallet has no custom avatar. */
export const DEFAULT_WALLET_AVATAR_URL = "/default-avatar.png";

export function resolveWalletAvatarUrl(avatar: string | null | undefined): string {
  const trimmed = avatar?.trim();
  return trimmed ? trimmed : DEFAULT_WALLET_AVATAR_URL;
}

export function isDefaultWalletAvatar(avatar: string | null | undefined): boolean {
  return !avatar?.trim();
}

export function walletDisplayName(nickname: string | null | undefined): string {
  const trimmed = nickname?.trim();
  return trimmed ? trimmed : DEFAULT_WALLET_DISPLAY_NAME;
}

export function isAllowedAvatarFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (!ALLOWED_AVATAR_MIME.has(mime)) return false;
  if (file.size > MAX_AVATAR_BYTES) return false;
  return true;
}

export function addressesEqual(a: string, b: string): boolean {
  try {
    return normalizeSuiAddress(a) === normalizeSuiAddress(b);
  } catch {
    return a.toLowerCase() === b.toLowerCase();
  }
}

export function buildProfileSignMessage(address: string, timestampMs: number): string {
  return `Revalio profile update\nAddress: ${address}\nTimestamp: ${timestampMs}`;
}

export function avatarHue(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = (hash * 31 + address.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

export function avatarInitial(address: string, nickname: string | null): string {
  if (nickname && nickname.length > 0) return nickname.slice(0, 1).toUpperCase();
  return address.slice(2, 3).toUpperCase();
}

import { z } from "zod";

// Sui addresses are 32-byte hex values. User input must be the full 64-char form
// so a truncated copy-paste cannot silently resolve to a different wallet.
const SUI_ADDRESS_RE = /^0x[0-9a-fA-F]{64}$/;

export const suiAddressSchema = z
  .string()
  .regex(SUI_ADDRESS_RE, "Invalid Sui address (expected 0x + 64 hex chars)")
  .transform((addr) => normalizeSuiAddress(addr));

export function normalizeSuiAddress(addr: string): string {
  const hex = addr.toLowerCase().replace(/^0x/, "");
  return "0x" + hex.padStart(64, "0");
}

export function isValidSuiAddress(addr: string): boolean {
  return SUI_ADDRESS_RE.test(addr.trim());
}

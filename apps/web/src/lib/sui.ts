// Require the full 64-hex form so truncated explorer copy-paste cannot map to another wallet.
const SUI_ADDRESS_RE = /^0x[0-9a-fA-F]{64}$/;

export function isValidSuiAddress(addr: string): boolean {
  return SUI_ADDRESS_RE.test(addr.trim());
}

export function normalizeSuiAddress(addr: string): string {
  const hex = addr.trim().toLowerCase().replace(/^0x/, "");
  return "0x" + hex.padStart(64, "0");
}

export function shortenAddress(addr: string): string {
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

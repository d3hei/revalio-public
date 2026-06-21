import type { Position } from "../api/client.js";
import { formatAmount, formatUsd } from "./format.js";
import { resolveTokenIconUrl, symbolFromDetails } from "./tokenIcons.js";

export const CATEGORY_LABELS: Record<string, string> = {
  staking: "Staking",
  liquid_staking: "Liquid Staking",
  lending: "Lending",
  amm_lp: "Liquidity",
  vault: "Vault",
};

export function friendlyProtocol(protocol: string): string {
  return protocol === "sui-system" ? "Native Staking" : protocol;
}

const PROTOCOL_ICONS: Record<string, string> = {
  NAVI: "/protocols/Navi.png",
  SCALLOP: "/protocols/scalop.svg",
  SCALOP: "/protocols/scalop.svg",
  SUILEND: "/protocols/suilend-logo-transparent.png",
};

export function protocolIconUrl(protocol: string): string | null {
  if (protocol === "sui-system") return resolveTokenIconUrl("SUI");
  const key = protocol.trim().toUpperCase();
  return PROTOCOL_ICONS[key] ?? null;
}

function isSuiVaultPosition(p: Position): boolean {
  if (p.positionType !== "ember-vault") return false;
  const deposit = String(p.details.depositSymbol ?? p.details.symbol ?? "").toUpperCase();
  return deposit === "SUI" || p.label.toUpperCase().includes("SUI");
}

export function positionTitleIconUrl(p: Position): string | null {
  if (p.positionType === "native-staking") return resolveTokenIconUrl("SUI");
  if (isSuiVaultPosition(p)) return resolveTokenIconUrl("SUI");
  return null;
}

export function positionCoinSymbol(p: Position): string | null {
  if (p.positionType === "supply" || p.positionType === "borrow") {
    return symbolFromDetails(p.details);
  }
  if (p.positionType === "suilend-supply" || p.positionType === "suilend-borrow") {
    return symbolFromDetails(p.details);
  }
  if (p.positionType === "scallop-supply" || p.positionType === "scallop-borrow") {
    return symbolFromDetails(p.details);
  }
  if (p.details.coinTypeA && p.details.coinTypeB) {
    const symA = String(p.details.coinTypeA).split("::").pop()?.toUpperCase() ?? null;
    return symA;
  }
  return null;
}

export function positionCoinIconUrl(p: Position): string | null {
  if (positionTitleIconUrl(p)) return null;
  return resolveTokenIconUrl(positionCoinSymbol(p));
}

export function isVisiblePosition(p: Position): boolean {
  if (p.protocol !== "Scallop") return true;
  if (p.positionType === "ve-sca") return false;
  // Misclassified rpc-owned veSCA keys surface as native-staking with "0 SUI staked".
  if (p.positionType === "native-staking" || p.category === "staking") return false;
  if (p.label.toLowerCase().includes("vesca")) return false;
  return true;
}

export function positionSubtitle(p: Position): string {
  if (p.positionType === "native-staking") {
    const principal = String(p.details.principal ?? "0");
    const epoch = p.details.activationEpoch;
    const amount = formatAmount(principal, 9);
    return epoch !== undefined ? `${amount} SUI staked · epoch ${String(epoch)}` : `${amount} SUI staked`;
  }
  if (typeof p.details.name === "string" && p.details.name.length > 0) {
    return p.details.name;
  }
  if (p.details.coinTypeA && p.details.balanceA && p.details.coinTypeB && p.details.balanceB) {
    const symA = String(p.details.coinTypeA).split("::").pop()?.toUpperCase() ?? "?";
    const symB = String(p.details.coinTypeB).split("::").pop()?.toUpperCase() ?? "?";
    return `${symA}+${symB} LP`;
  }
  if (p.positionType === "supply" || p.positionType === "borrow") {
    return String(p.details.symbol ?? "?");
  }
  if (p.positionType === "suilend-supply" || p.positionType === "suilend-borrow") {
    return String(p.details.symbol ?? "?");
  }
  if (p.positionType === "scallop-supply") {
    return String(p.details.symbol ?? "?");
  }
  if (p.positionType === "scallop-borrow" && p.details.totalDebtsInUsd !== undefined) {
    return `Collateral $${Number(p.details.totalCollateralInUsd ?? 0).toFixed(2)} · Debt $${Number(p.details.totalDebtsInUsd).toFixed(2)}`;
  }
  if (p.positionType === "ember-vault") {
    const deposit = String(p.details.depositSymbol ?? p.details.symbol ?? "?");
    const receipt = String(p.details.receiptSymbol ?? "shares");
    return `${deposit} vault · ${receipt}`;
  }
  return CATEGORY_LABELS[p.category] ?? p.category;
}

export function groupByProtocol(positions: Position[]): { protocol: string; items: Position[] }[] {
  const order: string[] = [];
  const map = new Map<string, Position[]>();
  for (const p of positions) {
    if (!map.has(p.protocol)) {
      map.set(p.protocol, []);
      order.push(p.protocol);
    }
    map.get(p.protocol)!.push(p);
  }
  return order.map((protocol) => ({ protocol, items: map.get(protocol)! }));
}

export { formatUsd };

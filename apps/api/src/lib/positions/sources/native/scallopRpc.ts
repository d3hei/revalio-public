import { normalizeCoinType } from "../../../coinType.js";
import type { ProtocolPositionAdapter } from "../../adapters/types.js";
import { symbolFromCoinType } from "../../coinSymbol.js";
import type { ResolvedPosition } from "../../types.js";
import { scallopObligationKeyFilter } from "./scallopPackages.js";
import { fetchCoinDecimals, fetchObject, fetchOwnedObjectsByFilter, type SuiObjectData } from "./rpcClient.js";
import { isObjectId, parseObjectId, parseTypeName, parseU128 } from "./suiFields.js";

function isObligationKeyType(type: string | null | undefined): boolean {
  return Boolean(type?.includes("obligation::ObligationKey"));
}

function isObligationType(type: string | null | undefined): boolean {
  if (!type) return false;
  return type.split("<")[0]!.trim().endsWith("::obligation::Obligation");
}

function parseObligationIdFromKey(fields: Record<string, unknown>): string | null {
  const ownership = fields.ownership;
  if (!ownership || typeof ownership !== "object") return null;
  const o = ownership as Record<string, unknown>;
  const nested = (o.fields as Record<string, unknown> | undefined) ?? o;
  return (
    parseObjectId(nested.of) ??
    parseObjectId(o.of) ??
    parseObjectId(o.inner) ??
    parseObjectId(nested.inner) ??
    parseObjectId(o.fields) ??
    parseObjectId(ownership)
  );
}

function parseBalanceBagAmounts(
  balances: unknown,
): { coinType: string; amount: bigint }[] {
  const out: { coinType: string; amount: bigint }[] = [];
  if (!balances || typeof balances !== "object") return out;
  const root = (balances as { fields?: Record<string, unknown> }).fields ?? balances;
  const bag = (root as Record<string, unknown>).balances ?? root;
  const contents =
    (bag as { fields?: { contents?: unknown[] } }).fields?.contents ??
    (bag as { contents?: unknown[] }).contents;
  if (!Array.isArray(contents)) return out;

  for (const entry of contents) {
    if (!entry || typeof entry !== "object") continue;
    const ef = ((entry as { fields?: Record<string, unknown> }).fields ?? entry) as Record<
      string,
      unknown
    >;
    const key = parseTypeName(ef.key) ?? (typeof ef.key === "string" ? ef.key : null);
    const value =
      parseU128(ef.value) ??
      parseU128((ef.value as { fields?: { value?: unknown } })?.fields?.value);
    if (key && value && value > 0n) {
      out.push({ coinType: normalizeCoinType(key), amount: value });
    }
  }
  return out;
}

function parseWitTableAmounts(table: unknown): { coinType: string; amount: bigint }[] {
  const out: { coinType: string; amount: bigint }[] = [];
  if (!table || typeof table !== "object") return out;
  const contents =
    (table as { fields?: { contents?: unknown[] } }).fields?.contents ??
    (table as { contents?: unknown[] }).contents;
  if (!Array.isArray(contents)) return out;

  for (const row of contents) {
    if (!row || typeof row !== "object") continue;
    const rf = ((row as { fields?: Record<string, unknown> }).fields ?? row) as Record<
      string,
      unknown
    >;
    const key = parseTypeName(rf.key) ?? (typeof rf.key === "string" ? rf.key : null);
    const valueField = rf.value;
    let amount = 0n;
    if (valueField && typeof valueField === "object") {
      const vf = ((valueField as { fields?: Record<string, unknown> }).fields ??
        valueField) as Record<string, unknown>;
      amount =
        parseU128(vf.amount) ??
        parseU128(vf.collateral) ??
        parseU128(vf.borrow_amount) ??
        0n;
    } else {
      amount = parseU128(valueField) ?? 0n;
    }
    if (key && amount > 0n) {
      out.push({ coinType: normalizeCoinType(key), amount });
    }
  }
  return out;
}

async function decodeObligationKey(
  keyObj: { objectId: string; fields: Record<string, unknown> },
): Promise<ResolvedPosition[]> {
  const obligationId = parseObligationIdFromKey(keyObj.fields);
  if (!isObjectId(obligationId)) return [];

  const obligation = await fetchObject(obligationId);
  if (!obligation?.content?.fields || !isObligationType(obligation.type)) return [];

  const fields = obligation.content.fields;
  const rows: ResolvedPosition[] = [];
  const collateralCoins = [
    ...parseBalanceBagAmounts(fields.balances),
    ...parseWitTableAmounts(fields.collaterals),
  ];

  for (const { coinType, amount } of collateralCoins) {
    const sym = symbolFromCoinType(coinType) ?? "?";
    const decimals = await fetchCoinDecimals(coinType);
    rows.push({
      protocol: "Scallop",
      category: "lending",
      positionType: "scallop-supply",
      label: `Collateral ${sym}`,
      objectId: obligationId,
      valueUsd: null,
      source: "native",
      details: {
        coinType,
        suppliedCoin: amount.toString(),
        coinDecimals: decimals,
        obligationId,
        obligationKey: keyObj.objectId,
        symbol: sym,
      },
    });
  }

  const debts = parseWitTableAmounts(fields.debts);
  if (debts.length > 0) {
    rows.push({
      protocol: "Scallop",
      category: "lending",
      positionType: "scallop-borrow",
      label: "Borrow obligation",
      objectId: obligationId,
      valueUsd: null,
      source: "native",
      details: {
        obligationId,
        obligationKey: keyObj.objectId,
        debts: debts.map((d) => ({ coinType: d.coinType, amount: d.amount.toString() })),
      },
    });
  }

  return rows;
}

async function discoverObligationKeys(address: string): Promise<SuiObjectData[]> {
  const filtered = await fetchOwnedObjectsByFilter(address, scallopObligationKeyFilter());
  if (filtered.length > 0) return filtered;

  const { getDefiPositions } = await import("../../../defiPositions.js");
  const rpcRows = await getDefiPositions(address);
  const out: SuiObjectData[] = [];
  for (const row of rpcRows) {
    if (row.protocol !== "Scallop" || !row.objectId) continue;
    const obj = await fetchObject(row.objectId);
    if (obj?.content?.fields && isObligationKeyType(obj.type)) out.push(obj);
  }
  return out;
}

/** Native Scallop via ObligationKey → shared Obligation (no BlockVision). */
export const nativeScallopAdapter: ProtocolPositionAdapter = {
  id: "native-scallop",
  async fetchPositions(address: string): Promise<ResolvedPosition[]> {
    const keys = await discoverObligationKeys(address);
    const seen = new Set<string>();
    const out: ResolvedPosition[] = [];
    for (const obj of keys) {
      if (!obj.content?.fields || seen.has(obj.objectId)) continue;
      seen.add(obj.objectId);
      const decoded = await decodeObligationKey({
        objectId: obj.objectId,
        fields: obj.content.fields,
      });
      out.push(...decoded);
    }
    return out;
  },
};

/** Debug: Scallop ObligationKey discovery + decode summary. */
export async function inspectNativeScallop(address: string): Promise<{
  obligationKeys: number;
  collateralRows: number;
  borrowRows: number;
  positions: ResolvedPosition[];
}> {
  const { fetchScallopScoinSupplyPositions } = await import("./scallopScoin.js");
  const [obligationPositions, scoinPositions] = await Promise.all([
    nativeScallopAdapter.fetchPositions(address),
    fetchScallopScoinSupplyPositions(address),
  ]);
  const positions = [...scoinPositions, ...obligationPositions];
  return {
    obligationKeys: new Set(obligationPositions.map((p) => p.details.obligationKey)).size,
    collateralRows: positions.filter((p) => p.positionType === "scallop-supply").length,
    borrowRows: positions.filter((p) => p.positionType === "scallop-borrow").length,
    positions,
  };
}

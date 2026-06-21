import { suiAddressSchema } from "./sui.js";
import { baseType, classifyType } from "./protocols.js";
import { isTrustedNft } from "./nftTrustList.js";
import { defiRpcCall } from "./positions/sources/native/rpcClient.js";

export interface NftItem {
  objectId: string;
  type: string;
  name: string | null;
  imageUrl: string | null;
  collection: string | null;
  kioskId: string | null;
  source: "wallet" | "kiosk";
  verified: boolean;
}

export interface NftPage {
  items: NftItem[];
  nextCursor: string | null;
  kioskIds: string[];
}

interface GetOwnedObjectsResult {
  result?: {
    data?: RawOwnedObjectRow[];
    hasNextPage?: boolean;
    nextCursor?: string | null;
  };
  error?: unknown;
}

interface DynamicFieldsResult {
  result?: {
    data?: {
      objectId?: string;
      name?: { type?: string; value?: unknown };
      type?: string;
      objectType?: string;
    }[];
    hasNextPage?: boolean;
    nextCursor?: string | null;
  };
  error?: unknown;
}

interface GetObjectResult {
  result?: {
    data?: RawOwnedObjectRow["data"];
    error?: unknown;
  };
  error?: unknown;
}

interface GetDynamicFieldObjectResult {
  result?: {
    data?: RawOwnedObjectRow["data"];
    error?: unknown;
  };
  error?: unknown;
}

export interface RawOwnedObjectRow {
  data?: {
    objectId?: string;
    type?: string;
    content?: { fields?: Record<string, unknown> };
    display?: { data?: Record<string, unknown> | null } | null;
  };
}

function isCoinObjectType(type: string): boolean {
  const b = baseType(type);
  const parts = b.split("::");
  return parts[parts.length - 1] === "Coin";
}

function asDisplayMap(
  display: { data?: Record<string, unknown> | null } | null | undefined,
): Record<string, unknown> {
  return display?.data && typeof display.data === "object" ? display.data : {};
}

function readString(map: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const raw = map[key];
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed.length > 0) return trimmed;
    }
  }
  return null;
}

function normalizeImageUrl(input: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;
  if (raw.startsWith("ipfs://")) {
    const cid = raw.slice("ipfs://".length).replace(/^ipfs\//, "");
    return `https://ipfs.io/ipfs/${cid}`;
  }
  return raw;
}

const PERSONAL_KIOSK_PACKAGE =
  "0x0cb4bcc0560340eb1a1b929cabe56b33fc6449820ec8c1980d69bb98b649b802";

function isKioskOwnerCapType(type: string): boolean {
  return type === "0x2::kiosk::KioskOwnerCap" || type.endsWith("::personal_kiosk::PersonalKioskCap");
}

/** Resolve kiosk object id from KioskOwnerCap / PersonalKioskCap content fields. */
export function extractKioskIdFromCapFields(fields: Record<string, unknown>): string | null {
  const direct =
    parseObjectId(fields.for) ??
    parseObjectId(fields.kiosk) ??
    parseObjectId(fields.kiosk_id);
  if (direct) return direct;

  const cap = fields.cap;
  if (!cap || typeof cap !== "object") return null;
  const capRec = cap as Record<string, unknown>;
  const capFields = capRec.fields;
  if (!capFields || typeof capFields !== "object") return null;
  return (
    parseObjectId((capFields as Record<string, unknown>).for) ??
    parseObjectId((capFields as Record<string, unknown>).kiosk) ??
    parseObjectId((capFields as Record<string, unknown>).kiosk_id)
  );
}

function inferSuifrenName(type: string): string | null {
  const lower = type.toLowerCase();
  if (lower.includes("::bullshark::")) return "Suifrens: Bullsharks";
  if (lower.includes("::capy::")) return "SuiFrens: Capys";
  return null;
}

function parseObjectId(value: unknown): string | null {
  if (typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value)) return value;
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  return (
    parseObjectId(rec.id) ??
    parseObjectId(rec.objectId) ??
    parseObjectId(rec.value) ??
    parseObjectId(rec.fields)
  );
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "1" || v === "yes" || v === "verified";
  }
  return false;
}

function inferVerified(
  display: Record<string, unknown>,
  fields: Record<string, unknown>,
): boolean {
  const keys = [
    "verified",
    "is_verified",
    "verified_collection",
    "verified_creator",
    "isVerified",
    "isVerifiedCollection",
  ];
  for (const key of keys) {
    if (toBoolean(display[key]) || toBoolean(fields[key])) return true;
  }
  return false;
}

function hasDisplayContent(display: Record<string, unknown>): boolean {
  for (const value of Object.values(display)) {
    if (typeof value === "string" && value.trim().length > 0) return true;
  }
  return false;
}

function inferCollectionFromType(type: string): string | null {
  const parts = baseType(type).split("::");
  if (parts.length < 2) return null;
  const module = parts[parts.length - 2];
  return module ? module : null;
}

function hasBasicFields(fields: Record<string, unknown>): boolean {
  return (
    typeof fields.name === "string" ||
    typeof fields.title === "string" ||
    typeof fields.image_url === "string" ||
    typeof fields.imageUrl === "string" ||
    typeof fields.url === "string"
  );
}

function toNftItem(
  row: RawOwnedObjectRow,
  source: "wallet" | "kiosk",
  kioskId: string | null,
): NftItem | null {
  const objectId = row.data?.objectId;
  const type = row.data?.type;
  if (!objectId || !type) return null;

  if (isCoinObjectType(type)) return null;
  if (classifyType(type)) return null;

  const display = asDisplayMap(row.data?.display);
  const fields = row.data?.content?.fields ?? {};
  if (!hasDisplayContent(display) && !hasBasicFields(fields)) return null;

  const name =
    readString(display, ["name", "title"]) ??
    (typeof fields.name === "string"
      ? fields.name
      : typeof fields.title === "string"
        ? fields.title
        : null) ??
    inferSuifrenName(type);
  const collection =
    readString(display, ["collection", "project", "creator"]) ??
    (typeof fields.collection === "string" ? fields.collection : null) ??
    inferCollectionFromType(type);
  const verifiedByOnchain = inferVerified(display, fields);
  const verifiedByTrustList = isTrustedNft(type, name, collection);
  const verified = source === "kiosk" || verifiedByOnchain || verifiedByTrustList;

  return {
    objectId,
    type: baseType(type),
    name,
    imageUrl: normalizeImageUrl(
      readString(display, [
        "image_url",
        "imageUrl",
        "img_url",
        "thumbnail_url",
        "image",
        "url",
        "media_url",
      ]) ??
        (typeof fields.image_url === "string"
          ? fields.image_url
          : typeof fields.imageUrl === "string"
            ? fields.imageUrl
            : typeof fields.url === "string"
              ? fields.url
              : null),
    ),
    collection,
    kioskId,
    source,
    verified,
  };
}

export function extractNftItems(
  rows: RawOwnedObjectRow[],
  source: "wallet" | "kiosk" = "wallet",
  kioskId: string | null = null,
): NftItem[] {
  return rows
    .map((row) => toNftItem(row, source, kioskId))
    .filter((item): item is NftItem => item !== null);
}

async function fetchObjectWithDisplay(objectId: string): Promise<RawOwnedObjectRow | null> {
  const body = await defiRpcCall<GetObjectResult>({
    jsonrpc: "2.0",
    id: 1,
    method: "sui_getObject",
    params: [objectId, { showDisplay: true, showType: true, showContent: true }],
  });
  if (!body || body.error || body.result?.error || !body.result?.data) return null;
  return { data: body.result.data };
}

async function fetchDynamicFieldObject(
  kioskId: string,
  name: unknown,
): Promise<RawOwnedObjectRow | null> {
  const body = await defiRpcCall<GetDynamicFieldObjectResult>({
    jsonrpc: "2.0",
    id: 1,
    method: "suix_getDynamicFieldObject",
    params: [kioskId, name],
  });
  if (!body || body.error || body.result?.error || !body.result?.data) return null;
  return { data: body.result.data };
}

async function discoverKioskIds(address: string): Promise<string[]> {
  const ids = new Set<string>();
  const capFilters: Array<Record<string, unknown>> = [
    { StructType: "0x2::kiosk::KioskOwnerCap" },
    {
      MoveModule: {
        package: PERSONAL_KIOSK_PACKAGE,
        module: "personal_kiosk",
      },
    },
  ];

  for (const filter of capFilters) {
    let cursor: string | null = null;
    for (let page = 0; page < 3; page++) {
      const body: GetOwnedObjectsResult | null = await defiRpcCall<GetOwnedObjectsResult>({
        jsonrpc: "2.0",
        id: 1,
        method: "suix_getOwnedObjects",
        params: [
          address,
          {
            filter,
            options: { showType: true, showContent: true },
          },
          cursor,
          50,
        ],
      });
      if (!body || body.error) break;
      for (const row of body.result?.data ?? []) {
        const type = row.data?.type ?? "";
        if (!isKioskOwnerCapType(type)) continue;
        const fields = row.data?.content?.fields;
        if (!fields || typeof fields !== "object") continue;
        const kioskId = extractKioskIdFromCapFields(fields as Record<string, unknown>);
        if (kioskId) ids.add(kioskId);
      }
      if (!body.result?.hasNextPage || !body.result.nextCursor) break;
      cursor = body.result.nextCursor;
    }
  }
  return [...ids];
}

async function loadKioskNfts(
  kioskId: string,
  take: number,
): Promise<NftItem[]> {
  const out: NftItem[] = [];
  let cursor: string | null = null;
  let scanned = 0;

  while (out.length < take && scanned < 200) {
    const page: DynamicFieldsResult | null = await defiRpcCall<DynamicFieldsResult>({
      jsonrpc: "2.0",
      id: 1,
      method: "suix_getDynamicFields",
      params: [kioskId, cursor, 50],
    });
    if (!page || page.error) break;
    const rows = page.result?.data ?? [];
    scanned += rows.length;
    for (const row of rows) {
      const nameType = row.name?.type ?? "";
      let itemObjectId =
        row.type === "DynamicObject" && row.objectId
          ? row.objectId
          : parseObjectId(row.name?.value) ?? parseObjectId(row.name) ?? null;
      const dynName = row.name;
      if (!itemObjectId && row.objectId) {
        const dynObj = await fetchObjectWithDisplay(row.objectId);
        const fields = dynObj?.data?.content?.fields as Record<string, unknown> | undefined;
        if (fields) {
          itemObjectId =
            parseObjectId(fields.value) ??
            parseObjectId(fields.item) ??
            parseObjectId(fields.item_id) ??
            parseObjectId(fields.id) ??
            null;
        }
      }
      if (!itemObjectId && dynName) {
        const byNameObj = await fetchDynamicFieldObject(kioskId, dynName);
        const fields = byNameObj?.data?.content?.fields as Record<string, unknown> | undefined;
        if (fields) {
          itemObjectId =
            parseObjectId(fields.value) ??
            parseObjectId(fields.item) ??
            parseObjectId(fields.item_id) ??
            parseObjectId(fields.id) ??
            null;
        }
      }
      if (!nameType.includes("::kiosk::Item") && !itemObjectId) continue;
      if (!itemObjectId) continue;
      const item = await fetchObjectWithDisplay(itemObjectId);
      if (!item) continue;
      const extracted = extractNftItems([item], "kiosk", kioskId);
      if (extracted.length > 0) out.push(extracted[0]!);
      if (out.length >= take) break;
    }
    if (!page.result?.hasNextPage || !page.result.nextCursor) break;
    cursor = page.result.nextCursor;
  }
  return out;
}

export async function getOwnedNfts(
  address: string,
  cursor?: string,
  limit = 50,
): Promise<NftPage> {
  const valid = suiAddressSchema.safeParse(address);
  if (!valid.success) return { items: [], nextCursor: null, kioskIds: [] };

  const pageLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
  const walletItems: NftItem[] = [];
  let nextCursor: string | null = cursor ?? null;
  let pages = 0;

  while (walletItems.length < pageLimit && pages < 6) {
    const body = await defiRpcCall<GetOwnedObjectsResult>({
      jsonrpc: "2.0",
      id: 1,
      method: "suix_getOwnedObjects",
      params: [
        valid.data,
        {
          options: {
            showDisplay: true,
            showType: true,
            showContent: true,
          },
        },
        nextCursor,
        50,
      ],
    });
    if (!body || body.error) break;
    walletItems.push(
      ...extractNftItems((body.result?.data ?? []) as RawOwnedObjectRow[], "wallet", null),
    );
    pages += 1;
    if (!body.result?.hasNextPage || !body.result.nextCursor) {
      nextCursor = null;
      break;
    }
    nextCursor = body.result.nextCursor;
  }

  const kioskIds = await discoverKioskIds(valid.data);
  const kioskItems: NftItem[] = [];
  for (const kioskId of kioskIds) {
    if (kioskItems.length >= pageLimit) break;
    const loaded = await loadKioskNfts(kioskId, pageLimit - kioskItems.length);
    kioskItems.push(...loaded);
  }

  const items = [...kioskItems, ...walletItems];
  const deduped: NftItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.objectId)) continue;
    seen.add(item.objectId);
    deduped.push(item);
    if (deduped.length >= pageLimit) break;
  }

  return {
    items: deduped,
    nextCursor,
    kioskIds,
  };
}


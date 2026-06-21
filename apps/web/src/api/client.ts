// Empty by default: paths already start with "/api", and the Vite dev server
// proxies "/api" to the API. Set VITE_API_BASE to an absolute origin only if
// you call the API directly (no proxy), e.g. "http://localhost:3001".
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export interface WalletToken {
  coinType: string;
  symbol: string | null;
  name: string | null;
  decimals: number;
  iconUrl: string | null;
  amount: string;
  priceUsd: number | null;
  valueUsd: number | null;
}

export interface WalletResponse {
  address: string;
  totalUsd: number;
  tokens: WalletToken[];
  source?: "indexer" | "rpc";
}

export interface PortfolioSummary {
  address: string;
  tokensUsd: number;
  positionsUsd: number;
  totalUsd: number;
  chartLiveUsd: number | null;
  sources: {
    indexerBalances: boolean;
    onDemandBalances: boolean;
    defiPositions: number;
  };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export function getWallet(address: string): Promise<WalletResponse> {
  return getJson<WalletResponse>(`/api/v1/wallets/${address}`);
}

export interface ActivityItem {
  txDigest: string;
  kind: string | null;
  sender: string | null;
  checkpoint: string;
  timestampMs: string;
}

export interface ActivityResponse {
  address: string;
  source?: "indexer" | "rpc";
  items: ActivityItem[];
  nextCursor: string | null;
}

export function getActivity(
  address: string,
  cursor?: string,
  limit = 20,
): Promise<ActivityResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  return getJson<ActivityResponse>(`/api/v1/wallets/${address}/activity?${params.toString()}`);
}

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

export interface NftResponse {
  address: string;
  items: NftItem[];
  nextCursor: string | null;
  kioskIds: string[];
}

export function getNfts(
  address: string,
  cursor?: string,
  limit = 12,
): Promise<NftResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);
  return getJson<NftResponse>(`/api/v1/wallets/${address}/nfts?${params.toString()}`);
}

export type ChartRange = "24h" | "7d" | "30d" | "1y";

export interface ChartPoint {
  timestamp: number;
  assetsUsd: number;
  debtUsd: number;
  netWorthUsd: number;
}

export interface ChartResponse {
  address: string;
  range: ChartRange;
  points: ChartPoint[];
  liveTotalUsd: number | null;
  activeSinceMs: number | null;
  historyStartMs: number | null;
}

export function getChart(address: string, range: ChartRange = "7d"): Promise<ChartResponse> {
  return getJson<ChartResponse>(`/api/v1/wallets/${address}/chart?range=${range}`);
}

export interface Position {
  protocol: string;
  category: string;
  positionType: string;
  label: string;
  objectId: string | null;
  details: Record<string, unknown>;
  valueUsd: number | null;
}

export interface ProtocolGroup {
  protocol: string;
  category: string;
  valueUsd: number;
  count: number;
}

export interface PositionsResponse {
  address: string;
  totalUsd: number;
  positions: Position[];
  protocols: ProtocolGroup[];
}

export function getPositions(address: string): Promise<PositionsResponse> {
  return getJson<PositionsResponse>(`/api/v1/wallets/${address}/positions`);
}

export function getPortfolio(address: string): Promise<PortfolioSummary> {
  return getJson<PortfolioSummary>(`/api/v1/wallets/${address}/portfolio`);
}

export interface AnalysisScore {
  key: string;
  label: string;
  value: number;
  why: string;
}
export interface AnalysisLabel {
  key: string;
  label: string;
  why: string;
}
export interface AnalysisHolding {
  name: string;
  kind: string;
  valueUsd: number;
  pctOfTotal: number;
}
export interface LendingHealth {
  protocol: string;
  collateralUsd: number;
  borrowUsd: number;
  liqThreshold: number;
  healthFactor: number;
  drawdownBufferPct: number;
  status: "safe" | "caution" | "danger";
}
export interface WalletAnalysis {
  address: string;
  netWorthUsd: number;
  exposure: { class: string; label: string; valueUsd: number; pct: number }[];
  scores: AnalysisScore[];
  riskScore: number;
  riskWhy: string;
  labels: AnalysisLabel[];
  primaryLabel: AnalysisLabel | null;
  biggest: AnalysisHolding[];
  protocols: { protocol: string; valueUsd: number; pct: number }[];
  lendingHealth: LendingHealth[];
  stats: {
    distinctAssets: number;
    protocolCount: number;
    largestHoldingPct: number;
    borrowUsd: number;
    collateralUsd: number;
    leveragePct: number;
  };
}

export function getAnalysis(address: string): Promise<WalletAnalysis> {
  return getJson<WalletAnalysis>(`/api/v1/wallets/${address}/analysis`);
}

export interface WalletStakeValidator {
  validator: string;
  name: string | null;
  imageUrl: string | null;
  apy: number | null;
  principalSui: number;
  rewardSui: number;
  valueUsd: number | null;
  stakes: number;
}
export interface WalletStaking {
  address: string;
  totalPrincipalSui: number;
  totalRewardSui: number;
  totalValueUsd: number | null;
  suiPriceUsd: number | null;
  validators: WalletStakeValidator[];
}
export function getStaking(address: string): Promise<WalletStaking> {
  return getJson<WalletStaking>(`/api/v1/wallets/${address}/staking`);
}

export interface WalletChange {
  coinType: string;
  symbol: string | null;
  side: "asset" | "liability";
  kind: "opened" | "closed" | "increased" | "decreased";
  beforeAmount: number;
  afterAmount: number;
  deltaAmount: number;
  deltaUsd: number | null;
}
export interface WalletChanges {
  address: string;
  ready: boolean;
  fromTs: number | null;
  toTs: number | null;
  snapshots: number;
  changes: WalletChange[];
}
export function getChanges(address: string): Promise<WalletChanges> {
  return getJson<WalletChanges>(`/api/v1/wallets/${address}/changes`);
}

export interface WalletOverview {
  wallet: WalletResponse;
  portfolio: PortfolioSummary;
  positions: PositionsResponse;
  profile: WalletProfile | null;
}

async function loadWalletOverviewLegacy(address: string): Promise<WalletOverview> {
  const emptyWallet: WalletResponse = { address, totalUsd: 0, tokens: [], source: "rpc" };
  const emptyPortfolio: PortfolioSummary = {
    address,
    tokensUsd: 0,
    positionsUsd: 0,
    totalUsd: 0,
    chartLiveUsd: null,
    sources: { indexerBalances: false, onDemandBalances: false, defiPositions: 0 },
  };
  const emptyPositions: PositionsResponse = {
    address,
    totalUsd: 0,
    positions: [],
    protocols: [],
  };

  const [walletR, portfolioR, positionsR, profileR] = await Promise.allSettled([
    getWallet(address),
    getPortfolio(address),
    getPositions(address),
    getWalletProfile(address),
  ]);

  if (walletR.status === "rejected" && portfolioR.status === "rejected" && positionsR.status === "rejected") {
    throw walletR.reason;
  }

  return {
    wallet: walletR.status === "fulfilled" ? walletR.value : emptyWallet,
    portfolio: portfolioR.status === "fulfilled" ? portfolioR.value : emptyPortfolio,
    positions: positionsR.status === "fulfilled" ? positionsR.value : emptyPositions,
    profile: profileR.status === "fulfilled" ? profileR.value : null,
  };
}

function overviewErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 400) return "Invalid Sui address (need 0x + 64 hex characters).";
    return `API error (${err.status}): ${err.message}`;
  }
  if (err instanceof TypeError) {
    return "Cannot reach API — start pnpm --filter @revalio/api dev on port 3001.";
  }
  if (err instanceof Error) return err.message;
  return "Unknown error loading portfolio.";
}

export { overviewErrorMessage };

export async function getWalletOverview(address: string): Promise<WalletOverview> {
  try {
    return await getJson<WalletOverview>(`/api/v1/wallets/${address}/overview`);
  } catch (err) {
    // Invalid address — do not fall back.
    if (err instanceof ApiError && err.status === 400) throw err;
    // Overview missing (old API), 5xx, or proxy/network error.
    return loadWalletOverviewLegacy(address);
  }
}

export interface WalletProfile {
  address: string;
  nickname: string | null;
  avatar: string | null;
  bio: string | null;
  updatedAt: string | null;
}

export function getWalletProfile(address: string): Promise<WalletProfile> {
  return getJson<WalletProfile>(`/api/v1/wallets/${address}/profile`);
}

export interface WalletAgeResponse {
  address: string;
  firstTimestampMs: string | null;
  firstDigest: string | null;
}

export function getWalletAge(address: string): Promise<WalletAgeResponse> {
  return getJson<WalletAgeResponse>(`/api/v1/wallets/${address}/age`);
}

export async function putWalletProfile(
  address: string,
  payload: {
    nickname: string | null;
    avatar: string | null;
    bio: string | null;
    message: string;
    signature: string;
    timestampMs: number;
  },
): Promise<WalletProfile> {
  const res = await fetch(`${API_BASE}/api/v1/wallets/${address}/profile`, {
    method: "PUT",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as WalletProfile;
}

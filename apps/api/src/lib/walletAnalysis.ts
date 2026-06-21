import { buildPositionsPayload } from "./positionsPayload.js";
import { getPortfolioSummary } from "./portfolioSummary.js";
import { buildWalletPayload } from "./walletPayload.js";
import { loadWalletSnapshot } from "./walletSnapshot.js";
import type { WalletBalanceSource } from "./walletBalances.js";

// Smart Wallet Analysis (project Stage 4): turn an address into a readable
// behaviour profile — exposure classes, explainable scores, labels and a risk
// summary — derived entirely from the holdings we already resolve (no extra
// indexer). Activity-over-time / trajectory is intentionally out of scope here;
// it needs the historical indexer and lands in a later phase.

const STABLE_SYMBOLS = new Set([
  "USDC", "USDT", "USDY", "USDB", "BUCK", "AUSD", "FDUSD", "USDE", "SUIUSDT",
  "SUIUSDC", "USDSUI", "SSBUSDT", "WUSDC", "NUSDC", "WUSDT", "DAI",
]);
// SUI liquid-staking tokens (SUI exposure earned via a validator).
const SUI_LST_SYMBOLS = new Set([
  "HASUI", "VSUI", "AFSUI", "SPRING_SUI", "SSUI", "CERT", "STSUI", "HAEDAL",
]);

// Representative liquidation thresholds per money-market (a position is liquidated
// when collateral * threshold < debt). Used for an explicit ESTIMATE of health —
// exact per-asset thresholds live in each protocol's reserve config.
const LIQ_THRESHOLD: Record<string, number> = {
  Navi: 0.8,
  Suilend: 0.8,
  Scallop: 0.75,
  AlphaLend: 0.8,
  Bucket: 0.9,
};
const DEFAULT_LIQ_THRESHOLD = 0.8;

export type ExposureClass = "sui" | "staking" | "stable" | "defi" | "other";

export interface AnalysisScore {
  key: string;
  label: string;
  value: number; // 0-100
  why: string;
}
export interface AnalysisLabel {
  key: string;
  label: string;
  why: string;
}
export interface AnalysisHolding {
  name: string;
  kind: "token" | string; // token | lending | amm_lp | staking | ...
  valueUsd: number;
  pctOfTotal: number;
}
export interface LendingHealth {
  protocol: string;
  collateralUsd: number;
  borrowUsd: number;
  liqThreshold: number;
  healthFactor: number; // (collateral * liqThreshold) / borrow; <1 = liquidatable
  drawdownBufferPct: number; // how far collateral can fall before liquidation
  status: "safe" | "caution" | "danger";
}
export interface WalletAnalysis {
  address: string;
  netWorthUsd: number;
  exposure: { class: ExposureClass; label: string; valueUsd: number; pct: number }[];
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

const EMPTY_BALANCES: WalletBalanceSource = {
  rows: [],
  indexerBalances: false,
  onDemandBalances: false,
};

function classifyToken(symbol: string | null): ExposureClass {
  const s = (symbol ?? "").toUpperCase();
  if (s === "SUI") return "sui";
  if (STABLE_SYMBOLS.has(s)) return "stable";
  if (SUI_LST_SYMBOLS.has(s)) return "staking";
  return "other";
}

function isStakingPosition(category: string, positionType: string): boolean {
  return (
    category === "staking" ||
    category === "liquid_staking" ||
    positionType === "native-staking"
  );
}

const EXPOSURE_LABELS: Record<ExposureClass, string> = {
  sui: "SUI",
  staking: "Staking",
  stable: "Stablecoins",
  defi: "DeFi",
  other: "Other tokens",
};

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}
function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Build the Smart Wallet Analysis profile for an address. */
export async function buildWalletAnalysis(address: string): Promise<WalletAnalysis> {
  let snapshot;
  try {
    snapshot = await loadWalletSnapshot(address);
  } catch {
    snapshot = { balanceSource: EMPTY_BALANCES, defi: [] };
  }

  const [wallet, portfolio, positions] = await Promise.all([
    buildWalletPayload(address, snapshot.balanceSource).catch(() => ({
      address, totalUsd: 0, tokens: [], source: "rpc" as const,
    })),
    getPortfolioSummary(address, snapshot).catch(() => ({
      address, tokensUsd: 0, positionsUsd: 0, totalUsd: 0, chartLiveUsd: null,
      sources: { indexerBalances: false, onDemandBalances: false, defiPositions: 0 },
    })),
    buildPositionsPayload(address, snapshot.defi).catch(() => ({
      address, totalUsd: 0, positions: [], protocols: [],
    })),
  ]);

  // --- Exposure buckets (positive USD) + collateral/borrow for leverage. ---
  const buckets: Record<ExposureClass, number> = { sui: 0, staking: 0, stable: 0, defi: 0, other: 0 };
  const holdings: AnalysisHolding[] = [];

  for (const t of wallet.tokens) {
    const v = typeof t.valueUsd === "number" && Number.isFinite(t.valueUsd) ? t.valueUsd : 0;
    if (v <= 0) continue;
    buckets[classifyToken(t.symbol)] += v;
    holdings.push({ name: t.symbol ?? t.coinType.split("::").pop() ?? "?", kind: "token", valueUsd: v, pctOfTotal: 0 });
  }

  let borrowUsd = 0;
  let lpDefiUsd = 0;
  const byProtoLend = new Map<string, { coll: number; borrow: number }>();
  for (const p of positions.positions) {
    const v = typeof p.valueUsd === "number" && Number.isFinite(p.valueUsd) ? p.valueUsd : 0;
    const staking = isStakingPosition(p.category, p.positionType);
    if (staking) {
      if (v > 0) buckets.staking += v;
    } else {
      if (v > 0) buckets.defi += v;
      if (v < 0) borrowUsd += -v;
      if (p.category === "amm_lp" && v > 0) lpDefiUsd += v;
      if (p.category === "lending" || p.category === "cdp") {
        const e = byProtoLend.get(p.protocol) ?? { coll: 0, borrow: 0 };
        if (v > 0) e.coll += v;
        else e.borrow += -v;
        byProtoLend.set(p.protocol, e);
      }
    }
    if (Math.abs(v) > 0.01) {
      holdings.push({
        name: p.label,
        kind: staking ? "staking" : p.category,
        valueUsd: v,
        pctOfTotal: 0,
      });
    }
  }

  const expoTotal = buckets.sui + buckets.staking + buckets.stable + buckets.defi + buckets.other;
  const netWorthUsd = portfolio.totalUsd || expoTotal;

  const exposure = (Object.keys(buckets) as ExposureClass[])
    .map((c) => ({ class: c, label: EXPOSURE_LABELS[c], valueUsd: buckets[c], pct: pct(buckets[c], expoTotal) }))
    .filter((e) => e.valueUsd > 0)
    .sort((a, b) => b.valueUsd - a.valueUsd);

  // --- Concentration / diversification. ---
  for (const h of holdings) h.pctOfTotal = Math.min(100, pct(Math.abs(h.valueUsd), expoTotal));
  const positives = holdings.filter((h) => h.valueUsd > 0).sort((a, b) => b.valueUsd - a.valueUsd);
  const largestHoldingPct = positives.length ? positives[0]!.pctOfTotal : 0;
  const distinctAssets = positives.length;
  const protocolCount = positions.protocols.length;

  // Leverage is debt vs lending COLLATERAL only (not LP / supply elsewhere), so the
  // "Leverage"/"Collateral" stats match the per-protocol lending-health section.
  const lendingCollateralUsd = [...byProtoLend.values()].reduce((s, e) => s + e.coll, 0);

  const stakingPct = pct(buckets.staking, expoTotal);
  const defiPct = pct(buckets.defi, expoTotal);
  const stablePct = pct(buckets.stable, expoTotal);
  const suiPct = pct(buckets.sui, expoTotal);
  const rawLeveragePct = lendingCollateralUsd > 0 ? (borrowUsd / lendingCollateralUsd) * 100 : 0;
  const leveragePct = clamp(rawLeveragePct);
  // Herfindahl-based diversification: 1/sum(share^2) normalized to a 0-100 feel.
  // Use the unrounded share so many tiny holdings don't round to 0 and inflate it.
  const hhi = positives.reduce((acc, h) => {
    const share = expoTotal > 0 ? Math.abs(h.valueUsd) / expoTotal : 0;
    return acc + share * share;
  }, 0);
  const effectiveHoldings = hhi > 0 ? 1 / hhi : 0;
  const diversification = clamp(Math.round((effectiveHoldings / 8) * 100));

  // --- Risk = how likely you lose principal beyond ordinary market moves. ---
  // Weighted by HOW RISKY the asset mix is: stablecoins and native staking are
  // conservative (no liquidation, base asset), DeFi adds smart-contract / IL
  // surface, long-tail tokens are speculative. So a wallet entirely in native
  // staking is LOW risk, while leveraged / meme-heavy wallets are HIGH risk.
  const CLASS_RISK: Record<ExposureClass, number> = {
    stable: 0,
    staking: 0.18,
    sui: 0.35,
    defi: 0.5,
    other: 0.8,
  };
  const assetRisk =
    expoTotal > 0
      ? ((Object.keys(buckets) as ExposureClass[]).reduce((s, c) => s + buckets[c] * CLASS_RISK[c], 0) /
          expoTotal) *
        100
      : 0;
  // Concentration is a risk only when the dominant holding is volatile — being
  // 100% in staked SUI or stables is not "dangerous concentration".
  const top = positives[0];
  const topCls: ExposureClass = !top
    ? "stable"
    : top.kind === "token"
      ? classifyToken(top.name)
      : top.kind === "staking"
        ? "staking"
        : "defi";
  const topVolatile = topCls === "sui" || topCls === "defi" || topCls === "other";
  const concentrationRisk =
    topVolatile && largestHoldingPct > 50 ? Math.min(100, (largestHoldingPct - 50) * 2) : 0;

  const riskScore = clamp(
    Math.round(0.5 * assetRisk + 0.35 * leveragePct + 0.15 * concentrationRisk),
  );
  const riskDrivers: string[] = [];
  if (rawLeveragePct > 0) riskDrivers.push(`${Math.round(rawLeveragePct)}% leverage (liquidation risk)`);
  if (pct(buckets.other, expoTotal) >= 25) riskDrivers.push(`${pct(buckets.other, expoTotal)}% in long-tail/volatile tokens`);
  if (topVolatile && largestHoldingPct >= 50) riskDrivers.push(`${largestHoldingPct}% in one volatile holding (${top?.name})`);
  if (stakingPct >= 50) riskDrivers.push(`mostly native staking — conservative`);
  if (stablePct >= 40) riskDrivers.push(`${stablePct}% stable buffer (lowers risk)`);
  const riskWhy = riskDrivers.length ? riskDrivers.join(" · ") : "balanced asset mix, no leverage";

  const scores: AnalysisScore[] = [
    { key: "staking", label: "Staking", value: Math.round(stakingPct), why: `${stakingPct}% of value earns staking yield (native + liquid)` },
    { key: "defi", label: "DeFi exposure", value: Math.round(defiPct), why: `${defiPct}% deployed across ${protocolCount} protocol${protocolCount === 1 ? "" : "s"}` },
    { key: "stable", label: "Stable buffer", value: Math.round(stablePct), why: `${stablePct}% parked in stablecoins` },
    { key: "diversification", label: "Diversification", value: diversification, why: `${distinctAssets} assets; ~${effectiveHoldings.toFixed(1)} effective holdings (largest ${largestHoldingPct}%)` },
  ];

  // --- Labels (collect all that match; primary = highest priority). ---
  const labels: AnalysisLabel[] = [];
  const add = (key: string, label: string, why: string) => labels.push({ key, label, why });

  if (netWorthUsd < 5) add("dust", "Dust / test wallet", `net worth ~$${netWorthUsd.toFixed(2)}`);
  if (netWorthUsd >= 100_000) add("whale", "Whale", `net worth $${Math.round(netWorthUsd).toLocaleString("en-US")}`);
  if (stakingPct >= 40) add("staker", "Power Staker", `${stakingPct}% staked`);
  if (suiPct + stakingPct >= 65) add("sui-maxi", "SUI Maxi", `${(suiPct + stakingPct).toFixed(1)}% in SUI + staking`);
  if (defiPct >= 35 && protocolCount >= 3) add("defi-native", "DeFi Native", `${defiPct}% across ${protocolCount} protocols`);
  if (buckets.defi > 0 && lpDefiUsd / buckets.defi >= 0.5) add("lp", "LP Provider", `${pct(lpDefiUsd, buckets.defi)}% of DeFi is liquidity provision`);
  if (borrowUsd > 0.5) add("leverage", "Leverage User", `borrowing $${Math.round(borrowUsd).toLocaleString("en-US")} against $${Math.round(lendingCollateralUsd).toLocaleString("en-US")}`);
  if (stablePct >= 50) add("stable", "Stable Parker", `${stablePct}% in stablecoins`);
  if (largestHoldingPct >= 50) add("concentrated", "Concentrated", `${largestHoldingPct}% in ${positives[0]?.name ?? "one holding"}`);
  if (distinctAssets >= 6 && largestHoldingPct < 40) add("diversified", "Diversified", `${distinctAssets} holdings, none over 40%`);
  if (defiPct < 10 && borrowUsd < 0.5 && netWorthUsd >= 5) add("holder", "Long-term Holder", `low DeFi activity, mostly tokens & staking`);

  const PRIORITY = ["whale", "leverage", "defi-native", "lp", "staker", "sui-maxi", "stable", "concentrated", "diversified", "holder", "dust"];
  const rank = (k: string) => {
    const i = PRIORITY.indexOf(k);
    return i === -1 ? PRIORITY.length : i;
  };
  const primaryLabel = [...labels].sort((a, b) => rank(a.key) - rank(b.key))[0] ?? null;

  const biggest = holdings
    .sort((a, b) => Math.abs(b.valueUsd) - Math.abs(a.valueUsd))
    .slice(0, 6);

  const protocols = positions.protocols
    .map((p) => ({ protocol: p.protocol, valueUsd: p.valueUsd, pct: pct(Math.abs(p.valueUsd), expoTotal) }))
    .sort((a, b) => Math.abs(b.valueUsd) - Math.abs(a.valueUsd));

  const lendingHealth: LendingHealth[] = [...byProtoLend.entries()]
    .filter(([, e]) => e.borrow > 0.5 && e.coll > 0)
    .map(([protocol, e]) => {
      const lt = LIQ_THRESHOLD[protocol] ?? DEFAULT_LIQ_THRESHOLD;
      const hf = (e.coll * lt) / e.borrow;
      const drawdownBufferPct = hf > 1 ? clamp((1 - 1 / hf) * 100) : 0;
      const status = hf >= 1.5 ? "safe" : hf >= 1.1 ? "caution" : "danger";
      return {
        protocol,
        collateralUsd: Math.round(e.coll * 100) / 100,
        borrowUsd: Math.round(e.borrow * 100) / 100,
        liqThreshold: lt,
        healthFactor: Math.round(hf * 100) / 100,
        drawdownBufferPct: Math.round(drawdownBufferPct),
        status: status as LendingHealth["status"],
      };
    })
    .sort((a, b) => a.healthFactor - b.healthFactor);

  return {
    address,
    netWorthUsd,
    exposure,
    scores,
    riskScore,
    riskWhy,
    labels,
    primaryLabel,
    biggest,
    protocols,
    lendingHealth,
    stats: {
      distinctAssets,
      protocolCount,
      largestHoldingPct,
      borrowUsd: Math.round(borrowUsd * 100) / 100,
      collateralUsd: Math.round(lendingCollateralUsd * 100) / 100,
      leveragePct: Math.round(leveragePct * 10) / 10,
    },
  };
}

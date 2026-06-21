// ─────────────────────────────────────────────────────────────────────────────
// Revalio - DeepSurge grant demo · SCENARIO (single source of truth)
//
// Timeline (≈ 3:00, 1920×1080, screen recording):
//   0:00  What is Revalio          intro
//   0:15  Paste a Sui address      paste
//   0:30  Portfolio Overview       overview
//   0:50  Native Staking           staking
//   1:10  DeFi Positions           defi
//   1:40  Portfolio History        history
//   2:10  Analysis                 analysis
//   2:40  Why it matters for Sui   why
//
// Each scene carries: caption (short on-screen label), narration (the line you say -
// plain prose, no filler, nothing invented), durationSec (locks the timecode above),
// and run(ctx) (the actions the recorder performs). docs/grant-video/*.md mirror this.
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG = {
  // Main wallet for the tour - broad DeFi coverage (Cetus, AlphaLend, Navi, Scallop, Suilend,
  // DeepBook) and a full year of chart history. Verified live on revalio.xyz.
  HERO: process.env.HERO ||
    "0x65cfe14bdf5fdcba512a2f20586c2738f8d2e2e277e3fdb880619ed2b4edf73d",
  // The hero doesn't stake, so the 0:50 scene shows native staking on this separate "Power Staker"
  // wallet: 4,208 SUI delegated to Mysten-1, Mysten-2 and Ledger by P2P.ORG, with live rewards.
  STAKER: process.env.STAKER ||
    "0x9edb6feffd0ebc84cb3923980341929d6bdf16254338188473c849b4615b098e",
  // Other wallets you can swap in via HERO=… (browse https://revalio.xyz/whales):
  HERO_ALTERNATES: {
    leveraged: "0x4c04cb7126f22623cf3d97d29c936d6b9882a9b28a08cc863bdc9190284a8417", // Navi+Suilend lending health
    cetusWhale: "0x08beed3ebf0b5620ab5ea33be9ccd87e7b1ef590834fe3b7ac71e40c3f679ed1", // ~$230k Cetus LP
    bluefin: "0x5c03a18b15278713cdd1710a76a8dcbf0159a5739c743015868013c6aadaf984",     // ~$728k Bluefin
  },
};

export const INTRO = {
  eyebrow: "DeepSurge · Sui",
  title: "Revalio",
  subtitle: "Portfolio tracker for the Sui blockchain",
};

export const OUTRO = {
  eyebrow: "Built on Sui",
  title: "Revalio",
  subtitle: "Read any Sui wallet, priced live",
};

export const SCENES = [
  // 0:00 - What is Revalio
  {
    id: "intro",
    caption: "Portfolio tracker for the Sui blockchain",
    narration:
      "Revalio is a portfolio tracker for the Sui blockchain. Give it any wallet address and it reads that wallet from the chain, showing what it holds and what it's worth in dollars.",
    durationSec: 15,
    async run(ctx) {
      await ctx.goto("/");
      await ctx.waitFonts();
      await ctx.card(INTRO);
      await ctx.sleep(5000);
      await ctx.cardHide();
      await ctx.caption(this.caption);
      await ctx.zoom({ selector: ".hero-card", scale: 1.1 });
      await ctx.sleep(2400);
      await ctx.zoomReset();
    },
  },

  // 0:15 - Paste a Sui address
  {
    id: "paste",
    caption: "Paste any Sui address - no sign-up",
    narration:
      "There's no sign-up and nothing to connect. I paste a wallet address here, and Revalio loads it. This one is an active mainnet wallet, so everything you'll see is real on-chain data.",
    durationSec: 15,
    async run(ctx) {
      await ctx.caption(this.caption);
      await ctx.click(".hero-lookup-input");
      await ctx.type(".hero-lookup-input", ctx.HERO);
      await ctx.sleep(400);
      await ctx.click(".hero-lookup-go");
      await ctx.waitData();
    },
  },

  // 0:30 - Portfolio Overview
  {
    id: "overview",
    caption: "Total value and allocation, priced live",
    narration:
      "This is the overview. The figure at the top is the wallet's total value. Underneath, that value is split by where the money sits - what's held as plain tokens, and what's inside protocols - priced from live market data.",
    durationSec: 20,
    async run(ctx) {
      await ctx.caption(this.caption);
      await ctx.waitData();
      await ctx.zoom({ selector: ".chart-value", scale: 1.5 });
      await ctx.sleep(2600);
      await ctx.zoomReset();
      await ctx.scrollTo({ headerText: "Allocation" });
      await ctx.zoom({ headerText: "Allocation", scale: 1.2 });
      await ctx.sleep(3000);
      await ctx.zoomReset();
    },
  },

  // 0:50 - Native Staking (shown on a separate "Power Staker" wallet, since the hero doesn't stake)
  {
    id: "staking",
    caption: "Native SUI staking - amount and rewards per validator",
    narration:
      "Revalio also reads native SUI staking. Here's a wallet that delegates to validators - it finds the staked objects on-chain, shows how much is staked with each validator and the rewards earned, and values the whole stake in dollars.",
    durationSec: 20,
    async run(ctx) {
      await ctx.goto("/" + ctx.STAKER + "/analysis"); // deep-link straight to the staking card
      await ctx.waitFor({ headerText: "Native SUI staking" });
      await ctx.caption(this.caption);
      await ctx.scrollTo({ headerText: "Native SUI staking" });
      await ctx.zoom({ headerText: "Native SUI staking", scale: 1.22 });
      await ctx.sleep(3600);
      await ctx.zoomReset();
    },
  },

  // 1:10 - DeFi Positions
  {
    id: "defi",
    caption: "DeFi positions, decoded from on-chain objects",
    narration:
      "Back on the main wallet, the money is spread across DeFi protocols - liquidity in pools, and funds supplied or borrowed in lending markets. Revalio reads each position from its on-chain object and groups it under the protocol it belongs to, with a dollar value. Sui doesn't publish contract interfaces the way Ethereum does, so every protocol needs its own decoder, written by hand. That decoding is most of the work behind Revalio.",
    durationSec: 30,
    async run(ctx) {
      await ctx.goto("/" + ctx.HERO + "/defi"); // back to the hero (staking used a different wallet)
      await ctx.waitFor(".positions-card");
      await ctx.caption(this.caption);
      await ctx.zoom({ headerText: "Positions", scale: 1.28 });
      await ctx.sleep(2400);
      await ctx.zoomReset();
      await ctx.scrollTo({ groupNot: "stak", block: "top", optional: true });
      const ok = await ctx.zoom({ groupNot: "stak", scale: 1.3 });
      if (!ok) await ctx.zoom({ selector: ".protocol-group", nth: 0, scale: 1.3 });
      await ctx.sleep(3200);
      await ctx.zoomReset();
      await ctx.scrollBy(340);
      await ctx.sleep(2200);
    },
  },

  // 1:40 - Portfolio History
  {
    id: "history",
    caption: "Net worth over time",
    narration:
      "Revalio also tracks the wallet's value over time. The line is net worth - what the wallet owns minus what it owes - and the buttons switch the window from a day out to a year. The history is built from price snapshots the backend records on a schedule, so a wallet that's been followed longer shows a fuller line.",
    durationSec: 30,
    async run(ctx) {
      await ctx.tab("Overview");
      await ctx.waitFor(".chart-card");
      await ctx.caption(this.caption);
      await ctx.scrollTo({ selector: ".chart-card", block: "top" });
      await ctx.zoom({ selector: ".chart-card", scale: 1.24 });
      await ctx.sleep(2400);
      await ctx.zoomReset();
      await ctx.clickButton("30d");
      await ctx.sleep(1600);
      await ctx.clickButton("1y");
      await ctx.sleep(1800);
      await ctx.zoom({ selector: ".chart-card", scale: 1.2 });
      await ctx.sleep(1500);
      await ctx.zoomReset();
    },
  },

  // 2:10 - Analysis
  {
    id: "analysis",
    caption: "Behaviour label, risk and concentration - all derived",
    narration:
      "The analysis tab reads the holdings and describes the wallet. It assigns a behaviour label, scores risk and diversification with the reason written next to each number, and points out where the money is concentrated. None of this is typed in - it comes from the positions Revalio already found.",
    durationSec: 30,
    async run(ctx) {
      await ctx.tab("Analysis");
      await ctx.waitFor({ headerText: "Wallet Intelligence" }, 20000);
      await ctx.caption(this.caption);
      await ctx.zoom({ headerText: "Wallet Intelligence", scale: 1.25 });
      await ctx.sleep(2800);
      await ctx.zoomReset();
      await ctx.scrollTo({ headerText: "Scores" });
      await ctx.zoom({ selector: ".meter", nth: 0, scale: 1.5 });
      await ctx.sleep(2800);
      await ctx.zoomReset();
      // Hero has no borrows → no Lending-health card; show Exposure instead (lending health
      // appears automatically for wallets that borrow, e.g. HERO=0x4c04…a8417).
      const lend = await ctx.scrollTo({ headerText: "Lending health", optional: true });
      await ctx.zoom({ headerText: lend ? "Lending health" : "Exposure", scale: 1.22 });
      await ctx.sleep(2800);
      await ctx.zoomReset();
    },
  },

  // 2:40 - Why it matters for Sui
  {
    id: "why",
    caption: "Public data · open API · built on Sui",
    narration:
      "All of this is public on-chain data, made readable. Anyone on Sui can check a wallet without handing trust to a third party, and the same data is open through a public API for other apps to use. It runs on Sui's own indexer framework and Pyth price feeds.",
    durationSec: 20,
    async run(ctx) {
      await ctx.captionHide();
      await ctx.goto("/whales");
      await ctx.waitFor(".token-row");
      await ctx.caption(this.caption);
      await ctx.sleep(1400);
      await ctx.zoom({ selector: ".card", nth: 0, scale: 1.14 });
      await ctx.sleep(3200);
      await ctx.zoomReset();
      await ctx.captionHide();
      await ctx.card(OUTRO);
      await ctx.hold();
    },
  },
];

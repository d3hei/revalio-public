# Revalio - DeepSurge grant video · Storyboard

A ~3:00 screen recording of the **live site (revalio.xyz)**, 1920×1080, no heavy editing - just clean
cursor moves, zooms and captions the recorder (`grant-video/`) performs automatically. Order follows the
agreed timeline.

## Wallets used
- **Main wallet** (`HERO`, default `0x65cf…f73d` - "Revalio Dev"): broad DeFi coverage across **Cetus,
  AlphaLend, Navi, Scallop, Suilend and DeepBook**, plus a year of chart history. Drives every scene
  except staking.
- **Staker wallet** (`STAKER`, default `0x9edb…098e` - a real "Power Staker"): 4,208 SUI delegated to
  Mysten-1, Mysten-2 and Ledger by P2P.ORG, with live rewards. Used **only** for the 0:50 scene, because
  the main wallet doesn't stake. The narration says "here's a wallet that delegates" to match the switch.

Both are swappable via the `HERO` / `STAKER` env vars; the recorder prints a pre-flight report of what
each has before recording.

| Time | Scene | On screen | Camera / action | Caption |
|------|-------|-----------|-----------------|---------|
| 0:00 | **What is Revalio** | Title card → landing hero | Card fades in/out, small zoom on hero copy | *Portfolio tracker for the Sui blockchain* |
| 0:15 | **Paste a Sui address** | Landing lookup field | Cursor types the address and clicks **Go**; the wallet loads | *Paste any Sui address - no sign-up* |
| 0:30 | **Portfolio Overview** | Total value + Allocation | Zoom the total, then scroll to and zoom **Allocation** (token vs protocol) | *Total value and allocation, priced live* |
| 0:50 | **Native Staking** *(staker wallet)* | Analysis → **Native SUI staking** card | Deep-link to the staker's Analysis, zoom the validator table (amount + rewards + USD) | *Native SUI staking - amount and rewards per validator* |
| 1:10 | **DeFi Positions** *(back to main)* | DeFi tab - protocol groups | Deep-link to the hero's DeFi, zoom the Positions total, then a lending group, then scroll | *DeFi positions, decoded from on-chain objects* |
| 1:40 | **Portfolio History** | Overview chart | Back to Overview, zoom the chart, switch ranges **30d → 1y** | *Net worth over time* |
| 2:10 | **Analysis** | Wallet Intelligence, Scores, Exposure | Zoom the label, the **Risk** meter, then Exposure (lending-health appears here for wallets that borrow) | *Behaviour label, risk and concentration - all derived* |
| 2:40 | **Why it matters for Sui** | Whales list → outro card | Zoom the list, then a closing card | *Public data · open API · built on Sui* |

## Mapping to what judges look for
- **Working product on real data** - the whole tour runs on the live site with real mainnet wallets and
  live dollar values.
- **Clear connection to Sui** - staking, DeFi decoding and history are Sui-specific; the close says it
  plainly.
- **Uses Sui infrastructure** - narrated at the end: Sui's own indexer framework and Pyth price feeds.
- **Public + verifiable** - the close notes the data is public and exposed through a public API.

## Notes
- The main wallet is small in dollars but wide in coverage (6 protocols). For judging on *capability*,
  breadth reads better than size. To lead with bigger numbers instead, set `HERO` to a whale from
  `https://revalio.xyz/whales` (e.g. the Cetus or Bluefin whale) - but those show fewer protocols and no
  lending health.
- **Lending health / liquidation** only renders for wallets that borrow. The default hero doesn't, so the
  Analysis scene shows Exposure there. Use `HERO=0x4c04…a8417` to feature a real health factor instead.
- If a scene's target is missing for your chosen wallet, the recorder logs a warning and continues.

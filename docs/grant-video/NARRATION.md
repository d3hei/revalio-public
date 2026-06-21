# Revalio - DeepSurge grant video · Narration (voice-over base)

English · ~3:00 · ~375 words. The recorder paces each scene to the timecodes below, so you read
along while the silent video plays. `(…)` marks a short pause. Record in a quiet room, ~15 cm from
the mic and slightly off-axis; do a scene per take and redo a line if you fluff it.

The recorder also writes `out/timing.txt` next to the video with these same timecodes.

> One thing to know: the **0:50 staking** scene shows a *different* wallet on screen - a real
> "Power Staker" that delegates SUI to validators - because the main demo wallet doesn't stake. The
> line is written so "here's a wallet that delegates" matches that switch. Everything else is the one
> main wallet.

---

**[0:00] What is Revalio**
Revalio is a portfolio tracker for the Sui blockchain. (…) Give it any wallet address and it reads that
wallet from the chain, showing what it holds and what it's worth in dollars.

**[0:15] Paste a Sui address**
There's no sign-up and nothing to connect. (…) I paste a wallet address here, and Revalio loads it.
This one is an active mainnet wallet, so everything you'll see is real on-chain data.

**[0:30] Portfolio Overview**
This is the overview. The figure at the top is the wallet's total value. (…) Underneath, that value is
split by where the money sits - what's held as plain tokens, and what's inside protocols - priced from
live market data.

**[0:50] Native Staking**  *(screen switches to the Power Staker wallet)*
Revalio also reads native SUI staking. (…) Here's a wallet that delegates to validators - it finds the
staked objects on-chain, shows how much is staked with each validator and the rewards earned, and values
the whole stake in dollars.

**[1:10] DeFi Positions**  *(back to the main wallet)*
Back on the main wallet, the money is spread across DeFi protocols - liquidity in pools, and funds
supplied or borrowed in lending markets. (…) Revalio reads each position from its on-chain object and
groups it under the protocol it belongs to, with a dollar value. (…) Sui doesn't publish contract
interfaces the way Ethereum does, so every protocol needs its own decoder, written by hand. That
decoding is most of the work behind Revalio.

**[1:40] Portfolio History**
Revalio also tracks the wallet's value over time. (…) The line is net worth - what the wallet owns minus
what it owes - and the buttons switch the window from a day out to a year. (…) The history is built from
price snapshots the backend records on a schedule, so a wallet that's been followed longer shows a
fuller line.

**[2:10] Analysis**
The analysis tab reads the holdings and describes the wallet. (…) It assigns a behaviour label, scores
risk and diversification with the reason written next to each number, and points out where the money is
concentrated. None of this is typed in - it comes from the positions Revalio already found.

**[2:40] Why it matters for Sui**
All of this is public on-chain data, made readable. (…) Anyone on Sui can check a wallet without handing
trust to a third party, and the same data is open through a public API for other apps to use. (…) It
runs on Sui's own indexer framework and Pyth price feeds.

---

## Continuous read-through (no timecodes / cues)

Revalio is a portfolio tracker for the Sui blockchain. Give it any wallet address and it reads that
wallet from the chain, showing what it holds and what it's worth in dollars.

There's no sign-up and nothing to connect. I paste a wallet address here, and Revalio loads it. This one
is an active mainnet wallet, so everything you'll see is real on-chain data.

This is the overview. The figure at the top is the wallet's total value. Underneath, that value is split
by where the money sits - what's held as plain tokens, and what's inside protocols - priced from live
market data.

Revalio also reads native SUI staking. Here's a wallet that delegates to validators - it finds the
staked objects on-chain, shows how much is staked with each validator and the rewards earned, and values
the whole stake in dollars.

Back on the main wallet, the money is spread across DeFi protocols - liquidity in pools, and funds
supplied or borrowed in lending markets. Revalio reads each position from its on-chain object and groups
it under the protocol it belongs to, with a dollar value. Sui doesn't publish contract interfaces the
way Ethereum does, so every protocol needs its own decoder, written by hand. That decoding is most of
the work behind Revalio.

Revalio also tracks the wallet's value over time. The line is net worth - what the wallet owns minus
what it owes - and the buttons switch the window from a day out to a year. The history is built from
price snapshots the backend records on a schedule, so a wallet that's been followed longer shows a
fuller line.

The analysis tab reads the holdings and describes the wallet. It assigns a behaviour label, scores risk
and diversification with the reason written next to each number, and points out where the money is
concentrated. None of this is typed in - it comes from the positions Revalio already found.

All of this is public on-chain data, made readable. Anyone on Sui can check a wallet without handing
trust to a third party, and the same data is open through a public API for other apps to use. It runs on
Sui's own indexer framework and Pyth price feeds.

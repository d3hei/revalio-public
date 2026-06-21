# Revalio - DeepSurge grant video kit

Everything to produce the grant demo video: a written plan, the voice‑over script, and a recorder that
drives the **live site** and films itself.

| File | What it is |
|------|------------|
| [`SCENARIO.md`](./SCENARIO.md) | Storyboard - every scene, what's on screen, the camera move, and why the order works for a grant. |
| [`NARRATION.md`](./NARRATION.md) | The English voice‑over script you record ("база"), with timecodes and delivery tips. |
| [`../../grant-video/`](../../grant-video/) | The automated recorder (Playwright). Produces `revalio-demo.mp4` + a `timing.txt`. |

## Workflow, end to end
1. **Record the silent walkthrough** of the live site:
   `cd grant-video && npm install && npx playwright install chromium && npm run record`.
   It records `https://revalio.xyz` by default - no local setup, real on‑chain data.
2. **Record your voice** over the video using `NARRATION.md` (the recorder also drops `out/timing.txt`
   telling you when to speak each line).
3. **Mux** voice + video in any editor (CapCut, DaVinci Resolve, Premiere, even Clipchamp) and export.

## The wallets it features
Everything is real, live data from `revalio.xyz`:
- **Main wallet** `0x65cf…f73d` - broad DeFi across Cetus, AlphaLend, Navi, Scallop, Suilend and DeepBook,
  with a year of chart history. Drives every scene except staking.
- **Staker** `0x9edb…098e` - a real "Power Staker" (4,208 SUI across Mysten‑1, Mysten‑2 and Ledger by
  P2P.ORG). Shown only in the 0:50 staking scene, because the main wallet doesn't stake.

Swap either via `HERO` / `STAKER` env vars. To lead with bigger dollar figures, set `HERO` to a whale
from `https://revalio.xyz/whales` - but those show fewer protocols (e.g. Cetus‑only) and no lending
health. To show a real lending health factor in the Analysis scene, use `HERO=0x4c04…a8417`.

## Recording a local build instead (optional)
Only needed if you want to film unreleased changes. Bring the app up, then point the recorder at it:

```powershell
docker compose up -d                 # Postgres + Redis (API connects at boot)
pnpm --filter @revalio/api dev       # API → http://localhost:3001 (reads mainnet on demand)
pnpm --filter @revalio/web dev       # Web → http://localhost:5173
# then, in grant-video/:
$env:BASE_URL="http://localhost:5173"; npm run record
```

## Notes for the submission
- Default render is **1080p**, ~3:00 - within DeepSurge's ≤5 min limit. The checklist prefers a YouTube
  link, so upload the MP4 **unlisted** and submit the URL.
- Keep the on‑screen captions (default) - judges often watch muted on a first pass.
- To re‑shoot a few scenes without redoing the whole video, pass their ids, e.g.
  `ONLY=overview,staking,defi` (ids: `intro, paste, overview, staking, defi, history, analysis, why`).

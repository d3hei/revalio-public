# Revalio grant‑video recorder

Automated, cinematic walkthrough of Revalio for the DeepSurge grant submission. Drives a real Chromium
browser through `scenario.mjs` and records **1080p** video with a synthetic cursor, zoom‑to‑element,
smooth scrolling, captions and branded title cards - then exports an MP4.

By default it records the **live site, `https://revalio.xyz`** - no local setup, real on‑chain data.

> Storyboard: [`../docs/grant-video/SCENARIO.md`](../docs/grant-video/SCENARIO.md) ·
> Voice‑over script: [`../docs/grant-video/NARRATION.md`](../docs/grant-video/NARRATION.md) ·
> Overview: [`../docs/grant-video/README.md`](../docs/grant-video/README.md)

## 1. Install (once)

```powershell
cd grant-video
npm install
npx playwright install chromium
```

## 2. Preview the shot list (no browser)

```powershell
npm run plan
```

Prints every scene, its start time and narration - the timing you'll see in the final video.

## 3. Record

```powershell
npm run record
```

The recorder prints a pre‑flight report (what the hero/staker wallets actually hold) and then films.
Output lands in `grant-video/out/`:
- `revalio-demo.mp4` - H.264, upload this (created if `ffmpeg` is on PATH)
- `revalio-demo.webm` - raw recording (always)
- `timing.txt` - when to speak each line, for your voice‑over

## Configuration (env vars)

| Var | Default | What it does |
|-----|---------|--------------|
| `HERO` | `0x65cf…f73d` (broad DeFi, 6 protocols) | Main wallet for the tour. Swap for any address. |
| `STAKER` | `0x9edb…098e` ("Power Staker") | Wallet shown only in the 0:50 staking scene (the hero doesn't stake). |
| `BASE_URL` | `https://revalio.xyz` | Site to record. Point at `http://localhost:5173` to record a local build. |
| `HEADED` | _(unset)_ | `HEADED=1` opens a visible browser so you can watch it run. |
| `CAPTIONS` | on | `CAPTIONS=0` records without on‑screen captions (clean plate for editing). |
| `SCALE` | `1` | `SCALE=2` renders at 2× for crisper text (bigger files). |
| `ONLY` | _(all)_ | Comma‑sep scene ids to record/retake a subset, e.g. `ONLY=overview,staking,defi`. |
| `OUT` | `out` | Output directory. |

PowerShell example (watch it, no captions, a bigger whale as hero):

```powershell
$env:HEADED=1; $env:CAPTIONS=0; $env:HERO="0x08beed3ebf0b5620ab5ea33be9ccd87e7b1ef590834fe3b7ac71e40c3f679ed1"; npm run record
```

Scene ids (in order): `intro, paste, overview, staking, defi, history, analysis, why`.

## How it works (so you can tweak it)
- **Synthetic cursor.** Playwright's video doesn't capture the OS cursor, so an SVG pointer is injected
  and mirrors the real mouse (it also pulses on click). Pure overlay - the site isn't modified.
- **Zoom.** A CSS `transform: scale()` is animated on `#root` toward the focal element's centre; the
  sticky header is neutralised during the zoom and restored after.
- **Captions / title cards** are injected `position:fixed` overlays themed with the app's own brand
  variables (violet `#5546ff`, orange `#f7931a`, Space Grotesk / Space Mono).
- **Pacing.** Each scene declares `durationSec`; the engine pads it so the picture always lasts at least
  as long as the narration line. Edit timings/words in `scenario.mjs`.

## Troubleshooting
- **`Could not reach https://revalio.xyz`** - check your connection, or the site is down. Record a local
  build instead with `BASE_URL=http://localhost:5173` (run the app first).
- **A section looks empty** - that wallet doesn't have that data. The pre‑flight report says what the
  hero/staker hold; set `HERO`/`STAKER` to richer addresses (browse `https://revalio.xyz/whales`).
- **No MP4, only WebM** - `ffmpeg` isn't installed. Either upload the WebM, or `winget install Gyan.FFmpeg`
  and re‑run (or use the exact `ffmpeg` command printed at the end).
- **A scene logs "target not found"** - that card is absent for the wallet (e.g. no lending health).
  Pick a richer wallet, or accept the scene shows the fallback card.

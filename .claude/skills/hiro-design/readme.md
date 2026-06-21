# Hiro Design System

A design system reconstructed from Hiro's public brand — the marketing site at **https://www.hiro.so/** and the **Hiro Platform** at **https://platform.hiro.so/**.

> **Sources used:** the public marketing site `hiro.so` (homepage content + structure). Hiro is open-source on GitHub at **https://github.com/hirosystems** (clarinet, stacks.js, chainhook, stacks-blockchain-api, ordhook) — useful for product/copy reference. Docs live at **https://docs.hiro.so/**. The live site CSS, font binaries and logo SVGs were **not reachable** from this build environment, so fonts/colors/logo are close substitutes — see **CAVEATS** at the bottom.

---

## 1. Company & product context

**Hiro Systems PBC** builds developer tools for **Bitcoin layers** — independent layers (like **Stacks** for smart contracts and **Lightning** for payments) that extend Bitcoin's functionality without changing Bitcoin itself. Tagline: *"Building on Bitcoin is hard. Hiro's developer tools make it easier."* The audience is **web3 / blockchain developers**.

Products represented here:
- **Hiro Platform** — a browser-based web3 development environment for writing, testing and deploying Clarity smart contracts (beta).
- **Chainhook** — a re-org-aware indexing engine that fires webhook-like triggers on onchain events (Stacks + Bitcoin).
- **Ordhook** — a reliable client indexer for Ordinals.
- **Stacks Blockchain API** & **Token Metadata API** — REST APIs to query the chain and token/NFT metadata.
- **Hiro Docs** — guides and references.

Supporting tooling in the ecosystem: **Clarinet** (Clarity dev/test CLI), **stacks.js**.

---

## 2. Content fundamentals — how Hiro writes

- **Voice:** developer-to-developer, plain and confident. Speaks to "you" implicitly through imperatives ("Start coding", "Build on Bitcoin"). No hype, no exclamation marks.
- **Casing:** big headlines are **UPPERCASE** and end with a period for a flat, declarative beat — `BUILD WEB3 ON BITCOIN.` Labels, eyebrows and nav are **uppercase monospace**. Body is sentence case.
- **Terminal idioms everywhere.** Copy borrows from the shell: `$ tree path/hiro`, `├──` / `└──` connectors, `# inline comments` ("# we're hiring"), and counts like `1 directory, 2 apis, 2 tools`. Section markers use a leading slash (`/ Tools`, `/ APIs`) or a plus (`+ WHAT'S A BITCOIN LAYER?`).
- **Brackets as chrome.** Interactive bits are wrapped in literal brackets: `[ SUBSCRIBE ]`, `[ Start coding → ]`, `[ X ]` toggles.
- **Arrows.** CTAs trail a mono `→` ("Start coding →", "View the Blog →").
- **No emoji** in the brand voice. Iconography is geometric/mono, not emoji. (The Platform file-explorer demo uses 📁 purely as a placeholder — swap for real icons in production.)
- **Examples:** "Re-org aware indexing engine for Bitcoin layers." · "Write and deploy smart contracts from your browser." · "Stay up to date with product updates, learning resources, and more."

---

## 3. Visual foundations

- **Palette.** A clean canvas — **white** `#FFFFFF` and a **warm off-white paper** `#F6F5F1` — with **near-black ink** `#0C0C0D` for text and borders. Primary accent is **violet `#5546FF`** (the Stacks/Hiro ecosystem hue); secondary accent is **Bitcoin orange `#F7931A`**, used for the file-tree connectors and "Bitcoin" emphasis. Dark **terminal panels** `#0C0C0D / #161618` host code. Status: green `#1E9E5A` (all-systems-normal), yellow `#E2B007` (beta), red `#D8412F`.
- **Type.** Geometric grotesque for display/UI, monospace for everything labelled or technical. Big headlines are tightly tracked (`-0.03em`), 700 weight, uppercase. Mono eyebrows are uppercase with `+0.08em` tracking. (Substitutes: **Space Grotesk** + **Space Mono** — see CAVEATS.)
- **Backgrounds.** Mostly flat fills — white and warm paper sections alternate. **No gradients**, no photographic hero. The recurring "texture" is *typographic*: terminal blocks and ASCII file-trees stand in for imagery.
- **Corners & borders.** The brand is **boxy** — small radii (`0–6px`, occasionally `10px`), hairline `1px` borders on paper, `2px` bold borders for emphasis. Cards are flat with a hairline border, **not** heavy drop shadows.
- **Elevation.** Restrained. Soft shadows are reserved for hover (`shadow-md`) and overlays (`shadow-lg`). A signature **hard offset shadow** (`4px 4px 0` ink, no blur) is available for a deliberate "developer/retro" feel.
- **Motion.** Quick and mechanical — `120–340ms`, eased out, **no bounce**. Hover on cards = a 2px lift + border darkens to ink. Press on buttons = 1px nudge down. Tabs slide a violet underline.
- **Hover / press states.** Links: color shifts toward ink/violet. Buttons: subtle translate + fill deepen. Bracket buttons: outline → solid fill flip. Rows: background tints to paper.
- **Transparency / blur.** Sparingly — the sticky nav uses `rgba(255,255,255,.85)` + `backdrop-filter: blur(8px)`. Terminal panels are fully opaque.
- **Layout.** Centered `1200px` container, `24px` gutters. Grid-based bento sections. Generous vertical rhythm (`64–80px` section padding). Fixed/sticky nav.
- **Imagery vibe.** Cool, technical, monochrome-leaning; the hero "art" is literally a terminal. When real product imagery is used it's screenshots of the IDE/console, not lifestyle photography.

---

## 4. Iconography

- Hiro leans on **typographic & ASCII iconography** far more than an icon set: shell glyphs (`$`, `#`, `→`, `├──`, `└──`, `▾`), bracket frames (`[ ]`), and the **H monogram** mark. These are drawn with type, not SVG sprites.
- The live site ships a handful of small **SVG decorations** (e.g. the `[X] FEATURED` toggle marks, mailbox illustration) from its Webflow CDN. **These binaries were not reachable from this environment**, so they are not bundled; the equivalents here are recreated typographically (e.g. the `[ X ]` toggle in the *UI Chrome* brand card).
- **No emoji** in brand surfaces. **No external icon font** is required by the system. If a project needs lined UI icons (settings, copy, external-link), pair with a thin-stroke open set such as **Lucide** (`https://lucide.dev`, CDN-available) at ~1.5px stroke to match the boxy, low-ornament feel — **flagged as a substitution**, not an official Hiro choice.
- Logos: the H-mark and "Hiro" wordmark in this system are **typographic stand-ins** rendered in the display font. Replace with the official SVGs when available (see CAVEATS).

---

## 5. Index / manifest

**Root**
- `styles.css` — global entry point (import this); `@import`s the token files below.
- `tokens/fonts.css` · `colors.css` · `typography.css` · `spacing.css` — design tokens (base + semantic aliases).
- `readme.md` (this file) · `SKILL.md` (Agent-Skills wrapper).

**Foundations** (`guidelines/*.card.html`) — Design System tab specimen cards
- Colors: Brand · Ink & Neutrals · Surfaces · Semantic Status
- Type: Display · Heading Scale · Body & Lead · Mono & Labels
- Spacing: Spacing Scale · Radius & Borders · Elevation
- Brand: Logo · UI Chrome · Terminal & Tree

**Components** (`components/<group>/`) — React primitives (`window.HiroDesignSystem_318aec.*`)
- `actions/` — **Button**, **BracketButton**
- `forms/` — **Input**, **Checkbox**, **Toggle**
- `display/` — **Badge**, **Tag**, **Card**, **Avatar**
- `navigation/` — **Tabs**
- `brand/` — **Terminal**, **TreeView** (the signature CLI/file-tree motifs)

**UI kits** (`ui_kits/<product>/index.html`)
- `website/` — the hiro.so marketing homepage (nav, hero, bento/tree/featured explorer, updates, footer).
- `platform/` — the Hiro Platform browser IDE (projects → Clarity editor + devnet console).

---

## CAVEATS — please help me make this perfect

1. **Fonts are substitutes.** Hiro's site uses licensed proprietary typefaces; I couldn't access the binaries. I'm shipping **Space Grotesk** (display/UI) + **Space Mono** (labels/code) from Google Fonts as the closest open match. **Please share the real font files / names** and I'll swap them in.
2. **Colors are inferred.** The violet `#5546FF` + Bitcoin orange `#F7931A` + warm paper palette is reconstructed from the brand context, not sampled from the live CSS. **Please confirm or send exact hex values.**
3. **Logo is a typographic stand-in.** I couldn't download the H-mark / wordmark SVGs from Hiro's CDN. **Please attach the official logo assets.**
4. **No real product icons/illustrations** were imported (CDN unreachable). I used typographic/ASCII equivalents.
5. **The Platform kit is an interpretation** (it's behind a login). Confirm against the real app or share screenshots/figma to tighten it.

**Biggest ask:** send the **brand kit (fonts + exact colors + logo SVGs)** — that alone takes this from "convincing recreation" to "pixel-accurate."

// ─────────────────────────────────────────────────────────────────────────────
// Revalio - DeepSurge grant demo · RECORDER
//
// Drives a Chromium browser through the scenario in scenario.mjs and records a
// 1080p video with: a synthetic cursor (Playwright's own video doesn't capture the
// OS cursor), cinematic zoom-to-element, smooth scrolling, lower-third captions and
// branded title cards. Exports .webm and (if ffmpeg is present) a judge-friendly .mp4.
//
//   node record.mjs            # record
//   node record.mjs --plan     # print the shot list + timing sheet and exit (no browser)
//
// Env:  BASE_URL (default http://localhost:5173)   HERO (wallet address)
//       HEADED=1 (watch it run)   SCALE=2 (sharper, bigger files)   CAPTIONS=0 (no captions)
//       ONLY=overview,defi (record a subset of scene ids)   OUT=out
// ─────────────────────────────────────────────────────────────────────────────

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SCENES, CONFIG } from "./scenario.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = (process.env.BASE_URL || "https://revalio.xyz").replace(/\/$/, "");
const HERO = CONFIG.HERO;
const STAKER = CONFIG.STAKER;
const OUT = path.resolve(__dirname, process.env.OUT || "out");
const HEADED = !!process.env.HEADED;
const SCALE = Number(process.env.SCALE || 1);
const CAPTIONS = process.env.CAPTIONS !== "0";
const ONLY = (process.env.ONLY || "").split(",").map((s) => s.trim()).filter(Boolean);
const VIEW = { width: 1920, height: 1080 };

const BRAND = {
  paper: "#f6f5f1",
  ink: "#0c0c0d",
  violet: "#5546ff",
  orange: "#f7931a",
  green: "#1e9e5a",
  line: "#e3e1d8",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const log = (...a) => console.log("·", ...a);
const warn = (...a) => console.warn("⚠ ", ...a);

const scenesToRun = ONLY.length ? SCENES.filter((s) => ONLY.includes(s.id)) : SCENES;

// ── Plan / timing sheet ──────────────────────────────────────────────────────
function printPlan() {
  const words = (s) => (s ? s.trim().split(/\s+/).length : 0);
  let t = 0;
  let totalWords = 0;
  console.log(`\n  Revalio grant video - shot list  (base ${BASE_URL}, hero …${HERO.slice(-6)})\n`);
  console.log("  #  start   secs  scene        narration / caption");
  console.log("  ─────────────────────────────────────────────────────────────────────────");
  scenesToRun.forEach((s, i) => {
    const mm = String(Math.floor(t / 60)).padStart(2, "0");
    const ss = String(t % 60).padStart(2, "0");
    console.log(
      `  ${String(i).padStart(2)} ${mm}:${ss}  ${String(s.durationSec).padStart(4)}  ${(s.id + "            ").slice(0, 11)}  ${s.narration ? s.narration.slice(0, 64) : "(title card)"}`,
    );
    t += s.durationSec;
    totalWords += words(s.narration);
  });
  const mm = String(Math.floor(t / 60)).padStart(2, "0");
  const ss = String(t % 60).padStart(2, "0");
  console.log("  ─────────────────────────────────────────────────────────────────────────");
  console.log(`  Total ≈ ${mm}:${ss}   ·   ${totalWords} narration words (~${Math.round((totalWords / 150) * 60)}s of speech at 150 wpm)\n`);
  return { totalSec: t, totalWords };
}

function writeTimingSheet(sceneTimes) {
  const lines = [
    "Revalio - DeepSurge grant video · timing sheet (measured from the actual recording)",
    `base=${BASE_URL}  hero=${HERO}  staker=${STAKER}`,
    "",
  ];
  for (const st of sceneTimes) {
    const s = scenesToRun.find((x) => x.id === st.id) || {};
    const mm = String(Math.floor(st.start / 60)).padStart(2, "0");
    const ss = String(Math.round(st.start) % 60).padStart(2, "0");
    lines.push(`[${mm}:${ss}]  ${st.id}`);
    if (s.caption) lines.push(`   on-screen: ${s.caption}`);
    if (s.narration) lines.push(`   say:       ${s.narration}`);
    lines.push("");
  }
  writeFileSync(path.join(OUT, "timing.txt"), lines.join("\n"), "utf8");
}

// ── Injected overlay (runs inside the page; self-contained) ───────────────────
function installOverlay(cfg) {
  if (window.__rvInstalled) return;
  window.__rvInstalled = true;
  const B = cfg.brand;
  const CAP = cfg.captions;

  function boot() {
    if (document.getElementById("__rv_layer")) return;

    const style = document.createElement("style");
    style.id = "__rv_style";
    style.textContent = `
      #__rv_layer{position:fixed;inset:0;pointer-events:none;z-index:2147483600;font-family:var(--font-sans,"Space Grotesk",system-ui,sans-serif)}
      #__rv_cursor{position:fixed;left:0;top:0;width:26px;height:26px;transform:translate(-100px,-100px);transition:opacity .25s ease;will-change:transform;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))}
      #__rv_pulse{position:fixed;left:0;top:0;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;background:${B.orange};opacity:0;pointer-events:none}
      #__rv_pulse.go{animation:__rv_pulse .55s ease-out}
      @keyframes __rv_pulse{0%{opacity:.55;transform:scale(.4)}100%{opacity:0;transform:scale(3.4)}}
      #__rv_caption{position:fixed;left:50%;bottom:54px;transform:translateX(-50%) translateY(14px);max-width:74%;
        background:${B.ink};color:${B.paper};font-family:var(--font-mono,"Space Mono",monospace);font-size:21px;line-height:1.35;
        letter-spacing:.01em;padding:14px 22px 14px 20px;border-radius:12px;border-left:4px solid ${B.orange};
        box-shadow:0 12px 40px rgba(0,0,0,.28);opacity:0;transition:opacity .4s ease,transform .4s ease;white-space:nowrap}
      #__rv_caption.show{opacity:1;transform:translateX(-50%) translateY(0)}
      #__rv_card{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;
        background:radial-gradient(120% 120% at 50% 0%, #14141a 0%, ${B.ink} 60%);color:${B.paper};opacity:0;
        transition:opacity .6s ease;text-align:center}
      #__rv_card .eb{font-family:var(--font-mono,"Space Mono",monospace);font-size:18px;letter-spacing:.18em;text-transform:uppercase;color:${B.orange}}
      #__rv_card .ti{font-family:var(--font-sans,"Space Grotesk",sans-serif);font-weight:700;font-size:96px;letter-spacing:-.02em;line-height:1;margin:6px 0 2px}
      #__rv_card .ti b{color:${B.violet}}
      #__rv_card .su{font-family:var(--font-sans,"Space Grotesk",sans-serif);font-size:30px;color:#cfceca;max-width:60%}
      #__rv_card .rule{width:64px;height:4px;border-radius:2px;background:${B.violet};margin-top:18px}
      #__rv_card.show{opacity:1}
      /* Keep the sticky header from fighting the zoom transform. */
      body.__rv_zooming .site-header{position:static !important}
    `;
    document.head.appendChild(style);

    const layer = document.createElement("div");
    layer.id = "__rv_layer";
    layer.innerHTML = `
      <div id="__rv_pulse"></div>
      <svg id="__rv_cursor" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 3 L5 19 L9.2 15.1 L11.7 21 L14.4 19.8 L11.9 14 L17.5 14 Z"
          fill="${B.ink}" stroke="#ffffff" stroke-width="1.3" stroke-linejoin="round"/>
      </svg>
      ${CAP ? '<div id="__rv_caption"></div>' : ""}
      <div id="__rv_card"><div class="eb"></div><div class="ti"></div><div class="su"></div><div class="rule"></div></div>
    `;
    document.body.appendChild(layer);

    const cursor = layer.querySelector("#__rv_cursor");
    const pulse = layer.querySelector("#__rv_pulse");
    const caption = layer.querySelector("#__rv_caption");
    const card = layer.querySelector("#__rv_card");

    window.__rvCursorPos = { x: -100, y: -100 };
    window.addEventListener(
      "mousemove",
      (e) => {
        window.__rvCursorPos = { x: e.clientX, y: e.clientY };
        cursor.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 2}px)`;
      },
      true,
    );
    window.addEventListener(
      "mousedown",
      (e) => {
        pulse.style.left = e.clientX + "px";
        pulse.style.top = e.clientY + "px";
        pulse.classList.remove("go");
        void pulse.offsetWidth;
        pulse.classList.add("go");
      },
      true,
    );

    function findEl(spec) {
      if (!spec) return null;
      if (spec.headerText) {
        const heads = Array.from(document.querySelectorAll(".card-header"));
        const h = heads.find(
          (e) => e.textContent && e.textContent.toLowerCase().includes(spec.headerText.toLowerCase()),
        );
        return h ? h.closest(".card") || h.parentElement : null;
      }
      if (spec.groupText || spec.groupNot) {
        const groups = Array.from(document.querySelectorAll(".protocol-group"));
        const match = groups.find((g) => {
          const name = (g.querySelector(".protocol-name")?.textContent || "").toLowerCase();
          if (spec.groupText) return name.includes(spec.groupText.toLowerCase());
          return name && !name.includes(spec.groupNot.toLowerCase());
        });
        return match || null;
      }
      if (spec.selector) {
        const els = document.querySelectorAll(spec.selector);
        return els[spec.nth || 0] || null;
      }
      return null;
    }
    window.__rvFind = (spec) => !!findEl(spec);

    function animateScroll(to, dur) {
      return new Promise((res) => {
        const from = window.scrollY;
        const d = to - from;
        if (Math.abs(d) < 2) {
          window.scrollTo(0, to);
          return res();
        }
        const t0 = performance.now();
        function step(now) {
          const p = Math.min(1, (now - t0) / dur);
          const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          window.scrollTo(0, from + d * e);
          if (p < 1) requestAnimationFrame(step);
          else res();
        }
        requestAnimationFrame(step);
      });
    }

    window.__rv = {
      ready: true,
      caption(text) {
        if (!caption) return;
        if (!text) {
          caption.classList.remove("show");
          return;
        }
        caption.textContent = text;
        caption.classList.add("show");
      },
      hideCaption() {
        if (caption) caption.classList.remove("show");
      },
      card(o) {
        card.querySelector(".eb").textContent = o.eyebrow || "";
        card.querySelector(".ti").innerHTML = o.title || "";
        card.querySelector(".su").textContent = o.subtitle || "";
        cursor.style.opacity = "0";
        if (caption) caption.classList.remove("show");
        card.classList.add("show");
      },
      hideCard() {
        card.classList.remove("show");
        cursor.style.opacity = "1";
      },
      zoom(spec) {
        const el = findEl(spec) || (spec.selector === "html" ? document.documentElement : null);
        if (!el) {
          console.warn("[rv] zoom target not found", JSON.stringify(spec));
          return false;
        }
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2 + window.scrollX;
        const cy =
          spec.origin === "top"
            ? r.top + Math.min(r.height / 2, window.innerHeight * 0.3) + window.scrollY
            : r.top + r.height / 2 + window.scrollY;
        const root = document.getElementById("root") || document.body;
        document.body.classList.add("__rv_zooming");
        root.style.willChange = "transform";
        root.style.transition = "transform 1.05s cubic-bezier(.22,.61,.36,1)";
        root.style.transformOrigin = cx + "px " + cy + "px";
        root.style.transform = "scale(" + (spec.scale || 1.3) + ")";
        return true;
      },
      zoomReset() {
        const root = document.getElementById("root") || document.body;
        root.style.transform = "scale(1)";
        return new Promise((res) =>
          setTimeout(() => {
            document.body.classList.remove("__rv_zooming");
            root.style.transformOrigin = "";
            root.style.willChange = "";
            res(true);
          }, 1080),
        );
      },
      scrollTo(spec) {
        const el = findEl(spec);
        if (!el) return Promise.resolve(false);
        const r = el.getBoundingClientRect();
        const margin =
          spec.block === "top" ? 96 : Math.max(96, (window.innerHeight - r.height) / 2);
        const to = Math.max(0, window.scrollY + r.top - margin);
        return animateScroll(to, spec.duration || 720).then(() => true);
      },
      scrollBy(dy, dur) {
        return animateScroll(Math.max(0, window.scrollY + dy), dur || 600).then(() => true);
      },
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
}

// ── Toolkit handed to each scene's run(ctx) ──────────────────────────────────
class Ctx {
  constructor(page) {
    this.page = page;
    this.HERO = HERO;
    this.STAKER = STAKER;
    this.cursor = { x: VIEW.width / 2, y: VIEW.height / 2 };
    this._sceneStart = Date.now();
    this._sceneTarget = 0;
  }

  async _rv() {
    try {
      await this.page.waitForFunction(() => window.__rv && window.__rv.ready, { timeout: 6000 });
    } catch {
      /* overlay not ready (e.g. raw JSON page that failed to boot) - degrade quietly */
    }
  }

  sleep(ms) {
    return sleep(ms);
  }

  async hold() {
    const rem = this._sceneTarget - (Date.now() - this._sceneStart);
    if (rem > 0) await sleep(rem);
  }

  locatorFor(spec) {
    if (typeof spec === "string") return this.page.locator(spec).first();
    if (spec && spec.selector) return this.page.locator(spec.selector).nth(spec.nth || 0);
    throw new Error("locator needs a selector");
  }

  async box(spec) {
    const loc = this.locatorFor(spec);
    try {
      await loc.scrollIntoViewIfNeeded({ timeout: 3500 });
    } catch {
      /* ignore */
    }
    try {
      return await loc.boundingBox();
    } catch {
      return null;
    }
  }

  async moveCursor(x, y, dur = 620) {
    const steps = Math.max(10, Math.round(dur / 16));
    const sx = this.cursor.x;
    const sy = this.cursor.y;
    for (let i = 1; i <= steps; i++) {
      const e = easeInOut(i / steps);
      await this.page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
      await sleep(dur / steps);
    }
    this.cursor = { x, y };
  }

  async cursorTo(spec, dur) {
    const b = await this.box(spec);
    if (!b) {
      warn("cursorTo: target not found", JSON.stringify(spec));
      return false;
    }
    await this.moveCursor(b.x + b.width / 2, b.y + b.height / 2, dur);
    return true;
  }

  async clickAt(x, y) {
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await sleep(70);
    await this.page.mouse.up();
  }

  async click(spec) {
    const b = await this.box(spec);
    if (!b) {
      warn("click: target not found", JSON.stringify(spec));
      return false;
    }
    const x = b.x + b.width / 2;
    const y = b.y + b.height / 2;
    await this.moveCursor(x, y);
    await sleep(120);
    await this.clickAt(x, y);
    return true;
  }

  async clickButton(name) {
    const loc = this.page.getByRole("button", { name, exact: true }).first();
    try {
      await loc.scrollIntoViewIfNeeded({ timeout: 3000 });
    } catch {
      /* ignore */
    }
    const b = await loc.boundingBox();
    if (!b) {
      warn("clickButton: not found", name);
      return false;
    }
    const x = b.x + b.width / 2;
    const y = b.y + b.height / 2;
    await this.moveCursor(x, y);
    await sleep(120);
    await this.clickAt(x, y);
    return true;
  }

  async tab(name) {
    // Profile tabs sit above the content; scroll to the top so they're in view and clickable
    // even when a prior scene left the page scrolled down.
    await this.page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    await sleep(280);
    const loc = this.page.getByRole("link", { name, exact: true }).first();
    try {
      await loc.scrollIntoViewIfNeeded({ timeout: 2500 });
    } catch {
      /* ignore */
    }
    const b = await loc.boundingBox();
    if (b) {
      const x = b.x + b.width / 2;
      const y = b.y + b.height / 2;
      await this.moveCursor(x, y);
      await sleep(120);
      await this.clickAt(x, y);
    } else {
      try {
        await loc.click();
      } catch {
        warn("tab: not found", name);
      }
    }
    // Wait for the tab to become active, then for data.
    try {
      await this.page
        .locator(".profile-tab.active", { hasText: name })
        .first()
        .waitFor({ state: "visible", timeout: 5000 });
    } catch {
      /* ignore */
    }
    await sleep(500);
  }

  async type(spec, text) {
    await this.page.keyboard.type(text, { delay: 30 });
  }

  async caption(text) {
    await this._rv();
    await this.page.evaluate((t) => window.__rv && window.__rv.caption(t), text).catch(() => {});
  }
  async captionHide() {
    await this.page.evaluate(() => window.__rv && window.__rv.hideCaption()).catch(() => {});
  }
  async card(o) {
    await this._rv();
    await this.page.evaluate((x) => window.__rv && window.__rv.card(x), o).catch(() => {});
    await sleep(650);
  }
  async cardHide() {
    await this.page.evaluate(() => window.__rv && window.__rv.hideCard()).catch(() => {});
    await sleep(550);
  }

  async zoom(spec) {
    await this._rv();
    const ok = await this.page.evaluate((s) => window.__rv && window.__rv.zoom(s), spec).catch(() => false);
    if (ok) await sleep(1100); // let the transition settle
    return ok;
  }
  async zoomReset() {
    await this.page.evaluate(() => window.__rv && window.__rv.zoomReset()).catch(() => {});
  }

  async scrollTo(spec) {
    await this._rv();
    const found = await this.page.evaluate((s) => window.__rv && window.__rv.scrollTo(s), spec).catch(() => false);
    if (!found && !(spec && spec.optional)) warn("scrollTo: target not found", JSON.stringify(spec));
    await sleep(150);
    return found;
  }
  async scrollBy(dy, dur) {
    await this.page.evaluate(([d, u]) => window.__rv && window.__rv.scrollBy(d, u), [dy, dur]).catch(() => {});
    await sleep(120);
  }

  async waitFor(spec, timeout = 12000) {
    try {
      if (typeof spec === "string" || (spec && spec.selector)) {
        await this.locatorFor(spec).waitFor({ state: "visible", timeout });
      } else if (spec && spec.headerText) {
        await this.page.waitForFunction((s) => window.__rvFind && window.__rvFind(s), spec, { timeout });
      }
    } catch {
      warn("waitFor: timed out", JSON.stringify(spec));
    }
  }

  async waitFonts() {
    await this.page.evaluate(() => (document.fonts ? document.fonts.ready.then(() => true) : true)).catch(() => {});
  }

  async waitData() {
    try {
      await this.page.locator(".dashboard").first().waitFor({ state: "visible", timeout: 12000 });
    } catch {
      /* keep going - empty/error states are still styled and recordable */
    }
    // Best-effort: wait until something with real data shows up.
    try {
      await this.page.waitForFunction(
        () => {
          const v = document.querySelector(".chart-value");
          const priced = v && v.textContent && v.textContent.trim() !== "-";
          return priced || document.querySelector(".token-row") || document.querySelector(".positions-card");
        },
        { timeout: 14000 },
      );
    } catch {
      warn("waitData: no populated data detected (is the API running with mainnet data?)");
    }
    await sleep(700);
  }

  async goto(p, opts = {}) {
    const url = p.startsWith("http") ? p : BASE_URL + (p.startsWith("/") ? p : "/" + p);
    // Retry transient navigation failures (ERR_CONNECTION_CLOSED, timeouts) - the live site
    // occasionally drops a connection, and a dropped goto would otherwise break a whole scene.
    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < 3) await sleep(900);
      }
    }
    if (lastErr) warn("goto", url, lastErr.message);
    if (!opts.raw) {
      await this.waitFonts();
      await this.page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    }
    // Re-center the synthetic cursor after a full navigation.
    this.cursor = { x: VIEW.width / 2, y: VIEW.height / 2 };
    await this.page.mouse.move(this.cursor.x, this.cursor.y);
  }

  async apiAvailable() {
    try {
      const res = await this.page.request.get(`${BASE_URL}/api/v1/wallets/${HERO}/overview`, { timeout: 8000 });
      const ct = res.headers()["content-type"] || "";
      return res.ok() && ct.includes("json");
    } catch {
      return false;
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (process.argv.includes("--plan") || process.env.DRYRUN) {
    printPlan();
    return;
  }

  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  printPlan();

  const { chromium, request: pwRequest } = await import("playwright");
  log(`launching Chromium (${HEADED ? "headed" : "headless"}, ${VIEW.width}×${VIEW.height}, scale ${SCALE})`);

  const browser = await chromium.launch({
    headless: !HEADED,
    args: ["--force-color-profile=srgb", "--hide-scrollbars", "--disable-features=Translate"],
  });

  // Pre-flight on a standalone request context (NOT recorded) so the video has no dead
  // landing-page lead-in before the title card.
  const apiReq = await pwRequest.newContext();
  const reachable = await preflight(apiReq);
  await apiReq.dispose();
  if (!reachable) {
    warn(`Aborting - could not reach ${BASE_URL}. Check your connection, or set BASE_URL to a running app.`);
    await browser.close();
    process.exitCode = 1;
    return;
  }

  const context = await browser.newContext({
    viewport: VIEW,
    deviceScaleFactor: SCALE,
    reducedMotion: "no-preference",
    colorScheme: "light",
    recordVideo: { dir: OUT, size: VIEW },
  });
  await context.addInitScript(installOverlay, { brand: BRAND, captions: CAPTIONS });

  const page = await context.newPage();
  const ctx = new Ctx(page);
  const recordStart = Date.now(); // ≈ video t=0
  await page.mouse.move(VIEW.width / 2, VIEW.height / 2);

  const sceneTimes = [];
  for (const scene of scenesToRun) {
    sceneTimes.push({ id: scene.id, start: (Date.now() - recordStart) / 1000 });
    ctx._sceneStart = Date.now();
    ctx._sceneTarget = scene.durationSec * 1000;
    log(`scene "${scene.id}" (target ${scene.durationSec}s)`);
    try {
      await scene.run(ctx);
    } catch (e) {
      warn(`scene "${scene.id}" threw:`, e.message);
    }
    const elapsed = Date.now() - ctx._sceneStart;
    if (elapsed < ctx._sceneTarget) await sleep(ctx._sceneTarget - elapsed);
  }

  await sleep(500);
  const video = page.video();
  await context.close();

  const webm = path.join(OUT, "revalio-demo.webm");
  if (video) {
    await video.saveAs(webm).catch((e) => warn("saveAs", e.message));
    await video.delete().catch(() => {});
    log(`saved ${webm}`);
  }
  await browser.close();

  writeTimingSheet(sceneTimes);
  toMp4(webm, path.join(OUT, "revalio-demo.mp4"));

  console.log("\n✔ Done. Files in:", OUT);
  console.log("  • revalio-demo.webm  (raw recording)");
  if (existsSync(path.join(OUT, "revalio-demo.mp4"))) console.log("  • revalio-demo.mp4   (H.264 - upload this)");
  console.log("  • timing.txt         (when to speak each line for your voice-over)\n");
}

// Report what the wallets hold before recording; returns false if the site is unreachable.
async function preflight(apiReq) {
  async function get(path) {
    try {
      const r = await apiReq.get(`${BASE_URL}${path}`, { timeout: 14000 });
      return r.ok() ? await r.json() : { __status: r.status() };
    } catch (e) {
      return { __err: e.message };
    }
  }
  // Hero drives Overview / DeFi / History / Analysis.
  const pos = await get(`/api/v1/wallets/${HERO}/positions`);
  if (pos.__err) {
    warn(`pre-flight: cannot reach ${BASE_URL} (${pos.__err}).`);
    return false;
  }
  if (pos.__status) {
    warn(`pre-flight: positions API returned ${pos.__status} - DeFi/Analysis scenes may be empty.`);
  } else {
    const defi = (pos.protocols || []).map((x) => x.protocol).filter((p) => !/sui-system/i.test(p));
    log(`pre-flight  hero …${HERO.slice(-6)}  ·  $${Math.round(pos.totalUsd || 0).toLocaleString()} across ${(pos.positions || []).length} positions`);
    log(`  DeFi protocols : ${defi.length ? defi.join(", ") : "NONE - the 1:10 DeFi scene will be empty (pick another HERO)"}`);
  }
  // Staker drives only the 0:50 scene.
  const stk = await get(`/api/v1/wallets/${STAKER}/staking`);
  if (!stk.__status && !stk.__err) {
    const n = (stk.validators || []).length;
    log(`  staker …${STAKER.slice(-6)} : ${n ? `${Math.round(stk.totalPrincipalSui)} SUI across ${n} validator(s) ($${Math.round(stk.totalValueUsd || 0)})` : "NONE - the 0:50 Native Staking scene will be empty (pick another STAKER)"}`);
  }
  return true;
}

function toMp4(webm, mp4) {
  if (!existsSync(webm)) return;
  const probe = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (probe.status !== 0) {
    warn("ffmpeg not found - skipping MP4. Upload the .webm, or install ffmpeg and run:");
    warn(`   ffmpeg -y -i "${webm}" -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow -movflags +faststart "${mp4}"`);
    return;
  }
  log("transcoding to MP4 (H.264)…");
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-i", webm, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow", "-movflags", "+faststart", mp4],
    { stdio: "ignore" },
  );
  if (r.status === 0) log(`wrote ${mp4}`);
  else warn("ffmpeg transcode failed - use the .webm.");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

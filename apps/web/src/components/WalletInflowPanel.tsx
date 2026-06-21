import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { isValidSuiAddress, normalizeSuiAddress } from "../lib/sui.js";

/**
 * "Inflow Constellation" (light) — a right-column block holding a fire-palette graph
 * of nodes whose luminous packets stream INTO a central wallet node where the address
 * input sits, which glows as the destination (data flowing into your wallet). Focus
 * and submit surge the inflow. Rendered on a TRANSPARENT canvas directly on the light
 * --paper page (normal source-over compositing + subdued alpha) — no dark panel.
 *
 * Performance: pre-baked glow sprite (no shadowBlur / per-frame gradients), a fixed
 * object pool (zero GC in the loop), DPR capped at 2, the rAF loop gated by an
 * IntersectionObserver + tab visibility, prefers-reduced-motion static frame, full
 * cleanup on unmount.
 */

const ORANGE = "247, 147, 26"; // --orange #f7931a — nodes, packets, focal glow
const EMBER = "214, 118, 12"; // deeper — edges read better on the light page

type NodeKind = "center" | "sat" | "leaf";
interface GraphNode {
  x: number; // normalized 0..1
  y: number;
  kind: NodeKind;
  phase: number;
}
interface Edge {
  a: GraphNode;
  b: GraphNode; // traversal a -> b moves inward (toward centre)
  qx: number;
  qy: number;
  decorative: boolean;
  litAt: number;
}
interface Particle {
  alive: boolean;
  path: Edge[];
  seg: number;
  t: number;
  speed: number;
  trail: number[];
}

const CENTER = { x: 0.5, y: 0.46 };
const SAT_POS: Array<[number, number]> = [
  [0.24, 0.24],
  [0.5, 0.15],
  [0.76, 0.23],
  [0.15, 0.46],
  [0.85, 0.45],
  [0.32, 0.72],
  [0.7, 0.71],
];
const LEAF_POS: Array<[number, number, number]> = [
  [0.5, 0.04, 1],
  [0.06, 0.28, 3],
  [0.94, 0.3, 2],
  [0.93, 0.64, 4],
];

function buildGraph(mobile: boolean): { nodes: GraphNode[]; edges: Edge[]; paths: Edge[][] } {
  const center: GraphNode = { x: CENTER.x, y: CENTER.y, kind: "center", phase: 0 };
  const sats: GraphNode[] = SAT_POS.map(([x, y], i) => ({ x, y, kind: "sat", phase: i * 1.7 }));
  const leaves: GraphNode[] = mobile
    ? []
    : LEAF_POS.map(([x, y], i) => ({ x, y, kind: "leaf", phase: i * 2.3 }));
  const nodes = [center, ...sats, ...leaves];
  const edges: Edge[] = [];

  const mkEdge = (a: GraphNode, b: GraphNode, decorative: boolean): Edge => {
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return { a, b, qx: mx - dy * 0.12, qy: my + dx * 0.12, decorative, litAt: -1e9 };
  };

  const satEdges = sats.map((s) => {
    const e = mkEdge(s, center, false);
    edges.push(e);
    return e;
  });
  const leafEdges = new Map<number, Edge>();
  if (!mobile) {
    LEAF_POS.forEach(([, , parent], i) => {
      const e = mkEdge(leaves[i]!, sats[parent]!, false);
      edges.push(e);
      leafEdges.set(i, e);
    });
  }
  for (const [i, j] of [[0, 1], [1, 2], [3, 5], [4, 6]] as const) {
    edges.push(mkEdge(sats[i]!, sats[j]!, true));
  }

  const paths: Edge[][] = satEdges.map((e) => [e]);
  if (!mobile) {
    LEAF_POS.forEach(([, , parent], i) => {
      paths.push([leafEdges.get(i)!, satEdges[parent]!]);
    });
  }
  return { nodes, edges, paths };
}

function makeGlow(rgb: string): HTMLCanvasElement {
  const s = 48;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, `rgba(${rgb}, 0.9)`);
  grad.addColorStop(0.4, `rgba(${rgb}, 0.3)`);
  grad.addColorStop(1, `rgba(${rgb}, 0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  return c;
}

const bez = (a: number, q: number, b: number, e: number): number => {
  const m = 1 - e;
  return m * m * a + 2 * m * e * q + e * e * b;
};

export function WalletInflowPanel() {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const boostRef = useRef(0);
  const arrivalRef = useRef(0);
  const focusedRef = useRef(false);
  const surgeRef = useRef<(() => void) | null>(null);

  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const canvas = canvasRef.current;
    if (!panel || !canvas) return;
    const ctx = canvas.getContext("2d"); // transparent
    if (!ctx) return;

    const reduceMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const { nodes, edges, paths } = buildGraph(mobile);
    const MAX = mobile ? 70 : 140;
    const pool: Particle[] = Array.from({ length: MAX }, () => ({
      alive: false,
      path: [],
      seg: 0,
      t: 0,
      speed: 0,
      trail: [],
    }));
    const glow = makeGlow(ORANGE);

    let W = 0;
    let H = 0;
    let lastDpr = 0;
    let scale = 1;
    let emitAcc = 0;
    let last = 0;
    let raf = 0;
    let running = false;
    let visible = false;

    const spawn = (path: Edge[]) => {
      const p = pool.find((q) => !q.alive);
      if (!p) return;
      p.alive = true;
      p.path = path;
      p.seg = 0;
      p.t = 0;
      p.speed = 0.45 + Math.random() * 0.3;
      p.trail.length = 0;
    };
    const randomPath = () => paths[(Math.random() * paths.length) | 0]!;
    surgeRef.current = () => {
      for (let i = 0; i < 30; i++) spawn(randomPath());
      arrivalRef.current += 8;
      boostRef.current = 1;
    };

    const blob = (x: number, y: number, size: number, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.drawImage(glow, x - size / 2, y - size / 2, size, size);
      ctx.globalAlpha = 1;
    };
    const diamond = (x: number, y: number, rr: number, rgb: string, a: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = `rgba(${rgb}, ${a})`;
      ctx.fillRect(-rr, -rr, rr * 2, rr * 2);
      ctx.restore();
    };

    const advance = (dt: number, now: number, t: number) => {
      boostRef.current *= 0.96;
      arrivalRef.current *= 0.92;
      const rate = 26 * (0.6 + 0.4 * Math.sin(t * 0.5)) * (1 + 2.2 * boostRef.current);
      emitAcc += rate * dt;
      while (emitAcc >= 1) {
        emitAcc -= 1;
        spawn(randomPath());
      }
      for (const p of pool) {
        if (!p.alive) continue;
        p.t += p.speed * dt;
        if (p.t >= 1) {
          p.path[p.seg]!.litAt = now;
          if (p.seg < p.path.length - 1) {
            p.seg += 1;
            p.t = 0;
            p.trail.length = 0;
          } else {
            arrivalRef.current += 1;
            p.alive = false;
          }
        }
      }
    };

    const drawScene = (now: number, t: number) => {
      ctx.clearRect(0, 0, W, H);
      const ox = Math.sin(t * 0.13) * 3 * scale;
      const oy = Math.sin(t * 0.17) * 2 * scale;
      ctx.save();
      ctx.translate(ox, oy);

      // Edges — dashed, crawling inward; brighten on delivery.
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 7]);
      ctx.lineDashOffset = -(t * 14) % 11;
      for (const e of edges) {
        const lit = now - e.litAt < 700;
        ctx.strokeStyle = e.decorative
          ? `rgba(${EMBER}, ${lit ? 0.26 : 0.1})`
          : `rgba(${EMBER}, ${lit ? 0.36 : 0.18})`;
        ctx.beginPath();
        ctx.moveTo(e.a.x * W, e.a.y * H);
        ctx.quadraticCurveTo(e.qx * W, e.qy * H, e.b.x * W, e.b.y * H);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Focal halo behind the input — warm glow, brightens with arrivals/focus.
      const E = Math.tanh(arrivalRef.current * 0.15) + (focusedRef.current ? 0.3 : 0);
      const cx = CENTER.x * W;
      const cy = CENTER.y * H;
      const R = (48 + 46 * E) * scale;
      blob(cx, cy, R * 2, 0.14 + 0.22 * Math.min(1.2, E));
      blob(cx, cy, R * 0.9, 0.4);

      // Packets — flowing dots with a short trail.
      for (const p of pool) {
        if (!p.alive) continue;
        const e = p.path[p.seg]!;
        const ease = p.t * p.t * (3 - 2 * p.t);
        const x = bez(e.a.x, e.qx, e.b.x, ease) * W;
        const y = bez(e.a.y, e.qy, e.b.y, ease) * H;
        p.trail.push(x, y);
        if (p.trail.length > 10) {
          p.trail.copyWithin(0, 2);
          p.trail.length = 10;
        }
        for (let i = 0; i < p.trail.length; i += 2) {
          blob(p.trail[i]!, p.trail[i + 1]!, 6 * scale, (i / p.trail.length) * 0.32);
        }
        ctx.fillStyle = `rgba(${ORANGE}, 0.9)`;
        const s = 3.2 * scale;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }

      // Nodes — soft halo + crisp diamond.
      for (const n of nodes) {
        if (n.kind === "center") continue;
        const px = n.x * W;
        const py = n.y * H;
        const breathe = 0.6 + 0.4 * Math.sin(t * 0.8 + n.phase);
        const r = (n.kind === "leaf" ? 2 : 3) * scale;
        blob(px, py, r * 6, 0.12 * breathe);
        diamond(px, py, r, EMBER, n.kind === "leaf" ? 0.6 : 0.85);
      }
      // Centre core (mostly behind the input).
      diamond(cx, cy, 8 * scale, ORANGE, 0.9);

      ctx.restore();
    };

    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const t = now / 1000;
      advance(dt, now, t);
      drawScene(now, t);
      raf = requestAnimationFrame(frame);
    };

    const renderStatic = () => {
      for (const p of pool) p.alive = false;
      for (let i = 0; i < Math.min(50, MAX); i++) {
        const p = pool[i]!;
        const path = randomPath();
        p.alive = true;
        p.path = path;
        p.seg = path.length > 1 && Math.random() < 0.5 ? 1 : 0;
        p.t = 0.15 + Math.random() * 0.7;
        p.trail.length = 0;
      }
      arrivalRef.current = 3;
      drawScene(performance.now(), performance.now() / 1000);
    };

    const start = () => {
      if (running || reduceMql.matches || W * H === 0) return;
      for (const p of pool) p.alive = false;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const resize = () => {
      const rect = panel.getBoundingClientRect();
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (w === W && h === H && dpr === lastDpr) return;
      W = w;
      H = h;
      lastDpr = dpr;
      if (W * H === 0) return;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = H / 440;
      if (reduceMql.matches) renderStatic();
      else drawScene(performance.now(), performance.now() / 1000);
    };

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 120);
    });
    ro.observe(panel);
    const io = new IntersectionObserver(
      (entries) => {
        visible = !!entries[0]?.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(panel);
    const onVisibility = () => {
      if (document.hidden) stop();
      else if (visible) start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onReduceChange = () => {
      stop();
      if (reduceMql.matches) renderStatic();
      else start();
    };
    reduceMql.addEventListener("change", onReduceChange);

    resize();
    if (reduceMql.matches) renderStatic();
    else start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      window.clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceMql.removeEventListener("change", onReduceChange);
      surgeRef.current = null;
    };
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    if (!isValidSuiAddress(trimmed)) {
      setError("Invalid address — use 0x + 64 hex characters.");
      return;
    }
    setError(null);
    surgeRef.current?.();
    navigate(`/${normalizeSuiAddress(trimmed)}`);
  }

  return (
    <div className="hero-panel" ref={panelRef}>
      <canvas className="hero-panel-canvas" ref={canvasRef} aria-hidden="true" />
      <div className="hero-panel-ui">
        <span className="hero-lookup-label">⌖ look up any wallet</span>
        <form className="hero-lookup" onSubmit={submit}>
          <input
            ref={inputRef}
            className="hero-lookup-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (error) setError(null);
              boostRef.current = Math.max(boostRef.current, 0.4);
            }}
            onFocus={() => {
              focusedRef.current = true;
              boostRef.current = 1;
            }}
            onBlur={() => {
              focusedRef.current = false;
            }}
            placeholder="Paste 0x… address"
            spellCheck={false}
            autoComplete="off"
            aria-label="Paste a Sui wallet address"
            aria-invalid={error ? true : undefined}
          />
          <button type="submit" className="hero-lookup-go">
            Go
          </button>
        </form>
        {error ? (
          <span className="hero-lookup-error" role="alert">
            {error}
          </span>
        ) : (
          <span className="hero-panel-hint">balances · DeFi · NFTs — valued live from mainnet</span>
        )}
      </div>
    </div>
  );
}

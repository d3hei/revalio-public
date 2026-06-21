import { useEffect, useRef } from "react";

/**
 * Pixelated "ember matrix" behind the dark footer — a calm fire-palette heat grid
 * (HydraDB-style) with a node/edge connection network. Nodes gently bloom with heat
 * and the grid shimmers; there are NO travelling comet streaks (those live in the
 * hero's comet field). Node markers + faint dashed edges overlay the network.
 *
 * Performance: a Float32 heat field (zero GC in the loop), CELL-grid fillRects only
 * for lit cells, DPR capped at 2, the rAF loop is gated by an IntersectionObserver +
 * tab visibility, prefers-reduced-motion renders one static frame, full cleanup.
 */

const CELL = 8; // px — grid cell size (the "pixel")

// Heat (0..1) -> rgba over the dark --ink footer. Top stop is a warm amber, not pure
// white, so node blooms glow without glaring.
function buildFireLut(): string[] {
  const stops: Array<[number, [number, number, number], number]> = [
    [0.0, [70, 16, 8], 0],
    [0.2, [150, 34, 14], 0.45],
    [0.45, [216, 65, 30], 0.78],
    [0.68, [247, 147, 26], 0.88],
    [0.86, [226, 176, 7], 0.92],
    [1.0, [255, 224, 168], 0.96],
  ];
  const lut: string[] = [];
  for (let i = 0; i < 64; i++) {
    const h = i / 63;
    let a = stops[0]!;
    let b = stops[stops.length - 1]!;
    for (let s = 0; s < stops.length - 1; s++) {
      if (h >= stops[s]![0] && h <= stops[s + 1]![0]) {
        a = stops[s]!;
        b = stops[s + 1]!;
        break;
      }
    }
    const f = (h - a[0]) / Math.max(1e-6, b[0] - a[0]);
    const r = Math.round(a[1][0] + (b[1][0] - a[1][0]) * f);
    const g = Math.round(a[1][1] + (b[1][1] - a[1][1]) * f);
    const bl = Math.round(a[1][2] + (b[1][2] - a[1][2]) * f);
    const al = (a[2] + (b[2] - a[2]) * f).toFixed(3);
    lut.push(`rgba(${r}, ${g}, ${bl}, ${al})`);
  }
  return lut;
}

interface Node {
  x: number;
  y: number;
}

export function FooterMatrix() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const lut = buildFireLut();
    const CONNECT = mobile ? 170 : 230;

    let W = 0;
    let H = 0;
    let lastDpr = 0;
    let cols = 0;
    let rows = 0;
    let heat = new Float32Array(0);
    const nodes: Node[] = [];
    const edges: Array<[number, number]> = [];

    let pulseAcc = 0;
    let last = 0;
    let raf = 0;
    let running = false;
    let visible = false;

    // A soft ember bloom around a node (round, not a streak).
    const bloomNode = (n: Node, amount: number) => {
      const cc = (n.x / CELL) | 0;
      const rr = (n.y / CELL) | 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const c = cc + dx;
          const r = rr + dy;
          if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
          const d = Math.hypot(dx, dy);
          if (d > 2.5) continue;
          const idx = r * cols + c;
          heat[idx] = Math.min(1, heat[idx]! + amount * (1 - d / 2.5));
        }
      }
    };

    const advance = (dt: number) => {
      for (let i = 0; i < heat.length; i++) heat[i]! *= Math.max(0, 1 - dt * 1.7);

      // gentle ambient shimmer — a few dim cells flicker warm
      const flickers = mobile ? 2 : 4;
      for (let k = 0; k < flickers; k++) {
        const idx = (Math.random() * heat.length) | 0;
        heat[idx] = Math.min(0.55, heat[idx]! + 0.1 + Math.random() * 0.12);
      }

      // nodes bloom in turn — a calm, travelling-free network pulse
      pulseAcc += dt;
      if (pulseAcc >= 0.42 && nodes.length) {
        pulseAcc = 0;
        bloomNode(nodes[(Math.random() * nodes.length) | 0]!, 0.7);
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const h = heat[r * cols + c]!;
          if (h < 0.05) continue;
          ctx.fillStyle = lut[Math.min(63, (h * 63) | 0)]!;
          ctx.fillRect(c * CELL, r * CELL, CELL - 1, CELL - 1);
        }
      }

      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = "rgba(247, 147, 26, 0.13)";
      ctx.beginPath();
      for (const [a, b] of edges) {
        ctx.moveTo(nodes[a]!.x, nodes[a]!.y);
        ctx.lineTo(nodes[b]!.x, nodes[b]!.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      for (const n of nodes) {
        ctx.strokeStyle = "rgba(247, 147, 26, 0.45)";
        ctx.strokeRect(n.x - 5, n.y - 5, 10, 10);
        ctx.fillStyle = "rgba(255, 226, 180, 0.85)";
        ctx.fillRect(n.x - 1.5, n.y - 1.5, 3, 3);
      }
    };

    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      advance(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };

    const renderStatic = () => {
      for (const n of nodes) bloomNode(n, 0.6);
      for (let k = 0; k < (mobile ? 50 : 130); k++) {
        const idx = (Math.random() * heat.length) | 0;
        heat[idx] = 0.2 + Math.random() * 0.3;
      }
      draw();
    };

    const start = () => {
      if (running || reduceMql.matches || W * H === 0) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
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

      cols = Math.ceil(W / CELL);
      rows = Math.ceil(H / CELL);
      heat = new Float32Array(cols * rows);

      nodes.length = 0;
      edges.length = 0;
      const count = Math.min(mobile ? 9 : 18, Math.max(6, Math.round(W / 110)));
      for (let i = 0; i < count; i++) {
        nodes.push({ x: 20 + Math.random() * (W - 40), y: 16 + Math.random() * (H - 32) });
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (Math.hypot(nodes[i]!.x - nodes[j]!.x, nodes[i]!.y - nodes[j]!.y) < CONNECT) {
            edges.push([i, j]);
          }
        }
      }
      if (reduceMql.matches) renderStatic();
      else draw();
    };

    let resizeTimer = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    });
    ro.observe(host);

    const io = new IntersectionObserver(
      (entries) => {
        visible = !!entries[0]?.isIntersecting;
        if (visible) start();
        else stop();
      },
      { threshold: 0 },
    );
    io.observe(host);

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
    };
  }, []);

  return (
    <div className="footer-matrix" ref={hostRef} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

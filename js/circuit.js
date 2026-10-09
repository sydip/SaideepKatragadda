/* ==========================================================================
   CIRCUIT — the ambient tech-line background.
   Procedurally routes bundles of parallel PCB traces (orthogonal runs with
   45° bends), adds end pads, chip blocks and dot grids, then runs glowing
   data pulses along random traces. The home tab shows them faintly, and
   cuts them away where its triangles are (see setReveal and setMask).
   ========================================================================== */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";
  const rand = (a, b) => a + Math.random() * (b - a);
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]].map(([x, y]) => {
    const l = Math.hypot(x, y);
    return [x / l, y / l];
  });

  /** Offset a polyline sideways by `o` px, mitring the joins (keeps lanes parallel through bends) */
  function offsetPath(pts, o) {
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const l = Math.hypot(x2 - x1, y2 - y1) || 1;
      const nx = -(y2 - y1) / l, ny = (x2 - x1) / l;
      segs.push([[x1 + nx * o, y1 + ny * o], [x2 + nx * o, y2 + ny * o]]);
    }
    const out = [segs[0][0]];
    for (let i = 0; i < segs.length - 1; i++) {
      const [a1, a2] = segs[i], [b1, b2] = segs[i + 1];
      const d1x = a2[0] - a1[0], d1y = a2[1] - a1[1], d2x = b2[0] - b1[0], d2y = b2[1] - b1[1];
      const den = d1x * d2y - d1y * d2x;
      if (Math.abs(den) < 1e-6) { out.push(a2); continue; }
      const t = ((b1[0] - a1[0]) * d2y - (b1[1] - a1[1]) * d2x) / den;
      out.push([a1[0] + d1x * t, a1[1] + d1y * t]);
    }
    out.push(segs[segs.length - 1][1]);
    return out;
  }

  /** Route a centre line: straight runs, occasionally stepping 45° and back */
  function route(x, y, dir, len, turn = 0.5) {
    const pts = [[x, y]];
    let d = dir, left = len;
    while (left > 0) {
      const run = Math.min(left, rand(40, 160));
      x += DIRS[d][0] * run; y += DIRS[d][1] * run;
      pts.push([x, y]);
      left -= run;
      if (Math.random() < turn) {
        const side = Math.random() < 0.5 ? 1 : -1;
        const jog = rand(16, 70);
        const dd = (d + side + 8) % 8;
        x += DIRS[dd][0] * jog; y += DIRS[dd][1] * jog;
        pts.push([x, y]);
        left -= jog;
      }
    }
    return pts;
  }

  function measure(pts) {
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return cum;
  }
  /** point at arc length s along a measured polyline */
  function pointAt(pts, cum, s) {
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const t = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
  }

  /* ======================================================================
     BACKGROUND
     ====================================================================== */
  const cv = document.getElementById("circuit");
  const ctx = cv.getContext("2d");
  const layer = document.createElement("canvas"); // static traces, repainted on resize
  const lctx = layer.getContext("2d");
  const PAD = 40; // margin around the screen
  let W = 0, H = 0, dpr = 1, traces = [], pads = [], decos = [], pulses = [], running = true;
  const ox = -PAD, oy = -PAD; // the lines stay put (no parallax)
  let version = 0, reveal = null, mask = null, lineCol = "", nodeCol = "", pulseCol = "";

  /** route the traces and place the decorations (geometry only) */
  function build() {
    traces = [];
    const g = 9; // lane spacing
    const occ = new Set();
    const cell = 22;
    const key = (x, y) => ((x / cell) | 0) + "," + ((y / cell) | 0);
    const fits = (lanes) => {
      let hit = 0, n = 0;
      for (const p of lanes) for (let i = 0; i < p.length - 1; i++) {
        const steps = Math.ceil(Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]) / cell);
        for (let k = 0; k <= steps; k++) {
          const x = p[i][0] + (p[i + 1][0] - p[i][0]) * (k / steps), y = p[i][1] + (p[i + 1][1] - p[i][1]) * (k / steps);
          n++; if (occ.has(key(x, y))) hit++;
        }
      }
      return hit / Math.max(1, n) < 0.12;
    };
    const mark = (lanes) => {
      for (const p of lanes) for (let i = 0; i < p.length - 1; i++) {
        const steps = Math.ceil(Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]) / cell);
        for (let k = 0; k <= steps; k++) occ.add(key(p[i][0] + (p[i + 1][0] - p[i][0]) * (k / steps), p[i][1] + (p[i + 1][1] - p[i][1]) * (k / steps)));
      }
    };
    const LW = W + PAD * 2, LH = H + PAD * 2;
    const target = Math.round((LW * LH) / 24000); // sparse: a quiet backdrop
    let tries = 0, laneCount = 0;
    while (laneCount < target && tries++ < 700) {
      // bundles start along a central spine and fan out — like the reference board
      const fromSpine = Math.random() < 0.35;
      const x = fromSpine ? LW / 2 + rand(-LW * 0.08, LW * 0.08) : rand(0, LW);
      const y = rand(0, LH);
      const dir = fromSpine ? (Math.random() < 0.5 ? 0 : 4) + (Math.random() < 0.25 ? (Math.random() < 0.5 ? 1 : -1) : 0) : [0, 2, 4, 6][(Math.random() * 4) | 0];
      const centre = route(x, y, (dir + 8) % 8, rand(140, Math.max(LW, LH) * 0.55));
      const m = 1 + ((Math.random() ** 2 * 3) | 0);
      const lanes = [];
      for (let k = 0; k < m; k++) {
        const lane = offsetPath(centre, (k - (m - 1) / 2) * g);
        // stagger the far ends so bundles break up naturally
        const cut = rand(0, 60);
        const cum = measure(lane);
        const end = Math.max(30, cum[cum.length - 1] - cut);
        const pts = [];
        for (let i = 0; i < lane.length && cum[i] < end; i++) pts.push(lane[i]);
        pts.push(pointAt(lane, cum, end));
        lanes.push(pts);
      }
      if (!fits(lanes)) continue;
      mark(lanes);
      for (const p of lanes) traces.push({ pts: p, cum: measure(p) });
      laneCount += m;
    }
    // end pads, plus chip blocks, dot grids and dashes in free cells
    pads = traces.map((t) => ({ end: t.pts[t.pts.length - 1], start: Math.random() < 0.35 ? t.pts[0] : null }));
    decos = [];
    const deco = Math.round((LW * LH) / 400000);
    for (let i = 0; i < deco; i++) {
      const x = rand(20, LW - 60), y = rand(20, LH - 40);
      if (occ.has(key(x, y)) || occ.has(key(x + 30, y))) continue;
      const kind = Math.random();
      if (kind < 0.35) decos.push({ k: 0, x, y, s: rand(4, 7) });                                                          // 2x2 chip squares
      else if (kind < 0.7) decos.push({ k: 1, x, y, cols: 2 + ((Math.random() * 6) | 0), rows: 1 + ((Math.random() * 3) | 0) }); // dot matrix
      else decos.push({ k: 2, x, y, w1: rand(10, 22), w2: rand(10, 22) });                                                  // short dash pair
    }
    pulses = [];
    version++;
    paint();
  }

  function paintDeco(c, alpha) {
    c.fillStyle = nodeCol;
    c.globalAlpha = alpha;
    for (const p of pads) {
      c.beginPath(); c.arc(p.end[0], p.end[1], 2, 0, Math.PI * 2); c.fill();
      if (p.start) { c.beginPath(); c.arc(p.start[0], p.start[1], 1.6, 0, Math.PI * 2); c.fill(); }
    }
    c.globalAlpha = 0.9 * alpha;
    for (const d of decos) {
      if (d.k === 0) { for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) c.fillRect(d.x + a * (d.s + 2), d.y + b * (d.s + 2), d.s, d.s); }
      else if (d.k === 1) { for (let a = 0; a < d.cols; a++) for (let b = 0; b < d.rows; b++) c.fillRect(d.x + a * 5, d.y + b * 5, 2, 2); }
      else { c.fillRect(d.x, d.y, d.w1, 2); c.fillRect(d.x, d.y + 5, d.w2, 2); }
    }
    c.globalAlpha = 1;
  }

  /** paint the cached layer in the current theme's colours (the geometry stays the same) */
  function paint() {
    lineCol = css("--trace") || "rgba(37,99,235,.25)";
    nodeCol = css("--trace-node") || lineCol;
    pulseCol = css("--pulse") || "#38bdf8";
    const LW = W + PAD * 2, LH = H + PAD * 2;
    layer.width = LW * dpr; layer.height = LH * dpr;
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lctx.clearRect(0, 0, LW, LH);
    lctx.strokeStyle = lineCol;
    lctx.lineWidth = 1.1;
    lctx.lineJoin = "round";
    lctx.beginPath();
    for (const t of traces) {
      lctx.moveTo(t.pts[0][0], t.pts[0][1]);
      for (let i = 1; i < t.pts.length; i++) lctx.lineTo(t.pts[i][0], t.pts[i][1]);
    }
    lctx.stroke();
    paintDeco(lctx, 1);
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function spawnPulse() {
    const t = traces[(Math.random() * traces.length) | 0];
    if (!t) return;
    const len = t.cum[t.cum.length - 1];
    pulses.push({ t, s: 0, len, v: rand(45, 90), tail: rand(30, 60) });
  }

  /** erase the lines inside the mask's area (screen coordinates), e.g. where the home screen's triangles are */
  function cutMask() {
    if (!mask || mask.alpha <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = mask.alpha;
    if (mask.maxY != null) { ctx.beginPath(); ctx.rect(-10, -10, W + 20, mask.maxY + 10); ctx.clip(); }
    ctx.beginPath();
    mask.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  let last = performance.now();
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(50, now - last) / 1000; last = now;
    ctx.clearRect(0, 0, W, H);
    if (reveal && reveal.full) {
      // every line, just fainter (the home screen), and no pulses
      ctx.globalAlpha = reveal.alpha;
      ctx.drawImage(layer, ox, oy, layer.width / dpr, layer.height / dpr);
      ctx.globalAlpha = 1;
      cutMask();
      return;
    }
    ctx.drawImage(layer, ox, oy, layer.width / dpr, layer.height / dpr);
    if (reduce) { cutMask(); return; }
    while (pulses.length < Math.min(5, traces.length / 10)) spawnPulse();
    const col = pulseCol;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.lineCap = "round";
    if (isDark()) ctx.globalCompositeOperation = "lighter";
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.s += p.v * dt;
      if (p.s - p.tail > p.len) { pulses.splice(i, 1); continue; }
      const a = Math.max(0, p.s - p.tail), b = Math.min(p.len, p.s);
      if (b <= a) continue;
      const grad = ctx.createLinearGradient(...pointAt(p.t.pts, p.t.cum, a), ...pointAt(p.t.pts, p.t.cum, b));
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, col);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const steps = 6;
      for (let k = 0; k <= steps; k++) {
        const [x, y] = pointAt(p.t.pts, p.t.cum, a + (b - a) * (k / steps));
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      const [hx, hy] = pointAt(p.t.pts, p.t.cum, b);
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(hx, hy, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    cutMask();
  }

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => { running = !document.hidden; if (running) { last = performance.now(); requestAnimationFrame(frame); } });
  resize();
  requestAnimationFrame(frame);

  window.Circuit = {
    route, offsetPath, measure, pointAt, DIRS, rand,
    /** the traces, in layer coordinates (screen = layer + offset()) */
    traces: () => traces,
    /** bumps whenever the traces are re-routed (resize) */
    version: () => version,
    offset: () => [ox, oy],
    /** null = the whole background with its pulses; { full: true, alpha } = every line at reduced strength, no pulses */
    setReveal: (r) => { reveal = r; },
    /** null, or { poly: [[x, y], ...] in screen px, maxY?: clip the cut-out above this, alpha: 0..1 } — no lines inside it */
    setMask: (m) => { mask = m; },
  };
})();

/* ==========================================================================
   SKILL BRAIN — the skills tab's diagram: the low-poly brain, split into six
   regions, one per skill category (frontal lobe = machine learning, and so
   on). Hovering a region lights it up; clicking it, or its label, opens that
   category's skills. The brain holds still, with signals running through
   it as short lines of light.
   ========================================================================== */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const { mulberry32, delaunay, pointSet, facetShade } = window.MeshKit;
  const { measure } = window.Circuit;

  /** 2D helpers */
  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function segDist(x, y, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((x - x1) * dx + (y - y1) * dy) / l2, 0, 1);
    return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
  }
  function distToLine(x, y, pts, closed) {
    let d = Infinity;
    const n = pts.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) { const a = pts[i], b = pts[(i + 1) % n]; d = Math.min(d, segDist(x, y, a[0], a[1], b[0], b[1])); }
    return d;
  }

  /* ======================================================================
     BRAIN MODEL — traced from the reference: a side view facing left.
     x = front (frontal lobe), y = up, z = toward the viewer (−).
     The outline and the main folds are fixed; the mesh between them is a
     Delaunay triangulation, lifted into a gentle 3D bulge.
     ====================================================================== */
  const BRAIN_OUTLINE = [
    [1.0, -0.03], [0.976, 0.09], [0.928, 0.19], [0.868, 0.281], [0.796, 0.359], [0.719, 0.431], [0.629, 0.497], [0.527, 0.557], [0.419, 0.605], [0.299, 0.635], [0.162, 0.653], [0.018, 0.659], [-0.126, 0.659], [-0.269, 0.641], [-0.401, 0.611], [-0.521, 0.575], [-0.629, 0.515], [-0.719, 0.443], [-0.796, 0.359], [-0.862, 0.263], [-0.922, 0.162], [-0.964, 0.06], [-0.994, -0.06], [-0.994, -0.18], [-0.982, -0.299], [-0.964, -0.407], [-0.934, -0.497],
    // cerebellum
    [-0.904, -0.569], [-0.844, -0.635], [-0.76, -0.701], [-0.659, -0.754], [-0.539, -0.79], [-0.419, -0.802], [-0.31, -0.796],
    // brainstem
    [-0.335, -0.874], [-0.365, -0.97], [-0.317, -1.012], [-0.269, -1.006], [-0.222, -0.946], [-0.174, -0.85], [-0.126, -0.731], [-0.078, -0.611], [-0.04, -0.594],
    // temporal lobe and the underside of the frontal lobe
    [0.03, -0.593], [0.15, -0.587], [0.269, -0.575], [0.377, -0.539], [0.467, -0.485], [0.539, -0.425], [0.611, -0.359], [0.677, -0.311], [0.76, -0.263], [0.85, -0.216], [0.928, -0.168], [0.982, -0.108],
  ];
  // folds traced from the bright bands in the reference; w = ribbon half-width at its widest
  const SULCI = [
    { w: 0.026, p: [[0.646, 0.183], [0.606, 0.286], [0.519, 0.269], [0.432, 0.297], [0.328, 0.326], [0.27, 0.332]] },             // upper frontal arc
    { w: 0.018, p: [[0.304, 0.458], [0.31, 0.332], [0.246, 0.171]] },                                                               // ...and the fold crossing it
    { w: 0.032, p: [[0.096, 0.131], [0.043, 0.343], [0.014, 0.458], [-0.032, 0.59]] },                                              // central
    { w: 0.024, p: [[-0.09, 0.125], [-0.136, 0.303], [-0.188, 0.389], [-0.322, 0.447]] },                                           // postcentral
    { w: 0.022, p: [[-0.322, 0.274], [-0.449, 0.257], [-0.507, 0.286], [-0.583, 0.372], [-0.641, 0.401]] },                         // parietal
    { w: 0.016, p: [[-0.449, 0.257], [-0.525, 0.073]] },
    { w: 0.032, p: [[0.478, -0.191], [0.27, -0.139], [0.072, -0.133], [-0.061, -0.127], [-0.177, -0.099], [-0.31, -0.041], [-0.362, 0.016]] }, // lateral fissure
    { w: 0.02, p: [[-0.368, -0.248], [-0.426, -0.156], [-0.496, -0.03]] },
    { w: 0.024, p: [[-0.687, -0.214], [-0.757, -0.099], [-0.814, -0.001], [-0.855, 0.073]] },                                       // occipital
    { w: 0.018, p: [[-0.71, 0.171], [-0.832, 0.114], [-0.919, -0.041]] },
    { w: 0.028, p: [[0.461, -0.46], [0.345, -0.357], [0.27, -0.363], [0.096, -0.328], [-0.061, -0.317], [-0.177, -0.311]] },        // superior temporal
    { w: 0.014, p: [[0.183, -0.443], [0.014, -0.426], [-0.119, -0.42], [-0.252, -0.392]] },                                         // middle temporal
    { w: 0.02, p: [[0.038, -0.518], [-0.136, -0.518], [-0.293, -0.506]] },                                                          // inferior temporal
    { w: 0.018, p: [[-0.136, -0.615], [-0.177, -0.69], [-0.235, -0.765]] },                                                         // brainstem / cerebellum
    { w: 0.014, p: [[-0.797, -0.529], [-0.872, -0.443]] },
    { w: 0.014, p: [[-0.641, -0.673], [-0.699, -0.575]] },
    { w: 0.014, p: [[0.751, 0.114], [0.704, -0.001]] },
  ];
  const BRAIN_SHIFT = 0.17; // centres the model vertically

  function buildBrain() {
    const rng = mulberry32(5150);
    const rr = (a, b) => a + rng() * (b - a);
    const poly = BRAIN_OUTLINE;
    const S = pointSet(0.04), P = S.P, kind = []; // kind: 0 fill · 1 outline · 3 fold
    const add = (x, y, k) => { S.add(x, y); kind.push(k); return P.length - 1; };
    // outline
    const outline = [];
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
      const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 0.115));
      for (let k = 0; k < n; k++) {
        const x = lerp(x1, x2, k / n), y = lerp(y1, y2, k / n);
        if (S.nearest(x, y, 0.035) < 0) outline.push(add(x, y, 1));
      }
    }
    // folds
    const folds = SULCI.map(({ p: line, w }) => {
      const ids = [];
      const push = (x, y) => {
        let id = S.nearest(x, y, 0.045);                     // join an outline vertex or a crossing fold
        if (id < 0 && pointInPoly(x, y, poly) && distToLine(x, y, poly, true) >= 0.03) id = add(x, y, 3);
        if (id >= 0 && ids[ids.length - 1] !== id) ids.push(id);
      };
      for (let i = 0; i < line.length - 1; i++) {
        const [x1, y1] = line[i], [x2, y2] = line[i + 1];
        const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 0.085));
        for (let k = 0; k < n; k++) push(lerp(x1, x2, k / n), lerp(y1, y2, k / n));
      }
      push(...line[line.length - 1]);
      return { ids, w };
    });
    // scatter fill
    for (let i = 0; i < 7000; i++) {
      const x = rr(-1.05, 1.05), y = rr(-1.05, 0.7);
      if (pointInPoly(x, y, poly) && distToLine(x, y, poly, true) > 0.045 && S.nearest(x, y, rr(0.1, 0.155)) < 0) add(x, y, 0);
    }
    // triangulate, keep what lies inside the outline
    const T = delaunay(P).filter(([a, b, c]) => {
      const gx = (P[a][0] + P[b][0] + P[c][0]) / 3, gy = (P[a][1] + P[b][1] + P[c][1]) / 3;
      if (!pointInPoly(gx, gy, poly)) return false;
      for (const [p, q] of [[a, b], [b, c], [c, a]]) {
        const mx = (P[p][0] + P[q][0]) / 2, my = (P[p][1] + P[q][1]) / 2;
        if (!pointInPoly(mx, my, poly) && distToLine(mx, my, poly, true) > 0.012) return false;
        if (Math.hypot(P[p][0] - P[q][0], P[p][1] - P[q][1]) > 0.34) return false;
      }
      return true;
    });
    const E = [], seen = new Set(), outlineE = [], foldE = [];
    const edge = (p, q, list) => {
      const k = p < q ? p + "," + q : q + "," + p;
      if (!seen.has(k)) { seen.add(k); E.push([p, q]); }
      if (list) list.push([p, q]);
    };
    T.forEach(([a, b, c]) => { edge(a, b); edge(b, c); edge(c, a); });
    for (let i = 0; i < outline.length; i++) edge(outline[i], outline[(i + 1) % outline.length], outlineE);
    folds.forEach(({ ids }) => { for (let i = 0; i < ids.length - 1; i++) edge(ids[i], ids[i + 1], foldE); });

    // lift: a dome that is thin at the edges and the brainstem, with grooves along the folds
    const depth = (x, y) => {
      const d = distToLine(x, y, poly, true);
      let z = Math.min(0.8 * Math.sqrt(1 - (1 - Math.min(1, d / 0.5)) ** 2), 2 * d);
      let s = Infinity;
      for (const { p: line } of SULCI) s = Math.min(s, distToLine(x, y, line, false));
      z -= 0.08 * Math.exp(-((s / 0.06) ** 2)) * Math.min(1, z / 0.2);
      return -Math.max(0, z);
    };
    const V = P.map(([x, y], i) => [x, y + BRAIN_SHIFT, depth(x, y) + (kind[i] === 1 ? 0 : rr(-0.015, 0.015))]);
    const L = [0.45, 0.55, -0.7];
    const onFold = new Set(folds.flatMap((f) => f.ids));
    const shade = T.map(([a, b, c]) => {
      const lit = (onFold.has(a) ? 1 : 0) + (onFold.has(b) ? 1 : 0) + (onFold.has(c) ? 1 : 0);
      return facetShade(V[a], V[b], V[c], L) * (rng() < 0.13 ? rr(1.8, 2.8) : 1) * (lit >= 2 ? 1.6 : 1);
    });


    // which category each triangle belongs to, by where it sits on the brain
    const lateralY = (x) => (x >= 0.55 ? -Infinity : x <= -0.36 ? -0.05 : lerp(-0.191, 0.016, (0.478 - Math.min(0.478, x)) / 0.84)); // the lateral fissure
    const regionAt = (x, y) => {
      if (y < -0.6 && x > -0.36 && x < 0.0) return "backend";   // brainstem
      if (y < -0.45 && x <= -0.33) return "tools";              // cerebellum
      if (x < -0.62) return "frontend";                         // occipital lobe (vision)
      if (y < lateralY(x)) return "data";                       // temporal lobe (memory)
      if (x > 0.05) return "ml";                                // frontal lobe (reasoning)
      return "languages";                                       // parietal lobe (language, symbols)
    };
    const region = T.map(([a, b, c]) => regionAt((P[a][0] + P[b][0] + P[c][0]) / 3, (P[a][1] + P[b][1] + P[c][1]) / 3));
    // a point inside each region for its label's leader line: the vertex nearest the region's middle
    const anchor = {};
    for (const id of new Set(region)) {
      let sx = 0, sy = 0, n = 0;
      T.forEach(([a, b, c], i) => { if (region[i] !== id) return; for (const v of [a, b, c]) { sx += P[v][0]; sy += P[v][1]; n++; } });
      const mx = sx / n, my = sy / n;
      let best = 0, bd = Infinity;
      T.forEach(([a, b, c], i) => { if (region[i] !== id) return; for (const v of [a, b, c]) { const d = (P[v][0] - mx) ** 2 + (P[v][1] - my) ** 2; if (d < bd) { bd = d; best = v; } } });
      anchor[id] = best;
    }
    return { V, E, T, shade, outline, outlineE, foldE, folds, region, anchor };
  }

  /* ======================================================================
     CONTROLLER — one brain, drawn on the skills tab's own canvas
     ====================================================================== */
  let brain = null;
  // where each category's label sits, in brain sizes from the centre (the brain faces left, so its front is on the left)
  const SLOTS = { ml: [-1.38, -0.5], data: [-1.38, 0.08], backend: [-1.38, 0.62], languages: [1.38, -0.5], frontend: [1.38, 0.08], tools: [1.38, 0.62] };

  let stage = null, canvas = null, ctx = null, tags = [], onPick = null, active = false;
  let W = 0, H = 0, dpr = 1, last = 0, hover = null, held = null, BP = null, pulses = [], col = {};
  let bcx = 0, bcy = 0, bs = 0, stacked = false;
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgba = (color, a) => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = color; probe.fillRect(0, 0, 1, 1); const [r, g, b] = probe.getImageData(0, 0, 1, 1).data; return `rgba(${r},${g},${b},${a})`; };

  function projO(p, cx, cy, sc, yaw, pitch) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    const x1 = p[0] * c + p[2] * s, z1 = -p[0] * s + p[2] * c;
    const cp = Math.cos(pitch), sp = Math.sin(pitch), yy = p[1] - 0.05;
    return [cx + x1 * sc, cy - (yy * cp - z1 * sp + 0.05) * sc];
  }
  function strokeList(list, pos, levels, scale) {
    const buckets = Array.from({ length: levels }, () => []);
    for (const it of list) if (it[2] > 0.01) buckets[Math.min(levels - 1, Math.floor(it[2] * levels))].push(it);
    buckets.forEach((bk, i) => {
      if (!bk.length) return;
      ctx.globalAlpha = ((i + 0.5) / levels) * scale;
      ctx.beginPath();
      for (const [p, q] of bk) { ctx.moveTo(pos[p][0], pos[p][1]); ctx.lineTo(pos[q][0], pos[q][1]); }
      ctx.stroke();
    });
  }
  function tri(pos, [a, b, c]) { ctx.moveTo(pos[a][0], pos[a][1]); ctx.lineTo(pos[b][0], pos[b][1]); ctx.lineTo(pos[c][0], pos[c][1]); ctx.closePath(); }
  function edgePulse(A, B, s, alpha, lw) {
    const TAIL = 0.5, h = s * (1 + TAIL), u1 = Math.min(1, h), u0 = Math.max(0, h - TAIL);
    if (u1 <= u0 || alpha <= 0.01) return;
    const x0 = lerp(A[0], B[0], u0), y0 = lerp(A[1], B[1], u0), x1 = lerp(A[0], B[0], u1), y1 = lerp(A[1], B[1], u1);
    const gr = ctx.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, col.pulseClear); gr.addColorStop(1, col.pulse);
    ctx.strokeStyle = gr;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    ctx.globalAlpha = 0.3 * alpha; ctx.lineWidth = lw * 3.5; ctx.stroke();
    ctx.globalAlpha = alpha; ctx.lineWidth = lw; ctx.stroke();
  }
  function glowAt(x, y, r, a) {
    const gl = ctx.createRadialGradient(x, y, 0, x, y, r);
    gl.addColorStop(0, col.glow); gl.addColorStop(1, col.lineClear);
    ctx.globalAlpha = a; ctx.fillStyle = gl; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  /** the category under a point on the canvas (or null) */
  function regionAtPoint(x, y) {
    if (!BP) return null;
    for (let i = brain.T.length - 1; i >= 0; i--) {
      const [a, b, c] = brain.T[i], A = BP[a], B = BP[b], C = BP[c];
      const d = (B[1] - C[1]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[1] - C[1]);
      if (!d) continue;
      const l1 = ((B[1] - C[1]) * (x - C[0]) + (C[0] - B[0]) * (y - C[1])) / d, l2 = ((C[1] - A[1]) * (x - C[0]) + (A[0] - C[0]) * (y - C[1])) / d;
      if (l1 >= 0 && l2 >= 0 && l1 + l2 <= 1) return brain.region[i];
    }
    return null;
  }

  function frame(now) {
    if (!active) return;
    requestAnimationFrame(frame);
    if (!stage.isConnected) { active = false; return; } // (the next tab sets or clears the background's cut-out)
    const dt = Math.min(50, now - (last || now)) / 1000; last = now;
    if (document.hidden) return;
    const r = canvas.getBoundingClientRect(); // (on narrow screens the labels sit below the canvas)
    if (r.bottom < 0 || r.top > innerHeight) { window.Circuit.setMask(null); return; } // off screen
    dpr = Math.min(devicePixelRatio || 1, 2);
    if (W !== r.width || H !== r.height) { W = r.width; H = r.height; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    stacked = stage.clientWidth < 760;
    if (stage.classList.contains("stacked") !== stacked) { stage.classList.toggle("stacked", stacked); return; } // re-measure next frame
    bs = stacked ? Math.min(W * 0.4, H * 0.5) : Math.min(W * 0.22, H * 0.5);
    bcx = W / 2; bcy = H / 2;
    const t = now / 1000, dark = isDark(), lit = held || hover;

    // a fixed side view: the brain holds still
    const yaw = Math.PI, pitch = 0;
    BP = brain.V.map((v) => projO(v, bcx, bcy, bs, yaw, pitch));
    // no background lines behind the brain: cut them away inside its outline (in screen coordinates)
    window.Circuit.setMask({ poly: brain.outline.map((i) => [BP[i][0] + r.left, BP[i][1] + r.top]), alpha: 1 });

    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    glowAt(bcx, bcy - 0.05 * bs, Math.min(bs * 1.3, H / 2), 0.8); // kept inside the canvas, so it never shows an edge
    if (dark) ctx.globalCompositeOperation = "lighter";

    // facets: the lit region glows, the others dim a little while one is lit
    ctx.fillStyle = col.line;
    const FL = 7, fb = Array.from({ length: FL }, () => []), max = 0.5;
    brain.T.forEach((tr, i) => {
      const on = lit && brain.region[i] === lit;
      let a = dark ? 0.03 + 0.12 * brain.shade[i] : 0.02 + 0.07 * brain.shade[i];
      if (lit) a = on ? a * 2.6 + 0.08 : a * 0.6;
      fb[Math.min(FL - 1, Math.floor((a / max) * FL))].push(tr);
    });
    fb.forEach((list, i) => {
      if (!list.length) return;
      ctx.globalAlpha = ((i + 0.5) / FL) * max;
      ctx.beginPath(); for (const tr of list) tri(BP, tr); ctx.fill();
    });
    ctx.strokeStyle = col.line; ctx.lineWidth = 0.85;
    strokeList(brain.E.map(([a, b]) => [a, b, 0.5]), BP, 8, 1);
    if (lit) {
      ctx.strokeStyle = col.pulse; ctx.lineWidth = 1; ctx.globalAlpha = 0.55;
      ctx.beginPath(); brain.T.forEach((tr, i) => { if (brain.region[i] === lit) tri(BP, tr); }); ctx.stroke();
    }
    // outline: a soft glow under a crisp line
    ctx.strokeStyle = col.line;
    ctx.lineWidth = 4; strokeList(brain.outlineE.map(([a, b]) => [a, b, dark ? 0.18 : 0.1]), BP, 3, 1);
    ctx.lineWidth = 1.4; strokeList(brain.outlineE.map(([a, b]) => [a, b, 0.92]), BP, 5, 1);
    // folds: bright ribbons that taper to a point at both ends
    ctx.fillStyle = col.line;
    for (const { ids, w } of brain.folds) {
      if (ids.length < 2) continue;
      const pts = [];
      for (let i = 0; i < ids.length - 1; i++) {
        const p = BP[ids[i]], q = BP[ids[i + 1]];
        for (let k = 0; k < 4; k++) pts.push([lerp(p[0], q[0], k / 4), lerp(p[1], q[1], k / 4)]);
      }
      pts.push(BP[ids[ids.length - 1]]);
      const cum = measure(pts), L = cum[cum.length - 1] || 1, hw = w * bs, lft = [], rgt = [];
      pts.forEach(([x, y], i) => {
        const [x0, y0] = pts[Math.max(0, i - 1)], [x1, y1] = pts[Math.min(pts.length - 1, i + 1)];
        const dl = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / dl, ny = (x1 - x0) / dl;
        const rr = hw * Math.pow(Math.sin((Math.PI * cum[i]) / L), 0.8);
        lft.push([x + nx * rr, y + ny * rr]); rgt.push([x - nx * rr, y - ny * rr]);
      });
      ctx.globalAlpha = dark ? 0.34 : 0.24;
      ctx.beginPath();
      lft.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      for (let i = rgt.length - 1; i >= 0; i--) ctx.lineTo(rgt[i][0], rgt[i][1]);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = col.line;
    if (dark) { ctx.lineWidth = 4.5; strokeList(brain.foldE.map(([a, b]) => [a, b, 0.12]), BP, 3, 1); }
    ctx.lineWidth = 1.6; strokeList(brain.foldE.map(([a, b]) => [a, b, 0.95]), BP, 5, 1);

    // signals running along the mesh and the folds, as short lines of light
    if (!reduce) {
      while (pulses.length < 24) {
        const pool = Math.random() < 0.45 ? brain.foldE : brain.E;
        pulses.push({ e: pool[(Math.random() * pool.length) | 0], s: 0, v: rand(0.8, 2.2) });
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const q = pulses[i];
        q.s += q.v * dt;
        if (q.s >= 1) { pulses.splice(i, 1); continue; }
        edgePulse(BP[q.e[0]], BP[q.e[1]], q.s, 1, 1.6);
      }
    }
    ctx.globalCompositeOperation = "source-over";

    // labels around the brain, each with a leader line into its region (side by side layouts only)
    ctx.strokeStyle = col.line; ctx.lineWidth = 1;
    tags.forEach((el) => {
      const id = el.dataset.region, on = lit === id;
      el.classList.toggle("on", on);
      if (stacked) { el.style.transform = ""; return; }
      const [sx, sy] = SLOTS[id], base = BP[brain.anchor[id]];
      const x = bcx + sx * bs, y = bcy + sy * bs, left = sx < 0;
      ctx.globalAlpha = on ? 0.95 : 0.45;
      ctx.beginPath(); ctx.moveTo(base[0], base[1]); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = col.pulse; ctx.globalAlpha = on ? 1 : 0.8;
      ctx.beginPath(); ctx.arc(base[0], base[1], on ? 3.4 : 2.6, 0, Math.PI * 2); ctx.fill();
      el.classList.toggle("left", left);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(${left ? "calc(-100% + 7px)" : "-7px"}, -50%)`;
    });
    ctx.restore();
  }

  window.SkillBrain = {
    /** run the brain in this stage (a .brain-stage with a canvas and .region-tag buttons); pick(id) opens a category */
    mount(el, pick) {
      active = false;
      if (!el) return;
      window.Circuit.setMask(null);
      if (!brain) brain = buildBrain();
      stage = el; onPick = pick; canvas = el.querySelector("canvas"); ctx = canvas.getContext("2d");
      tags = [...el.querySelectorAll(".region-tag")];
      col = { line: css("--brain-line"), pulse: css("--pulse") };
      col.lineClear = rgba(col.line, 0); col.pulseClear = rgba(col.pulse, 0); col.glow = rgba(col.line, isDark() ? 0.22 : 0.1);
      W = H = 0; hover = held = null; pulses = []; last = 0;
      canvas.addEventListener("pointermove", (e) => {
        const r = canvas.getBoundingClientRect();
        hover = regionAtPoint(e.clientX - r.left, e.clientY - r.top);
        canvas.style.cursor = hover ? "pointer" : "";
      });
      canvas.addEventListener("pointerleave", () => { hover = null; });
      canvas.addEventListener("click", (e) => {
        const r = canvas.getBoundingClientRect(), id = regionAtPoint(e.clientX - r.left, e.clientY - r.top);
        if (id) onPick(id);
      });
      tags.forEach((t) => {
        t.addEventListener("pointerenter", () => { hover = t.dataset.region; });
        t.addEventListener("pointerleave", () => { hover = null; });
        t.addEventListener("focus", () => { held = t.dataset.region; });
        t.addEventListener("blur", () => { held = null; });
        t.addEventListener("click", () => onPick(t.dataset.region));
      });
      active = true;
      requestAnimationFrame(frame);
    },
    /** keep a region lit while its pop-up is open (null to let go) */
    hold(id) { held = id; },
  };
})();

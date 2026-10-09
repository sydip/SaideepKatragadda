/* ==========================================================================
   HEAD — the home tab's scene (one full-screen 2D canvas).
   A low-poly wireframe face in profile, looking toward the name. Its
   triangle mesh carries on past the back of the head — over the top,
   straight back, and under the neck — to the screen edges, with signals
   running through it as short lines of light. It holds still. The
   background's circuit traces show faintly everywhere except where the
   triangles are.
   ========================================================================== */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const G = (v, m, s) => Math.exp(-(((v - m) / s) ** 2));
  const MESH_LINE = 0.3; // one even strength for every line of the head's mesh and the mesh around it

  /** small seeded PRNG so the models and traces look the same on every visit */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /** smooth (Catmull-Rom) curve through [y, value] knots, y descending */
  function curve(knots) {
    const ys = knots.map((k) => k[0]), vs = knots.map((k) => k[1]), n = ys.length;
    return (y) => {
      if (y >= ys[0]) return vs[0];
      if (y <= ys[n - 1]) return vs[n - 1];
      let i = 0;
      while (ys[i + 1] > y) i++;
      const t = (ys[i] - y) / (ys[i] - ys[i + 1]), t2 = t * t, t3 = t2 * t;
      const p0 = vs[Math.max(0, i - 1)], p1 = vs[i], p2 = vs[i + 1], p3 = vs[Math.min(n - 1, i + 2)];
      return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    };
  }
  /** Bowyer–Watson Delaunay triangulation of 2D points */
  function delaunay(pts) {
    const n = pts.length;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const d = Math.max(x1 - x0, y1 - y0) * 20, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    const P = pts.concat([[mx - d, my - d], [mx, my + d], [mx + d, my - d]]);
    const circ = (a, b, c) => {
      const [ax, ay] = P[a], [bx, by] = P[b], [cx, cy] = P[c];
      const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
      const A = ax * ax + ay * ay, B = bx * bx + by * by, C = cx * cx + cy * cy;
      const ux = (A * (by - cy) + B * (cy - ay) + C * (ay - by)) / D, uy = (A * (cx - bx) + B * (ax - cx) + C * (bx - ax)) / D;
      return [ux, uy, (ax - ux) ** 2 + (ay - uy) ** 2];
    };
    let tris = [[n, n + 1, n + 2, ...circ(n, n + 1, n + 2)]];
    for (let i = 0; i < n; i++) {
      const [px, py] = P[i], edges = new Map(), keep = [];
      for (const t of tris) {
        if ((px - t[3]) ** 2 + (py - t[4]) ** 2 < t[5]) {
          for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
            const k = a < b ? a + "," + b : b + "," + a;
            edges.has(k) ? edges.delete(k) : edges.set(k, [a, b]);
          }
        } else keep.push(t);
      }
      edges.forEach(([a, b]) => keep.push([a, b, i, ...circ(a, b, i)]));
      tris = keep;
    }
    return tris.filter((t) => t[0] < n && t[1] < n && t[2] < n).map((t) => [t[0], t[1], t[2]]);
  }
  /** grid-accelerated point set for scatter sampling */
  function pointSet(cell) {
    const P = [], grid = new Map();
    return {
      P,
      add(x, y) {
        P.push([x, y]);
        const k = Math.floor(x / cell) + "," + Math.floor(y / cell);
        (grid.get(k) || grid.set(k, []).get(k)).push(P.length - 1);
        return P.length - 1;
      },
      nearest(x, y, d) {
        const cx = Math.floor(x / cell), cy = Math.floor(y / cell), n = Math.ceil(d / cell);
        let best = -1, bd = d * d;
        for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
          const list = grid.get(cx + i + "," + (cy + j));
          if (list) for (const k of list) { const dd = (P[k][0] - x) ** 2 + (P[k][1] - y) ** 2; if (dd < bd) { bd = dd; best = k; } }
        }
        return best;
      },
    };
  }
  /** outward-facing facet shade for a near-side mesh (normal points to −z) */
  function facetShade(A, B, C, L) {
    const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], w = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    let n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
    if (n[2] > 0) n = n.map((v) => -v);
    const l = Math.hypot(...n) || 1, ll = Math.hypot(...L);
    return clamp((n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / (l * ll), 0, 1);
  }

  /* ======================================================================
     HEAD MODEL — a low-poly face in profile.
     The side silhouette (forehead, brow, nose, lips, chin) is defined by
     curves; horizontal cross-sections give it depth. Points are scattered
     in the side view (dense on the face), Delaunay-triangulated, then lifted
     onto the 3D surface. Only the near half is built, so the wireframe stays
     clean in profile. x = forward (face), y = up, z = toward the viewer (−).
     ====================================================================== */
  const Y_TOP = 1.0, Y_BOT = -1.15;
  const XF = curve([[1.0, 0], [0.99, 0.12], [0.97, 0.205], [0.95, 0.263], [0.9, 0.367], [0.75, 0.553], [0.6, 0.665], [0.45, 0.737], [0.33, 0.775], [0.22, 0.78], [0.12, 0.788], [0.04, 0.765], [-0.04, 0.723], [-0.12, 0.745], [-0.2, 0.775], [-0.28, 0.815], [-0.32, 0.837], [-0.36, 0.82], [-0.4, 0.76], [-0.44, 0.725], [-0.47, 0.717], [-0.5, 0.725], [-0.53, 0.739], [-0.57, 0.715], [-0.6, 0.696], [-0.63, 0.717], [-0.67, 0.705], [-0.71, 0.66], [-0.74, 0.625], [-0.79, 0.63], [-0.84, 0.61], [-0.88, 0.56], [-0.92, 0.43], [-0.96, 0.25], [-1.02, 0.19], [-1.1, 0.11], [-1.2, 0.03]]);
  const XB = curve([[1.0, 0], [0.99, -0.125], [0.97, -0.21], [0.95, -0.27], [0.9, -0.376], [0.75, -0.567], [0.6, -0.68], [0.45, -0.755], [0.33, -0.79], [0.22, -0.81], [0.12, -0.82], [0.04, -0.818], [-0.04, -0.8], [-0.12, -0.78], [-0.2, -0.75], [-0.28, -0.71], [-0.36, -0.66], [-0.44, -0.6], [-0.5, -0.55], [-0.57, -0.52], [-0.63, -0.5], [-0.71, -0.49], [-0.8, -0.49], [-0.9, -0.5], [-1.0, -0.52], [-1.1, -0.55], [-1.2, -0.58]]);
  const RID = curve([[0.0, 0], [-0.04, 0], [-0.12, 0.035], [-0.2, 0.075], [-0.28, 0.11], [-0.32, 0.13], [-0.36, 0.12], [-0.4, 0.06], [-0.44, 0.03], [-0.47, 0.02], [-0.5, 0.035], [-0.53, 0.055], [-0.57, 0.04], [-0.6, 0.02], [-0.63, 0.04], [-0.67, 0.035], [-0.71, 0.02], [-0.74, 0.02], [-0.79, 0.045], [-0.84, 0.04], [-0.88, 0.02], [-0.92, 0]]); // nose / lips / chin ridge on the midline
  const SIG = curve([[0.0, 0.3], [-0.06, 0.09], [-0.12, 0.07], [-0.2, 0.08], [-0.28, 0.1], [-0.32, 0.12], [-0.36, 0.14], [-0.44, 0.15], [-0.47, 0.18], [-0.5, 0.2], [-0.67, 0.2], [-0.71, 0.22], [-0.92, 0.22]]); // ridge width
  const WD = curve([[1.0, 0], [0.99, 0.11], [0.97, 0.19], [0.95, 0.24], [0.9, 0.33], [0.75, 0.49], [0.6, 0.57], [0.45, 0.61], [0.33, 0.62], [0.12, 0.61], [-0.04, 0.59], [-0.2, 0.58], [-0.36, 0.555], [-0.5, 0.53], [-0.63, 0.5], [-0.71, 0.48], [-0.79, 0.44], [-0.84, 0.4], [-0.88, 0.36], [-0.92, 0.32], [-0.96, 0.3], [-1.02, 0.29], [-1.2, 0.28]]); // half-width
  const XC = curve([[1.0, 0], [0.22, -0.02], [0.12, -0.05], [-0.36, -0.05], [-0.44, -0.08], [-0.57, -0.1], [-0.71, -0.12], [-0.84, -0.14], [-0.92, -0.15], [-1.02, -0.16], [-1.2, -0.24]]); // where the section is widest
  const NF = curve([[1.0, 2.0], [0.45, 2.0], [0.33, 2.2], [0.12, 2.6], [-0.6, 2.6], [-0.71, 2.3], [-0.79, 2.0], [-0.88, 1.7], [-0.92, 1.6], [-1.0, 1.9], [-1.2, 2.0]]); // flat face front vs. narrow jaw
  const insideHead = (x, y, m = 0) => y <= Y_TOP - m && y >= Y_BOT + m && x <= XF(y) - m && x >= XB(y) + m;

  /** near-side surface point: u = 0 front midline → π back midline */
  function headSurface(u, y) {
    const a = Math.max(0, RID(y)), xF = XF(y) - a, xb = XB(y), xc = XC(y), w = Math.max(0, WD(y));
    let x, z;
    if (u <= Math.PI / 2) {
      const e = 2 / NF(y);
      x = xc + (xF - xc) * Math.pow(Math.max(0, Math.cos(u)), e);
      z = -w * Math.pow(Math.sin(u), e);
    } else {
      x = xc + (xb - xc) * -Math.cos(u);
      z = -w * Math.sin(u);
    }
    if (a > 0) x += a * Math.exp(-((z / Math.max(0.04, SIG(y))) ** 2));
    z -= 0.03 * G(y, -0.2, 0.1) * G(x, 0.42, 0.16);     // cheekbone
    return [x, y, z];
  }
  /** the near-side point whose side view lands on (x, y) */
  function liftXY(x, y) {
    if (x >= headSurface(0, y)[0] || x <= headSurface(Math.PI, y)[0]) return [x, y, 0];
    let lo = 0, hi = Math.PI;
    for (let i = 0; i < 28; i++) { const mid = (lo + hi) / 2; if (headSurface(mid, y)[0] > x) lo = mid; else hi = mid; }
    return [x, y, headSurface((lo + hi) / 2, y)[2]];
  }

  // The mesh beyond the head fills the sector behind it, measured from a point inside the skull.
  // φ is a screen angle: 0 = straight back (right), +π/2 = up, −π/2 = down, ±π = the face.
  const HE = [0.02, 0.0];
  // It also stops at two lines, so nothing sits in front of the face: one rising up and back from the
  // crown, one running down from under the chin. Points are [x, y] in head units, top to bottom.
  const CROWN_LINE = [[-0.354, 1.85], [0.21, 1.0]];
  const CHIN_LINE = [[0.26, -0.913], [0.097, -1.22], [-0.065, -1.823]];
  /** x of a polyline at height y (extended past its ends) */
  const lineX = (pts, y) => {
    let i = 0;
    while (i < pts.length - 2 && y < pts[i + 1][1]) i++;
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    return x1 + ((y - y1) * (x2 - x1)) / (y2 - y1);
  };
  const behindLines = (x, y) => {
    let w = 1;
    if (y > 0.5) { const lx = lineX(CROWN_LINE, y); w *= smooth(lx + 0.02, lx - 0.06, x); }
    if (y < -0.7) { const lx = lineX(CHIN_LINE, y); w *= smooth(lx + 0.02, lx - 0.06, x); }
    return w;
  };
  const headSector = (x, y) => {
    const phi = Math.atan2(y - HE[1], -(x - HE[0]));
    return smooth(2.1, 1.65, phi) * smooth(-2.35, -1.85, phi) * behindLines(x, y);
  };

  function buildHead() {
    const rng = mulberry32(20261006);
    const rr = (a, b) => a + rng() * (b - a);
    const radius = () => 0.08; // one even triangle size across the whole head: no features inside, just the outline of a face
    const S = pointSet(0.03), P = S.P, R = [], kind = []; // kind: 0 fill · 1 front profile · 2 back outline
    const add = (x, y, k) => { S.add(x, y); R.push(radius(x, y)); kind.push(k); return P.length - 1; };
    const near = (x, y, d) => S.nearest(x, y, d) >= 0;

    // 1. the front profile — finer through the face, and every landmark kept exactly
    const profile = [], knots = [-0.04, -0.32, -0.47, -0.53, -0.6, -0.63, -0.74, -0.79, -0.92, -0.96];
    let acc = 0, px = XF(Y_TOP), py = Y_TOP;
    profile.push(add(px, py, 1));
    for (let y = Y_TOP - 0.002; y >= Y_BOT; y -= 0.002) {
      const x = XF(y);
      acc += Math.hypot(x - px, y - py); px = x; py = y;
      const sp = y < 0.15 && y > -1.0 ? 0.03 : 0.05;
      if ((acc >= sp || knots.some((k) => Math.abs(k - y) < 0.001)) && !near(x, y, 0.014)) { profile.push(add(x, y, 1)); acc = 0; }
    }
    // 2. back outline and the cut at the neck
    acc = 0; px = XB(Y_TOP); py = Y_TOP;
    for (let y = Y_TOP - 0.002; y >= Y_BOT; y -= 0.002) {
      const x = XB(y);
      acc += Math.hypot(x - px, y - py); px = x; py = y;
      if (acc >= 0.085 && !near(x, y, 0.04)) { add(x, y, 2); acc = 0; }
    }
    for (let x = XB(Y_BOT) + 0.1; x < XF(Y_BOT) - 0.05; x += 0.1) if (!near(x, Y_BOT, 0.05)) add(x, Y_BOT, 2);
    // 3. scatter fill, evenly spaced
    for (let i = 0; i < 14000; i++) {
      const y = rr(Y_BOT, Y_TOP), x = rr(-0.86, 0.86);
      if (insideHead(x, y, 0.012) && !near(x, y, radius(x, y))) add(x, y, 0);
    }

    // 4. visibility: a soft fade under the jaw; the back of the head stays whole and carries on into the plexus
    const jawY = (x) => (x >= 0.43 ? -0.93 : x >= -0.12 ? lerp(-0.72, -0.93, (x + 0.12) / 0.55) : lerp(-0.72, -0.42, clamp((-0.12 - x) / 0.15, 0, 1)));
    const fade = P.map(([x, y]) => {
      const jy = jawY(x);
      return y < jy ? 0.5 + 0.5 * smooth(jy - 0.3, jy - 0.01, y) : 1;
    });

    // 5. triangulate the side view; drop triangles that bridge outside the silhouette or have faded away
    const T = delaunay(P).filter(([a, b, c]) => {
      if (Math.min(fade[a], fade[b], fade[c]) < 0.05) return false;
      const gx = (P[a][0] + P[b][0] + P[c][0]) / 3, gy = (P[a][1] + P[b][1] + P[c][1]) / 3;
      if (!insideHead(gx, gy, -0.003)) return false;
      for (const [p, q] of [[a, b], [b, c], [c, a]]) {
        if (!insideHead((P[p][0] + P[q][0]) / 2, (P[p][1] + P[q][1]) / 2, -0.012)) return false;
        if (Math.hypot(P[p][0] - P[q][0], P[p][1] - P[q][1]) > 2.7 * Math.max(R[p], R[q])) return false;
      }
      return true;
    });
    const E = [], seen = new Set();
    const edge = (p, q) => { const k = p < q ? p + "," + q : q + "," + p; if (!seen.has(k)) { seen.add(k); E.push([p, q]); } };
    T.forEach(([a, b, c]) => { edge(a, b); edge(b, c); edge(c, a); });
    for (let i = 0; i < profile.length - 1; i++) edge(profile[i], profile[i + 1]);

    const V = P.map(([x, y]) => liftXY(x, y));
    const shade = T.map(([a, b, c]) => facetShade(V[a], V[b], V[c], [0.55, 0.45, -0.7]));
    const tfade = T.map(([a, b, c]) => Math.min(fade[a], fade[b], fade[c]));
    // line brightness: the same everywhere (fading out only under the jaw); the profile is drawn brighter on top
    const lum = P.map((p, i) => MESH_LINE * fade[i]);
    // outline strength along the profile: full on the face, easing off over the crown and down the neck
    const ofade = P.map(([x, y], i) => (kind[i] === 1 ? smooth(Y_TOP + 0.02, 0.45, y) * smooth(Y_BOT, -0.82, y) : 1));
    return { V, E, T, shade, tfade, fade, profile, kind, lum, ofade, edgeKeys: seen };
  }

  /* ======================================================================
     PLEXUS — the head's triangle mesh carries on past the back of the head
     to the screen edges: over the top, straight back, and under the neck.
     It shares the head's outline vertices, so head and plexus read as one
     continuous mesh; its triangles grow and dim with distance from the head.
     Points are kept in head units, so the mesh moves with the head; only a
     new layout (screen or head size) rebuilds it.
     ====================================================================== */
  function buildPlexus(pcx, pcy, hs, W, H, maxY, head) {
    const rng = mulberry32(777);
    const rr = (a, b) => a + rng() * (b - a);
    const weight = (mx, my) => headSector(mx, my) * (maxY == null ? 1 : smooth(maxY, maxY - 0.45 * hs, pcy - my * hs));
    const spacing = (d) => lerp(0.11, 0.3, smooth(0, 2.2, d));
    const S = pointSet(0.08), P = S.P, ref = [], dist = [], base = [];
    // the head's outline vertices are shared, so the two meshes join seamlessly
    const bnd = [];
    head.kind.forEach((k, i) => {
      if (k !== 1 && k !== 2) return;
      const [x, y] = head.V[i];
      bnd.push(P.length); S.add(x, y); ref.push(i); dist.push(0); base.push(head.lum[i]);
    });
    // scatter points out to the screen edges (and a little past them)
    const xMin = (pcx - W - 50) / hs, xMax = (pcx + 50) / hs, yMin = (pcy - H - 50) / hs, yMax = (pcy + 50) / hs;
    const tries = Math.round(clamp((12000 * W * H) / (1440 * 900), 6000, 24000));
    for (let i = 0; i < tries; i++) {
      const mx = rr(xMin, xMax), my = rr(yMin, yMax);
      if (insideHead(mx, my, -0.02)) continue;
      const w = weight(mx, my);
      if (w < 0.03) continue;
      let d = Infinity, nb = 0;
      for (const k of bnd) { const dd = (P[k][0] - mx) ** 2 + (P[k][1] - my) ** 2; if (dd < d) { d = dd; nb = k; } }
      d = Math.sqrt(d);
      if (S.nearest(mx, my, spacing(d) * rr(0.85, 1.15)) >= 0) continue;
      S.add(mx, my); ref.push(-1); dist.push(d);
      base.push(MESH_LINE * w); // as bright as the head's own lines, easing off only at the mesh's borders
    }
    // triangulate; keep triangles outside the head, behind the face, never cutting across the head
    const T = delaunay(P).filter(([a, b, c]) => {
      const gx = (P[a][0] + P[b][0] + P[c][0]) / 3, gy = (P[a][1] + P[b][1] + P[c][1]) / 3;
      if (insideHead(gx, gy, -0.004) || weight(gx, gy) < 0.25) return false;
      for (const [p, q] of [[a, b], [b, c], [c, a]]) {
        if (insideHead((P[p][0] + P[q][0]) / 2, (P[p][1] + P[q][1]) / 2, 0.015)) return false;
        if (Math.hypot(P[p][0] - P[q][0], P[p][1] - P[q][1]) > 2.6 * spacing(Math.max(dist[p], dist[q]))) return false;
      }
      return true;
    });
    const E = [], seen = new Set();
    const edge = (p, q) => {
      const k = p < q ? p + "," + q : q + "," + p;
      if (seen.has(k)) return;
      seen.add(k);
      if (ref[p] >= 0 && ref[q] >= 0) { // already part of the head's own mesh?
        const a = ref[p], b = ref[q];
        if (head.edgeKeys.has(a < b ? a + "," + b : b + "," + a)) return;
      }
      E.push([p, q]);
    };
    T.forEach(([a, b, c]) => { edge(a, b); edge(b, c); edge(c, a); });
    // a few brighter facets, like the head
    const tA = T.map(([a, b, c]) => ((base[a] + base[b] + base[c]) / 3) * (rng() < 0.14 ? rr(0.45, 0.8) : rr(0.05, 0.22)));
    return { P, ref, dist, base, E, T, tA };
  }

  /* ======================================================================
     CONTROLLER
     ====================================================================== */
  const Scene = (() => {
    const canvas = document.getElementById("scene");
    const ctx = canvas.getContext("2d");
    const head = buildHead();
    const Circuit = window.Circuit;
    const HOME_LINES = 0.7; // how strong the background lines are on the home tab
    const HYAW = Math.PI; // a fixed profile, facing left

    let anchor = null, active = false;
    let W = 0, H = 0, dpr = 1, last = performance.now();
    let pcx = 0, pcy = 0, hs = 0, plexus = null, plexusKey = "", pPulses = [], hPulses = [];
    let col = {};
    const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    const rgba = (color, a) => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = color; probe.fillRect(0, 0, 1, 1); const [r, g, b] = probe.getImageData(0, 0, 1, 1).data; return `rgba(${r},${g},${b},${a})`; };
    const readColors = () => {
      col = { line: css("--brain-line"), pulse: css("--pulse") };
      col.lineClear = rgba(col.line, 0);
      col.pulseClear = rgba(col.pulse, 0);
      col.glow = rgba(col.line, isDark() ? 0.22 : 0.1);
    };
    readColors();

    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    /** orthographic projection */
    function projO(p, cx, cy, sc, cyaw) {
      const c = Math.cos(cyaw), s = Math.sin(cyaw);
      return [cx + (p[0] * c + p[2] * s) * sc, cy - p[1] * sc];
    }
    /** stroke [a, b, alpha] segments in a few alpha buckets (cheap) */
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
    /** fill triangles in alpha buckets */
    function fillTris(tris, alphaOf, pos, max) {
      const FL = 7, fb = Array.from({ length: FL }, () => []);
      tris.forEach((tr, i) => { const a = alphaOf(i); if (a > 0.004) fb[Math.min(FL - 1, Math.floor((a / max) * FL))].push(tr); });
      fb.forEach((list, i) => {
        if (!list.length) return;
        ctx.globalAlpha = ((i + 0.5) / FL) * max;
        ctx.beginPath();
        for (const [a, b, c] of list) { ctx.moveTo(pos[a][0], pos[a][1]); ctx.lineTo(pos[b][0], pos[b][1]); ctx.lineTo(pos[c][0], pos[c][1]); ctx.closePath(); }
        ctx.fill();
      });
    }
    /** a signal travelling along an edge: a short line of light that runs in from A and out through B */
    function edgePulse(A, B, s, alpha, lw) {
      const TAIL = 0.5, h = s * (1 + TAIL), u1 = Math.min(1, h), u0 = Math.max(0, h - TAIL);
      if (u1 <= u0 || alpha <= 0.01) return;
      const x0 = lerp(A[0], B[0], u0), y0 = lerp(A[1], B[1], u0), x1 = lerp(A[0], B[0], u1), y1 = lerp(A[1], B[1], u1);
      const gr = ctx.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, col.pulseClear); gr.addColorStop(1, col.pulse);
      ctx.strokeStyle = gr;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      ctx.globalAlpha = 0.3 * alpha; ctx.lineWidth = lw * 3.5; ctx.stroke(); // soft glow
      ctx.globalAlpha = alpha; ctx.lineWidth = lw; ctx.stroke();
    }
    function glowAt(x, y, r, a) {
      const gl = ctx.createRadialGradient(x, y, 0, x, y, r);
      gl.addColorStop(0, col.glow); gl.addColorStop(1, col.lineClear);
      ctx.globalAlpha = a; ctx.fillStyle = gl; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    /** the area the head and its mesh cover, on screen: up the crown line, down the face's profile, down the chin line, out to the right */
    function meshOutline(HP) {
      const toS = ([x, y]) => [pcx - x * hs, pcy - y * hs];
      const yTop = (pcy + 60) / hs, yBot = (pcy - H - 60) / hs;
      return [
        toS([lineX(CROWN_LINE, yTop), yTop]),
        toS(CROWN_LINE[CROWN_LINE.length - 1]),
        ...head.profile.map((i) => HP[i]),
        toS([lineX(CHIN_LINE, Y_BOT), Y_BOT]),
        toS([lineX(CHIN_LINE, yBot), yBot]),
        [W + 60, H + 60],
        [W + 60, -60],
      ];
    }
    /** plexus vertex positions: shared outline vertices follow the head, the rest sit relative to it */
    function plexusPos(HP) {
      return plexus.P.map(([x, y], i) => (plexus.ref[i] >= 0 ? HP[plexus.ref[i]] : [pcx - x * hs, pcy - y * hs]));
    }

    function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(50, now - last) / 1000; last = now;
      if (!active || document.hidden) return;
      size();
      ctx.clearRect(0, 0, W, H);
      const ar = anchor.getBoundingClientRect();
      if (!ar.width) return;
      const dark = isDark(), stacked = W <= 1000;

      // placement: the face looks left toward the name, its mesh runs off to the edges behind it
      hs = Math.min(H * 0.27, ar.width * 0.62, stacked ? Infinity : W * 0.2);
      pcx = ar.left + ar.width / 2 + (stacked ? 0.28 : 0.12) * hs;
      pcy = ar.top + ar.height / 2 + 0.04 * hs;
      // (keyed on the page position, so scrolling the tab only moves the mesh)
      const key = `${W}x${H}:${Math.round(hs)}:${Math.round(pcx / 24)},${Math.round((pcy + scrollY) / 48)}`;
      if (key !== plexusKey) {
        // stacked (phone / tablet) layout: keep the mesh above the text
        plexus = buildPlexus(pcx, pcy, hs, W, H, stacked ? ar.bottom + 50 : null, head);
        plexusKey = key; pPulses = [];
      }
      const HP = head.V.map((v) => projO(v, pcx, pcy, hs, HYAW));
      const ppos = plexusPos(HP);
      // no background lines where the triangles are
      Circuit.setMask({ poly: meshOutline(HP), maxY: stacked ? ar.bottom + 50 : null, alpha: 1 });

      ctx.save();
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      glowAt(pcx + 0.1 * hs, pcy - 0.05 * hs, hs * 1.6, 1);
      if (dark) ctx.globalCompositeOperation = "lighter";

      // the plexus: the head's triangles carried out to the screen edges
      ctx.fillStyle = col.line;
      fillTris(plexus.T, (i) => plexus.tA[i] * (dark ? 0.55 : 0.4), ppos, 0.2);
      ctx.strokeStyle = col.line; ctx.lineWidth = 0.85;
      strokeList(plexus.E.map(([a, b]) => [a, b, (plexus.base[a] + plexus.base[b]) / 2 / 0.4]), ppos, 16, 0.4);

      // the head itself: even lines, with the profile drawn bright on top
      ctx.fillStyle = col.line;
      fillTris(head.T, (i) => (dark ? 0.03 + 0.12 * head.shade[i] : 0.02 + 0.075 * head.shade[i]) * head.tfade[i], HP, 0.15);
      ctx.strokeStyle = col.line; ctx.lineWidth = 0.85;
      strokeList(head.E.map(([a, b]) => [a, b, (head.lum[a] + head.lum[b]) / 2]), HP, 10, 1);
      ctx.lineWidth = 1.3;
      const prof = [];
      for (let i = 0; i < head.profile.length - 1; i++) { const a = head.profile[i], b = head.profile[i + 1]; prof.push([a, b, 0.95 * Math.min(head.fade[a], head.fade[b]) * Math.min(head.ofade[a], head.ofade[b])]); }
      strokeList(prof, HP, 5, 1);

      // signals running through the triangles as short lines of light
      if (!reduce) {
        for (let tries = 0; tries < 8 && pPulses.length < 14 && plexus.E.length; tries++) {
          const e = plexus.E[(Math.random() * plexus.E.length) | 0];
          const [a, b] = plexus.dist[e[0]] >= plexus.dist[e[1]] ? e : [e[1], e[0]];
          if ((plexus.base[a] + plexus.base[b]) / 2 > 0.1) pPulses.push({ a, b, s: 0, v: rand(0.6, 1.4) });
        }
        for (let i = pPulses.length - 1; i >= 0; i--) {
          const q = pPulses[i];
          q.s += q.v * dt;
          if (q.s >= 1) { pPulses.splice(i, 1); continue; }
          edgePulse(ppos[q.a], ppos[q.b], q.s, Math.sin(Math.PI * q.s), 1.3);
        }
        while (hPulses.length < 18) hPulses.push({ e: head.E[(Math.random() * head.E.length) | 0], s: 0, v: rand(0.6, 1.4) });
        for (let i = hPulses.length - 1; i >= 0; i--) {
          const q = hPulses[i], [a, b] = q.e;
          q.s += q.v * dt;
          if (q.s >= 1) { hPulses.splice(i, 1); continue; }
          edgePulse(HP[a], HP[b], q.s, Math.sin(Math.PI * q.s) * Math.min(head.fade[a], head.fade[b]), 1.2);
        }
      }
      ctx.restore();
    }
    requestAnimationFrame(frame);

    return {
      /** draw the head over this anchor (the home tab), or nothing (null: every other tab) */
      attach(el) {
        anchor = el;
        active = !!el;
        plexusKey = ""; pPulses = []; hPulses = [];
        canvas.style.opacity = active ? "1" : "0";
        if (active) {
          Circuit.setReveal({ full: true, alpha: HOME_LINES }); // faint lines on the home tab…
        } else {
          Circuit.setReveal(null);                              // …the full background everywhere else
          Circuit.setMask(null);
          size();
          ctx.clearRect(0, 0, W, H);
        }
      },
    };
  })();

  window.Scene = Scene;
  window.MeshKit = { mulberry32, delaunay, pointSet, facetShade }; // shared with the skills brain (skillbrain.js)
})();

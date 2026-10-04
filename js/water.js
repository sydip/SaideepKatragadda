/* ==========================================================================
   WATER — WebGL liquid orb (home hero) + whirlpool navigation wheel
   ========================================================================== */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";

  /* ---------- tiny WebGL helper: one full-screen triangle + fragment shader ---------- */
  const NOISE = `
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p); vec2 u = f * f * f * (f * (f * 6. - 15.) + 10.); // quintic: no crease lines in the lighting
      return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
    }
    float fbm(vec2 p){ float v = 0., a = .5; mat2 m = mat2(.8, .6, -.6, .8); for (int i = 0; i < 4; i++){ v += a * noise(p); p = m * p * 2.03 + vec2(1.7, 9.2); a *= .5; } return v; }
  `;

  function makeGL(canvas, frag, uniformNames) {
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return null;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, "attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }");
    const fs = sh(gl.FRAGMENT_SHADER, "precision highp float;\n" + frag);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error(gl.getProgramInfoLog(prog)); return null; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    uniformNames.forEach((n) => (u[n] = gl.getUniformLocation(prog, n)));
    return {
      gl, u,
      draw() { gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3); },
      dispose() { const ext = gl.getExtension("WEBGL_lose_context"); ext && ext.loseContext(); },
    };
  }

  /* ======================================================================
     LIQUID ORB
     ====================================================================== */
  const ORB_FRAG = `
    uniform vec2 uRes; uniform float uTime, uTilt, uLevel, uAmp, uDark, uSplash, uSplashX;
    ${NOISE}
    float caustic(vec2 uv, float time){
      vec2 p = mod(uv * 6.28318, 6.28318) - 250.;
      vec2 i = p; float c = 1.; float inten = .005;
      for (int n = 0; n < 4; n++){
        float t = time * (1. - (3.5 / float(n + 1)));
        i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
        c += 1. / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
      }
      c /= 4.; c = 1.17 - pow(c, 1.4);
      return pow(abs(c), 8.);
    }
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes * 2. - 1.;
      float R = .965, r = length(uv);
      if (r > R + .02) { gl_FragColor = vec4(0.); return; }
      vec2 sp = uv / R;
      vec3 n = vec3(sp, sqrt(max(0., 1. - dot(sp, sp))));
      float x = uv.x, t = uTime;

      // living surface: layered swell + chop + click splash, tilted by pointer momentum
      float surf = uLevel + uTilt * x
        + uAmp * (.045 * sin(x * 3.1 + t * 1.6) + .026 * sin(x * 6.9 - t * 2.3) + .012 * sin(x * 14. + t * 3.4))
        + .008 * (fbm(vec2(x * 2. + t * .4, t * .3)) - .5)
        + uSplash * .09 * sin(x * 11. - t * 10.) * exp(-abs(x - uSplashX) * 2.2);

      vec3 air = mix(vec3(.93, .975, 1.), vec3(.035, .1, .16), uDark);
      vec3 col = air * mix(.94, 1.04, uv.y * .5 + .5);
      float d = surf - uv.y;

      if (d > 0.) {
        vec2 ruv = uv + n.xy * .14 * (1. - n.z);                 // refraction through the glass
        float depth = clamp(d / 1.25, 0., 1.);
        vec3 shallow = mix(vec3(.26, .8, .94), vec3(.04, .55, .7), uDark);
        vec3 deep = mix(vec3(.02, .3, .55), vec3(.0, .08, .2), uDark);
        vec3 w = mix(shallow, deep, pow(depth, .65));
        float c = caustic(ruv * 1.6 + vec2(0., t * .03), t * .45);
        w += c * .42 * (1. - depth) * vec3(.85, 1., 1.);
        float rays = pow(max(0., sin((ruv.x + ruv.y * .35) * 8. + t * .5 + fbm(ruv * 3.) * 2.) * .5 + .5), 7.);
        w += rays * .13 * (1. - depth);
        w *= .92 + .16 * fbm(ruv * 5. + t * .2);
        // rising bubbles
        for (int i = 0; i < 9; i++){
          float fi = float(i);
          float h = fract(sin(fi * 12.9898) * 43758.5453);
          float y = -1.1 + mod(t * (.1 + h * .14) + h * 4., 2.2);
          float bx = (h - .5) * 1.25 + .035 * sin(t * 2. + fi * 1.7);
          float br = .014 + .022 * fract(h * 7.31);
          vec2 bp = uv - vec2(bx, y);
          float bd = length(bp);
          float under = step(y + br, surf);
          float ring = smoothstep(br, br - .006, bd) - smoothstep(br - .006, br - .014, bd);
          float hl = smoothstep(br * .42, 0., length(bp - vec2(-br * .38, br * .38)));
          w += (ring * .45 + hl * .7) * under;
        }
        // bright underside of the surface (total internal reflection band)
        w = mix(w, mix(vec3(.82, .97, 1.), vec3(.45, .85, .95), uDark), smoothstep(.04, 0., d) * .7);
        col = w;
      } else {
        // soft light the surface throws onto the air above
        col += exp(d * 30.) * .08 * mix(vec3(.2, .7, .9), vec3(.1, .6, .8), uDark);
      }

      // glass: fresnel rim, two specular highlights, inner shadow
      float fres = pow(1. - n.z, 2.4);
      col = mix(col, mix(vec3(1.), vec3(.55, .88, 1.), uDark), fres * .42);
      col += pow(max(dot(n, normalize(vec3(-.5, .62, .78))), 0.), 46.) * .95;
      col += pow(max(dot(n, normalize(vec3(.55, -.5, .7))), 0.), 90.) * .3;
      col *= 1. - .18 * smoothstep(.75, 1., r / R) * (1. - uDark * .3);
      float alpha = smoothstep(R + .012, R - .008, r);
      float rim = smoothstep(.016, 0., abs(r - R + .008));
      col = mix(col, mix(vec3(.55, .82, .92), vec3(.25, .75, .9), uDark), rim * .55);
      gl_FragColor = vec4(col * alpha, alpha);
    }`;

  function mountOrb(btn) {
    const canvas = btn.querySelector("canvas");
    const g = makeGL(canvas, ORB_FRAG, ["uRes", "uTime", "uTilt", "uLevel", "uAmp", "uDark", "uSplash", "uSplashX"]);
    if (!g) { btn.classList.add("no-gl"); return; }
    btn.classList.add("gl-ready");
    const st = { tilt: 0, tiltV: 0, target: 0, amp: 1, ampT: 1, splash: 0, splashX: 0, lastX: null, visible: true };
    const t0 = performance.now();

    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const s = Math.round(canvas.clientWidth * dpr);
      if (canvas.width !== s) { canvas.width = s; canvas.height = s; }
    };
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const px = ((e.clientX - r.left) / r.width) * 2 - 1;
      st.target = -px * 0.12;
      if (st.lastX != null) st.tiltV += (px - st.lastX) * -0.25; // momentum slosh
      st.lastX = px;
      st.ampT = 1.7;
    });
    btn.addEventListener("pointerleave", () => { st.target = 0; st.ampT = 1; st.lastX = null; });
    btn.addEventListener("pointerdown", (e) => {
      const r = btn.getBoundingClientRect();
      st.splash = 1;
      st.splashX = ((e.clientX - r.left) / r.width) * 2 - 1;
    });

    const io = new IntersectionObserver(([en]) => (st.visible = en.isIntersecting));
    io.observe(btn);

    function frame(now) {
      if (!btn.isConnected) { io.disconnect(); g.dispose(); return; }
      requestAnimationFrame(frame);
      if (!st.visible || document.hidden) return;
      size();
      // spring physics for the slosh
      st.tiltV += (st.target - st.tilt) * 0.045;
      st.tiltV *= 0.93;
      st.tilt += st.tiltV;
      st.tilt = Math.max(-0.35, Math.min(0.35, st.tilt));
      st.amp += (st.ampT - st.amp) * 0.04;
      st.splash *= 0.965;
      const t = reduce ? 0 : (now - t0) / 1000;
      const { gl, u } = g;
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      gl.uniform1f(u.uTime, t);
      gl.uniform1f(u.uTilt, st.tilt);
      gl.uniform1f(u.uLevel, -0.08 + 0.025 * Math.sin(t * 0.45));
      gl.uniform1f(u.uAmp, st.amp);
      gl.uniform1f(u.uDark, isDark() ? 1 : 0);
      gl.uniform1f(u.uSplash, st.splash);
      gl.uniform1f(u.uSplashX, st.splashX);
      g.draw();
    }
    requestAnimationFrame(frame);
  }

  /* ======================================================================
     WHIRLPOOL NAVIGATION
     ====================================================================== */
  const I = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    about: '<svg viewBox="0 0 24 24"><path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/></svg>',
    experience: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
    projects: '<svg viewBox="0 0 24 24"><path d="M12 3 3 8l9 5 9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
    skills: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8 7.5 10.8 16M16 7.5 13.2 16M8.5 6h7"/></svg>',
    contact: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  };
  const SECTIONS = [
    { id: "home", label: "Home", sub: "Back to the surface" },
    { id: "about", label: "About", sub: "Education & foundations" },
    { id: "experience", label: "Experience", sub: "Industry, research & quant" },
    { id: "projects", label: "Projects", sub: "Five worlds to explore" },
    { id: "skills", label: "Skills", sub: "Every skill → a project" },
    { id: "contact", label: "Contact", sub: "Let's make some waves" },
  ];

  const Vortex = (() => {
    let el = null, raf = 0, state = null, opener = null, collapsed = false, closing = null;

    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const easeIn = (t) => t * t * t;
    function tween(dur, fn, curve = ease) {
      return new Promise((res) => {
        const t0 = performance.now();
        const step = (now) => {
          const p = Math.min(1, (now - t0) / dur);
          fn(curve(p));
          p < 1 ? requestAnimationFrame(step) : res();
        };
        requestAnimationFrame(step);
      });
    }

    function build() {
      const outer = SECTIONS.map((s, i) => `
        <a class="vx-item sec" href="#/${s.id}" data-i="${i}" data-label="${s.label}" data-sub="${s.sub}">
          <span class="vx-counter"><span class="vx-bubble">${I[s.id]}</span><span class="vx-label">${s.label}</span></span>
        </a>`).join("");
      el = document.createElement("div");
      el.className = "vortex";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
      el.setAttribute("aria-label", "Site navigation");
      el.innerHTML = `
        <div class="vx-backdrop"></div>
        <svg class="vx-lines" aria-hidden="true"><path class="b b1" fill-rule="evenodd"/><path class="b b2" fill-rule="evenodd"/><path class="b b3" fill-rule="evenodd"/><path class="l1"/></svg>
        <div class="vx-wheel">
          <div class="vx-ring outer">${outer}</div>
          <button class="vx-hub" aria-label="Close navigation">
            <span class="vx-hub-title"></span>
            <span class="vx-hub-sub"></span>
            <span class="vx-hub-x">${I.close}</span>
          </button>
        </div>`;
      document.body.appendChild(el);
      layoutItems();
      wire();
    }

    function radii() {
      const m = Math.min(innerWidth, innerHeight);
      return { outer: Math.min(250, m * 0.33, innerWidth * 0.33) };
    }
    function itemTransform(item, R, extraRot = 0, scale = 1) {
      const a = (360 / SECTIONS.length) * +item.dataset.i - 90 + extraRot;
      return `rotate(${a}deg) translateX(${R}px) rotate(${-a}deg) scale(${scale})`;
    }
    function layoutItems() {
      const r = radii();
      el.querySelectorAll(".vx-item").forEach((it) => {
        it.style.transform = itemTransform(it, r.outer);
      });
    }

    function wire() {
      const hubT = el.querySelector(".vx-hub-title"), hubS = el.querySelector(".vx-hub-sub");
      const wheel = el.querySelector(".vx-wheel");
      el.querySelectorAll(".vx-item").forEach((it) => {
        const on = () => { el.querySelectorAll('.vx-item.hot').forEach((x) => x.classList.remove('hot')); hubT.textContent = it.dataset.label; hubS.textContent = it.dataset.sub; wheel.classList.add("paused"); it.classList.add("hot"); };
        const off = () => { hubT.textContent = ""; hubS.textContent = ""; wheel.classList.remove("paused"); it.classList.remove("hot"); };
        it.addEventListener("pointerenter", on); it.addEventListener("focus", on);
        it.addEventListener("pointerleave", off); it.addEventListener("blur", off);
      });
      el.querySelector(".vx-hub").addEventListener("click", () => drain());
      el.addEventListener("keydown", (e) => {
        if (e.key === "Escape") drain();
        if (e.key === "Tab") { // keep focus inside the wheel
          const f = [...el.querySelectorAll("a, button")];
          const i = f.indexOf(document.activeElement);
          if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        }
      });
      window.addEventListener("resize", onResize);
    }
    function onResize() {
      if (!el) return;
      state.cx = innerWidth / 2; state.cy = innerHeight / 2;
      state.R = radii().outer;
      layoutItems();
    }

    // Thick, translucent water bands (like the background waves) bent into a ring.
    // Each band swells and thins as it flows, and drifts around the circle at its own speed.
    const BANDS = [
      { k: 3, A: 9, W: 30, wk: 2, sp: -0.6, off: 2, spin: 0.7 },  // wide, slow undercurrent
      { k: 4, A: 7, W: 20, wk: 3, sp: 0.9, off: 0, spin: 1 },     // main stream
      { k: 6, A: 5, W: 12, wk: 5, sp: 1.4, off: 4, spin: 1.35 },  // quick surface ripple
    ];
    const N = 200;
    function bandPath(cx, cy, R, B, t, rot) {
      const s = Math.min(1, R / 150);
      const outer = [], inner = [];
      for (let i = 0; i <= N; i++) {
        const th = (i / N) * Math.PI * 2;
        const ph = th - rot * B.spin;
        const c = R + B.A * s * Math.sin(B.k * ph + t * B.sp + B.off);
        const w = B.W * s * (0.55 + 0.45 * Math.sin(B.wk * ph - t * B.sp * 0.7 + B.off * 2)) / 2;
        const cos = Math.cos(th), sin = Math.sin(th);
        outer.push((cx + (c + w) * cos).toFixed(1) + " " + (cy + (c + w) * sin).toFixed(1));
        inner.push((cx + (c - w) * cos).toFixed(1) + " " + (cy + (c - w) * sin).toFixed(1));
      }
      return "M" + outer.join("L") + "Z M" + inner.reverse().join("L") + "Z";
    }
    function linePath(cx, cy, R, t, rot) {
      const s = Math.min(1, R / 150);
      let d = "";
      for (let i = 0; i <= N; i++) {
        const th = (i / N) * Math.PI * 2;
        const r = R + 4 * s * Math.sin(5 * (th - rot) + t * 1.1);
        d += (i ? "L" : "M") + (cx + r * Math.cos(th)).toFixed(1) + " " + (cy + r * Math.sin(th)).toFixed(1);
      }
      return d + "Z";
    }
    function render(now) {
      if (!el) return;
      raf = requestAnimationFrame(render);
      const t = reduce ? 0 : (now - state.t0) / 1000;
      state.rot += (reduce ? 0 : 0.0045) * state.spin;
      const R = Math.max(0, state.R);
      const bands = el.querySelectorAll(".vx-lines .b");
      BANDS.forEach((B, i) => bands[i].setAttribute("d", bandPath(state.cx, state.cy, R, B, t, state.rot)));
      el.querySelector(".vx-lines .l1").setAttribute("d", linePath(state.cx, state.cy, R, t, state.rot));
    }

    async function open(from, viaKeyboard) {
      if (el) return;
      opener = document.activeElement;
      collapsed = false;
      build();
      document.documentElement.classList.add("vx-lock");
      state = { cx: from.x, cy: from.y, R: from.r || 20, spin: 6, rot: 0, t0: performance.now() };
      raf = requestAnimationFrame(render);

      const sx = from.x, sy = from.y, sr = from.r || 20;
      const tx = innerWidth / 2, ty = innerHeight / 2, tr = radii().outer;
      el.classList.add("opening");
      el.querySelector(".vx-backdrop").animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 1 : 700, easing: "ease-out", fill: "both" });
      await tween(reduce ? 1 : 1050, (p) => {
        state.cx = sx + (tx - sx) * p;
        state.cy = sy + (ty - sy) * p;
        state.R = sr + (tr - sr) * p;
        state.spin = 6 - 5 * p;
      }, (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2));
      el.classList.remove("opening");
      el.classList.add("open");
      revealItems(viaKeyboard);
    }

    function revealItems(viaKeyboard) {
      const r = radii();
      const hub = el.querySelector(".vx-hub");
      hub.animate([{ opacity: 0, transform: "translate(-50%,-50%) scale(.4)" }, { opacity: 1, transform: "translate(-50%,-50%) scale(1)" }], { duration: 600, easing: "cubic-bezier(.22,1.4,.36,1)", fill: "both" });
      el.querySelectorAll(".vx-item").forEach((it, k) => {
        const R = r.outer;
        it.animate(
          [
            { transform: itemTransform(it, 0, -160, 0.2), opacity: 0 },
            { transform: itemTransform(it, R, 0, 1), opacity: 1 },
          ],
          { duration: reduce ? 1 : 850, delay: reduce ? 0 : k * 55, easing: "cubic-bezier(.22,1.2,.36,1)", fill: "backwards" }
        );
      });
      setTimeout(() => el && (viaKeyboard ? el.querySelector(".vx-item.sec") : el.querySelector(".vx-hub")).focus({ preventScroll: true, focusVisible: viaKeyboard }), reduce ? 0 : 500);
    }

    /** Items spiral down into the drain */
    async function collapseItems() {
      if (!el || collapsed) return;
      collapsed = true;
      el.classList.add("collapsing");
      const r = radii();
      const anims = [...el.querySelectorAll(".vx-item")].map((it, k) => {
        const R = r.outer;
        return it.animate(
          [{ transform: itemTransform(it, R, 0, 1), opacity: 1 }, { transform: itemTransform(it, 0, 220, 0.1), opacity: 0 }],
          { duration: reduce ? 1 : 520, delay: reduce ? 0 : k * 25, easing: "cubic-bezier(.55,0,.8,.4)", fill: "forwards" }
        ).finished;
      });
      el.querySelector(".vx-hub").animate([{ opacity: 1 }, { opacity: 0, transform: "translate(-50%,-50%) scale(.3) rotate(90deg)" }], { duration: 420, fill: "forwards" });
      await Promise.all(anims);
    }

    /** The ring shrinks away and the page fades back in */
    function drain() {
      if (!el) return Promise.resolve();
      if (closing) return closing;
      closing = (async () => {
        await collapseItems();
        const r0 = state.R, s0 = state.spin;
        el.querySelector(".vx-backdrop").animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 1 : 820, easing: "ease-in", fill: "forwards" });
        await tween(reduce ? 1 : 820, (p) => {
          state.R = r0 * (1 - p);
          state.spin = s0 + 6 * p;
        }, easeIn);
        destroy();
      })();
      return closing;
    }

    function destroy() {
      if (!el) return;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      el.remove();
      el = null; closing = null;
      document.documentElement.classList.remove("vx-lock");
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    }

    return { open, drain, destroy, collapseItems, isOpen: () => !!el };
  })();

  window.Water = { mountOrb, Vortex };
})();

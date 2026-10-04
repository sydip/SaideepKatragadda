/* ==========================================================================
   TRANSITIONS
   Every transition is `async (swap, opts) => {}`. It covers the screen,
   awaits `swap()` (which renders the next page underneath), then reveals.
   ========================================================================== */
(function () {
  const layer = document.getElementById("transition");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const anim = (el, kf, o) => el.animate(kf, Object.assign({ fill: "both", easing: "cubic-bezier(.65,0,.35,1)" }, o)).finished;
  const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";

  function mount(html, cls) {
    layer.innerHTML = `<div class="tx ${cls}">${html}</div>`;
    layer.classList.add("active");
    return layer.firstElementChild;
  }
  function unmount() {
    layer.classList.remove("active");
    layer.innerHTML = "";
  }

  function spawnBubbles(root, n = 16) {
    for (let i = 0; i < n; i++) {
      const b = document.createElement("span");
      const s = 6 + Math.random() * 22;
      b.className = "tx-bubble";
      b.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s}px;--dx:${(Math.random() - 0.5) * 80}px;animation-duration:${1 + Math.random() * 1.1}s;animation-delay:${Math.random() * 0.35}s`;
      root.appendChild(b);
    }
  }

  /* ------------------------------------------------------------------
     DEFAULT: rising / falling wave (vertical)
     ------------------------------------------------------------------ */
  async function wave(swap, { dir = 1, label = "", startCovered = false } = {}) {
    const sheet = (n) => `<div class="tx-wl tx-l${n}"><div class="crest"></div><div class="edge top"></div><div class="fill"></div><div class="edge bot"></div></div>`;
    const root = mount(`${sheet(1)}${sheet(2)}${sheet(3)}<div class="tx-mark">${label}</div>`, "tx-wave");
    const layers = [...root.querySelectorAll(".tx-wl")];
    const mark = root.querySelector(".tx-mark");
    const far = "calc(100vh + 110px)", nfar = "calc(-100vh - 110px)";
    const enter = dir > 0 ? far : nfar, leave = dir > 0 ? nfar : far;

    if (startCovered) {
      layers.forEach((l) => (l.style.transform = "translateY(0)"));
    } else {
      await Promise.all(
        layers.map((l, i) =>
          anim(l, [{ transform: `translateY(${enter})` }, { transform: "translateY(0)" }], { duration: 620, delay: i * 95, easing: "cubic-bezier(.55,0,.3,1)" })
        )
      );
    }
    spawnBubbles(root.querySelector(".tx-l3"), 18);
    if (label) anim(mark, [{ opacity: 0, transform: "translate(-50%,-30%)", filter: "blur(8px)" }, { opacity: 1, transform: "translate(-50%,-50%)", filter: "blur(0)" }], { duration: 380, easing: "cubic-bezier(.22,1,.36,1)" });
    await swap();
    await wait(label ? 260 : 120);
    if (label) anim(mark, [{ opacity: 1 }, { opacity: 0, transform: "translate(-50%,-70%)" }], { duration: 320 });
    await Promise.all(
      layers
        .slice()
        .reverse()
        .map((l, i) =>
          anim(l, [{ transform: "translateY(0)" }, { transform: `translateY(${leave})` }], { duration: 680, delay: 60 + i * 95, easing: "cubic-bezier(.6,0,.25,1)" })
        )
    );
    unmount();
  }

  /* ------------------------------------------------------------------
     DEFAULT: horizontal stream (used when leaving a project world)
     ------------------------------------------------------------------ */
  async function stream(swap, { dir = -1, label = "" } = {}) {
    const sheet = (n) => `<div class="tx-sl tx-l${n}"><div class="edge tail"></div><div class="fill"></div><div class="edge lead"></div></div>`;
    const root = mount(`${sheet(1)}${sheet(2)}${sheet(3)}<div class="tx-mark">${label}</div>`, "tx-stream");
    const layers = [...root.querySelectorAll(".tx-sl")];
    const mark = root.querySelector(".tx-mark");
    // dir -1 → flows right-to-left, dir 1 → left-to-right
    const far = "calc(100vw + 110px)", nfar = "calc(-100vw - 110px)";
    const enter = dir > 0 ? nfar : far, leave = dir > 0 ? far : nfar;
    await Promise.all(
      layers.map((l, i) =>
        anim(l, [{ transform: `translateX(${enter})` }, { transform: "translateX(0)" }], { duration: 600, delay: i * 90, easing: "cubic-bezier(.55,0,.3,1)" })
      )
    );
    spawnBubbles(root.querySelector(".tx-l3"), 14);
    if (label) anim(mark, [{ opacity: 0, transform: "translate(-40%,-50%)", filter: "blur(8px)" }, { opacity: 1, transform: "translate(-50%,-50%)", filter: "blur(0)" }], { duration: 380, easing: "cubic-bezier(.22,1,.36,1)" });
    await swap();
    await wait(label ? 260 : 120);
    if (label) anim(mark, [{ opacity: 1 }, { opacity: 0, transform: "translate(-60%,-50%)" }], { duration: 300 });
    await Promise.all(
      layers
        .slice()
        .reverse()
        .map((l, i) =>
          anim(l, [{ transform: "translateX(0)" }, { transform: `translateX(${leave})` }], { duration: 660, delay: 60 + i * 90, easing: "cubic-bezier(.6,0,.25,1)" })
        )
    );
    unmount();
  }

  /* ------------------------------------------------------------------
     BASKETBALL — ball bounces in, swells into the screen, swishes through a hoop
     ------------------------------------------------------------------ */
  async function basketball(swap) {
    const W = innerWidth, H = innerHeight;
    const ball = window.Art.basketball("card").match(/<svg[\s\S]*?<\/svg>/)[0];
    const root = mount(
      `
      <div class="fillball"><svg viewBox="0 0 100 100"><g class="seams" stroke-width="1.1"><circle cx="50" cy="50" r="49"/><path d="M0 50h100M50 0v100M15 8c20 24 20 60 0 84M85 8c-20 24-20 60 0 84"/></g></svg></div>
      <svg class="t-court" viewBox="0 0 940 500" preserveAspectRatio="xMidYMid slice">
        <g><rect x="20" y="20" width="900" height="460"/><path d="M470 20v460"/><circle cx="470" cy="250" r="60"/>
        <rect x="20" y="170" width="190" height="160"/><rect x="730" y="170" width="190" height="160"/>
        <path d="M20 50h140a200 200 0 0 1 0 400H20"/><path d="M920 50H780a200 200 0 0 0 0 400h140"/></g>
      </svg>
      <svg class="t-hoop" viewBox="0 0 140 110"><rect x="20" y="2" width="100" height="54" rx="4"/><ellipse class="rim" cx="70" cy="60" rx="24" ry="5"/><path class="net" d="M48 61l6 30h32l6-30M56 62l7 29M84 62l-7 29M70 62v29M50 74h40M53 84h34"/></svg>
      <div class="tball">${ball}</div>`,
      "tx-bb"
    );
    const tb = root.querySelector(".tball"), fill = root.querySelector(".fillball"), seams = fill.querySelector("svg");
    const court = root.querySelector(".t-court"), hoop = root.querySelector(".t-hoop"), net = hoop.querySelector(".net");
    const floor = H * 0.8, cx = W / 2, cy = H / 2;
    const R = Math.hypot(W, H);
    const T = (x, y, r, sx = 1, sy = 1) => `translate(${x}px, ${y}px) rotate(${r}deg) scale(${sx}, ${sy})`;
    const fall = "cubic-bezier(.4,0,.8,.4)", rise = "cubic-bezier(.2,.6,.6,1)";

    await anim(
      tb,
      [
        { transform: T(-90, H * 0.12, 0), offset: 0, easing: fall },
        { transform: T(W * 0.2, floor, 220, 1.15, 0.85), offset: 0.34, easing: rise },
        { transform: T(W * 0.33, H * 0.36, 330), offset: 0.58, easing: fall },
        { transform: T(W * 0.43, floor, 440, 1.1, 0.9), offset: 0.8, easing: rise },
        { transform: T(cx, cy, 540), offset: 1 },
      ],
      { duration: 950, easing: "linear" }
    );

    // swell into a giant ball
    tb.style.opacity = 0;
    anim(seams, [{ transform: "rotate(0deg) scale(.6)" }, { transform: "rotate(70deg) scale(1)" }], { duration: 520, easing: "cubic-bezier(.5,0,.2,1)" });
    await anim(fill, [{ clipPath: `circle(60px at ${cx}px ${cy}px)` }, { clipPath: `circle(${R}px at ${cx}px ${cy}px)` }], { duration: 480, easing: "cubic-bezier(.6,0,.3,1)" });
    court.querySelectorAll("rect,path,circle").forEach((el, i) =>
      anim(el, [{ strokeDashoffset: 1600 }, { strokeDashoffset: 0 }], { duration: 700, delay: i * 40, easing: "cubic-bezier(.22,1,.36,1)" })
    );
    await swap();
    await wait(260);

    // shrink up into the hoop
    const hx = cx, hy = H * 0.14 + 60; // rim position inside .t-hoop
    anim(hoop, [{ opacity: 0, transform: "translateY(-20px)" }, { opacity: 1, transform: "none" }], { duration: 260, easing: "ease-out" });
    anim(court, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: 150 });
    await anim(fill, [{ clipPath: `circle(${R}px at ${cx}px ${cy}px)` }, { clipPath: `circle(26px at ${hx}px ${hy}px)` }], { duration: 560, easing: "cubic-bezier(.7,0,.3,1)" });
    anim(fill, [{ clipPath: `circle(26px at ${hx}px ${hy}px)` }, { clipPath: `circle(0px at ${hx}px ${hy + 40}px)` }], { duration: 200, easing: "ease-in" });
    anim(net, [{ transform: "scaleY(1)" }, { transform: "scaleY(1.25) scaleX(.9)" }, { transform: "scaleY(1)" }], { duration: 420, easing: "ease-out" });
    await wait(260);
    await anim(hoop, [{ opacity: 1 }, { opacity: 0, transform: "translateY(-14px)" }], { duration: 260 });
    unmount();
  }

  /* ------------------------------------------------------------------
     FORMULA 1 — start lights, lights out, car blasts past, chequered wipe
     ------------------------------------------------------------------ */
  async function f1(swap) {
    const W = innerWidth, H = innerHeight;
    const car = window.Art.f1("card").match(/<svg[\s\S]*?<\/svg>/)[0];
    let streaks = "";
    for (let i = 0; i < 16; i++) streaks += `<i class="tstreak" style="top:${8 + Math.random() * 84}%;opacity:${0.3 + Math.random() * 0.6}"></i>`;
    const root = mount(
      `<div class="f1-stage">
        <div class="asphalt"></div><div class="tkerb t"></div><div class="tkerb b"></div>
        <div class="tlights">${"<span><i></i><i></i></span>".repeat(5)}</div>
        ${streaks}
        <div class="tcar">${car}</div>
      </div>
      <div class="tred"></div><div class="tchecker"></div>`,
      "tx-f1"
    );
    const stage = root.querySelector(".f1-stage");
    stage.style.cssText = "position:absolute;inset:0;";
    const asphalt = root.querySelector(".asphalt"), lights = root.querySelector(".tlights");
    const pairs = [...lights.children];

    anim(asphalt, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: "ease-out" });
    root.querySelectorAll(".tkerb").forEach((k) => anim(k, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" }));
    await anim(lights, [{ opacity: 0, transform: "translate(-50%, -30px)" }, { opacity: 1, transform: "translate(-50%, 0)" }], { duration: 300, delay: 120, easing: "cubic-bezier(.22,1,.36,1)" });
    for (const p of pairs) { p.classList.add("on"); await wait(120); }
    const swapping = swap();
    await wait(240);
    pairs.forEach((p) => p.classList.remove("on")); // lights out — go!
    anim(lights, [{ opacity: 1 }, { opacity: 0, transform: "translate(-50%, -20px)" }], { duration: 300, delay: 120 });
    root.querySelectorAll(".tstreak").forEach((s, i) =>
      anim(s, [{ transform: "translateX(-50vw)" }, { transform: "translateX(150vw)" }], { duration: 380 + Math.random() * 200, delay: 40 + (i % 6) * 40, easing: "cubic-bezier(.5,0,.8,.6)" })
    );
    await anim(root.querySelector(".tcar"), [{ transform: "translateX(-120%)" }, { transform: `translateX(${W + 80}px)` }], { duration: 520, easing: "cubic-bezier(.6,0,.9,.6)" });
    await swapping;

    // chequered wipe — the stage's left edge follows the skewed flag
    const k = Math.tan((18 * Math.PI) / 180) * (H / 2);
    const poly = (b) => `polygon(${b + k}px 0px, ${W + 2 * k + 40}px 0px, ${W + 2 * k + 40}px ${H}px, ${b - k}px ${H}px)`;
    const b0 = -k - 120, b1 = W + k + 120, opts = { duration: 720, easing: "cubic-bezier(.6,0,.3,1)" };
    await Promise.all([
      anim(stage, [{ clipPath: poly(b0) }, { clipPath: poly(b1) }], opts),
      anim(root.querySelector(".tchecker"), [{ transform: `translateX(${b0 - 100}px) skewX(-18deg)` }, { transform: `translateX(${b1 - 100}px) skewX(-18deg)` }], opts),
      anim(root.querySelector(".tred"), [{ transform: `translateX(${b0 + 108}px) skewX(-18deg)` }, { transform: `translateX(${b1 + 108}px) skewX(-18deg)` }], opts),
    ]);
    unmount();
  }

  /* ------------------------------------------------------------------
     FOOTBALL — turf slams in from both ends, a spiral flies through, field splits at the 50
     ------------------------------------------------------------------ */
  async function football(swap) {
    const W = innerWidth, H = innerHeight;
    const ball = window.Art.football("card").match(/<svg[\s\S]*?<\/svg>/)[0];
    const labels = [10, 20, 30, 40, 50, 40, 30, 20, 10];
    const nums = (shift) =>
      labels
        .map((n, i) => {
          const x = `calc(${(i + 1) * 10}vw - ${shift}vw)`;
          return `<span class="ynum" style="left:${x};transform:translateX(-50%)">${n}</span><span class="ynum top" style="left:${x};transform:translateX(-50%) rotate(180deg)">${n}</span>`;
        })
        .join("");
    const root = mount(
      `<div class="half l"><div class="hashes"></div>${nums(0)}</div>
       <div class="half r"><div class="hashes" style="background-position:-49.5vw 0"></div>${nums(49.5)}</div>
       <div class="first-down"></div>
       <div class="tfb">${ball}</div>`,
      "tx-fb"
    );
    const L = root.querySelector(".half.l"), Rt = root.querySelector(".half.r");
    const fb = root.querySelector(".tfb");
    const kick = anim(
      fb,
      [
        { transform: `translate(${-120}px, ${H * 0.92}px) rotate(-40deg) scale(1.5)`, offset: 0 },
        { transform: `translate(${W * 0.5}px, ${H * 0.22}px) rotate(-8deg) scale(1)`, offset: 0.55 },
        { transform: `translate(${W + 160}px, ${H * 0.3}px) rotate(28deg) scale(.6)`, offset: 1 },
      ],
      { duration: 1250, delay: 150, easing: "cubic-bezier(.3,.2,.6,.9)" }
    );
    await Promise.all([
      anim(L, [{ transform: "translateY(100%)" }, { transform: "translateY(0)" }], { duration: 560, easing: "cubic-bezier(.7,0,.25,1)" }),
      anim(Rt, [{ transform: "translateY(-100%)" }, { transform: "translateY(0)" }], { duration: 560, delay: 70, easing: "cubic-bezier(.7,0,.25,1)" }),
    ]);
    const swapping = swap();
    await anim(root.querySelector(".first-down"), [{ transform: "translateX(-20px)", opacity: 0.95 }, { transform: `translateX(${W + 20}px)`, opacity: 0.95 }], { duration: 560, easing: "cubic-bezier(.5,0,.3,1)" });
    await Promise.all([kick, swapping]);
    await Promise.all([
      anim(L, [{ transform: "translate(0,0)" }, { transform: "translate(-102%,0)" }], { duration: 640, easing: "cubic-bezier(.7,0,.25,1)" }),
      anim(Rt, [{ transform: "translate(0,0)" }, { transform: "translate(102%,0)" }], { duration: 640, easing: "cubic-bezier(.7,0,.25,1)" }),
    ]);
    unmount();
  }

  /* ------------------------------------------------------------------
     PIXEL PATHOLOGY — stained pixels tile in, reticle focuses, Grad-CAM scan reveals
     ------------------------------------------------------------------ */
  async function pathology(swap, { origin } = {}) {
    const W = innerWidth, H = innerHeight;
    const size = Math.max(46, Math.ceil(W / 18));
    const cols = Math.ceil(W / size), rows = Math.ceil(H / size);
    const pal = isDark()
      ? ["#701a75", "#86198f", "#581c87", "#4c1d95", "#9d174d", "#6b21a8", "#3b0764"]
      : ["#f5d0fe", "#f0abfc", "#e9d5ff", "#fbcfe8", "#d8b4fe", "#f9a8d4", "#c4b5fd"];
    let cells = "";
    for (let i = 0; i < cols * rows; i++) cells += `<i style="background:${pal[(i * 7 + (i % cols) * 3) % pal.length]}"></i>`;
    const root = mount(`<div class="pgrid" style="grid-template-columns:repeat(${cols},${size}px);grid-auto-rows:${size}px">${cells}</div><div class="preticle"></div><div class="pscan"></div>`, "tx-px");
    const els = [...root.querySelectorAll(".pgrid i")];
    const ox = (origin || window.lastPointer).x, oy = (origin || window.lastPointer).y;
    const maxD = Math.hypot(W, H);
    await Promise.all(
      els.map((el, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const d = Math.hypot(c * size + size / 2 - ox, r * size + size / 2 - oy) / maxD;
        return anim(el, [{ transform: "scale(0) rotate(45deg)", borderRadius: "50%" }, { transform: "scale(1.04) rotate(0deg)", borderRadius: "4px" }], { duration: 380, delay: d * 520 + Math.random() * 90, easing: "cubic-bezier(.22,1,.36,1)" });
      })
    );
    const ret = root.querySelector(".preticle");
    anim(ret, [{ opacity: 0, transform: "scale(1.6) rotate(-30deg)" }, { opacity: 1, transform: "scale(1) rotate(0deg)" }], { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" });
    await swap();
    await wait(380);
    anim(ret, [{ opacity: 1 }, { opacity: 0, transform: "scale(.6)" }], { duration: 300 });
    const sweep = 820;
    const scan = anim(root.querySelector(".pscan"), [{ transform: "translateY(0)" }, { transform: `translateY(${H + 320}px)` }], { duration: sweep, easing: "linear" });
    await Promise.all([
      scan,
      ...els.map((el, i) => {
        const r = Math.floor(i / cols);
        return anim(el, [{ transform: "scale(1.04)", opacity: 1, filter: "hue-rotate(0deg) brightness(1)" }, { transform: "scale(0)", opacity: 0, filter: "hue-rotate(-140deg) brightness(1.6)" }], { duration: 300, delay: ((r * size + size) / (H + 160)) * sweep, easing: "cubic-bezier(.5,0,.75,0)" });
      }),
    ]);
    unmount();
  }

  /* ------------------------------------------------------------------
     COSMOS — deep space opens from the click, hyperspace warp, flash
     ------------------------------------------------------------------ */
  async function space(swap, { origin } = {}) {
    const W = innerWidth, H = innerHeight;
    const root = mount(`<div class="void"></div><canvas></canvas><div class="flash"></div>`, "tx-sp");
    const voidEl = root.querySelector(".void"), cv = root.querySelector("canvas"), flash = root.querySelector(".flash");
    const ox = (origin || window.lastPointer).x, oy = (origin || window.lastPointer).y;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    const cols = ["#ffffff", "#c7d2fe", "#a5b4fc", "#f0abfc", "#e0e7ff"];
    const stars = Array.from({ length: 480 }, () => ({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random(), c: cols[(Math.random() * cols.length) | 0] }));
    let speed = 0.002, running = true, last = performance.now(), t0 = last;
    const cx = W / 2, cy = H / 2, f = Math.max(W, H) * 0.5;
    function frame(now) {
      if (!running) return;
      const dt = Math.min(40, now - last); last = now;
      const el = now - t0;
      speed = el < 1100 ? 0.0004 + Math.pow(el / 1100, 2.2) * 0.03 : Math.max(0.0008, speed * 0.9);
      ctx.fillStyle = "rgba(5,6,26,0.35)";
      ctx.fillRect(0, 0, W, H);
      for (const s of stars) {
        const px = cx + (s.x / s.z) * f, py = cy + (s.y / s.z) * f;
        s.z -= speed * dt * 0.06;
        if (s.z <= 0.02) { s.x = (Math.random() - 0.5) * 2; s.y = (Math.random() - 0.5) * 2; s.z = 1; continue; }
        const nx = cx + (s.x / s.z) * f, ny = cy + (s.y / s.z) * f;
        if (nx < -50 || nx > W + 50 || ny < -50 || ny > H + 50) { s.z = 1; continue; }
        ctx.strokeStyle = s.c;
        ctx.globalAlpha = Math.min(1, (1 - s.z) * 1.4);
        ctx.lineWidth = Math.max(0.6, (1 - s.z) * 2.6);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    const R = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy));
    anim(cv, [{ clipPath: `circle(0px at ${ox}px ${oy}px)` }, { clipPath: `circle(${R}px at ${ox}px ${oy}px)` }], { duration: 620, easing: "cubic-bezier(.7,0,.3,1)" });
    await anim(voidEl, [{ clipPath: `circle(0px at ${ox}px ${oy}px)` }, { clipPath: `circle(${R}px at ${ox}px ${oy}px)` }], { duration: 620, easing: "cubic-bezier(.7,0,.3,1)" });
    await swap();
    await wait(420);
    await anim(flash, [{ opacity: 0, transform: "scale(.4)" }, { opacity: 0.95, transform: "scale(1.4)" }], { duration: 260, easing: "ease-in" });
    anim(flash, [{ opacity: 0.95 }, { opacity: 0 }], { duration: 520, easing: "ease-out" });
    await Promise.all([
      anim(voidEl, [{ opacity: 1 }, { opacity: 0 }], { duration: 560, easing: "ease-out" }),
      anim(cv, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.25)" }], { duration: 600, easing: "ease-out" }),
    ]);
    running = false;
    unmount();
  }

  /* ------------------------------------------------------------------ */
  async function fade(swap) {
    const root = mount("", "tx-fade");
    await anim(root, [{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    await swap();
    await anim(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 220 });
    unmount();
  }

  const themed = { basketball, f1, football, pathology, space };

  window.Transitions = {
    run(type, swap, opts = {}) {
      if (reduce) return fade(swap);
      if (type === "wave") return wave(swap, opts);
      if (type === "stream") return stream(swap, opts);
      if (themed[type]) return themed[type](swap, opts);
      return wave(swap, opts);
    },
  };
})();

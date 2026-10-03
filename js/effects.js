/* ==========================================================================
   EFFECTS — ambient bubbles, click ripples, reveals, counters, typer, tilt
   ========================================================================== */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* ---------- Ambient bubbles canvas ---------- */
  const Bubbles = (() => {
    const cv = document.getElementById("bubbles");
    const ctx = cv.getContext("2d");
    let w, h, dpr, items = [], color = "#0891b2", running = true, mx = 0, my = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(46, (w * h) / 32000));
      items = Array.from({ length: count }, () => spawn(true));
    }
    function spawn(anywhere) {
      const r = Math.random() ** 2 * 9 + 1.5;
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + 20 + Math.random() * 60,
        r,
        vy: 0.15 + r * 0.045 + Math.random() * 0.2,
        phase: Math.random() * Math.PI * 2,
        amp: 0.3 + Math.random() * 0.6,
        depth: 0.3 + Math.random() * 0.7,
      };
    }
    function refreshColor() { color = css("--accent") || color; }
    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      for (const b of items) {
        b.y -= b.vy;
        b.x += Math.sin(t / 1400 + b.phase) * b.amp * 0.4;
        if (b.y < -20) Object.assign(b, spawn(false));
        const px = b.x + mx * 14 * b.depth, py = b.y + my * 10 * b.depth;
        ctx.globalAlpha = 0.12 + b.depth * 0.18;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(px, py, b.r, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha *= 0.35;
        ctx.beginPath(); ctx.arc(px - b.r * 0.35, py - b.r * 0.35, b.r * 0.3, 0, Math.PI * 2); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
    document.addEventListener("visibilitychange", () => {
      running = !document.hidden;
      if (running) requestAnimationFrame(frame);
    });
    resize(); refreshColor();
    if (!reduce) requestAnimationFrame(frame);
    return { refreshColor };
  })();

  /* ---------- Click ripples ---------- */
  window.lastPointer = { x: innerWidth / 2, y: innerHeight / 2 };
  document.addEventListener("pointerdown", (e) => {
    window.lastPointer = { x: e.clientX, y: e.clientY };
    if (reduce || e.pointerType === "touch" && e.isPrimary === false) return;
    for (const cls of ["ripple", "ripple r2"]) {
      const r = document.createElement("span");
      r.className = cls;
      r.style.left = e.clientX + "px";
      r.style.top = e.clientY + "px";
      document.body.appendChild(r);
      r.addEventListener("animationend", () => r.remove());
    }
  });

  /* ---------- Scroll reveal ---------- */
  let io;
  function observeReveals(root) {
    if (io) io.disconnect();
    io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    root.querySelectorAll(".reveal").forEach((el) => io.observe(el));
  }

  /* ---------- Count-up numbers ---------- */
  function initCounters(root) {
    const els = root.querySelectorAll("[data-count]");
    const cio = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      cio.unobserve(en.target);
      const el = en.target, end = +el.dataset.count, suf = el.dataset.suffix || "";
      if (reduce) { el.textContent = end.toLocaleString("en-US") + suf; return; }
      const dur = 1600 + Math.min(900, Math.log10(end + 1) * 200), t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(end * e).toLocaleString("en-US") + suf;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }), { threshold: 0.4 });
    els.forEach((el) => cio.observe(el));
  }

  /* ---------- Typer ---------- */
  let typerTimer;
  function initTyper(root) {
    clearTimeout(typerTimer);
    const el = root.querySelector(".typer");
    if (!el) return;
    const words = JSON.parse(el.dataset.words);
    let wi = 0, ci = 0, del = false;
    const tick = () => {
      if (!el.isConnected) return;
      const word = words[wi];
      ci += del ? -1 : 1;
      el.textContent = word.slice(0, ci);
      let wait = del ? 38 : 75;
      if (!del && ci === word.length) { del = true; wait = 1900; }
      else if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; wait = 350; }
      typerTimer = setTimeout(tick, wait);
    };
    typerTimer = setTimeout(tick, 1100);
  }

  /* ---------- Card tilt + glare ---------- */
  function initTilt(root) {
    if (reduce || matchMedia("(hover: none)").matches) return;
    root.querySelectorAll("[data-tilt]").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 7}deg) rotateY(${(x - 0.5) * 9}deg) translateY(-6px)`;
        card.style.setProperty("--gx", x * 100 + "%");
        card.style.setProperty("--gy", y * 100 + "%");
      });
      card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
  }

  /* ---------- Hero orb parallax ---------- */
  function initParallax(root) {
    const el = root.querySelector("[data-parallax]");
    if (!el || reduce) return;
    const onMove = (e) => {
      if (!el.isConnected) return window.removeEventListener("pointermove", onMove);
      const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
      el.style.transform = `translate(${x * -22}px, ${y * -18}px)`;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
  }

  window.Effects = {
    reduce,
    refreshColors: () => Bubbles.refreshColor(),
    hydrate(root) {
      observeReveals(root);
      initCounters(root);
      initTyper(root);
      initTilt(root);
      initParallax(root);
    },
  };
})();

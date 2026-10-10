/* ==========================================================================
   EFFECTS — reveals, counters, typer, tilt
   ========================================================================== */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Reveal: everything on a tab fades in as soon as it opens (staggered by --d), not as you scroll to it ---------- */
  function revealAll(root) {
    const els = root.querySelectorAll(".reveal");
    requestAnimationFrame(() => requestAnimationFrame(() => els.forEach((el) => el.classList.add("in"))));
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
    hydrate(root) {
      revealAll(root);
      initCounters(root);
      initTyper(root);
      initTilt(root);
      initParallax(root);
    },
  };
})();

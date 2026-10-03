/* ==========================================================================
   APP — hash router, tab blob, theme switch, per-page wiring
   ========================================================================== */
(function () {
  const S = window.SITE;
  const view = document.getElementById("view");
  const tabsEl = document.querySelector(".tabs");
  const blob = tabsEl.querySelector(".tab-blob");
  const tabLinks = [...tabsEl.querySelectorAll("a[data-tab]")];
  const ORDER = ["home", "about", "experience", "projects", "skills", "contact"];
  const LABELS = { home: "Home", about: "About", experience: "Experience", projects: "Projects", skills: "Skills", contact: "Contact" };
  const reduce = window.Effects.reduce;

  /* ---------------- Routing ---------------- */
  function parse(hash) {
    const parts = (hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
    const tab = ORDER.includes(parts[0]) ? parts[0] : "home";
    const sub = parts.length > 1 ? decodeURIComponent(parts.slice(1).join("/")) : null;
    return { tab, sub, key: tab + "/" + (sub || "") };
  }
  const projectOf = (r) => (r && r.tab === "projects" && r.sub ? S.projects.find((p) => p.id === r.sub) : null);

  function render(route) {
    const p = projectOf(route);
    if (p) view.innerHTML = Views.project(p.id);
    else if (route.tab === "skills") view.innerHTML = Views.skills(route.sub);
    else view.innerHTML = (Views[route.tab] || Views.notFound)();

    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = `${p ? p.name : LABELS[route.tab]} · ${S.profile.name}`;
    const page = view.firstElementChild;
    Effects.hydrate(view);
    hydrate(route);
    setTimeout(() => page && page.classList.add("entered"), 1700);
  }

  function pick(from, to) {
    const p = projectOf(to);
    if (p) return { type: p.theme, opts: {} };
    if (projectOf(from)) return { type: "stream", opts: { dir: -1, label: LABELS[to.tab] } };
    const dir = ORDER.indexOf(to.tab) >= ORDER.indexOf(from.tab) ? 1 : -1;
    return { type: "wave", opts: { dir, label: LABELS[to.tab] } };
  }

  let current = null, busy = false, queued = false;
  async function go() {
    if (busy) { queued = true; return; }
    const next = parse(location.hash);
    if (current && next.key === current.key) return;
    busy = true;
    const from = current;
    current = next;
    moveBlob(next.tab);
    const swap = () => new Promise((res) => { render(next); requestAnimationFrame(() => res()); });

    try {
      if (!from) {
        await Transitions.run("wave", swap, { startCovered: true, label: S.profile.first });
      } else if (from.tab === next.tab && !projectOf(from) && !projectOf(next)) {
        // same section, different focus — no full-screen transition
        await swap();
      } else {
        const t = pick(from, next);
        await Transitions.run(t.type, swap, t.opts);
      }
    } catch (err) {
      console.error(err);
      document.getElementById("transition").className = "transition-layer";
      document.getElementById("transition").innerHTML = "";
    }
    busy = false;
    if (queued) { queued = false; go(); }
  }

  /* ---------------- Liquid tab blob ---------------- */
  let blobPos = null;
  function moveBlob(tab, instant) {
    const a = tabLinks.find((t) => t.dataset.tab === tab);
    tabLinks.forEach((t) => t.classList.toggle("active", t === a));
    tabLinks.forEach((t) => (t === a ? t.setAttribute("aria-current", "page") : t.removeAttribute("aria-current")));
    if (!a) return;
    const to = { left: a.offsetLeft, width: a.offsetWidth };
    blob.style.left = to.left + "px";
    blob.style.width = to.width + "px";
    blob.style.opacity = 1;
    if (blobPos && !instant && !reduce && blobPos.left !== to.left) {
      const L = Math.min(blobPos.left, to.left), R = Math.max(blobPos.left + blobPos.width, to.left + to.width);
      blob.animate(
        [
          { left: blobPos.left + "px", width: blobPos.width + "px" },
          { left: L + "px", width: R - L + "px", offset: 0.45 },
          { left: to.left + "px", width: to.width + "px" },
        ],
        { duration: 700, easing: "cubic-bezier(.65,0,.35,1)" }
      );
    }
    blobPos = to;
    if (tabsEl.scrollWidth > tabsEl.clientWidth) {
      tabsEl.scrollTo({ left: to.left - tabsEl.clientWidth / 2 + to.width / 2, behavior: "smooth" });
    }
  }
  window.addEventListener("resize", () => current && moveBlob(current.tab, true));
  document.fonts && document.fonts.ready.then(() => current && moveBlob(current.tab, true));

  /* ---------------- Theme switch ---------------- */
  const sw = document.getElementById("themeSwitch");
  const getTheme = () => document.documentElement.getAttribute("data-theme");
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("sk-theme", t); } catch (e) {}
    sw.setAttribute("aria-checked", String(t === "dark"));
    Effects.refreshColors();
  }
  sw.setAttribute("aria-checked", String(getTheme() === "dark"));
  sw.addEventListener("click", () => {
    const next = getTheme() === "dark" ? "light" : "dark";
    if (!document.startViewTransition || reduce) return setTheme(next);
    const r = sw.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const style = document.createElement("style");
    style.textContent = "*,*::before,*::after{transition:none!important}";
    const vt = document.startViewTransition(() => { document.head.appendChild(style); setTheme(next); });
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] },
        { duration: 800, easing: "cubic-bezier(.65,0,.35,1)", pseudoElement: "::view-transition-new(root)" }
      );
    });
    vt.finished.finally(() => style.remove());
  });

  /* ---------------- Per-page wiring ---------------- */
  function hydrate(route) {
    if (route.tab === "experience" && route.sub) {
      const card = view.querySelector(`#exp-${CSS.escape(route.sub)} .exp-card`);
      if (card) {
        setTimeout(() => {
          card.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
          card.classList.add("focus");
          setTimeout(() => card.classList.remove("focus"), 2600);
        }, 500);
      }
    }
    if (route.tab === "skills") wireSkills(route.sub);

    view.querySelectorAll("[data-copy]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(btn.dataset.copy); } catch (e) { return; }
        btn.classList.add("copied");
        btn.setAttribute("aria-label", "Copied!");
        setTimeout(() => btn.classList.remove("copied"), 1400);
      })
    );
  }

  function wireSkills(focus) {
    const seg = view.querySelector(".seg");
    const segBlob = seg.querySelector(".seg-blob");
    const buttons = [...seg.querySelectorAll("button")];
    const panels = [...view.querySelectorAll(".skills-panel")];
    const flow = view.querySelector(".skill-flow");
    const chipsEls = [...view.querySelectorAll(".skill-chip")];

    const placeBlob = () => {
      const b = buttons.find((x) => x.getAttribute("aria-selected") === "true");
      segBlob.style.width = b.offsetWidth + "px";
      segBlob.style.transform = `translateX(${b.offsetLeft - 5}px)`;
    };
    function setMode(mode) {
      buttons.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === mode)));
      panels.forEach((p) => {
        const show = p.dataset.panel === mode;
        p.hidden = !show;
        if (show) {
          p.style.animation = "none"; p.offsetHeight; p.style.animation = "";
          p.querySelectorAll(".reveal").forEach((r) => r.classList.add("in"));
        }
      });
      placeBlob();
      if (mode === "skill" && !chipsEls.some((c) => c.classList.contains("on"))) select(S.skills[0].name);
    }
    function select(name, fromUser) {
      chipsEls.forEach((c) => c.classList.toggle("on", c.dataset.skill === name));
      flow.innerHTML = Views.skillFlow(name);
      if (!reduce) flow.animate([{ opacity: 0.4, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: "cubic-bezier(.22,1,.36,1)" });
      const hash = "#/skills/" + encodeURIComponent(name);
      history.replaceState(null, "", hash);
      current = parse(hash);
      if (fromUser && innerWidth < 1000) flow.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    buttons.forEach((b) => b.addEventListener("click", () => {
      setMode(b.dataset.mode);
      if (b.dataset.mode === "project") { history.replaceState(null, "", "#/skills"); current = parse("#/skills"); }
    }));
    chipsEls.forEach((c) => c.addEventListener("click", () => select(c.dataset.skill, true)));
    view.querySelectorAll("[data-goto-skill]").forEach((c) =>
      c.addEventListener("click", () => {
        setMode("skill");
        select(c.dataset.gotoSkill, true);
        window.scrollTo({ top: seg.getBoundingClientRect().top + scrollY - 110, behavior: "smooth" });
      })
    );

    if (focus && S.skills.some((s) => s.name === focus)) { setMode("skill"); select(focus); }
    else if (focus) setMode("skill");
    requestAnimationFrame(placeBlob);
    document.fonts && document.fonts.ready.then(placeBlob);
  }

  /* ---------------- Boot ---------------- */
  if (!location.hash) history.replaceState(null, "", "#/home");
  window.addEventListener("hashchange", go);
  go();
})();

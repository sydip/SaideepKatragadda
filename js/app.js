/* ==========================================================================
   APP — separate tabs, each its own page with its own scroll.
   Hash routes:  #/home  #/about  #/experience  #/projects  #/skills  #/contact
                 #/experience/<id> → that tab, with that role highlighted
                 #/projects/<id>   → that tab, with that project's pop-up open
   Switching tabs fades from one to the next (see transitions.js).
   ========================================================================== */
(function () {
  const S = window.SITE;
  const view = document.getElementById("view");
  const ORDER = ["home", "about", "experience", "projects", "skills", "contact"];
  const LABELS = { home: "Home", about: "About", experience: "Experience", projects: "Projects", skills: "Skills", contact: "Contact" };
  const reduce = window.Effects.reduce;
  const Scene = window.Scene;

  /* ---------------- Routing ---------------- */
  function parse(hash) {
    const parts = (hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
    const tab = ORDER.includes(parts[0]) ? parts[0] : "home";
    const sub = parts.length > 1 ? decodeURIComponent(parts.slice(1).join("/")) : null;
    return { tab, sub };
  }

  function render(route) {
    view.innerHTML = Views.tab(route.tab);
    window.scrollTo({ top: 0, behavior: "instant" });
    document.title = route.tab === "home" ? S.profile.name : `${LABELS[route.tab]} · ${S.profile.name}`;
    document.body.dataset.route = route.tab;
    Effects.hydrate(view);
    wire();
    Scene.attach(route.tab === "home" ? view.querySelector(".head-anchor") : null);
    SkillBrain.mount(route.tab === "skills" ? view.querySelector(".brain-stage") : null, openSkills);
    showTab(route.tab);
    const page = view.firstElementChild;
    setTimeout(() => page && page.classList.add("entered"), 1700);
  }

  /* ---------------- Navigation ---------------- */
  let current = null, busy = false, queued = false;
  async function go() {
    if (busy) { queued = true; return; }
    const next = parse(location.hash);
    // same tab, different detail (a role or a project): no transition
    if (current && next.tab === current.tab) { current = next; afterArrive(next); return; }
    busy = true;
    const first = !current;
    current = next;
    closeProject();
    try {
      const swap = () => new Promise((res) => { render(next); requestAnimationFrame(() => res()); });
      await Transitions.run(swap, { startCovered: first });
      afterArrive(next);
    } catch (err) {
      console.error(err);
      document.getElementById("transition").className = "transition-layer";
      document.getElementById("transition").innerHTML = "";
    }
    busy = false;
    if (queued) { queued = false; go(); }
  }

  /** Extras once a tab is showing: highlight a role, or open a project's pop-up */
  function afterArrive(route) {
    if (route.tab === "experience" && route.sub) {
      const card = view.querySelector(`#exp-${CSS.escape(route.sub)} .exp-card`);
      if (!card) return;
      card.classList.add("in");
      card.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "center" });
      card.classList.add("focus");
      setTimeout(() => card.classList.remove("focus"), 2600);
    }
    if (route.tab === "projects" && route.sub) openProject(route.sub);
  }

  /* ---------------- Top tabs ---------------- */
  const tabLinks = [...document.querySelectorAll("#topnav a")];
  function showTab(tab) {
    tabLinks.forEach((a) => {
      const on = a.dataset.tab === tab;
      a.classList.toggle("on", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }
  tabLinks.forEach((a) =>
    a.addEventListener("click", (e) => {
      // the tab you're already on: back to its top
      if (current && a.dataset.tab === current.tab) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: reduce ? "instant" : "smooth" });
      }
    })
  );

  /* ---------------- Pop-ups: a project's summary + GitHub link, or a brain region's skills ---------------- */
  let popEl = null, popOpener = null;
  const openProject = (id) => openPop(Views.projectPopup(id));
  function openSkills(id) {
    if (!openPop(Views.skillPopup(id))) return;
    SkillBrain.hold(id); // the region stays lit while its skills are showing
  }
  function openPop(html) {
    closeProject();
    if (!html) return false;
    popOpener = document.activeElement;
    popEl = document.createElement("div");
    popEl.className = "pop";
    popEl.innerHTML = html;
    document.body.appendChild(popEl);
    lockScroll(true);
    popEl.addEventListener("click", (e) => { if (e.target === popEl || e.target.closest(".pop-close")) closeProject(); });
    requestAnimationFrame(() => popEl && popEl.classList.add("open"));
    popEl.querySelector(".pop-close").focus({ preventScroll: true });
    return true;
  }
  /** the page behind an open pop-up can't scroll (the scrollbar's width is kept, so nothing shifts) */
  function lockScroll(on) {
    const root = document.documentElement;
    if (on) document.body.style.paddingRight = window.innerWidth - root.clientWidth + "px";
    else document.body.style.paddingRight = "";
    root.classList.toggle("pop-open", on);
  }
  function closeProject() {
    if (!popEl) return;
    const el = popEl;
    popEl = null;
    el.classList.remove("open");
    SkillBrain.hold(null);
    lockScroll(false);
    setTimeout(() => el.remove(), reduce ? 0 : 300);
    if (popOpener && popOpener.isConnected) popOpener.focus({ preventScroll: true });
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeProject(); });
  // project cards open the pop-up in place
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#/projects/"]');
    if (!a || !view.contains(a)) return;
    e.preventDefault();
    openProject(decodeURIComponent(a.getAttribute("href").split("/")[2]));
  });

  function wire() {
    view.querySelectorAll("[data-copy]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(btn.dataset.copy); } catch (e) { return; }
        btn.classList.add("copied");
        btn.setAttribute("aria-label", "Copied!");
        setTimeout(() => btn.classList.remove("copied"), 1400);
      })
    );
  }

  /* ---------------- Boot ---------------- */
  if (!location.hash) history.replaceState(null, "", "#/home");
  window.addEventListener("hashchange", go);
  go();
})();

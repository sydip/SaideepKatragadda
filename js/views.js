/* ==========================================================================
   VIEWS — each returns an HTML string for one routed page.
   ========================================================================== */
(function () {
  const S = window.SITE;
  const fmt = (n) => n.toLocaleString("en-US");
  const byId = (list, id) => list.find((x) => x.id === id);

  /* ---------- Icons ---------- */
  const I = {
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M6.6 3.5h2.8l1.4 4.2-2 1.4a12 12 0 0 0 6.1 6.1l1.4-2 4.2 1.4v2.8a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 10.5V16M8 7.8v.1M11.5 16v-5.5M11.5 13c0-1.7 1-2.6 2.3-2.6s2.2.9 2.2 2.6V16"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    github: '<svg viewBox="0 0 24 24"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    cap: '<svg viewBox="0 0 24 24"><path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/></svg>',
    chip: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    layers: '<svg viewBox="0 0 24 24"><path d="M12 3 3 8l9 5 9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
    nodes: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8 7.5 10.8 16M16 7.5 13.2 16M8.5 6h7"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
  };

  /* ---------- Small helpers ---------- */
  // Letters animate individually; words stay unbroken (wrap only between words)
  const splitWord = (text, offset = 0) => {
    let i = offset;
    return text
      .split(" ")
      .map((w) => `<span class="word">${[...w].map((ch) => `<span class="ch" style="--i:${i++}">${ch}</span>`).join("")}</span>`)
      .join(" ");
  };

  const pageHead = (num, eyebrow, title, lede) => `
    <header class="page-head">
      <p class="eyebrow reveal"><span class="eyebrow-num">${num}</span>${eyebrow}</p>
      <h2 class="page-title reveal" style="--d:1">${title}</h2>
      ${lede ? `<p class="lede reveal" style="--d:2">${lede}</p>` : ""}
    </header>`;

  const footer = () => `
    <footer class="site-footer reveal">
      <div class="footer-trace" aria-hidden="true"><i></i></div>
      <p>© ${new Date().getFullYear()} ${S.profile.name}</p>
    </footer>`;

  const chips = (arr, cls = "chip") => arr.map((t) => `<span class="${cls}">${t}</span>`).join("");

  const skillsFor = (id) => S.skills.filter((s) => s.links.includes(id));

  const statTile = (s, i) => {
    const inner = s.text != null
      ? `<span class="stat-num">${s.text}</span>`
      : `<span class="stat-num" data-count="${s.value}" data-suffix="${s.suffix || ""}">0${s.suffix || ""}</span>`;
    return `<div class="stat reveal" style="--d:${i}">${inner}<span class="stat-label">${s.label}</span></div>`;
  };

  const projectCard = (p, i) => `
    <a class="proj-card reveal" href="#/projects/${p.id}" style="--d:${i}" data-tilt>
      <div class="pc-body">
        <p class="pc-kicker">${p.kicker}</p>
        <h3 class="pc-name">${p.name}</h3>
        <p class="pc-tag">${p.tagline}</p>
        <span class="pc-cta" aria-hidden="true">${I.github}<span>GitHub</span></span>
      </div>
      <span class="pc-glare" aria-hidden="true"></span>
    </a>`;

  /* ======================================================================
     PAGES
     ====================================================================== */
  const Views = {};

  /**
   * The home tab: name, typed role and links on the left; the wireframe head
   * (drawn by head.js on the scene canvas over .head-anchor) on the right.
   */
  Views.home = () => {
    const P = S.profile;
    return `
    <section class="page page-home" id="sec-home" data-sec="home">
          <div class="hero">
            <div class="hero-copy">
              <p class="eyebrow reveal"><span class="pulse-dot"></span>Computer Science · Texas A&amp;M University</p>
              <h1 class="hero-name" aria-label="${P.name}">
                <span class="hn-line">${splitWord(P.first)}</span>
                <span class="hn-line accent">${splitWord(P.last, P.first.length)}</span>
              </h1>
              <p class="hero-role reveal" style="--d:3">
                <span class="role-pre">Building as a </span><span class="typer" data-words='${JSON.stringify(P.buildingAs)}'></span><span class="caret" aria-hidden="true"></span>
              </p>
              <nav class="hero-links reveal" style="--d:4" aria-label="Resume and profiles">
                <a href="${P.resume}" target="_blank" rel="noopener">Resume</a>
                <a href="${P.linkedin}" target="_blank" rel="noopener">LinkedIn</a>
                <a href="${P.github}" target="_blank" rel="noopener">GitHub</a>
                <a href="mailto:${P.email}">Email</a>
              </nav>
            </div>
            <div class="hero-visual reveal" style="--d:2" aria-hidden="true">
              <div class="orb-wrap">
                <div class="head-anchor"></div>
              </div>
            </div>
          </div>
    </section>`;
  };

  /** One tab, on its own (every tab but home ends with the footer) */
  Views.tab = (tab) =>
    tab === "home" ? Views.home() : (Views[tab] || Views.notFound)() + `<div class="page page-end">${footer()}</div>`;

  Views.about = () => {
    const E = S.education;
    return `
    <section class="page section" id="sec-about" data-sec="about">
      ${pageHead("01", "About", "About Me", "")}
      <p class="about-intro reveal">${S.profile.about}</p>
      <div class="about-grid">
        <article class="card edu-card reveal">
          <div class="edu-icon">${I.cap}</div>
          <p class="card-kicker">${E.dates}</p>
          <h3>${E.school}</h3>
          <p class="edu-degree">${E.degree}</p>
          <p class="muted inline-icon">${I.pin}${E.location}</p>
        </article>

        <article class="card reveal" style="--d:1">
          <div class="card-head">${I.users}<h3>Organizations</h3></div>
          <ul class="org-list">
            ${E.organizations.map((o) => `<li><span class="node-dot"></span>${o}</li>`).join("")}
          </ul>
        </article>

        <article class="card coursework-card reveal" style="--d:2">
          <div class="card-head">${I.book}<h3>Relevant coursework</h3></div>
          <div class="course-grid">
            ${E.coursework.map((c, i) => `<div class="course" style="--d:${i}">${c.code ? `<span class="course-code">${c.code}</span>` : ""}<span>${c.name}</span></div>`).join("")}
          </div>
        </article>

        <article class="card focus-card reveal" style="--d:3">
          <div class="card-head">${I.chip}<h3>What I'm focused on</h3></div>
          <ul class="focus-list">
            <li><b>Forecasting</b> — leading a 6-person team predicting airline market demand for American Airlines.</li>
            <li><b>Simulation research</b> — agent-based models of exoskeleton adoption in construction.</li>
            <li><b>Sports analytics</b> — end-to-end ML platforms for the NBA, NFL, and Formula 1.</li>
            <li><b>Interpretable ML</b> — Grad-CAM explainability for medical imaging.</li>
          </ul>
        </article>
      </div>
      
    </section>`;
  };

  Views.experience = () => {
    // current roles first, otherwise in the order they're listed (newest first)
    const roles = S.experience.filter((e) => e.current).concat(S.experience.filter((e) => !e.current));
    return `
    <section class="page section" id="sec-experience" data-sec="experience">
      ${pageHead("02", "Experience", "Where I've Worked", "")}
      <div class="exp-grid">
        ${roles
          .map(
            (e, i) => `
          <article class="exp" id="exp-${e.id}">
            <div class="card exp-card reveal${e.current ? " is-current" : ""}" style="--d:${i % 2}">
              <div class="exp-top">
                ${e.current
                  ? '<span class="live-badge sm"><span class="pulse-dot"></span>Current role</span>'
                  : '<span class="past-badge">Past role</span>'}
                <span class="exp-loc">${I.pin}${e.location}</span>
              </div>
              <p class="card-kicker exp-dates">${e.dates}</p>
              <h3>${e.role}</h3>
              <p class="exp-org">${I.briefcase}${e.org}</p>
              <ul class="bullets">${e.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
            </div>
          </article>`
          )
          .join("")}
      </div>
      
    </section>`;
  };

  Views.projects = () => `
    <section class="page section" id="sec-projects" data-sec="projects">
      ${pageHead("03", "Projects", "Things I've built", "")}
      <div class="proj-grid">${S.projects.map(projectCard).join("")}</div>
      
    </section>`;

  Views.project = (id) => {
    const p = byId(S.projects, id);
    if (!p) return Views.notFound();
    const idx = S.projects.indexOf(p);
    const prev = S.projects[(idx - 1 + S.projects.length) % S.projects.length];
    const next = S.projects[(idx + 1) % S.projects.length];
    const linked = skillsFor(p.id);
    return `
    <section class="page project-page">
      <a class="back-link reveal" href="#/projects">${I.back}<span>All projects</span></a>

      <header class="pp-hero">
        <div class="pp-copy">
          <p class="pp-kicker reveal">${p.kicker} · ${p.dates}</p>
          <h1 class="pp-title">${splitWord(p.name)}</h1>
          <p class="pp-tag reveal" style="--d:2">${p.tagline}</p>
          <div class="chips reveal" style="--d:3">${chips(p.stack)}</div>
        </div>
      </header>

      <div class="pp-stats">${p.stats.map(statTile).join("")}</div>

      <div class="pp-body">
        <article class="card pp-built reveal">
          <h3>What I built</h3>
          <ul class="bullets">${p.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
        </article>
        <aside class="card pp-skills reveal" style="--d:1">
          <h3>Skills in this project</h3>
          <div class="chips">${
            linked.length
              ? chips(linked.map((s) => s.name))
              : '<p class="muted">Detailed skills coming soon.</p>'
          }</div>
        </aside>
      </div>

      <nav class="pp-nav">
        <a class="pp-nav-link reveal" href="#/projects/${prev.id}">${I.back}<span><small>Previous</small>${prev.name}</span></a>
        <a class="pp-nav-link next reveal" href="#/projects/${next.id}"><span><small>Next</small>${next.name}</span>${I.arrow}</a>
      </nav>
      ${footer()}
    </section>`;
  };

  /** Skills: the brain diagram (drawn by skillbrain.js), one region per category */
  Views.skills = () => `
    <section class="page section" id="sec-skills" data-sec="skills">
      ${pageHead("04", "Skills", "Skills", "")}
      <div class="brain-stage reveal" style="--d:2">
        <canvas aria-hidden="true"></canvas>
        <div class="region-tags">
          ${S.skillBrain.map((c) => `<button class="region-tag" data-region="${c.id}"><i aria-hidden="true"></i><span>${c.name}</span></button>`).join("")}
        </div>
      </div>
    </section>`;

  /** Pop-up for one region of the brain: its skills */
  Views.skillPopup = (id) => {
    const c = S.skillBrain.find((x) => x.id === id);
    if (!c) return "";
    return `
      <div class="pop-card" role="dialog" aria-modal="true" aria-labelledby="pop-title">
        <button class="pop-close" aria-label="Close">${I.close}</button>
        <p class="pc-kicker">${c.region} · ${c.note}</p>
        <h3 class="pop-title" id="pop-title">${c.name}</h3>
        <div class="chips">${chips(c.skills)}</div>
      </div>`;
  };

  Views.contact = () => {
    const P = S.profile;
    return `
    <section class="page page-contact section" id="sec-contact" data-sec="contact">
      ${pageHead("05", "Contact", "Let's connect", "Open to internships, research collaborations, and interesting data problems. The fastest way to reach me is email.")}
      <div class="contact-grid">
        <div class="contact-cards">
          <div class="card contact-card reveal">
            <span class="cc-icon">${I.mail}</span>
            <span class="cc-text"><small>Email</small><a href="mailto:${P.email}">${P.email}</a></span>
            <button class="icon-btn" data-copy="${P.email}" aria-label="Copy email">${I.copy}</button>
          </div>
          <div class="card contact-card reveal" style="--d:1">
            <span class="cc-icon">${I.phone}</span>
            <span class="cc-text"><small>Phone</small><a href="tel:+1${P.phone.replace(/\D/g, "")}">${P.phone}</a></span>
            <button class="icon-btn" data-copy="${P.phone}" aria-label="Copy phone">${I.copy}</button>
          </div>
          <a class="card contact-card reveal" style="--d:2" href="${P.linkedin}" target="_blank" rel="noopener">
            <span class="cc-icon">${I.linkedin}</span>
            <span class="cc-text"><small>LinkedIn</small><span>${P.linkedinLabel}</span></span>
            <span class="icon-btn">${I.arrow}</span>
          </a>
          <a class="card contact-card reveal" style="--d:3" href="${P.github}" target="_blank" rel="noopener">
            <span class="cc-icon">${I.github}</span>
            <span class="cc-text"><small>GitHub</small><span>${P.githubLabel}</span></span>
            <span class="icon-btn">${I.arrow}</span>
          </a>
        </div>

        <div class="signal-scene reveal" style="--d:2" aria-hidden="true">
          <svg class="signal" viewBox="0 0 320 320">
            <g class="sig-traces">
              <path d="M184 160h46l18-18h56"/><path d="M184 172h34l14 14h72"/><path d="M184 148h30l14-14h20l16-16h40"/>
              <path d="M136 160H90l-18 18H16"/><path d="M136 148h-34l-14-14H16"/><path d="M136 172h-30l-14 14H72l-16 16H16"/>
              <path d="M160 136V92l-18-18V16"/><path d="M172 136v-30l14-14V16"/><path d="M148 184v40l-14 14v66"/><path d="M172 184v34l14 14v72"/>
            </g>
            <g class="sig-pads"><circle cx="304" cy="142" r="3"/><circle cx="304" cy="186" r="3"/><circle cx="304" cy="118" r="3"/><circle cx="16" cy="178" r="3"/><circle cx="16" cy="134" r="3"/><circle cx="16" cy="202" r="3"/><circle cx="142" cy="16" r="3"/><circle cx="186" cy="16" r="3"/><circle cx="134" cy="304" r="3"/><circle cx="186" cy="304" r="3"/></g>
            <g class="sig-flow">
              <path d="M184 160h46l18-18h56"/><path d="M136 172h-30l-14 14H72l-16 16H16"/><path d="M172 136v-30l14-14V16"/><path d="M148 184v40l-14 14v66"/>
            </g>
            <rect class="sig-chip" x="130" y="130" width="60" height="60" rx="8"/>
            <path class="sig-mail" d="M146 150h28v20h-28zM146 151l14 10 14-10"/>
          </svg>
        </div>
      </div>
    </section>`;
  };

  Views.notFound = () => `
    <section class="page">
      ${pageHead("404", "Signal lost", "This page isn't on the circuit", "")}
      <a class="btn primary" href="#/home"><span>Back home</span>${I.arrow}</a>
    </section>`;

  /** Pop-up for a project: its summary and a link to the GitHub repo */
  /** Pop-up for a project: the full write-up (what I built, then its stats), its tech stack and the GitHub link */
  Views.projectPopup = (id) => {
    const p = byId(S.projects, id);
    if (!p) return "";
    const link = p.github
      ? `<a class="pop-link" href="${p.github}" target="_blank" rel="noopener">View on GitHub</a>`
      : `<span class="pop-link is-disabled">GitHub link coming soon</span>`;
    // the stack: this project's skills, grouped the way the Skills tab's brain groups them
    const used = new Set(skillsFor(p.id).map((k) => k.name));
    const stack = S.skillBrain.map((c) => ({ name: c.name, skills: c.skills.filter((k) => used.has(k)) })).filter((c) => c.skills.length);
    const stat = (s) => `<div class="pop-stat"><b>${s.text != null ? s.text : fmt(s.value) + (s.suffix || "")}</b><span>${s.label}</span></div>`;
    return `
      <div class="pop-card wide" role="dialog" aria-modal="true" aria-labelledby="pop-title">
        <button class="pop-close" aria-label="Close">${I.close}</button>
        <p class="pc-kicker">${p.kicker} · ${p.dates}</p>
        <h3 class="pop-title" id="pop-title">${p.name}</h3>
        <p class="pc-tag">${p.tagline}</p>
        <h4 class="pop-sub">What I built</h4>
        <ul class="bullets">${p.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
        ${p.stats && p.stats.length ? `<div class="pop-stats">${p.stats.map(stat).join("")}</div>` : ""}
        ${stack.length ? `<h4 class="pop-sub">Tech stack</h4>
        <div class="pop-stack">${stack.map((c) => `<div class="stack-row"><span class="stack-cat">${c.name}</span><div class="chips small">${chips(c.skills)}</div></div>`).join("")}</div>` : ""}
        ${link}
      </div>`;
  };

  window.Views = Views;
})();

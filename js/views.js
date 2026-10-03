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
    github: '<svg viewBox="0 0 24 24"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
    cap: '<svg viewBox="0 0 24 24"><path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/></svg>',
    award: '<svg viewBox="0 0 24 24"><circle cx="12" cy="9" r="6"/><path d="m8.5 14-1.5 8 5-3 5 3-1.5-8"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/></svg>',
    wave: '<svg viewBox="0 0 24 24"><path d="M2 8c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 13c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 18c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
  };

  /* ---------- Themed art (SVG) ---------- */
  const jet = (t) => {
    const stops = [[30, 58, 138], [6, 182, 212], [132, 204, 22], [250, 204, 21], [239, 68, 68]];
    const x = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1);
    const i = Math.floor(x), f = x - i;
    const c = stops[i].map((v, k) => Math.round(v + (stops[i + 1][k] - v) * f));
    return `rgb(${c.join(",")})`;
  };

  const Art = {
    basketball(mode) {
      const ball = `
        <svg class="bb-ball" viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="46" fill="#f97316"/>
          <circle cx="38" cy="34" r="30" fill="#fdba74" opacity=".35"/>
          <g fill="none" stroke="#7c2d12" stroke-width="3.2" stroke-linecap="round">
            <circle cx="50" cy="50" r="46"/>
            <path d="M4 50h92M50 4v92M18 16c16 18 16 50 0 68M82 16c-16 18-16 50 0 68"/>
          </g>
        </svg>`;
      if (mode === "card") return `<div class="art art-bb"><div class="court-lines"></div><div class="bb-bouncer">${ball}</div><div class="bb-shadow"></div></div>`;
      return `
        <div class="emblem emblem-bb">
          <svg class="hoop" viewBox="0 0 160 120" aria-hidden="true">
            <rect x="30" y="4" width="100" height="64" rx="4" class="hoop-board"/>
            <rect x="60" y="26" width="40" height="30" class="hoop-square"/>
            <ellipse cx="80" cy="70" rx="26" ry="5" class="hoop-rim"/>
            <path class="hoop-net" d="M56 71l6 30h36l6-30M62 72l8 29M98 72l-8 29M71 72l3 29M89 72l-3 29M80 72v29M58 82h44M61 92h38"/>
          </svg>
          <div class="bb-bouncer big">${ball}</div>
          <div class="bb-shadow big"></div>
        </div>`;
    },

    f1(mode) {
      const car = `
        <svg class="f1-car" viewBox="0 0 240 64" aria-hidden="true">
          <path d="M8 16h26v6H8z" fill="currentColor" class="car-dark"/>
          <path d="M18 22h6v14h-6z" class="car-dark"/>
          <path d="M14 38 32 30l52-3 22-9 26-2 12 9 58 6 32 4v6l-34 5H40z" class="car-body"/>
          <path d="M106 18l22-2 8 8-30 2z" class="car-dark"/>
          <path d="M200 42h36v5h-36z" class="car-dark"/>
          <path d="M60 36h110" stroke="#fff" stroke-width="2.5" opacity=".75"/>
          <circle cx="50" cy="45" r="14" class="car-tyre"/><circle cx="50" cy="45" r="6" class="car-rim"/>
          <circle cx="190" cy="46" r="13" class="car-tyre"/><circle cx="190" cy="46" r="5.5" class="car-rim"/>
        </svg>`;
      if (mode === "card")
        return `<div class="art art-f1"><div class="kerb top"></div><div class="speedlines"><i></i><i></i><i></i><i></i><i></i></div><div class="f1-runner">${car}</div><div class="kerb bottom"></div></div>`;
      return `
        <div class="emblem emblem-f1">
          <div class="lights" aria-hidden="true">${"<span><i></i><i></i></span>".repeat(5)}</div>
          <svg class="track" viewBox="0 0 400 260" aria-hidden="true">
            <path id="trk" class="track-path" d="M60 200C20 200 20 140 60 130l90-20c30-6 40-30 20-50s10-40 40-30l120 40c40 14 50 50 20 70l-70 40c-20 12-10 30 20 34l30 4c30 4 20 22-10 22l-230-4c-20 0-30-16-30-36z"/>
            <path class="track-line" d="M60 200C20 200 20 140 60 130l90-20c30-6 40-30 20-50s10-40 40-30l120 40c40 14 50 50 20 70l-70 40c-20 12-10 30 20 34l30 4c30 4 20 22-10 22l-230-4c-20 0-30-16-30-36z"/>
            <rect x="52" y="186" width="16" height="4" class="track-start"/>
            <circle r="7" class="track-car"><animateMotion dur="5.5s" repeatCount="indefinite" rotate="auto"><mpath href="#trk"/></animateMotion></circle>
            <circle r="5" class="track-car ghost"><animateMotion dur="5.5s" begin="-0.35s" repeatCount="indefinite"><mpath href="#trk"/></animateMotion></circle>
          </svg>
        </div>`;
    },

    football(mode) {
      const ball = `
        <svg class="fb-ball" viewBox="0 0 120 70" aria-hidden="true">
          <path d="M6 35C22 5 98 5 114 35 98 65 22 65 6 35z" fill="#92400e" stroke="#451a03" stroke-width="3"/>
          <path d="M24 20c6 10 6 20 0 30M96 20c-6 10-6 20 0 30" stroke="#fff" stroke-width="3" fill="none"/>
          <path d="M40 35h40M46 29v12M53 29v12M60 29v12M67 29v12M74 29v12" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M28 22C45 14 75 14 92 22" stroke="#fff" stroke-width="3" opacity=".18" fill="none"/>
        </svg>`;
      if (mode === "card")
        return `<div class="art art-fb"><div class="turf"></div><div class="yard-nums"><span>20</span><span>30</span><span>40</span></div><div class="fb-flyer">${ball}</div></div>`;
      return `
        <div class="emblem emblem-fb">
          <svg class="goalpost" viewBox="0 0 160 200" aria-hidden="true">
            <path d="M80 200V120M30 120h100M30 120V10M130 120V10"/>
          </svg>
          <div class="fb-flyer big">${ball}</div>
        </div>`;
    },

    pathology(mode) {
      const n = mode === "card" ? 8 : 12;
      const size = 200 / n;
      let rects = "";
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          const dx = (x + 0.5) / n - 0.58, dy = (y + 0.5) / n - 0.45;
          const heat = Math.exp(-(dx * dx + dy * dy) / 0.045);
          const d = ((x * 7 + y * 13) % 17) * 0.12;
          rects += `<rect x="${(x * size).toFixed(2)}" y="${(y * size).toFixed(2)}" width="${(size - 1.5).toFixed(2)}" height="${(size - 1.5).toFixed(2)}" rx="2" fill="${jet(heat)}" style="animation-delay:${d.toFixed(2)}s"/>`;
        }
      }
      const svg = `
        <svg class="px-grid" viewBox="0 0 200 200" aria-hidden="true">
          <g class="px-rects">${rects}</g>
          <g class="px-cells" fill="none">
            <circle cx="116" cy="90" r="38"/><circle cx="116" cy="90" r="14" class="nucleus"/>
            <circle cx="46" cy="150" r="26"/><circle cx="48" cy="148" r="9" class="nucleus"/>
            <circle cx="160" cy="166" r="20"/><circle cx="158" cy="168" r="7" class="nucleus"/>
          </g>
          <rect class="px-scan" x="0" y="0" width="200" height="3"/>
        </svg>`;
      if (mode === "card") return `<div class="art art-px">${svg}</div>`;
      return `<div class="emblem emblem-px"><div class="reticle"></div>${svg}<div class="px-legend"><span>low</span><i></i><span>high</span></div></div>`;
    },

    space(mode) {
      let dots = "";
      for (let a = 0; a < 3; a++) {
        for (let i = 0; i < 42; i++) {
          const th = i * 0.17 + (a * Math.PI * 2) / 3;
          const r = 6 + i * 2.05;
          const j = ((i * 37 + a * 11) % 9) - 4;
          const x = 100 + r * Math.cos(th) + j * 0.6;
          const y = 100 + r * Math.sin(th) - j * 0.6;
          const rad = Math.max(0.6, 2.6 - i * 0.045);
          dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" style="animation-delay:${((i % 7) * 0.3).toFixed(1)}s"/>`;
        }
      }
      const galaxy = `
        <svg class="galaxy" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r="22" class="g-core"/>
          <g class="g-spin">${dots}</g>
        </svg>`;
      if (mode === "card") return `<div class="art art-space"><div class="stars s1"></div><div class="stars s2"></div>${galaxy}</div>`;
      return `
        <div class="emblem emblem-space">
          <div class="orbit o1"><span class="planet p1"></span></div>
          <div class="orbit o2"><span class="planet p2"></span></div>
          <div class="orbit o3"><span class="planet p3"></span></div>
          ${galaxy}
        </div>`;
    },
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
      <div class="footer-wave" aria-hidden="true"></div>
      <p>© ${new Date().getFullYear()} ${S.profile.name} · Built with HTML, CSS & a lot of water</p>
      <div class="footer-links">
        <a href="mailto:${S.profile.email}" aria-label="Email">${I.mail}</a>
        <a href="${S.profile.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn">${I.linkedin}</a>
        <a href="${S.profile.github}" target="_blank" rel="noopener" aria-label="GitHub">${I.github}</a>
      </div>
    </footer>`;

  const chips = (arr, cls = "chip") => arr.map((t) => `<span class="${cls}">${t}</span>`).join("");

  /** Resolve a skill link id to a project or experience */
  function resolveLink(id) {
    const p = byId(S.projects, id);
    if (p) return { href: `#/projects/${p.id}`, label: p.name, sub: p.kicker, kind: "Project", theme: p.theme, id };
    const e = byId(S.experience, id);
    if (e) return { href: `#/experience/${e.id}`, label: e.org.replace(/\s*\(.*\)/, ""), sub: e.role, kind: "Experience", theme: "water", id };
    return null;
  }
  const skillsFor = (id) => S.skills.filter((s) => s.links.includes(id));

  const statTile = (s, i) => {
    const inner = s.text != null
      ? `<span class="stat-num">${s.text}</span>`
      : `<span class="stat-num" data-count="${s.value}" data-suffix="${s.suffix || ""}">0${s.suffix || ""}</span>`;
    return `<div class="stat reveal" style="--d:${i}">${inner}<span class="stat-label">${s.label}</span></div>`;
  };

  const projectCard = (p, i) => `
    <a class="proj-card reveal" data-ptheme="${p.theme}" href="#/projects/${p.id}" style="--d:${i}" data-tilt>
      <div class="pc-art">${Art[p.theme]("card")}</div>
      <div class="pc-body">
        <p class="pc-kicker">${p.kicker}</p>
        <h3 class="pc-name">${p.name}</h3>
        <p class="pc-tag">${p.tagline}</p>
        <div class="chips small">${chips(p.stack.slice(0, 5))}</div>
        <span class="pc-cta">Dive in ${I.arrow}</span>
      </div>
      <span class="pc-glare" aria-hidden="true"></span>
    </a>`;

  /* ======================================================================
     PAGES
     ====================================================================== */
  const Views = {};

  Views.home = () => {
    const P = S.profile;
    const current = S.experience.filter((e) => e.current);
    return `
    <section class="page page-home">
      <div class="hero">
        <div class="hero-copy">
          <p class="eyebrow reveal"><span class="pulse-dot"></span>Computer Science · Texas A&amp;M University</p>
          <h1 class="hero-name" aria-label="${P.name}">
            <span class="hn-line">${splitWord(P.first)}</span>
            <span class="hn-line accent">${splitWord(P.last, P.first.length)}</span>
          </h1>
          <p class="hero-role reveal" style="--d:3">
            <span class="role-pre">I build as a</span>
            <span class="typer" data-words='${JSON.stringify(P.roles)}'></span><span class="caret"></span>
          </p>
          <p class="hero-intro reveal" style="--d:4">${P.intro}</p>
          <div class="hero-cta reveal" style="--d:5">
            <a class="btn primary" href="#/projects"><span>Explore projects</span>${I.arrow}</a>
            <a class="btn ghost" href="#/contact"><span>Get in touch</span></a>
          </div>
          <div class="hero-social reveal" style="--d:6">
            <a href="${P.github}" target="_blank" rel="noopener" aria-label="GitHub">${I.github}</a>
            <a href="${P.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn">${I.linkedin}</a>
            <a href="mailto:${P.email}" aria-label="Email">${I.mail}</a>
            <span class="hero-loc">${I.pin}${P.location}</span>
          </div>
        </div>

        <div class="hero-visual reveal" style="--d:2" aria-hidden="true">
          <div class="orb-wrap" data-parallax>
            <div class="orb-ring r1"></div>
            <div class="orb-ring r2"></div>
            <svg class="orb" viewBox="0 0 200 200">
              <defs>
                <clipPath id="orbClip"><circle cx="100" cy="100" r="84"/></clipPath>
                <linearGradient id="orbWater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" style="stop-color:var(--accent-2)"/>
                  <stop offset="1" style="stop-color:var(--deep)"/>
                </linearGradient>
                <radialGradient id="orbGlass" cx=".35" cy=".3" r=".75">
                  <stop offset="0" style="stop-color:#fff;stop-opacity:.75"/>
                  <stop offset=".45" style="stop-color:#fff;stop-opacity:.06"/>
                  <stop offset="1" style="stop-color:#fff;stop-opacity:0"/>
                </radialGradient>
              </defs>
              <circle cx="100" cy="100" r="84" class="orb-bg"/>
              <text x="100" y="78" class="orb-text" text-anchor="middle">SK</text>
              <g clip-path="url(#orbClip)">
                <g class="orb-level">
                  <path class="orb-wave w2" d="M0 104q25-10 50 0t50 0 50 0 50 0 50 0 50 0 50 0 50 0V220H0z"/>
                  <path class="orb-wave w1" d="M0 108q25-12 50 0t50 0 50 0 50 0 50 0 50 0 50 0 50 0V220H0z" fill="url(#orbWater)"/>
                </g>
                <g class="orb-bubbles">
                  <circle cx="70" cy="190" r="3"/><circle cx="110" cy="200" r="2"/><circle cx="135" cy="195" r="4"/><circle cx="90" cy="205" r="2.5"/>
                </g>
              </g>
              <circle cx="100" cy="100" r="84" fill="url(#orbGlass)" class="orb-glass"/>
              <circle cx="100" cy="100" r="84" class="orb-rim"/>
            </svg>
            <span class="float-tag t1">Machine Learning</span>
            <span class="float-tag t2">Full-Stack</span>
            <span class="float-tag t3">Quant</span>
            <span class="float-tag t4">Research</span>
          </div>
        </div>
      </div>

      <div class="hero-waves" aria-hidden="true">
        <div class="wave-band b3"></div><div class="wave-band b2"></div><div class="wave-band b1"></div>
      </div>

      <div class="home-stats">
        ${statTile({ value: 5, label: "Shipped projects" }, 0)}
        ${statTile({ value: 4, label: "Roles & research" }, 1)}
        ${statTile({ value: 489000, suffix: "+", label: "NFL plays modeled" }, 2)}
        ${statTile({ value: 36, suffix: "%", label: "Backtested return" }, 3)}
      </div>

      <section class="home-section">
        <div class="section-row">
          <h3 class="section-title reveal">Currently</h3>
          <a class="text-link reveal" href="#/experience">All experience ${I.arrow}</a>
        </div>
        <div class="current-grid">
          ${current
            .map(
              (e, i) => `
            <a class="card current-card reveal" href="#/experience/${e.id}" style="--d:${i}">
              <span class="live-badge"><span class="pulse-dot"></span>Now</span>
              <h4>${e.role}</h4>
              <p class="cc-org">${e.org}</p>
              <p class="cc-sum">${e.summary}</p>
            </a>`
            )
            .join("")}
        </div>
      </section>

      <section class="home-section">
        <div class="section-row">
          <h3 class="section-title reveal">Featured projects</h3>
          <a class="text-link reveal" href="#/projects">See all ${I.arrow}</a>
        </div>
        <div class="proj-grid">${S.projects.slice(0, 3).map(projectCard).join("")}</div>
      </section>
      ${footer()}
    </section>`;
  };

  Views.about = () => {
    const E = S.education;
    return `
    <section class="page">
      ${pageHead("01", "About", "Education &amp; foundations", "A Computer Science student who likes turning messy real-world data into models, pipelines, and products people actually use.")}
      <div class="about-grid">
        <article class="card edu-card reveal">
          <div class="edu-icon">${I.cap}</div>
          <p class="card-kicker">${E.dates}</p>
          <h3>${E.school}</h3>
          <p class="edu-degree">${E.degree}</p>
          <p class="muted inline-icon">${I.pin}${E.location}</p>
          <div class="edu-depth" aria-hidden="true"><div class="wave-band b1"></div></div>
        </article>

        <article class="card reveal" style="--d:1">
          <div class="card-head">${I.users}<h3>Organizations</h3></div>
          <ul class="org-list">
            ${E.organizations.map((o) => `<li><span class="drop"></span>${o}</li>`).join("")}
          </ul>
        </article>

        <article class="card coursework-card reveal" style="--d:2">
          <div class="card-head">${I.book}<h3>Relevant coursework</h3></div>
          <div class="course-grid">
            ${E.coursework.map((c, i) => `<div class="course" style="--d:${i}">${c.code ? `<span class="course-code">${c.code}</span>` : ""}<span>${c.name}</span></div>`).join("")}
          </div>
        </article>

        <article class="card reveal" style="--d:3">
          <div class="card-head">${I.award}<h3>Certifications</h3></div>
          <ul class="cert-list">${E.certifications.map((c) => `<li>${c}</li>`).join("")}</ul>
        </article>

        <article class="card focus-card reveal" style="--d:4">
          <div class="card-head">${I.wave}<h3>What I'm focused on</h3></div>
          <ul class="focus-list">
            <li><b>Forecasting</b> — leading a 6-person team predicting airline market demand for American Airlines.</li>
            <li><b>Simulation research</b> — agent-based models of exoskeleton adoption in construction.</li>
            <li><b>Sports analytics</b> — end-to-end ML platforms for the NBA, NFL, and Formula 1.</li>
            <li><b>Interpretable ML</b> — Grad-CAM explainability for medical imaging.</li>
          </ul>
        </article>
      </div>
      ${footer()}
    </section>`;
  };

  Views.experience = () => `
    <section class="page">
      ${pageHead("02", "Experience", "Where I've been flowing", "Industry, research, and quant work — newest first.")}
      <div class="river">
        <svg class="river-line" preserveAspectRatio="none" viewBox="0 0 20 100" aria-hidden="true">
          <path d="M10 0V100" class="river-bed"/>
          <path d="M10 0V100" class="river-flow"/>
        </svg>
        ${S.experience
          .map(
            (e, i) => `
          <article class="exp ${i % 2 ? "right" : "left"}" id="exp-${e.id}">
            <div class="exp-node reveal" aria-hidden="true"><span></span></div>
            <div class="card exp-card reveal" style="--d:1">
              <div class="exp-top">
                <p class="card-kicker">${e.dates}${e.current ? ' <span class="live-badge sm"><span class="pulse-dot"></span>Current</span>' : ""}</p>
                <span class="exp-loc">${I.pin}${e.location}</span>
              </div>
              <h3>${e.role}</h3>
              <p class="exp-org">${I.briefcase}${e.org}</p>
              <ul class="bullets">${e.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
              <div class="chips small">${chips(e.tags)}</div>
            </div>
          </article>`
          )
          .join("")}
      </div>
      ${footer()}
    </section>`;

  Views.projects = () => `
    <section class="page">
      ${pageHead("03", "Projects", "Things I've built", "Every project has its own world — pick one and dive in.")}
      <div class="proj-grid">${S.projects.map(projectCard).join("")}</div>
      ${footer()}
    </section>`;

  Views.project = (id) => {
    const p = byId(S.projects, id);
    if (!p) return Views.notFound();
    const idx = S.projects.indexOf(p);
    const prev = S.projects[(idx - 1 + S.projects.length) % S.projects.length];
    const next = S.projects[(idx + 1) % S.projects.length];
    const linked = skillsFor(p.id);
    return `
    <section class="page project-page" data-ptheme="${p.theme}">
      <div class="pp-backdrop" aria-hidden="true">${backdrop(p.theme)}</div>
      <a class="back-link reveal" href="#/projects">${I.back}<span>All projects</span></a>

      <header class="pp-hero">
        <div class="pp-copy">
          <p class="pp-kicker reveal">${p.kicker} · ${p.dates}</p>
          <h1 class="pp-title">${splitWord(p.name)}</h1>
          <p class="pp-tag reveal" style="--d:2">${p.tagline}</p>
          <div class="chips reveal" style="--d:3">${chips(p.stack, "chip themed")}</div>
        </div>
        <div class="pp-emblem reveal" style="--d:2">${Art[p.theme]("hero")}</div>
      </header>

      <div class="pp-stats">${p.stats.map(statTile).join("")}</div>

      <div class="pp-body">
        <article class="card pp-built reveal">
          <h3>What I built</h3>
          <ul class="bullets themed">${p.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>
        </article>
        <aside class="card pp-skills reveal" style="--d:1">
          <h3>Skills in this project</h3>
          <div class="chips">${
            linked.length
              ? linked.map((s) => `<a class="chip themed link" href="#/skills/${encodeURIComponent(s.name)}">${s.name}</a>`).join("")
              : '<p class="muted">Detailed skills coming soon.</p>'
          }</div>
          <p class="muted small-note">Tap a skill to see everywhere else it shows up.</p>
        </aside>
      </div>

      <nav class="pp-nav">
        <a class="pp-nav-link reveal" href="#/projects/${prev.id}">${I.back}<span><small>Previous</small>${prev.name}</span></a>
        <a class="pp-nav-link next reveal" href="#/projects/${next.id}"><span><small>Next</small>${next.name}</span>${I.arrow}</a>
      </nav>
      ${footer()}
    </section>`;
  };

  function backdrop(theme) {
    switch (theme) {
      case "basketball":
        return `<div class="bd-wood"></div>
          <svg class="bd-court" viewBox="0 0 940 500" preserveAspectRatio="xMidYMid slice">
            <g class="draw">
              <rect x="20" y="20" width="900" height="460"/>
              <path d="M470 20v460"/><circle cx="470" cy="250" r="60"/><circle cx="470" cy="250" r="20"/>
              <rect x="20" y="170" width="190" height="160"/><circle cx="210" cy="250" r="60"/>
              <path d="M20 50h140a200 200 0 0 1 0 400H20"/>
              <rect x="730" y="170" width="190" height="160"/><circle cx="730" cy="250" r="60"/>
              <path d="M920 50H780a200 200 0 0 0 0 400h140"/>
            </g>
          </svg>`;
      case "f1":
        return `<div class="bd-stripes"></div><div class="bd-checker top"></div><div class="bd-speed">${"<i></i>".repeat(10)}</div>`;
      case "football":
        return `<div class="bd-turf"></div><div class="bd-yards">${[10, 20, 30, 40, 50, 40, 30, 20, 10].map((n) => `<span>${n}</span>`).join("")}</div>`;
      case "pathology":
        return `<div class="bd-grid"></div><div class="bd-heat"></div><div class="bd-scan"></div><div class="bd-cells">${"<i></i>".repeat(9)}</div>`;
      case "space":
        return `<div class="stars s1"></div><div class="stars s2"></div><div class="stars s3"></div><div class="bd-nebula"></div>`;
    }
    return "";
  }

  Views.skills = (focus) => {
    const pools = [
      ...S.projects.map((p) => ({ id: p.id, name: p.name, sub: p.kicker, theme: p.theme, href: `#/projects/${p.id}`, kind: "Project" })),
      ...S.experience.map((e) => ({ id: e.id, name: e.org.replace(/\s*\(.*\)/, ""), sub: e.role, theme: "water", href: `#/experience/${e.id}`, kind: "Experience" })),
    ]
      .map((x) => ({ ...x, skills: skillsFor(x.id) }))
      .filter((x) => x.skills.length);

    return `
    <section class="page">
      ${pageHead("04", "Skills", "Every skill flows into a project", "Skills aren't just a list — each one is tied to the work where I used it. Switch views to explore from either side.")}

      <div class="seg reveal" role="tablist" aria-label="Skill view">
        <span class="seg-blob" aria-hidden="true"></span>
        <button role="tab" data-mode="project" aria-selected="${focus ? "false" : "true"}">By project</button>
        <button role="tab" data-mode="skill" aria-selected="${focus ? "true" : "false"}">By skill</button>
      </div>

      <div class="skills-panel" data-panel="project" ${focus ? "hidden" : ""}>
        <div class="pool-grid">
          ${pools
            .map(
              (x, i) => `
            <article class="card pool reveal" data-ptheme="${x.theme}" style="--d:${i % 4}">
              <a class="pool-head" href="${x.href}">
                <span class="pool-icon">${x.theme === "water" ? I.wave : Art[x.theme]("card")}</span>
                <span><small>${x.kind}</small><b>${x.name}</b><em>${x.sub}</em></span>
                <span class="pool-go">${I.arrow}</span>
              </a>
              <div class="chips small">${x.skills.map((s) => `<button class="chip as-btn" data-goto-skill="${s.name}">${s.name}</button>`).join("")}</div>
            </article>`
            )
            .join("")}
        </div>
      </div>

      <div class="skills-panel" data-panel="skill" ${focus ? "" : "hidden"}>
        <div class="skill-layout">
          <div class="skill-cats">
            ${S.skillCategories
              .map(
                (cat) => `
              <div class="skill-cat reveal">
                <h4>${cat}</h4>
                <div class="chips">
                  ${S.skills
                    .filter((s) => s.cat === cat)
                    .map((s) => `<button class="skill-chip" data-skill="${s.name}"><span>${s.name}</span><em>${s.links.length || "·"}</em></button>`)
                    .join("")}
                </div>
              </div>`
              )
              .join("")}
          </div>
          <div class="skill-flow card reveal" style="--d:1" aria-live="polite"></div>
        </div>
      </div>
      ${footer()}
    </section>`;
  };

  /** Detail panel for one skill (By-skill view) */
  Views.skillFlow = (name) => {
    const s = S.skills.find((k) => k.name === name);
    if (!s) return "";
    const links = s.links.map(resolveLink).filter(Boolean);
    return `
      <p class="card-kicker">${s.cat}</p>
      <h3 class="sf-title">${s.name}</h3>
      <p class="muted">${links.length ? `Flows into ${links.length} ${links.length === 1 ? "place" : "places"}:` : s.note || "Project links for this skill are coming soon."}</p>
      <div class="sf-stream" aria-hidden="true"></div>
      <div class="sf-links">
        ${links
          .map(
            (l, i) => `
          <a class="sf-link" data-ptheme="${l.theme}" href="${l.href}" style="--d:${i}">
            <span class="sf-icon">${l.theme === "water" ? I.wave : Art[l.theme]("card")}</span>
            <span><small>${l.kind}</small><b>${l.label}</b><em>${l.sub}</em></span>
            ${I.arrow}
          </a>`
          )
          .join("")}
      </div>`;
  };

  Views.contact = () => {
    const P = S.profile;
    return `
    <section class="page page-contact">
      ${pageHead("05", "Contact", "Let's make some waves", "Open to internships, research collaborations, and interesting data problems. The fastest way to reach me is email.")}
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

        <div class="bottle-scene reveal" style="--d:2" aria-hidden="true">
          <svg class="bottle" viewBox="0 0 120 220">
            <rect x="48" y="6" width="24" height="16" rx="3" class="cork"/>
            <path d="M50 22h20v26c0 6 22 16 22 40v108a12 12 0 0 1-12 12H40a12 12 0 0 1-12-12V88c0-24 22-34 22-40z" class="glass"/>
            <rect x="42" y="96" width="36" height="70" rx="4" class="scroll" transform="rotate(-8 60 130)"/>
            <path d="M48 112h22M48 122h24M48 132h18M48 142h22" class="scroll-lines" transform="rotate(-8 60 130)"/>
            <path d="M38 70c4-10 10-14 14-16" class="shine"/>
          </svg>
          <div class="bottle-waves"><div class="wave-band b2"></div><div class="wave-band b1"></div></div>
          <p class="bottle-note">${P.location}</p>
        </div>
      </div>
      ${footer()}
    </section>`;
  };

  Views.notFound = () => `
    <section class="page">
      ${pageHead("404", "Lost at sea", "This page drifted away", "")}
      <a class="btn primary" href="#/home"><span>Back to shore</span>${I.arrow}</a>
    </section>`;

  window.Views = Views;
  window.Art = Art;
})();

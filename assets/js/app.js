/* Router, navigation and pages. */
(function () {
  const Z = window.Zone;
  const R = window.ZoneRender;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = R.esc;

  const PHASES = [
    { id: "foundations", label: "Foundations · concepts & Claude Code", color: "brand" },
    { id: "claude", label: "Claude Code craft", color: "violet" },
    { id: "usecase", label: "The use case", color: "amber" },
    { id: "sdlc", label: "Build across the SDLC", color: "teal" },
    { id: "ship", label: "Ship & operate", color: "coral" },
  ];

  /* ---------------- shell ---------------- */
  function renderNav(activeId) {
    const mods = Z.activeModules();
    let h = `<a class="brand" href="#/"><div class="brand-mark">AZ</div><div><div class="brand-name">Agentic Zone</div><div class="brand-sub">AI full-stack runbook</div></div></a><nav class="nav">`;
    h += `<a href="#/" class="${activeId === "home" ? "active" : ""}"><span class="num">⌂</span>Home</a>`;
    PHASES.forEach((ph) => {
      const list = mods.filter((m) => m.phase === ph.id);
      if (!list.length) return;
      h += `<div class="nav-group">${ph.label}</div>`;
      list.forEach((m) => {
        const p = Z.moduleProgress(m);
        h += `<a href="#/m/${m.id}" class="${activeId === m.id ? "active" : ""}"><span class="num">${esc(m.num)}</span>${esc(Z.tpl(m.short || m.title))}<span class="dot ${p >= 100 ? "full" : p > 0 ? "half" : ""}"></span></a>`;
      });
    });
    h += `<div class="nav-group">Toolkit</div>
      <a href="#/prompts" class="${activeId === "prompts" ? "active" : ""}"><span class="num">💬</span>Prompt library</a>
      <a href="#/commands" class="${activeId === "commands" ? "active" : ""}"><span class="num">⌨️</span>Command library</a>
      <a href="#/layers" class="${activeId === "layers" ? "active" : ""}"><span class="num">🏗️</span>9-layer stack</a>
      <a href="#/lab" class="${activeId === "lab" ? "active" : ""}"><span class="num">🧪</span>Use-Case Lab</a>
      <a href="#/resources" class="${activeId === "resources" ? "active" : ""}"><span class="num">📚</span>Resources</a>
      <a href="#/glossary" class="${activeId === "glossary" ? "active" : ""}"><span class="num">📖</span>Glossary</a>
      <a href="#/settings" class="${activeId === "settings" ? "active" : ""}"><span class="num">⚙️</span>My variables</a></nav>`;
    $("#side").innerHTML = h;
  }

  function topbar(crumbs) {
    const ucs = Z.allUseCases();
    const uc = Z.activeUseCase();
    $("#topbar").innerHTML = `<button class="pill-btn menu-btn" id="menuBtn" aria-label="Menu">☰</button>
      <div class="crumbs">${crumbs}</div><span class="spacer"></span>
      <select class="pill-btn hide-sm" id="ucSel" aria-label="Active use case">${ucs.map((u) => `<option value="${u.id}" ${u.id === uc.id ? "selected" : ""}>${u.icon || "📦"} ${esc(u.vars.name)}</option>`).join("")}</select>
      <button class="pill-btn hide-sm ${Z.state.shell === "ps" ? "on" : ""}" id="shellBtn" title="Toggle command shell">${Z.state.shell === "ps" ? "PowerShell" : "bash"}</button>
      <button class="pill-btn hide-sm" id="viewBtn" title="Deck or scroll view">${Z.state.view === "deck" ? "🃏 Deck" : "📜 Scroll"}</button>
      <button class="pill-btn" id="presentBtn" title="Presenter mode (P)">📽️</button>
      <button class="pill-btn" id="themeBtn" title="Theme (T)">${Z.state.theme === "dark" ? "🌙" : Z.state.theme === "light" ? "☀️" : "🌓"}</button>`;
    $("#menuBtn").onclick = () => document.body.classList.toggle("nav-open");
    $("#ucSel").onchange = (e) => { Z.state.usecase = e.target.value; Z.persist("usecase"); toast("Use case switched — prompts and commands updated"); route(); };
    $("#shellBtn").onclick = () => { Z.state.shell = Z.state.shell === "ps" ? "bash" : "ps"; Z.persist("shell"); route(); };
    $("#viewBtn").onclick = () => { Z.state.view = Z.state.view === "deck" ? "scroll" : "deck"; Z.persist("view"); route(); };
    $("#presentBtn").onclick = togglePresent;
    $("#themeBtn").onclick = cycleTheme;
  }

  function togglePresent() {
    const r = document.documentElement;
    r.dataset.present = r.dataset.present === "on" ? "off" : "on";
  }
  function applyTheme() {
    const t = Z.state.theme;
    if (t === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    if (window.mermaid) {
      const dark = t === "dark" || (t === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      window.mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "neutral", securityLevel: "loose", fontFamily: "Inter, system-ui, sans-serif" });
    }
  }
  function cycleTheme() {
    Z.state.theme = Z.state.theme === "auto" ? "dark" : Z.state.theme === "dark" ? "light" : "auto";
    Z.persist("theme"); applyTheme(); route();
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------------- pages ---------------- */
  function pageHome() {
    const uc = Z.activeUseCase();
    const mods = Z.activeModules();
    const sessions = Z.data.sessions || [];
    let h = `<section class="hero">
      <div class="eyebrow">AI-Native Full-Stack Engineering · Developer track</div>
      <h1>Build a production agentic app with Claude Code — end to end</h1>
      <p>Concepts in minutes, then hands on. Plan in Jira, design the architecture, ship working features sprint by sprint, test with evidence, add guardrails, deploy to Azure and observe it running.</p>
      <div class="hero-actions"><a class="btn" style="background:#fff;color:#3b2bd9" href="#/m/${mods[0].id}">▶ Start the runbook</a>
      <a class="btn ghost" href="#/m/${(mods.find((m) => m.phase === "usecase") || mods[0]).id}">${uc.icon || "📦"} Meet ${esc(uc.vars.name)}</a>
      <a class="btn ghost" href="#/lab">🧪 Use-Case Lab</a></div></section>`;

    h += `<div class="uc-switch"><span class="lbl">Active use case</span><b>${uc.icon || ""} ${esc(uc.vars.name)}</b><span style="color:var(--ink-2);font-size:.9rem">${esc(uc.vars.tagline || "")}</span><span class="spacer" style="flex:1"></span><a class="btn sm soft" href="#/lab">Switch or add a use case</a><a class="btn sm line" href="#/settings">⚙️ My Azure / Jira variables</a></div>`;

    h += `<div class="section-h"><h2>The AI-enabled SDLC loop</h2><span class="hint">Every studio needs context, delegation, verification, correction and traceability.</span></div>
      <div class="loop">${[["01", "Design", "specs & contracts", "brand"], ["02", "Build", "agentic build", "violet"], ["03", "Test", "tests & evals", "teal"], ["04", "Review", "secure verify", "amber"], ["05", "Deploy", "CI/CD & release", "coral"], ["06", "Operate", "observe & improve", "sky"]].map(([n, b, s, c]) => `<div class="step accent-${c}"><span class="n">${n}</span><b>${b}</b><span>${s}</span></div>`).join("")}</div>`;

    if (sessions.length) {
      h += `<div class="section-h"><h2>Saturday sessions</h2><span class="hint">4 hours each · concept → do-along → checkpoint</span></div><div class="grid g3">`;
      h += sessions.map((s) => `<div class="session accent-${s.color} ${s.done ? "done" : ""}"><div class="when">${esc(s.when)}${s.done ? " · done" : ""}</div><h3>${esc(s.title)}</h3><ol>${s.agenda.map((a) => `<li><span class="t">${esc(a[0])}</span><span>${a[2] ? `<a href="#/m/${a[2]}">${esc(Z.tpl(a[1]))}</a>` : esc(Z.tpl(a[1]))}</span></li>`).join("")}</ol></div>`).join("");
      h += `</div>`;
    }

    PHASES.forEach((ph) => {
      const list = mods.filter((m) => m.phase === ph.id);
      if (!list.length) return;
      h += `<div class="section-h"><h2>${ph.label}</h2></div><div class="grid g3">`;
      h += list.map((m) => {
        const p = Z.moduleProgress(m);
        return `<a class="tile accent-${m.color || ph.color}" href="#/m/${m.id}"><span class="bar"></span><div class="ico">${m.icon}</div><span class="kicker">MODULE ${esc(m.num)}</span><h3>${esc(Z.tpl(m.title))}</h3><p>${esc(Z.tpl(m.subtitle || ""))}</p>
          <div class="meta"><span class="tag">⏱ ${esc(m.duration || "")}</span><span class="tag">${(m.cards || []).length} cards</span>${p ? `<span class="tag green">${p}% done</span>` : ""}</div></a>`;
      }).join("");
      h += `</div>`;
    });

    h += `<div class="section-h"><h2>Toolkit</h2></div><div class="grid g4">
      <a class="tile accent-sky" href="#/resources"><div class="ico">📚</div><h3>Resources</h3><p>Vetted skills, subagents, hooks, MCP servers, SDK examples and use-case evidence.</p></a>
      <a class="tile accent-violet" href="#/prompts"><div class="ico">💬</div><h3>Prompt library</h3><p>Every prompt, by SDLC stage, ready to paste.</p></a>
      <a class="tile accent-teal" href="#/commands"><div class="ico">⌨️</div><h3>Command library</h3><p>Setup, Azure, Docker, tests, all with your variables filled in.</p></a>
      <a class="tile accent-coral" href="#/layers"><div class="ico">🏗️</div><h3>9-layer stack</h3><p>Why production AI fails, and the control for each layer.</p></a>
      <a class="tile accent-amber" href="#/lab"><div class="ico">🧪</div><h3>Use-Case Lab</h3><p>Breakout rooms: canvas, rubric, pick the best one.</p></a></div>`;
    return h;
  }

  function pageModule(id, idx) {
    const m = Z.moduleById(id);
    if (!m) return `<div class="empty">Module not found. <a href="#/">Home</a></div>`;
    const cards = m.cards || [];
    const total = cards.length;
    idx = Math.max(0, Math.min(total - 1, idx || 0));
    const p = Z.moduleProgress(m);
    let h = `<div class="accent-${m.color || "brand"}"><header class="mod-head"><div class="ico">${m.icon}</div><div><span class="kicker" style="font-family:var(--mono);font-size:.72rem;color:var(--accent);font-weight:700">MODULE ${esc(m.num)} · ⏱ ${esc(m.duration || "")}</span><h1>${esc(Z.tpl(m.title))}</h1><p>${esc(Z.tpl(m.subtitle || ""))}</p>
      ${m.goals ? `<div class="mod-goals">${m.goals.map((g) => `<span class="tag brand">🎯 ${esc(Z.tpl(g))}</span>`).join("")}</div>` : ""}</div><div class="ring" style="--p:${p}"><span>${p}%</span></div></header>`;
    if (Z.state.view === "deck") {
      h += `<div class="progress"><i style="width:${((idx + 1) / total) * 100}%"></i></div>
        <div class="deck-bar"><div class="deck-dots">${cards.map((c, i) => `<button title="${esc(Z.tpl(c.title || ""))}" data-goto="${i}" class="${i === idx ? "cur" : ""} ${Z.isDone(m.id, i) ? "done" : ""}"></button>`).join("")}</div>
        <span class="tag">← → keys</span></div>
        <div class="deck">${R.cardHtml(m, cards[idx], idx, total)}</div>`;
    } else {
      h += cards.map((c, i) => R.cardHtml(m, c, i, total)).join("");
    }
    h += moduleFooter(m) + `</div>`;
    return h;
  }

  function moduleFooter(m) {
    const mods = Z.activeModules();
    const i = mods.findIndex((x) => x.id === m.id);
    const prev = mods[i - 1], next = mods[i + 1];
    return `<div class="grid g2" style="margin-top:22px">
      ${prev ? `<a class="tile" href="#/m/${prev.id}"><span class="kicker">← PREVIOUS</span><h3>${prev.icon} ${esc(Z.tpl(prev.title))}</h3></a>` : "<div></div>"}
      ${next ? `<a class="tile" style="text-align:right" href="#/m/${next.id}"><span class="kicker">NEXT →</span><h3>${next.icon} ${esc(Z.tpl(next.title))}</h3></a>` : "<div></div>"}</div>`;
  }

  /* collect prompts / commands from every card */
  function harvest(kind) {
    const out = [];
    Z.activeModules().forEach((m) => (m.cards || []).forEach((c, ci) => {
      const push = (text, label) => out.push({ m, ci, title: c.title, label, text });
      if (kind === "prompt") {
        if (c.type === "prompt") push(c.prompt, c.label);
        (c.steps || []).forEach((s) => s.prompt && push(s.prompt, s.promptLabel));
        if (c.side && c.side.prompt) push(c.side.prompt, c.side.label);
      } else {
        (c.blocks || []).forEach((b) => b.cmd && push(b.cmd, b.label));
        (c.steps || []).forEach((s) => s.cmd && push(s.cmd, s.cmdLabel));
      }
    }));
    return out;
  }

  function pageLibrary(kind) {
    const items = harvest(kind);
    const stages = [...new Set(items.map((x) => x.m.stage || x.m.phase))];
    let h = `<div class="accent-${kind === "prompt" ? "violet" : "teal"}"><header class="mod-head"><div class="ico">${kind === "prompt" ? "💬" : "⌨️"}</div><div><h1>${kind === "prompt" ? "Prompt library" : "Command library"}</h1><p>${items.length} ${kind === "prompt" ? "prompts" : "command blocks"} across the runbook${kind === "cmd" ? `, with <b>your</b> variables filled in (<a href="#/settings">edit</a>). Shell: <b>${Z.state.shell === "ps" ? "PowerShell" : "bash"}</b>` : ""}.</p></div><div></div></header></div>
      <div class="searchbar"><input id="libQ" placeholder="Search…" aria-label="Search"><select class="pill-btn" id="libStage"><option value="">All stages</option>${stages.map((s) => `<option>${esc(s)}</option>`).join("")}</select></div><div id="libList">`;
    h += items.map((x, i) => `<div class="lib-item" data-stage="${esc(x.m.stage || x.m.phase)}" data-text="${esc((Z.tpl(typeof x.text === "string" ? x.text : Object.values(x.text).join(" ")) + " " + x.title + " " + x.m.title).toLowerCase())}">
      <div class="lib-meta"><span class="tag brand">${x.m.icon} ${esc(x.m.num)} · ${esc(Z.tpl(x.m.short || x.m.title))}</span><span class="tag">${esc(x.m.stage || x.m.phase)}</span><a href="#/m/${x.m.id}/${x.ci}">${esc(Z.tpl(x.title || ""))} →</a></div>
      ${R.codeBlock(x.text, { kind: kind === "prompt" ? "prompt" : "cmd", label: x.label })}</div>`).join("");
    h += `</div>`;
    return h;
  }

  function wireLibrary() {
    const q = $("#libQ"), st = $("#libStage");
    const apply = () => {
      const t = q.value.toLowerCase(), s = st.value;
      document.querySelectorAll(".lib-item").forEach((el) => {
        el.style.display = (!t || el.dataset.text.includes(t)) && (!s || el.dataset.stage === s) ? "" : "none";
      });
    };
    q.oninput = apply; st.onchange = apply;
  }

  function pageLayers() {
    const mod = Z.activeModules().find((m) => m.id === "production-reality");
    return `<div class="accent-coral"><header class="mod-head"><div class="ico">🏗️</div><div><h1>The 9-layer production stack</h1><p>Click a layer: how it fails in production, the engineering control, and where it lives in ${esc(Z.activeUseCase().vars.name)}.</p></div><div></div></header>
      <div class="card">${R.cardHtml({ id: "_layers" }, { type: "layers", title: "Layers, top (user) to bottom (operations)" }, 0, 1).replace(/<div class="card-foot">[\s\S]*<\/div><\/article>$/, "</article>")}</div>
      ${mod ? `<p style="margin-top:16px"><a class="btn soft" href="#/m/${mod.id}">Open the full "${esc(mod.title)}" module →</a></p>` : ""}</div>`;
  }

  function pageGlossary() {
    const g = Z.data.glossary || [];
    return `<div class="accent-sky"><header class="mod-head"><div class="ico">📖</div><div><h1>Glossary</h1><p>${g.length} terms, each in one or two lines.</p></div><div></div></header>
      <div class="searchbar"><input id="gQ" placeholder="Filter terms…" aria-label="Filter terms"></div>
      <div class="grid g3" id="gList">${g.map(([t, d]) => `<div class="tile" data-t="${esc((t + " " + d).toLowerCase())}"><h3>${esc(t)}</h3><p>${R.mdInline(d)}</p></div>`).join("")}</div></div>`;
  }

  /* ---------------- resources ---------------- */
  function pageResources() {
    const r = Z.data.resources || { groups: [] };
    const verdictTag = { "Use in class": "green", "Reading": "sky", "Instructor only": "amber" };
    let h = `<div class="accent-sky"><header class="mod-head"><div class="ico">📚</div><div><h1>Resources</h1><p>${R.mdInline(r.lead || "")}</p></div><div></div></header>
      <div class="searchbar"><input id="rQ" placeholder="Filter resources…" aria-label="Filter resources"></div>`;
    (r.groups || []).forEach((g) => {
      h += `<div class="section-h"><h2>${g.icon || ""} ${esc(g.title)}</h2><span class="hint">${esc(g.hint || "")}</span></div><div class="grid g3">`;
      h += g.items.map((it) => `<div class="tile res-item" data-t="${esc((it.name + " " + it.desc + " " + (it.note || "")).toLowerCase())}"><span class="kicker">${esc(it.kind || "")}</span>
        <h3><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.name)}</a></h3><p>${R.mdInline(it.desc)}</p>
        ${it.note ? `<p style="font-size:.82rem;color:var(--ink-3)">${R.mdInline(it.note)}</p>` : ""}
        <div class="meta"><span class="tag ${verdictTag[it.verdict] || ""}">${esc(it.verdict)}</span></div></div>`).join("");
      h += `</div>`;
    });
    if (r.footer) h += `<div class="card" style="margin-top:18px">${R.md(r.footer)}</div>`;
    return h + `</div>`;
  }

  /* ---------------- settings ---------------- */
  function pageSettings() {
    const d = Z.defaults();
    const groups = [
      ["Azure", ["az.subscription", "az.location", "az.swaLocation", "az.rg", "az.law", "az.appi", "az.acaEnv", "az.acr", "az.pg", "az.pgUser", "az.db", "az.swa", "az.api", "az.erp", "az.ghApp", "az.kv"]],
      ["GitHub", ["gh.owner", "gh.repo", "gh.branch"]],
      ["Jira", ["jira.site", "jira.project", "jira.email"]],
    ];
    const help = {
      "az.subscription": "From: az account show --query id -o tsv",
      "az.acr": "Globally unique, lowercase letters/numbers only",
      "az.swaLocation": "Static Web Apps regions: eastasia, westeurope, eastus2, centralus, westus2",
      "az.pg": "Globally unique",
      "jira.site": "e.g. acme-ap.atlassian.net",
    };
    let h = `<div class="accent-teal"><header class="mod-head"><div class="ico">⚙️</div><div><h1>My variables</h1><p>Every command in the runbook is filled in with these values, highlighted <code style="color:var(--amber)">like this</code>. They are saved in this browser only. Never put passwords or tokens here.</p></div><div></div></header>
      <div class="grid g3">`;
    groups.forEach(([g, keys]) => {
      h += `<div class="card"><h3>${g}</h3><div class="form">${keys.map((k) => `<div class="field"><label for="f-${k}">${k}</label><input id="f-${k}" data-k="${k}" value="${esc(Z.state.settings[k] || "")}" placeholder="${esc(d[k])}">${help[k] ? `<small>${esc(help[k])}</small>` : ""}</div>`).join("")}</div></div>`;
    });
    h += `</div><div class="card" style="margin-top:18px"><h3>Session</h3><p>Unique suffix for globally-unique names: <code>${esc(d.suffix)}</code></p>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sm line" id="resetVars">Reset variables</button><button class="btn sm line" id="newSuffix">New random suffix</button><button class="btn sm line" id="resetProg">Reset progress</button></div></div></div>`;
    return h;
  }
  function wireSettings() {
    document.querySelectorAll("[data-k]").forEach((inp) => inp.addEventListener("change", () => {
      Z.state.settings[inp.dataset.k] = inp.value.trim(); Z.persist("settings"); toast("Saved");
    }));
    $("#resetVars").onclick = () => { const s = Z.state.settings._suffix; Z.state.settings = { _suffix: s }; Z.persist("settings"); route(); toast("Variables reset"); };
    $("#newSuffix").onclick = () => { delete Z.state.settings._suffix; Z.persist("settings"); route(); toast("New suffix generated"); };
    $("#resetProg").onclick = (e) => {
      const b = e.currentTarget;
      if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Click again to clear progress"; return; }
      Z.state.progress = {}; Z.persist("progress"); route(); toast("Progress cleared");
    };
  }

  /* ---------------- router ---------------- */
  let current = { name: "home" };
  function route() {
    const hash = location.hash.replace(/^#\/?/, "");
    const parts = hash.split("/").filter(Boolean);
    const content = $("#content");
    document.body.classList.remove("nav-open");
    let html = "", crumbs = "<b>Home</b>", active = "home";
    if (!parts.length) { html = pageHome(); current = { name: "home" }; }
    else if (parts[0] === "m") {
      const m = Z.moduleById(parts[1]);
      const idx = parseInt(parts[2] || "0", 10) || 0;
      current = { name: "module", id: parts[1], idx };
      html = pageModule(parts[1], idx);
      active = parts[1];
      crumbs = m ? `Module ${esc(m.num)} · <b>${esc(Z.tpl(m.title))}</b>` : "Module";
    } else if (parts[0] === "prompts" || parts[0] === "commands") {
      html = pageLibrary(parts[0] === "prompts" ? "prompt" : "cmd"); active = parts[0];
      crumbs = `<b>${parts[0] === "prompts" ? "Prompt library" : "Command library"}</b>`; current = { name: parts[0] };
    } else if (parts[0] === "layers") { html = pageLayers(); active = "layers"; crumbs = "<b>9-layer stack</b>"; current = { name: "layers" }; }
    else if (parts[0] === "resources") { html = pageResources(); active = "resources"; crumbs = "<b>Resources</b>"; current = { name: "resources" }; }
    else if (parts[0] === "glossary") { html = pageGlossary(); active = "glossary"; crumbs = "<b>Glossary</b>"; current = { name: "glossary" }; }
    else if (parts[0] === "settings") { html = pageSettings(); active = "settings"; crumbs = "<b>My variables</b>"; current = { name: "settings" }; }
    else if (parts[0] === "lab") { html = window.ZoneLab.page(parts[1], parts[2]); active = "lab"; crumbs = "<b>Use-Case Lab</b>"; current = { name: "lab" }; }
    else { html = `<div class="empty">Page not found. <a href="#/">Home</a></div>`; }
    renderNav(active);
    topbar(crumbs);
    content.innerHTML = html;
    R.wire(content);
    wirePage();
    if (current.name !== "module" || !current._keep) window.scrollTo(0, 0);
  }

  function wirePage() {
    const content = $("#content");
    if (current.name === "module") {
      const m = Z.moduleById(current.id);
      content.querySelectorAll("[data-goto]").forEach((b) => b.onclick = () => go(current.id, +b.dataset.goto));
      content.querySelectorAll("[data-nav]").forEach((b) => b.onclick = () => step(b.dataset.nav === "next" ? 1 : -1));
      content.querySelectorAll("[data-done]").forEach((b) => b.onclick = () => {
        const on = Z.toggleDone(m.id, +b.dataset.done);
        b.classList.toggle("on", on); b.textContent = on ? "✓ Done" : "Mark done";
        renderNav(m.id);
        const ring = content.querySelector(".ring");
        if (ring) { const p = Z.moduleProgress(m); ring.style.setProperty("--p", p); ring.querySelector("span").textContent = p + "%"; }
        const dot = content.querySelector(`[data-goto="${b.dataset.done}"]`);
        if (dot) dot.classList.toggle("done", on);
      });
    }
    if (current.name === "prompts" || current.name === "commands") wireLibrary();
    if (current.name === "settings") wireSettings();
    if (current.name === "resources") {
      $("#rQ").oninput = (e) => { const t = e.target.value.toLowerCase(); document.querySelectorAll(".res-item").forEach((el) => el.style.display = el.dataset.t.includes(t) ? "" : "none"); };
    }
    if (current.name === "glossary") {
      $("#gQ").oninput = (e) => { const t = e.target.value.toLowerCase(); document.querySelectorAll("#gList .tile").forEach((el) => el.style.display = el.dataset.t.includes(t) ? "" : "none"); };
    }
    if (current.name === "lab") window.ZoneLab.wire(route, toast);
  }

  function go(id, idx) { location.hash = `#/m/${id}/${idx}`; }
  function step(dir) {
    if (current.name !== "module") return;
    const m = Z.moduleById(current.id);
    const n = current.idx + dir;
    if (n >= 0 && n < m.cards.length) {
      if (dir > 0 && !Z.isDone(m.id, current.idx)) Z.toggleDone(m.id, current.idx);
      return go(m.id, n);
    }
    if (n >= m.cards.length) {
      if (!Z.isDone(m.id, current.idx)) Z.toggleDone(m.id, current.idx);
      const mods = Z.activeModules();
      const next = mods[mods.findIndex((x) => x.id === m.id) + 1];
      location.hash = next ? `#/m/${next.id}` : "#/";
    }
  }

  document.addEventListener("keydown", (e) => {
    if (/input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === "ArrowRight" && Z.state.view === "deck") step(1);
    else if (e.key === "ArrowLeft" && Z.state.view === "deck") step(-1);
    else if (e.key === "p" || e.key === "P") togglePresent();
    else if (e.key === "t" || e.key === "T") cycleTheme();
  });

  window.addEventListener("hashchange", route);
  window.ZoneApp = { rerender: route, toast };
  window.addEventListener("DOMContentLoaded", () => { applyTheme(); route(); });
})();

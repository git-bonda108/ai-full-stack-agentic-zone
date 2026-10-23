/* Use-Case Lab: canvas, rubric, create/import/export use cases, auto-generated modules for custom ones. */
(function () {
  const Z = window.Zone;
  const R = window.ZoneRender;
  const esc = R.esc;

  const RUBRIC = [
    ["value", "Business value & frequency", "A widespread, recurring, costly pain, not a one-off"],
    ["integration", "Integration spread", "Touches an ERP/system of record, a database and a work tracker"],
    ["agentic", "Agentic fit", "Needs judgement over unstructured input and tool use, not just CRUD"],
    ["deterministic", "Deterministic core", "Has hard rules we can unit test and use as eval ground truth"],
    ["risk", "Guardrail teaching value", "Real risks: fraud, injection, PII, irreversible actions"],
    ["hitl", "Human-in-the-loop clarity", "Obvious points where a human must approve"],
    ["data", "Data availability", "Realistic sample data can be mocked in an hour"],
    ["feasible", "Buildable in 3 sprints", "A thin vertical slice is shippable in the class"],
  ];

  const FIELDS = [
    ["name", "App name", "e.g. P2P Sentinel", "vars"],
    ["short", "Short code (3–5 lowercase letters)", "used in Azure names, e.g. p2p", "vars"],
    ["slug", "Repo / folder slug", "e.g. p2p-sentinel", "vars"],
    ["tagline", "One-line pitch", "Agentic invoice exception resolver", "vars"],
    ["domain", "Business domain", "Finance · Accounts Payable", "vars"],
    ["jiraKey", "Jira project key", "e.g. AP", "vars"],
    ["problem", "Problem (2–3 sentences)", "Who suffers, how often, what it costs", "canvas", true],
    ["users", "Personas (one per line: Name: need)", "AP Clerk: a queue with evidence already gathered", "canvas", true],
    ["input", "Unstructured input the agents read", "supplier invoices (PDF/email text)", "vars"],
    ["erp", "System of record (ERP/CRM/core)", "SAP-style ERP (mocked)", "vars"],
    ["db", "Database", "PostgreSQL", "vars"],
    ["tracker", "Work tracker", "Jira", "vars"],
    ["core", "Deterministic core rule", "three-way match with 2% price tolerance", "vars"],
    ["agents", "Agents (one per line: Name: role)", "Intake Agent: extract structured invoice", "canvas", true],
    ["hitl", "Human approval points (one per line)", "Any invoice above 10,000", "canvas", true],
    ["risks", "Risks & guardrails (one per line)", "Bank-detail change fraud → HOLD", "canvas", true],
    ["kpis", "Success KPIs (one per line)", "% auto-resolved without rework", "canvas", true],
    ["outcomes", "Decision outcomes (comma separated)", "AUTO_APPROVE, ROUTE_TO_HUMAN, HOLD, REJECT", "vars"],
  ];

  function lines(s) { return String(s || "").split("\n").map((x) => x.trim()).filter(Boolean); }
  function score(uc) { return RUBRIC.reduce((a, [k]) => a + (+((uc.rubric || {})[k]) || 0), 0); }

  function page(sub, id) {
    if (sub === "new") return formPage(null);
    if (sub === "edit") return formPage(Z.allUseCases().find((u) => u.id === id));
    if (sub === "view") return canvasPage(Z.allUseCases().find((u) => u.id === id));
    return listPage();
  }

  function listPage() {
    const all = Z.allUseCases();
    const active = Z.activeUseCase();
    let h = `<div class="accent-amber"><header class="mod-head"><div class="ico">🧪</div><div><h1>Use-Case Lab</h1><p>Breakout rooms design a use case on the canvas, score it with the rubric, and the class picks the best. Activate any use case and every generic prompt and command in the runbook switches to it.</p></div><div></div></header>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px"><a class="btn" href="#/lab/new">＋ New use case canvas</a><label class="btn line" style="cursor:pointer">⬆ Import JSON<input type="file" id="ucImport" accept="application/json" hidden></label><button class="btn line" id="ucExportAll">⬇ Export all custom</button></div>
      <div class="grid g3">`;
    h += all.map((u) => `<div class="tile accent-${u.color || "amber"}"><span class="bar"></span><div class="ico">${u.icon || "📦"}</div>
      <span class="kicker">${u.custom ? "BREAKOUT" : "BUILT-IN"}${u.id === active.id ? " · ACTIVE" : ""}</span><h3>${esc(u.vars.name)}</h3><p>${esc(u.vars.tagline || "")}</p>
      <div class="meta"><span class="tag">${esc(u.vars.domain || "")}</span><span class="tag amber">Rubric ${score(u)}/40</span></div>
      <div class="meta"><a class="btn sm soft" href="#/lab/view/${u.id}">Canvas</a>${u.id !== active.id ? `<button class="btn sm" data-activate="${u.id}">Activate</button>` : ""}${u.custom ? `<a class="btn sm line" href="#/lab/edit/${u.id}">Edit</a><button class="btn sm line" data-del="${u.id}">Delete</button>` : ""}</div></div>`).join("");
    h += `</div><div class="section-h"><h2>Leaderboard</h2><span class="hint">rubric totals, highest first</span></div>`;
    const ranked = all.slice().sort((a, b) => score(b) - score(a));
    h += R.table(["#", "Use case", ...RUBRIC.map((r) => r[1].split(" ")[0]), "Total"], ranked.map((u, i) => [String(i + 1), `${u.icon || ""} **${u.vars.name}**`, ...RUBRIC.map(([k]) => String((u.rubric || {})[k] || "–")), `**${score(u)}**`]));
    h += `<div class="section-h"><h2>Rubric</h2></div>` + R.table(["Criterion", "What a 5 looks like"], RUBRIC.map((r) => [`**${r[1]}**`, r[2]]));
    h += `</div>`;
    return h;
  }

  function canvasPage(u) {
    if (!u) return `<div class="empty">Use case not found. <a href="#/lab">Back</a></div>`;
    const c = u.canvas || {};
    const box = (title, body, color) => `<div class="tile accent-${color}"><span class="bar"></span><span class="kicker">${title}</span><div style="margin-top:6px;font-size:.9rem">${body}</div></div>`;
    const list = (arr) => `<ul style="margin:0;padding-left:18px">${(arr || []).map((x) => `<li>${R.mdInline(x)}</li>`).join("")}</ul>`;
    return `<div class="accent-${u.color || "amber"}"><header class="mod-head"><div class="ico">${u.icon || "📦"}</div><div><h1>${esc(u.vars.name)}</h1><p>${esc(u.vars.tagline || "")} · ${esc(u.vars.domain || "")}</p></div><div class="ring" style="--p:${(score(u) / 40) * 100}"><span>${score(u)}/40</span></div></header>
      <div class="grid g3">${box("PROBLEM", R.md(c.problem), "coral")}${box("PERSONAS", list(c.users), "sky")}${box("SYSTEMS", list([`ERP / system of record: ${u.vars.erp}`, `Database: ${u.vars.db}`, `Work tracker: ${u.vars.tracker}`, `Input: ${u.vars.input || ""}`]), "teal")}
      ${box("AGENTS", list(c.agents), "violet")}${box("DETERMINISTIC CORE", R.md(u.vars.core), "brand")}${box("HUMAN APPROVAL", list(c.hitl), "amber")}
      ${box("RISKS → GUARDRAILS", list(c.risks), "coral")}${box("KPIs", list(c.kpis), "green")}${box("OUTCOMES", R.md(u.vars.outcomes || ""), "sky")}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">${u.id !== Z.activeUseCase().id ? `<button class="btn" data-activate="${u.id}">Activate this use case</button>` : `<span class="tag green">Active use case</span>`}<button class="btn line" data-export="${u.id}">⬇ Export JSON</button><a class="btn line" href="#/lab">← All use cases</a></div>
      <div class="card" style="margin-top:18px"><div class="card-type">💬 Prompt</div><h2>Turn this canvas into a full use-case pack with Claude</h2><p class="lead">The built-in use case ships hand-written sprint modules. Paste this into Claude Code in the training-site repo to generate the same for this canvas.</p>${R.codeBlock(packPrompt(u), { kind: "prompt" })}</div></div>`;
  }

  function packPrompt(u) {
    return `Read content/usecases/p2p-sentinel.js and docs/AUTHORING.md to learn the use-case file format.
Create content/usecases/${u.vars.slug || "my-usecase"}.js for this canvas, keeping the same structure:
- vars, canvas and rubric copied from the JSON below
- a "reveal" module (order 6) and three sprint modules (orders 10, 11, 12) with lab cards whose prompts reference real file paths for this app
- Sprint 1 = system-of-record mock + MCP server + DB + deterministic core with unit tests + API
- Sprint 2 = agents (OpenAI Agents SDK), parallel specialist agents, guardrails, tracker integration, human approval
- Sprint 3 = React UI with explainability panel and approve/reject
Then add a <script> tag for it in index.html after the other use cases. Do not change any other file.

Canvas JSON:
${JSON.stringify({ vars: u.vars, canvas: u.canvas, rubric: u.rubric }, null, 2)}`;
  }

  function formPage(u) {
    const editing = !!u;
    u = u || { vars: {}, canvas: {}, rubric: {} };
    const val = (k, where) => {
      const src = where === "vars" ? u.vars : u.canvas;
      const v = src[k];
      return Array.isArray(v) ? v.join("\n") : v || "";
    };
    return `<div class="accent-amber"><header class="mod-head"><div class="ico">📝</div><div><h1>${editing ? "Edit" : "New"} use case canvas</h1><p>Fill it in during the breakout (15–20 min). Saved in this browser; export JSON to share with the trainer.</p></div><div></div></header>
      <form id="ucForm" class="grid g2" style="align-items:start"><div class="card"><div class="form">
      <div class="field"><label>Icon (one emoji)</label><input name="icon" value="${esc(u.icon || "🧩")}"></div>
      ${FIELDS.map(([k, label, ph, where, area]) => `<div class="field"><label for="uc-${k}">${label}</label>${area ? `<textarea id="uc-${k}" name="${k}" data-w="${where}" placeholder="${esc(ph)}">${esc(val(k, where))}</textarea>` : `<input id="uc-${k}" name="${k}" data-w="${where}" placeholder="${esc(ph)}" value="${esc(val(k, where))}">`}</div>`).join("")}
      </div></div><div class="card" style="position:sticky;top:70px"><h3>Rubric</h3><p style="color:var(--ink-2);font-size:.88rem">Score honestly, 1 (weak) to 5 (excellent).</p><div class="rubric">
      ${RUBRIC.map(([k, label, hint]) => `<div class="r" title="${esc(hint)}"><span>${label}<br><small style="color:var(--ink-3)">${hint}</small></span><input type="range" min="1" max="5" name="r_${k}" value="${(u.rubric || {})[k] || 3}"><b id="rv_${k}">${(u.rubric || {})[k] || 3}</b></div>`).join("")}
      </div><div style="margin-top:14px">Total <span class="score-big" id="rTotal">0</span><span style="color:var(--ink-3)">/40</span></div>
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap"><button class="btn" type="submit">💾 Save use case</button><a class="btn line" href="#/lab">Cancel</a></div>
      <input type="hidden" name="id" value="${esc(u.id || "")}"></div></form></div>`;
  }

  function download(name, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function wire(route, toast) {
    document.querySelectorAll("[data-activate]").forEach((b) => b.onclick = () => {
      Z.state.usecase = b.dataset.activate; Z.persist("usecase"); toast("Activated — the runbook now uses this use case"); route();
    });
    document.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => {
      if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Click again to delete"; return; }
      Z.state.customUseCases = Z.state.customUseCases.filter((u) => u.id !== b.dataset.del);
      if (Z.state.usecase === b.dataset.del) Z.state.usecase = "p2p-sentinel";
      Z.persist("customUseCases"); Z.persist("usecase"); route();
    });
    document.querySelectorAll("[data-export]").forEach((b) => b.onclick = () => {
      const u = Z.allUseCases().find((x) => x.id === b.dataset.export);
      download(`${u.vars.slug || u.id}.usecase.json`, { id: u.id, icon: u.icon, color: u.color, vars: u.vars, canvas: u.canvas, rubric: u.rubric });
    });
    const exp = document.getElementById("ucExportAll");
    if (exp) exp.onclick = () => download("usecases.json", Z.state.customUseCases);
    const imp = document.getElementById("ucImport");
    if (imp) imp.onchange = () => {
      const f = imp.files[0]; if (!f) return;
      f.text().then((t) => {
        let data = JSON.parse(t);
        data = Array.isArray(data) ? data : [data];
        data.forEach((u) => {
          if (!u.vars || !u.vars.name) return;
          u.id = u.id && !Z.usecases.some((b) => b.id === u.id) ? u.id : "uc-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
          Z.state.customUseCases = Z.state.customUseCases.filter((x) => x.id !== u.id).concat([u]);
        });
        Z.persist("customUseCases"); toast(`Imported ${data.length} use case(s)`); route();
      }).catch(() => toast("That file is not valid use-case JSON"));
    };
    const form = document.getElementById("ucForm");
    if (form) {
      const total = () => {
        let s = 0;
        RUBRIC.forEach(([k]) => { const v = +form["r_" + k].value; s += v; document.getElementById("rv_" + k).textContent = v; });
        document.getElementById("rTotal").textContent = s;
      };
      form.querySelectorAll("input[type=range]").forEach((r) => r.oninput = total);
      total();
      form.onsubmit = (e) => {
        e.preventDefault();
        const u = { id: form.id.value || "uc-" + Date.now().toString(36), icon: form.icon.value || "🧩", color: "amber", vars: {}, canvas: {}, rubric: {} };
        FIELDS.forEach(([k, , , where, area]) => {
          const v = form[k].value.trim();
          if (where === "vars") u.vars[k] = v; else u.canvas[k] = area && k !== "problem" ? lines(v) : v;
        });
        if (!u.vars.name) { toast("Give it a name first"); return; }
        u.vars.short = (u.vars.short || u.vars.name.replace(/[^a-z]/gi, "").slice(0, 4)).toLowerCase();
        u.vars.slug = u.vars.slug || u.vars.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        RUBRIC.forEach(([k]) => { u.rubric[k] = +form["r_" + k].value; });
        Z.state.customUseCases = Z.state.customUseCases.filter((x) => x.id !== u.id).concat([u]);
        Z.persist("customUseCases"); toast("Saved"); location.hash = "#/lab/view/" + u.id;
      };
    }
  }

  /* Modules for a custom (breakout) use case, generated from its canvas. */
  function generateModules(u) {
    const c = u.canvas || {};
    const v = u.vars;
    const agents = (c.agents || []).map((a) => a.split(":")[0].trim()).filter(Boolean);
    return [
      {
        id: "usecase", num: "06", order: 6, phase: "usecase", stage: "Plan", icon: u.icon || "🧩", color: "amber",
        title: `Meet ${v.name}`, short: `Meet ${v.name}`, subtitle: v.tagline, duration: "20 min",
        goals: ["Understand the problem", "See the agent team", "Know the human approval points"],
        cards: [
          { type: "concept", title: "The problem", lead: c.problem || "", points: (c.users || []).map((x) => `**${x.split(":")[0]}** — ${x.split(":").slice(1).join(":")}`) },
          { type: "flips", title: "The agent team", lead: "Flip each card: what the agent does.", items: (c.agents || []).map((a) => ({ icon: "🤖", front: a.split(":")[0], back: a.split(":").slice(1).join(":") || "" })) },
          { type: "table", title: "Systems we integrate", head: ["System", "What we use"], rows: [["System of record", v.erp || ""], ["Database", v.db || ""], ["Work tracker", v.tracker || ""], ["Unstructured input", v.input || ""]] },
          { type: "concept", title: "Deterministic core, risks and human approval", lead: `**Deterministic core:** ${v.core || ""}`, points: [...(c.risks || []).map((r) => "🛡️ " + r), ...(c.hitl || []).map((x) => "🙋 " + x)] },
        ],
      },
      {
        id: "sprints", num: "10", order: 10, phase: "sdlc", stage: "Build", icon: "🏃", color: "teal",
        title: `Build ${v.name} in three sprints`, short: "Build sprints", subtitle: "Generated from your canvas; refine the prompts as you go", duration: "3 × 75 min",
        goals: ["Thin vertical slice per sprint", "Tests before features", "Agents never own the decision"],
        cards: [
          { type: "lab", title: "Sprint 1 — system of record, data and the deterministic core", steps: [
            { text: "Plan first (Shift+Tab into Plan mode).", prompt: `Read CLAUDE.md and docs/ (stories + architecture). Plan Sprint 1 for ${v.name}: a mock ${v.erp} service (FastAPI, verbose realistic payloads), a FastMCP server wrapping it, SQLAlchemy models in ${v.db}, and the deterministic core: ${v.core}. List files, tests, and acceptance criteria per story. Do not write code yet.` },
            { text: "Build test-first.", prompt: `Implement the Sprint 1 plan. Write pytest unit tests for the deterministic core first, run them red, then implement until green. Then add the FastAPI endpoints and an integration test. Run ruff and pytest and show me the output.` },
          ] },
          { type: "lab", title: "Sprint 2 — agents, guardrails and the tracker", steps: [
            { prompt: `Using the OpenAI Agents SDK, create these agents: ${agents.join(", ") || "intake, specialist and resolution agents"}. The orchestrator is code: run independent specialist agents in parallel with asyncio.gather, pass a typed context object, and have each agent return a Pydantic model. The final decision comes from the deterministic core, never from an LLM. Add an input guardrail for prompt injection and an output guardrail for unsafe claims. Add an offline mode with deterministic stand-ins so tests run without an API key.` },
            { prompt: `Integrate ${v.tracker}: when a case needs a human, create a ticket (dry-run JSON outbox when credentials are missing). Add an approve/reject endpoint for: ${(c.hitl || []).join("; ")}. Write an audit event for every step.` },
          ] },
          { type: "lab", title: "Sprint 3 — UI with explainability", steps: [
            { prompt: `Create a React + Vite + TypeScript frontend: dashboard KPI tiles (${(c.kpis || []).join(", ")}), a case list, and a case detail page that shows the decision, reason codes, the evidence table, the agent timeline and approve/reject buttons. Use plain CSS. Read the API base URL from VITE_API_BASE_URL.` },
          ] },
        ],
      },
    ];
  }

  window.ZoneLab = { page, wire, generateModules, RUBRIC };
})();

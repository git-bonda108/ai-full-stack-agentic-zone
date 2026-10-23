/* Card renderers. Each card is a plain object with a `type`; see docs/AUTHORING.md. */
(function () {
  const Z = window.Zone;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Tiny markdown: **bold**, *em*, `code`, [text](url), blank line = paragraph, "\n" = <br>. */
  function md(s) {
    if (s == null) return "";
    let t = esc(Z.tpl(s));
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    t = t.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    t = t.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => {
      const ext = /^https?:/.test(url);
      return `<a href="${url}"${ext ? ' target="_blank" rel="noopener"' : ""}>${txt}</a>`;
    });
    return t.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  }
  function mdInline(s) { return md(s).replace(/^<p>|<\/p>$/g, "").replace(/<\/p><p>/g, "<br><br>"); }

  let codeSeq = 0;
  const codeStore = {};

  /* Code with variable highlighting. kind: "cmd" | "prompt" | "file". */
  function codeBlock(src, opts) {
    opts = opts || {};
    const id = "cb" + (++codeSeq);
    const multi = src && typeof src === "object" && !Array.isArray(src);
    const shells = multi ? Object.keys(src) : null;
    let shell = multi ? (src[Z.state.shell] != null ? Z.state.shell : shells[0]) : null;
    const raw = multi ? src[shell] : src;
    codeStore[id] = { src, opts };
    const lang = opts.lang || (opts.kind === "prompt" ? "prompt" : multi ? (shell === "ps" ? "powershell" : "bash") : "bash");
    const label = opts.label ? `<span>${esc(opts.label)}</span>` : "";
    const tabs = multi
      ? `<span class="os-tabs">${shells.map((s) => `<button data-shell="${s}" data-cb="${id}" class="${s === shell ? "on" : ""}">${s === "ps" ? "PowerShell" : s === "bash" ? "bash / zsh" : s}</button>`).join("")}</span>`
      : "";
    // Embedded viewers (iframes) block downloads, so only offer the button in a normal tab.
    const dl = opts.file && (window.self === window.top || window.claude) ? `<button data-dl="${id}">Download</button>` : "";
    return `<div class="code ${opts.kind === "prompt" ? "prompt" : ""} ${opts.tall ? "tall" : ""}" id="${id}">
      <div class="code-head"><span class="lang">${esc(opts.kind === "prompt" ? "Prompt · Claude Code" : lang)}</span>${label}<span class="spacer"></span>${tabs}${dl}<button data-copy="${id}">Copy</button></div>
      <pre>${highlight(raw, lang, opts.kind, opts.raw)}</pre></div>`;
  }

  function highlight(raw, lang, kind, noTpl) {
    const marked = noTpl ? String(raw) : Z.tpl(raw, true);
    let h = esc(marked);
    if (kind !== "prompt" && ["bash", "powershell", "yaml", "python", "toml", "dockerfile", "ini", "text"].includes(lang)) {
      h = h.split("\n").map((line) => (/^\s*#/.test(line) ? `<span class="c">${line}</span>` : line)).join("\n");
    }
    if (kind !== "prompt" && ["json", "javascript", "typescript", "kql"].includes(lang)) {
      h = h.split("\n").map((line) => (/^\s*\/\//.test(line) ? `<span class="c">${line}</span>` : line)).join("\n");
    }
    return h.replace(/\u0001/g, '<span class="v">').replace(/\u0002/g, "</span>");
  }

  function plainOf(id) {
    const entry = codeStore[id];
    if (!entry) return "";
    const el = document.getElementById(id);
    let raw = entry.src;
    if (raw && typeof raw === "object") {
      const on = el && el.querySelector(".os-tabs button.on");
      raw = raw[on ? on.dataset.shell : Object.keys(raw)[0]];
    }
    return entry.opts.raw ? String(raw) : Z.tpl(raw);
  }

  function langOf(path) {
    const ext = (path.split(".").pop() || "").toLowerCase();
    return { py: "python", md: "markdown", json: "json", yml: "yaml", yaml: "yaml", sh: "bash", ps1: "powershell", ts: "typescript", tsx: "typescript", js: "javascript", toml: "toml", txt: "text", example: "ini" }[ext] || (/dockerfile/i.test(path) ? "dockerfile" : "text");
  }

  function callouts(list) {
    if (!list) return "";
    const icons = { tip: "💡", trap: "⚠️", rai: "🛡️", why: "🎯", java: "☕" };
    return list.map((c) => `<div class="callout ${c.kind || "tip"}"><div class="ci">${icons[c.kind || "tip"]}</div><div><b>${esc(Z.tpl(c.title || ""))}</b>${md(c.text)}</div></div>`).join("");
  }

  function points(list) {
    if (!list || !list.length) return "";
    return `<ul class="points">${list.map((p) => `<li>${mdInline(p)}</li>`).join("")}</ul>`;
  }

  function table(head, rows) {
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${mdInline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }

  function flow(nodes) {
    return `<div class="flow">${nodes.map((n, i) => `${i ? '<div class="arrow">→</div>' : ""}<div class="node"><span class="e">${n.e || ""}</span><b>${esc(Z.tpl(n.b))}</b><small>${esc(Z.tpl(n.s || ""))}</small></div>`).join("")}</div>`;
  }

  function mermaid(src) {
    return `<div class="diagram"><div class="mermaid">${esc(Z.tpl(src))}</div></div>`;
  }

  function steps(list) {
    return `<div class="steps">${list.map((s) => {
      let h = `<div class="step-item">${md(s.text || "")}`;
      if (s.prompt) h += codeBlock(s.prompt, { kind: "prompt", label: s.promptLabel });
      if (s.cmd) h += codeBlock(s.cmd, { kind: "cmd", label: s.cmdLabel, lang: s.lang });
      if (s.code) h += codeBlock(s.code.code, { kind: "file", lang: s.code.lang, label: s.code.file, file: s.code.file });
      if (s.expect) h += `<div class="expect">${mdInline(s.expect)}</div>`;
      if (s.callouts) h += callouts(s.callouts);
      return h + "</div>";
    }).join("")}</div>`;
  }

  const TYPE_LABEL = {
    concept: "🧠 Concept", flips: "🃏 Flip cards", lab: "🛠️ Hands-on lab", prompt: "💬 Prompt",
    cmds: "⌨️ Commands", compare: "⚖️ Compare", table: "📋 Reference", diagram: "🗺️ Diagram",
    flow: "🔁 Flow", quiz: "❓ Checkpoint quiz", file: "📄 File", tree: "🗂️ Structure",
    layers: "🏗️ Architecture", embed: "🎧 Listen", checklist: "✅ Checklist", backlog: "🗂️ Backlog",
  };

  function body(card) {
    let h = "";
    switch (card.type) {
      case "concept":
        if (card.side) {
          h += `<div class="split"><div>${card.lead ? `<div class="lead">${md(card.lead)}</div>` : ""}${points(card.points)}${card.html || ""}</div><div>${sideOf(card.side)}</div></div>`;
        } else {
          h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
          h += points(card.points) + (card.html || "");
        }
        break;
      case "flips":
        h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
        h += `<div class="flips">${card.items.map((it) => `<button class="flip" type="button" aria-label="Flip card: ${esc(it.front)}"><div class="flip-inner">
          <div class="flip-face flip-front"><span class="flip-hint">tap to flip ↻</span><span class="big">${it.icon || "✨"}</span><b>${esc(Z.tpl(it.front))}</b><small>${esc(Z.tpl(it.sub || ""))}</small></div>
          <div class="flip-face flip-back"><b>${esc(Z.tpl(it.front))}</b>${md(it.back)}</div></div></button>`).join("")}</div>`;
        break;
      case "lab":
        h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
        h += steps(card.steps || []);
        if (card.checkpoint) h += `<div class="callout why"><div class="ci">🏁</div><div><b>Checkpoint</b>${md(card.checkpoint)}</div></div>`;
        break;
      case "prompt":
        h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
        h += codeBlock(card.prompt, { kind: "prompt", label: card.label });
        if (card.expect) h += `<div class="expect">${mdInline(card.expect)}</div>`;
        break;
      case "cmds":
        h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
        h += (card.blocks || []).map((b) => `${b.text ? md(b.text) : ""}${codeBlock(b.cmd, { kind: "cmd", label: b.label, lang: b.lang })}${b.expect ? `<div class="expect">${mdInline(b.expect)}</div>` : ""}`).join("");
        break;
      case "compare":
        h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
        h += `<div class="compare" style="grid-template-columns:repeat(${card.cols.length},minmax(0,1fr))">${card.cols.map((c) => `<div class="col" style="--c:var(--${c.color || "brand"})"><h4>${c.icon || ""} ${esc(Z.tpl(c.title))}</h4><ul>${c.points.map((p) => `<li>${mdInline(p)}</li>`).join("")}</ul>${c.verdict ? `<div class="verdict">${mdInline(c.verdict)}</div>` : ""}</div>`).join("")}</div>`;
        break;
      case "table":
        h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
        h += table(card.head, card.rows);
        break;
      case "diagram":
        h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
        const src = card.mermaid || ((Z.activeUseCase().diagrams || {})[card.mermaidRef]);
        h += src ? mermaid(src) : card.svg ? `<div class="diagram">${card.svg}</div>` : `<div class="callout tip"><div class="ci">💡</div><div><b>No diagram yet for this use case</b><p>Generate it with the prompt on the previous card.</p></div></div>`;
        h += points(card.points);
        break;
      case "flow":
        h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
        h += flow(card.nodes) + points(card.points);
        break;
      case "quiz":
        h += `<div class="lead">${md(card.q)}</div><div class="quiz-opts" data-answer="${card.answer}">${card.options.map((o, i) => `<button type="button" data-i="${i}">${String.fromCharCode(65 + i)}. ${mdInline(o)}</button>`).join("")}</div><div class="quiz-why callout why"><div class="ci">🎯</div><div><b>Why</b>${md(card.why)}</div></div>`;
        break;
      case "file": {
        h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
        const code = card.code != null ? card.code : (Z.data.files || {})[card.fileRef];
        const path = card.path || (card.fileRef || "").replace(/^(starter-kit|reference-app)\//, "");
        h += code == null
          ? `<div class="callout trap"><div class="ci">⚠️</div><div><b>File not bundled</b><p>Run <code>python tools/build_files.py</code> to include <code>${esc(card.fileRef)}</code>.</p></div></div>`
          : codeBlock(code, { kind: "file", lang: card.lang || langOf(path), label: path, file: path, tall: true, raw: true });
        if (card.fileRef) h += `<p style="font-size:.78rem;color:var(--ink-3);margin-top:6px">Source: <code>${esc(card.fileRef)}</code> in this repo</p>`;
        h += points(card.points);
        break;
      }
      case "backlog": {
        const uc = Z.activeUseCase();
        h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
        h += (uc.backlog || []).map((ep) => `<div class="session" style="margin-top:12px"><div class="when">${esc(ep.key)} · EPIC · ${esc(ep.sprint || "")}</div><h3>${esc(ep.title)}</h3>
          ${table(["Story", "As a… I want… so that…", "Acceptance (Gherkin)", "Pts"], ep.stories.map((st) => [`**${st.key}** ${st.title}`, st.story, st.ac, String(st.pts)]))}</div>`).join("") || `<p>No backlog defined for this use case yet. Use the Plan prompts to generate one.</p>`;
        break;
      }
      case "tree":
        h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
        h += `<div class="tree">${treeHtml(card.tree)}</div>` + points(card.points);
        break;
      case "layers":
        h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
        h += layersHtml();
        break;
      case "embed":
        h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
        h += card.html || "";
        h += points(card.points);
        break;
      case "checklist":
        h += card.lead ? `<div class="lead">${md(card.lead)}</div>` : "";
        h += `<div class="grid g2" style="margin-top:12px">${card.groups.map((g) => `<div class="session"><h4>${esc(g.title)}</h4>${g.items.map((it) => `<label style="display:flex;gap:8px;font-size:.88rem;margin:6px 0"><input type="checkbox"> <span>${mdInline(it)}</span></label>`).join("")}</div>`).join("")}</div>`;
        break;
      default:
        h += md(card.lead || "");
    }
    h += callouts(card.callouts);
    return h;
  }

  function sideOf(side) {
    if (typeof side === "string") return side;
    if (side.mermaid) return mermaid(side.mermaid);
    if (side.flow) return flow(side.flow);
    if (side.table) return table(side.table.head, side.table.rows);
    if (side.code) return codeBlock(side.code, { kind: side.kind || "file", lang: side.lang, label: side.label });
    if (side.prompt) return codeBlock(side.prompt, { kind: "prompt", label: side.label });
    if (side.callouts) return callouts(side.callouts);
    if (side.html) return side.html;
    return "";
  }

  function treeHtml(t) {
    return esc(Z.tpl(t)).split("\n").map((line) => {
      const [path, note] = line.split("  #");
      const p = /\/\s*$/.test(path) ? `<span class="d">${path}</span>` : path;
      return note ? `${p}  <span class="note">#${note}</span>` : p;
    }).join("\n");
  }

  function layersHtml() {
    const layers = Z.data.layers || [];
    return `<div class="layers">${layers.map((l, i) => `<button type="button" class="layer" style="--c:var(--${l.color})">
      <span class="ln">L${l.n}</span><span><b>${l.icon} ${esc(l.name)}</b><small>${esc(l.what)}</small></span><span class="tag">${esc(l.inApp)}</span>
      <div class="layer-detail"><div><h5>Fails in production when…</h5><ul>${l.fails.map((f) => `<li>${mdInline(f)}</li>`).join("")}</ul></div>
      <div><h5>Engineering control</h5><ul>${l.controls.map((f) => `<li>${mdInline(f)}</li>`).join("")}</ul></div>
      <div><h5>Where it lives in {{app.name}}</h5><ul>${l.where.map((f) => `<li>${mdInline(f)}</li>`).join("")}</ul></div></div></button>`).join("")}</div>`;
  }

  function cardHtml(mod, card, idx, total) {
    const done = Z.isDone(mod.id, idx);
    return `<article class="card" data-idx="${idx}">
      <div class="card-type">${TYPE_LABEL[card.type] || card.type}${card.time ? ` · <span style="color:var(--ink-3)">${esc(card.time)}</span>` : ""}</div>
      <h2>${esc(Z.tpl(card.title || ""))}</h2>
      ${body(card)}
      <div class="card-foot">
        <span class="tag">${idx + 1} / ${total}</span>
        <span class="spacer"></span>
        <button class="pill-btn done-btn ${done ? "on" : ""}" data-done="${idx}">${done ? "✓ Done" : "Mark done"}</button>
        ${Z.state.view === "deck" ? `<button class="pill-btn" data-nav="prev" ${idx === 0 ? "disabled" : ""}>← Prev</button><button class="btn sm" data-nav="next">${idx === total - 1 ? "Finish module →" : "Next card →"}</button>` : ""}
      </div></article>`;
  }

  /* Wire interactive bits inside a rendered container. */
  function wire(root) {
    root.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => {
      const text = plainOf(b.dataset.copy);
      const ok = () => { b.textContent = "Copied ✓"; b.classList.add("ok"); setTimeout(() => { b.textContent = "Copy"; b.classList.remove("ok"); }, 1400); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, () => fallbackCopy(text, ok));
      else fallbackCopy(text, ok);
    }));
    root.querySelectorAll("[data-dl]").forEach((b) => b.addEventListener("click", () => {
      const entry = codeStore[b.dataset.dl];
      let name = (entry.opts.file || "file.txt").split("/").pop();
      if (!/\.(txt|json|md|csv|html)$/i.test(name)) name += ".txt"; // hosted viewers allow only some extensions
      Z.saveFile(name, plainOf(b.dataset.dl), window.ZoneApp && window.ZoneApp.toast);
    }));
    root.querySelectorAll(".os-tabs button").forEach((b) => b.addEventListener("click", () => {
      Z.state.shell = b.dataset.shell; Z.persist("shell");
      window.ZoneApp && window.ZoneApp.rerender();
    }));
    root.querySelectorAll(".flip").forEach((f) => f.addEventListener("click", () => f.classList.toggle("flipped")));
    root.querySelectorAll(".layer").forEach((l) => l.addEventListener("click", () => l.classList.toggle("open")));
    root.querySelectorAll(".quiz-opts").forEach((q) => q.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
      const ans = +q.dataset.answer;
      q.querySelectorAll("button").forEach((x) => x.classList.remove("right", "wrong"));
      b.classList.add(+b.dataset.i === ans ? "right" : "wrong");
      q.querySelectorAll("button")[ans].classList.add("right");
      q.nextElementSibling.classList.add("show");
    })));
    if (window.mermaid) {
      const nodes = root.querySelectorAll(".mermaid:not([data-processed])");
      if (nodes.length) {
        try { window.mermaid.run({ nodes }); } catch (e) { /* diagram stays as text */ }
      }
    }
  }

  function fallbackCopy(text, ok) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); ok(); } catch (e) { /* ignore */ }
    ta.remove();
  }

  window.ZoneRender = { esc, md, mdInline, codeBlock, cardHtml, wire, table, flow, mermaid, callouts, points, plainOf };
})();

/* Export the runbook to an Excel workbook (SheetJS) so trainees can follow along and tick progress. */
(function () {
  const Z = window.Zone;
  const MAX_CELL = 32000; // Excel's hard limit is 32,767 characters per cell

  /* Markdown-ish text → plain text with variables filled in. */
  function plain(s) {
    if (s == null) return "";
    return Z.tpl(String(s))
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1$2")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
      .replace(/<br\s*\/?>/g, " ")
      .trim();
  }
  function clip(s) { return s.length > MAX_CELL ? s.slice(0, MAX_CELL - 20) + " … (truncated)" : s; }
  function cmdText(cmd, shell) {
    if (cmd == null) return "";
    if (typeof cmd === "object") return Z.tpl(cmd[shell] != null ? cmd[shell] : "");
    return shell === "bash" ? Z.tpl(cmd) : "";
  }

  /* One readable text block per card, for the Runbook sheet. */
  function cardText(c) {
    const out = [];
    const add = (s) => { const t = plain(s); if (t) out.push(t); };
    add(c.lead);
    add(c.q);
    (c.points || []).forEach((p) => add("• " + p));
    (c.items || []).forEach((it) => add(`• ${it.front}: ${it.back}`));
    (c.cols || []).forEach((col) => add(`[${col.title}] ${col.points.join("; ")}${col.verdict ? " → " + col.verdict : ""}`));
    (c.nodes || []).forEach((n, i) => add(`${i + 1}. ${n.b}: ${n.s || ""}`));
    if (c.head && c.rows) { add(c.head.join(" | ")); c.rows.forEach((r) => add(r.join(" | "))); }
    if (c.side && c.side.table) { add(c.side.table.head.join(" | ")); c.side.table.rows.forEach((r) => add(r.join(" | "))); }
    if (c.side && c.side.flow) add(c.side.flow.map((n) => n.b).join(" → "));
    (c.steps || []).forEach((s, i) => {
      add(`Step ${i + 1}: ${s.text || ""}`);
      if (s.prompt) add("PROMPT: " + (typeof s.prompt === "string" ? s.prompt : ""));
      if (s.cmd) add("COMMAND: " + cmdText(s.cmd, "bash"));
      if (s.expect) add("EXPECT: " + s.expect);
    });
    (c.blocks || []).forEach((b) => { add((b.label ? b.label + ": " : "") + (b.text || "")); add("COMMAND: " + cmdText(b.cmd, "bash")); });
    if (c.type === "prompt") add("PROMPT: " + c.prompt);
    (c.options || []).forEach((o, i) => add(`${String.fromCharCode(65 + i)}. ${o}`));
    if (c.why) add("Answer: " + String.fromCharCode(65 + c.answer) + ". " + c.why);
    if (c.fileRef || c.path) add("File: " + (c.fileRef || c.path));
    if (c.tree) add(c.tree);
    (c.groups || []).forEach((g) => add(`[${g.title}] ${g.items.join("; ")}`));
    if (c.checkpoint) add("CHECKPOINT: " + c.checkpoint);
    if (c.expect) add("EXPECT: " + c.expect);
    (c.callouts || []).forEach((k) => add(`${(k.title || "").toUpperCase()}: ${k.text}`));
    return clip(out.join("\n"));
  }

  function sheet(rows, widths) {
    const ws = window.XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = widths.map((w) => ({ wch: w }));
    if (rows.length > 1) ws["!autofilter"] = { ref: window.XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: rows[0].length - 1 } }) };
    return ws;
  }

  function buildWorkbook() {
    const X = window.XLSX;
    const uc = Z.activeUseCase();
    const mods = Z.activeModules();
    const wb = X.utils.book_new();
    const date = new Date().toISOString().slice(0, 10);
    wb.Props = { Title: `Agentic Zone runbook · ${uc.vars.name}`, Subject: "AI full-stack agentic engineering", CreatedDate: new Date() };

    const runbook = [["Module #", "Module", "Card #", "Type", "Title", "Content", "Time", "Done (Y/N)", "Notes"]];
    const prompts = [["Module #", "Module", "Card #", "Card", "Label", "Prompt (paste into Claude Code)", "Expect", "Done (Y/N)", "Notes"]];
    const cmds = [["Module #", "Module", "Card #", "Card", "Label", "bash / zsh", "PowerShell", "Expect", "Done (Y/N)", "Notes"]];
    const quiz = [["Module #", "Module", "Question", "Options", "Answer", "Why", "My answer"]];
    const overview = [["Module #", "Module", "Phase", "Stage", "Duration", "Cards", "Goals", "Done (Y/N)"]];

    mods.forEach((m) => {
      const title = plain(m.title);
      overview.push([m.num, title, m.phase, m.stage || "", m.duration || "", (m.cards || []).length, (m.goals || []).map(plain).join("; "), ""]);
      (m.cards || []).forEach((c, i) => {
        const ct = plain(c.title);
        runbook.push([m.num, title, i + 1, c.type, ct, cardText(c), c.time || "", Z.isDone(m.id, i) ? "Y" : "", ""]);
        const p = (text, label, expect) => prompts.push([m.num, title, i + 1, ct, plain(label || ""), clip(Z.tpl(text)), plain(expect || ""), "", ""]);
        if (c.type === "prompt") p(c.prompt, c.label, c.expect);
        (c.steps || []).forEach((s) => s.prompt && p(s.prompt, s.promptLabel || s.text, s.expect));
        if (c.side && c.side.prompt) p(c.side.prompt, c.side.label);
        const k = (cmd, label, expect) => cmds.push([m.num, title, i + 1, ct, plain(label || ""), clip(cmdText(cmd, "bash")), clip(cmdText(cmd, "ps")), plain(expect || ""), "", ""]);
        (c.blocks || []).forEach((b) => b.cmd && k(b.cmd, b.label || b.text, b.expect));
        (c.steps || []).forEach((s) => s.cmd && k(s.cmd, s.cmdLabel || s.text, s.expect));
        if (c.type === "quiz") quiz.push([m.num, title, plain(c.q), c.options.map((o, j) => `${String.fromCharCode(65 + j)}. ${plain(o)}`).join("\n"), String.fromCharCode(65 + c.answer), plain(c.why), ""]);
      });
    });

    const start = [
      ["Agentic Zone runbook"],
      [`Use case: ${uc.vars.name}, ${uc.vars.tagline || ""}`],
      [`Exported ${date}. Commands are filled in with the variables on the "My variables" sheet.`],
      [""],
      ["Sheet", "What it holds"],
      ["Overview", "Every module with duration and goals"],
      ["Runbook", "Every card in order, as text, with Done and Notes columns"],
      ["Prompts", "Every Claude Code prompt, ready to paste"],
      ["Commands", "Every terminal command, bash and PowerShell"],
      ["Sessions", "The Saturday plan"],
      ["Backlog", `Epics and user stories for ${uc.vars.name}`],
      ["9 Layers", "The production stack: failure modes and controls"],
      ["Quiz", "Checkpoint questions with answers"],
      ["Glossary", "Terms in one or two lines"],
      ["My variables", "Azure, GitHub and Jira names used in the commands"],
    ];
    X.utils.book_append_sheet(wb, sheet(start, [22, 90]), "Start here");
    X.utils.book_append_sheet(wb, sheet(overview, [9, 46, 12, 12, 11, 7, 70, 11]), "Overview");
    X.utils.book_append_sheet(wb, sheet(runbook, [9, 36, 7, 10, 44, 110, 9, 11, 30]), "Runbook");
    X.utils.book_append_sheet(wb, sheet(prompts, [9, 30, 7, 36, 30, 100, 40, 11, 30]), "Prompts");
    X.utils.book_append_sheet(wb, sheet(cmds, [9, 30, 7, 36, 30, 80, 80, 40, 11, 30]), "Commands");

    const sessions = [["Session", "Title", "Time", "Agenda item"]];
    (Z.data.sessions || []).forEach((s) => s.agenda.forEach((a) => sessions.push([s.when, s.title, a[0], plain(a[1])])));
    X.utils.book_append_sheet(wb, sheet(sessions, [14, 40, 8, 60]), "Sessions");

    const backlog = [["Epic", "Epic title", "Sprint", "Story", "Title", "User story", "Acceptance criteria", "Points", "Status"]];
    (uc.backlog || []).forEach((ep) => ep.stories.forEach((st) => backlog.push([ep.key, ep.title, ep.sprint || "", st.key, st.title, st.story, st.ac, st.pts, ""])));
    X.utils.book_append_sheet(wb, sheet(backlog, [10, 40, 11, 9, 40, 70, 70, 7, 12]), "Backlog");

    const layers = [["#", "Layer", "What", "Fails in production when…", "Engineering control", "Where it lives"]];
    (Z.data.layers || []).forEach((l) => layers.push([l.n, l.name, l.what, l.fails.map(plain).join("\n"), l.controls.map(plain).join("\n"), l.where.map(plain).join("\n")]));
    X.utils.book_append_sheet(wb, sheet(layers, [4, 26, 40, 60, 60, 50]), "9 Layers");

    X.utils.book_append_sheet(wb, sheet(quiz, [9, 36, 60, 60, 8, 70, 12]), "Quiz");
    X.utils.book_append_sheet(wb, sheet([["Term", "Meaning"]].concat((Z.data.glossary || []).map(([t, d]) => [t, plain(d)])), [28, 100]), "Glossary");
    const vars = Z.vars();
    X.utils.book_append_sheet(wb, sheet([["Variable", "Value"]].concat(Object.keys(vars).filter((k) => !k.startsWith("app.")).sort().map((k) => [k, vars[k]])), [22, 50]), "My variables");
    return { wb, filename: `agentic-zone-${uc.vars.slug || "runbook"}-${date}.xlsx` };
  }

  async function exportExcel(toast) {
    if (!window.XLSX) { toast("Excel export needs internet to load its library. Check your connection and try again."); return; }
    const { wb, filename } = buildWorkbook();
    const bytes = window.XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    await Z.saveFile(filename, blob, toast);
  }

  window.ZoneExport = { exportExcel, buildWorkbook };
})();

# Authoring guide

Everything in the runbook is data. Add a `<script>` tag to `index.html` for any new file.

## Variables

Any string can use `{{…}}` placeholders, filled in at render time:

| Prefix | Source | Examples |
|---|---|---|
| `app.*` | active use case `vars` | `{{app.name}}`, `{{app.slug}}`, `{{app.short}}`, `{{app.jiraKey}}` |
| `az.*`, `gh.*`, `jira.*` | **My variables** page (per browser), with defaults derived from `app.short` | `{{az.rg}}`, `{{az.acr}}`, `{{gh.owner}}`, `{{jira.site}}` |

In commands, filled-in values are highlighted. File cards that use `fileRef` are shown raw (no substitution).

## A module

```js
Zone.addModule({
  id: "my-module", num: "17", order: 17,      // order decides position; use-case modules mix in by order
  phase: "ship",                              // foundations | usecase | sdlc | ship (sidebar group)
  stage: "Operate",                           // used to filter the prompt/command libraries
  icon: "📈", color: "sky",                   // brand | teal | amber | coral | sky | violet | green
  title: "…", short: "…", subtitle: "…", duration: "30 min",
  goals: ["…"],
  cards: [ /* see below */ ],
});
```

## Card types

| type | Fields |
|---|---|
| `concept` | `title, lead, points[], side?` (`side` = `{table}`, `{flow}`, `{code, lang, label}`, `{prompt}`, `{mermaid}`) |
| `flips` | `title, lead, items[{icon, front, sub, back}]` |
| `lab` | `title, time, lead, steps[{text, prompt?, cmd?, code?, expect?}], checkpoint` |
| `prompt` | `title, lead, prompt, expect` |
| `cmds` | `title, lead, blocks[{label, cmd, text?, expect?, lang?}]` |
| `compare` | `title, lead, cols[{title, icon, color, points[], verdict}]` |
| `table` | `title, lead, head[], rows[][]` |
| `diagram` | `title, lead, mermaid` or `mermaidRef` (a key in the active use case's `diagrams`) |
| `flow` | `title, lead, nodes[{e, b, s}], points[]` |
| `file` | `title, lead, fileRef` (bundled by `tools/build_files.py`) or `code` + `path` + `lang` |
| `tree` | `title, lead, tree` (lines ending in `/` are folders; `  # note` adds a note) |
| `quiz` | `title, q, options[], answer (0-based), why` |
| `checklist` | `title, lead, groups[{title, items[]}]` |
| `layers` | renders the 9-layer stack from `content/data.js` |
| `backlog` | renders the active use case's `backlog` |
| `embed` | `title, lead, html` |

Any card can add `callouts: [{kind: "tip"|"trap"|"why"|"rai"|"java", title, text}]`.

A command can be a string, or `{ bash: "…", ps: "…" }` for a bash / PowerShell toggle.
Text supports `**bold**`, `*em*`, `` `code` `` and `[links](https://…)`.

## A use case

Copy `content/usecases/p2p-sentinel.js`. The parts:

- `vars`: name, short (3–5 lowercase letters, used in Azure names), slug, jiraKey, tagline, domain, input, erp, db, tracker, core, outcomes
- `canvas`: problem, users[], agents[], hitl[], risks[], kpis[]
- `rubric`: eight scores from 1 to 5 (see the Use-Case Lab)
- `backlog`: epics with stories `{key, title, story, ac, pts}`
- `diagrams`: Mermaid sources for `context`, `container`, `sequence`, `agents`, `erd`
- `modules`: optional. Without them, a reveal module and a generated sprint module are built from the canvas (`assets/js/lab.js`)

Breakout teams can do all of this without code: **Use-Case Lab → New use case canvas**, then
**Export JSON**. The canvas page also shows a ready-made prompt that asks Claude Code to turn the
canvas into a full use-case pack file.

## Bundled files

File cards show real files from `starter-kit/`, `reference-app/` and `.github/`. After you change
any of those, run:

```bash
python tools/build_files.py
```

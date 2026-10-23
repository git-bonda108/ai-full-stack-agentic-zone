Zone.addModule({
  id: "complete", num: "17", order: 17, phase: "ship", stage: "Operate",
  icon: "🏁", color: "green", duration: "45 min + each Saturday",
  title: "Completion: the Definition of Done, from plan to production", short: "Completion & demo",
  subtitle: "Every gate with the evidence that proves it, a final end-to-end verification against Azure, and the demo script",
  goals: ["Every gate ticked with evidence", "Golden set passes against the deployed API", "A 10-minute demo", "The evidence pack handed in"],
  cards: [
    {
      type: "concept", title: "How to use this module",
      lead: "Each gate lists what must be **true and provable** before you move on. Tick an item only when you can show the evidence (a command output, a file, a link). Ticks are saved in this browser **per use case**, so each team tracks its own build.",
      side: { table: { head: ["Gate", "Module(s)", "Proves"], rows: [["0 · Use case & plan", "W, 06, 07, 08", "We know what we're building"], ["1 · Design", "09", "We know how"], ["2 · Sprint 1", "10", "The deterministic core is right"], ["3 · Sprint 2", "11", "Agents can't change decisions"], ["4 · Sprint 3", "12", "A human can see why and decide"], ["5 · Test & secure", "13, 14", "Evidence, guardrails, RAI"], ["6 · Deploy", "15", "It runs in Azure, keylessly"], ["7 · Observe", "16", "We'd see it break"]] } },
      points: ["Trainer: open this module at the end of every Saturday; each team reads out its count per gate", "Anything unticked becomes a Jira story in the hardening epic, not a secret"],
    },
    {
      type: "checklist", title: "Gate 0 · Use case and plan",
      groups: [
        { title: "Use case", items: ["Canvas readiness **8 / 8** in the Use-Case Lab", "`docs/SPEC.md` written from the canvas and reviewed by the team (Module 06)", "Golden scenarios agreed: every one maps to exactly one first-matching rule"] },
        { title: "Project & plan", items: ["Starter kit copied, venv active, `/healthz` ok, hooks visible in `/hooks` (Module 07)", "Repo `{{gh.owner}}/{{gh.repo}}` pushed with the first commit `{{app.jiraKey}}-1`", "Backlog in Jira project `{{jira.project}}`: 4 epics, stories with Gherkin acceptance criteria (Module 08)", "`docs/session-facts.md` holds the keys, thresholds and ports"] },
      ],
    },
    {
      type: "checklist", title: "Gate 1 · Design",
      groups: [
        { title: "Architecture", items: ["`docs/architecture.md` with context, container, sequence, agent and ER diagrams that render", "Design checked against the 9 layers; gaps written down"] },
        { title: "Contracts & decisions", items: ["`docs/api.md`: every endpoint with request, response and error codes", "ADRs 0001 (hybrid workflow), 0002 (deterministic policy), 0003 (Container Apps) in `docs/adr/`"] },
      ],
    },
    {
      type: "checklist", title: "Gate 2 · Sprint 1: system of record, MCP, deterministic core",
      groups: [
        { title: "Build", items: ["Mock {{app.sorShort}} on :8001 with verbose payloads and 404s", "MCP server `erp` connected in `/mcp`, returns trimmed fields only", "8 golden samples in `{{app.samplesDir}}/` and `evals/golden_set.jsonl`"] },
        { title: "Proof", items: ["Unit tests cover every rule, its boundary and one step past it", "Coverage of `backend/app/domain` ≥ 90% (`pytest --cov`)", "Mutation check done: a broken comparison made a test fail", "Golden loop through the API matches SPEC §8 for all of `{{app.samples}}`", "Stories moved to Done in Jira with the pytest summary as a comment"] },
      ],
    },
    {
      type: "checklist", title: "Gate 3 · Sprint 2: agents, guardrails, Jira, HITL",
      groups: [
        { title: "Agents", items: ["Every agent has a typed output and an import test with a dummy key", "Same decisions offline and with a real model (`python -m evals.run_evals`)", "Typed context holds clients and full payloads; the model gets trimmed data only"] },
        { title: "Guardrails & humans", items: ["`{{app.injectionSample}}` gives {{app.injectionExpect}}", "Output guardrail stops text that claims an outcome the policy didn't decide", "Jira issue (or `var/outbox/*.json`) for every case that needs a human", "`POST /api/cases/{id}/decision`: 404 unknown, 409 when closed, audit event written", "No agent has a tool that performs the irreversible action"] },
      ],
    },
    {
      type: "checklist", title: "Gate 4 · Sprint 3: the experience",
      groups: [
        { title: "UI", items: ["`npm run build` passes with no type errors", "Dashboard counts match `GET /api/metrics/summary`", "Case detail shows decision, reason codes, evidence, explanation and the agent timeline"] },
        { title: "Human in the loop", items: ["Approve / reject from the UI with a mandatory comment; 409 shown nicely", "Explainer subagent's accessibility list triaged: fixed or logged as Jira bugs"] },
      ],
    },
    {
      type: "checklist", title: "Gate 5 · Test, secure, responsible AI",
      groups: [
        { title: "Evidence", items: ["`docs/test-evidence/`: junit.xml, coverage, eval report (8/8), e2e screenshot", "Two extra golden cases (boundary + another language) added and passing or explained", "Playwright e2e: `{{app.holdSample}}` → {{app.holdDecision}} → human decision"] },
        { title: "Security & RAI", items: ["Red-team suite in `tests/redteam/`: none reaches {{app.autoOutcome}}", "`bandit -r backend` and `pip-audit` clean or findings logged", "Security-reviewer subagent report addressed", "`docs/responsible-ai.md`: owners, data processed by the LLM, retention, human oversight", "No secret in git history, prompts or logs"] },
      ],
    },
    {
      type: "checklist", title: "Gate 6 · Deploy to Azure",
      groups: [
        { title: "Runtime", items: ["Images `{{app.short}}-api` and `{{app.short}}-erp` in ACR `{{az.acr}}` (built with `az acr build`)", "`{{az.erp}}` has **internal** ingress only", "`{{az.api}}` answers `/healthz` and `/readyz` over HTTPS", "Static Web App `{{az.swa}}` loads and calls the API (CORS allow-list, no `*`)", "Secrets as Container Apps secrets or Key Vault references, never env literals in git"] },
        { title: "Delivery", items: ["Entra app registration `{{az.ghApp}}` with a GitHub OIDC federated credential, no client secret", "Deploy workflow green on a push to `{{gh.branch}}`; new revision serving", "`docs/deployments.md` records the revision, image tag and eval result", "Rollback rehearsed: traffic moved to the previous revision and back"] },
      ],
    },
    {
      type: "checklist", title: "Gate 7 · Observe and operate",
      groups: [
        { title: "Signals", items: ["App Insights shows a trace per {{app.unit}} with agent-step spans", "KQL: decision mix and tokens per day return data", "Alerts: API 5xx and injection spike, both routed to the action group"] },
        { title: "Operations", items: ["`docs/runbook.md`: how to diagnose, the KQL, the safe remediations", "Incident drill done; the follow-up bug is in Jira", "Cost per {{app.unit}} estimated and written in the README"] },
      ],
    },
    {
      type: "lab", title: "Final verification: prove it end to end", time: "20 min",
      lead: "One run of everything, locally and against Azure. The deployed API must give the same golden decisions as your laptop.",
      steps: [
        { text: "Local gate, all in one go (venv active, repo root):", cmd: "ruff check . && ruff format --check . \\\n  && pytest -q --cov=backend/app/domain --cov-fail-under=90 \\\n  && python -m evals.run_evals \\\n  && (cd frontend && npm run build)", expect: "No lint errors, all tests green, coverage ≥ 90%, 8/8 evals, a clean frontend build." },
        { text: "Make the eval runner able to hit a deployed API:", prompt: "1) Add a --base-url option to evals/run_evals.py. Without it, keep today's in-process behaviour exactly.\n2) With it, POST each golden sample to {base_url}{{app.samplesApi}}/<sample>{{app.sampleQuery}} over HTTPS with httpx (timeout 30s, one retry for a cold start), and compare decision and reason codes with evals/golden_set.jsonl.\n3) Print the same per-case table and write docs/test-evidence/eval-report-deployed.md.\n4) Exit non-zero if any case differs.\n5) Add a unit test for the comparison function and run pytest." },
        { text: "Run the golden set against Azure (a fresh database gives the same order-dependent results as your laptop):", cmd: { bash: "API_URL=\"https://$(az containerapp show -g {{az.rg}} -n {{az.api}} --query properties.configuration.ingress.fqdn -o tsv)\"\ncurl -s $API_URL/healthz; echo; curl -s $API_URL/readyz; echo\npython -m evals.run_evals --base-url $API_URL", ps: "$API_URL = \"https://\" + (az containerapp show -g {{az.rg}} -n {{az.api}} --query properties.configuration.ingress.fqdn -o tsv)\nInvoke-RestMethod \"$API_URL/healthz\"; Invoke-RestMethod \"$API_URL/readyz\"\npython -m evals.run_evals --base-url $API_URL" }, expect: "`{\"status\":\"ok\"}`, a ready payload, and 8/8 golden cases against the deployed API." },
        { text: "Check the UI is live and points at that API:", cmd: { bash: "SWA_HOST=$(az staticwebapp show -g {{az.rg}} -n {{az.swa}} --query defaultHostname -o tsv)\necho \"https://$SWA_HOST\"\ncurl -s -o /dev/null -w '%{http_code}\\n' \"https://$SWA_HOST\"", ps: "$SWA_HOST = az staticwebapp show -g {{az.rg}} -n {{az.swa}} --query defaultHostname -o tsv\n\"https://$SWA_HOST\"\n(Invoke-WebRequest \"https://$SWA_HOST\").StatusCode" }, expect: "`200`, and in the browser the dashboard loads cases from the deployed API (no CORS errors in the console)." },
        { text: "Assemble the evidence and close the loop in Jira:", prompt: "Use the test-evidence skill.\n1) Collect into docs/test-evidence/: junit.xml, coverage summary, eval-report.md, eval-report-deployed.md, the e2e screenshot, the red-team result, bandit and pip-audit output.\n2) Write docs/test-evidence/README.md: one line per file saying what it proves, and the commit SHA and Container Apps revision it was produced from.\n3) Update README.md 'How to run' (local and Azure URLs).\n4) Using the Atlassian MCP tools, move the hardening stories to Done with a link to the evidence, and list any story still open with the reason." },
      ],
      checkpoint: "The deployed API passes the same golden set as your laptop, the UI is live, and `docs/test-evidence/README.md` ties every file to a commit and a revision.",
    },
    {
      type: "lab", title: "Demo day: the 10-minute script", time: "10 min per team",
      lead: "Demo the **deployed** app, not localhost. One driver, one narrator.",
      steps: [
        { text: "**1 min · The problem.** The user, the pain, how often. One sentence on why an agent and not just a form." },
        { text: "**2 min · Happy path.** Submit `{{app.firstSample}}` in the deployed UI; show the decision and the evidence." },
        { text: "**2 min · A human is needed.** Submit `{{app.holdSample}}`: show {{app.holdDecision}}, the `{{app.holdReason}}` evidence and the Jira issue." },
        { text: "**1 min · Attack it.** Submit `{{app.injectionSample}}`: show the guardrail result and that nothing automatic happened." },
        { text: "**1 min · The human decides.** Decide ({{app.humanAction}}) with a comment; show the timeline and audit trail." },
        { text: "**1 min · Operate.** App Insights: the trace for that {{app.unit}}, the decision mix, the alert rule." },
        { text: "**1 min · Evidence.** `docs/test-evidence/README.md`: tests, coverage, 8/8 evals locally and deployed, red team." },
        { text: "**1 min · Next.** What you'd build in sprint 4, and the biggest risk you'd fix first." },
      ],
    },
    {
      type: "table", title: "Hand-in: the evidence pack",
      head: ["Item", "Where", "Proves"],
      rows: [
        ["Spec + backlog", "`docs/SPEC.md`, Jira `{{jira.project}}`", "What we built and why"],
        ["Design", "`docs/architecture.md`, `docs/api.md`, `docs/adr/`", "How, and the decisions behind it"],
        ["Code + history", "`{{gh.owner}}/{{gh.repo}}` with `{{app.jiraKey}}-n` commits", "Traceability story → code"],
        ["Test evidence", "`docs/test-evidence/` + its README", "It works, locally and deployed"],
        ["Security & RAI", "`tests/redteam/`, security review, `docs/responsible-ai.md`", "It's safe to run"],
        ["Operations", "`docs/runbook.md`, `docs/deployments.md`, alert rules", "We'd know when it breaks"],
        ["AI provenance", "`.ai-trace/ledger.jsonl`, `EXPLAIN.md`", "Which code the AI wrote, and a human reviewed it"],
      ],
    },
  ],
});

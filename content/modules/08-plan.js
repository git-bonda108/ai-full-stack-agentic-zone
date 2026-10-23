Zone.addModule({
  id: "plan", num: "08", order: 8, phase: "sdlc", stage: "Plan",
  icon: "🗂️", color: "sky", duration: "50 min",
  title: "Plan like a team: Agile backlog in Jira through MCP", short: "Plan: Agile + Jira",
  subtitle: "Epics, INVEST stories, Gherkin acceptance criteria, sprints and traceability, created by Claude in Jira",
  goals: ["Backlog in Jira via MCP", "Sprint 1–3 planned", "Story → commit → test traceability"],
  cards: [
    {
      type: "flow", title: "From idea to shippable increments",
      nodes: [
        { e: "🎯", b: "Product goal", s: "{{app.tagline}}" }, { e: "🏔️", b: "Epics", s: "big capabilities" },
        { e: "📝", b: "Stories", s: "INVEST + Gherkin" }, { e: "🏃", b: "Sprints", s: "a working slice each" },
        { e: "✅", b: "Definition of Done", s: "tests, evidence, demo" },
      ],
      points: [
        "**INVEST**: Independent, Negotiable, Valuable, Estimable, Small, Testable",
        "**Gherkin** (Given / When / Then) acceptance criteria are directly convertible into tests, and Claude is good at it",
        "Every sprint ends with something **demoable**, never \"the backend is 60% done\"",
      ],
    },
    {
      type: "backlog", title: "The {{app.name}} backlog",
      lead: "This is what we'll create in Jira. Claude generated it from SPEC.md with the `jira-user-story` skill; you review it before anything is pushed.",
    },
    {
      type: "table", title: "Sprint plan",
      head: ["Sprint", "Goal (demo at the end)", "Key stories"],
      rows: [
        ["**0 · Setup**", "Repo, venv, starter kit, hooks, Jira connected", "{{app.jiraKey}}-1"],
        ["**1 · Foundations**", "Submit an invoice via API → deterministic decision with reason codes, from real (mock) ERP data", "ERP mock + MCP, DB, matching/risk/policy engine, API"],
        ["**2 · Agents**", "Agents extract, gather evidence in parallel and explain; guardrails trip on injection; Jira ticket created", "Intake/Match/Risk/Resolution agents, guardrails, Jira, HITL endpoint"],
        ["**3 · Experience**", "A user sees the queue, opens a case, reads *why*, approves or rejects", "React dashboard, case detail, explainability panel"],
        ["**Hardening**", "Test evidence pack, security review, deployed to Azure, observable", "Evals in CI, deploy, monitoring"],
      ],
    },
    {
      type: "lab", title: "Lab: create a free Jira site and project", time: "8 min",
      steps: [
        { text: "Go to [atlassian.com/software/jira/free](https://www.atlassian.com/software/jira/free) and sign up (free for up to 10 users). Pick a site name, e.g. `{{jira.site}}`." },
        { text: "Create a project: **Scrum** template → name `{{app.name}}` → key **`{{jira.project}}`**." },
        { text: "Add an Epic and a Story manually so you know what Claude will do for you." },
        { text: "Only for the REST fallback (card after next): create an API token at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) and put it in `.env` as `JIRA_API_TOKEN`. **Never** paste it into a prompt; the UserPromptSubmit hook will block you anyway." },
      ],
    },
    {
      type: "lab", title: "Lab: connect Claude to Jira with the Atlassian MCP server", time: "8 min",
      lead: "Our `.mcp.json` already declares the `atlassian` server, so you only need to authenticate. OAuth means Claude acts **with your Jira permissions**, never more.",
      steps: [
        { text: "In the Claude Code panel:", prompt: "/mcp", expect: "`erp` (fails until Sprint 1 builds it, which is fine) and `atlassian` (needs authentication). Choose atlassian → Authenticate → approve in the browser." },
        { text: "Not using the project file? Add it from the terminal instead:", cmd: "claude mcp add --transport http atlassian https://mcp.atlassian.com/v1/mcp/authv2" },
        { text: "Smoke test, read-only:", prompt: "Using the Atlassian MCP tools, list the Jira projects I can access and show the issue types available in project {{jira.project}}. Don't create anything.", expect: "Your project, with issue types such as Epic, Story, Task, Bug." },
      ],
      callouts: [{ kind: "rai", title: "Least privilege for tools", text: "MCP tools appear as `mcp__atlassian__<tool>`. In `.claude/settings.json` you can `ask` on create/update tools and `allow` the read-only ones, so Claude can't bulk-edit Jira without you seeing it." }],
    },
    {
      type: "prompt", title: "Prompt: generate the backlog and push it to Jira",
      lead: "Two steps on purpose: **draft → human review → create**. This is the human-in-the-loop habit we want in the app, too.",
      prompt: "/jira-user-story Create the backlog for {{app.name}} from docs/SPEC.md.\n\nStructure: 4 epics: (1) Foundations: ERP, data, deterministic core, API; (2) Agents & guardrails; (3) Experience & explainability; (4) Quality, deploy & operate.\nFor each epic, 3–5 INVEST stories with Gherkin acceptance criteria, story points (1/2/3/5/8) and labels sprint-1/2/3/hardening.\nInclude at least one story per sample-invoice scenario in SPEC §8, written so the acceptance criteria can become a test.\n\nShow me the full draft as a table first and WAIT for my approval. After I approve, create the epics and stories in Jira project {{jira.project}}, link stories to epics, then write the created keys into docs/session-facts.md.",
      expect: "A draft table → you reply \"approved\" (or edit) → issues created in Jira → keys like `{{jira.project}}-2…{{jira.project}}-20` recorded in the fact block.",
    },
    {
      type: "cmds", title: "Fallback: Jira REST API (no MCP)",
      lead: "If OAuth is blocked on the VM, the same thing works over REST with an API token from `.env`. Our app's `jira_client.py` uses exactly this API.",
      blocks: [
        { label: "Load .env into this shell (never echo it)", cmd: { bash: "set -a; source .env; set +a", ps: "Get-Content .env | Where-Object { $_ -match '^[A-Z_]+=' } | ForEach-Object { $k,$v = $_ -split '=',2; [Environment]::SetEnvironmentVariable($k,$v) }" } },
        { label: "List projects", cmd: { bash: "curl -s -u \"$JIRA_EMAIL:$JIRA_API_TOKEN\" \"https://{{jira.site}}/rest/api/3/project/search\" | python -m json.tool | head -30", ps: "$auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(\"$env:JIRA_EMAIL`:$env:JIRA_API_TOKEN\"))\nInvoke-RestMethod -Headers @{Authorization=\"Basic $auth\"} \"https://{{jira.site}}/rest/api/3/project/search\"" } },
        { label: "Create a story", cmd: { bash: "curl -s -u \"$JIRA_EMAIL:$JIRA_API_TOKEN\" -H 'Content-Type: application/json' \\\n  -X POST \"https://{{jira.site}}/rest/api/3/issue\" -d '{\n  \"fields\": {\n    \"project\": {\"key\": \"{{jira.project}}\"},\n    \"issuetype\": {\"name\": \"Story\"},\n    \"summary\": \"Route price-variance invoices to an AP clerk\",\n    \"labels\": [\"sprint-1\"],\n    \"description\": {\"type\": \"doc\", \"version\": 1, \"content\": [{\"type\": \"paragraph\",\n      \"content\": [{\"type\": \"text\", \"text\": \"Given an invoice priced 6.7% above the PO, when it is processed, then the decision is ROUTE_TO_HUMAN with PRICE_VARIANCE.\"}]}]}\n  }}'", ps: "$body = @{ fields = @{ project = @{ key = \"{{jira.project}}\" }; issuetype = @{ name = \"Story\" }; summary = \"Route price-variance invoices to an AP clerk\"; labels = @(\"sprint-1\") } } | ConvertTo-Json -Depth 6\nInvoke-RestMethod -Method Post -Headers @{Authorization=\"Basic $auth\"} -ContentType 'application/json' -Body $body \"https://{{jira.site}}/rest/api/3/issue\"" }, expect: "`{\"id\":\"10012\",\"key\":\"{{jira.project}}-12\",…}`" },
      ],
    },
    {
      type: "flow", title: "Traceability: from story to production",
      lead: "An auditor (or a panel) asks: *why does this code exist, and how do we know it works?* The Jira key answers it at every hop.",
      nodes: [
        { e: "📝", b: "Story", s: "{{jira.project}}-12" }, { e: "🌿", b: "Branch", s: "feature/{{jira.project}}-12-tolerance" },
        { e: "💾", b: "Commit", s: "\"{{jira.project}}-12: add tolerance rule\"" }, { e: "🧪", b: "Test", s: "test_price_variance_over_tolerance" },
        { e: "🔀", b: "PR", s: "CI evidence attached" }, { e: "🚀", b: "Release", s: "revision + deployments.md" },
      ],
      points: ["The provenance ledger (`.ai-trace/ledger.jsonl`) adds one more link: **which files the AI wrote, in which session**"],
    },
    {
      type: "prompt", title: "Prompt: start a story the traceable way",
      prompt: "We're starting story {{jira.project}}-12 (price tolerance rule). Using the Atlassian MCP tools, read the story and its acceptance criteria, move it to In Progress, and create the branch feature/{{jira.project}}-12-price-tolerance. Then summarise the acceptance criteria as a checklist of pytest test names. Don't implement anything yet.",
    },
    {
      type: "quiz", title: "Checkpoint",
      q: "Which acceptance criterion is testable?",
      options: ["The system should handle invoices well", "Given an invoice whose unit price is 2.01% above the PO price, when it is processed, then the decision is ROUTE_TO_HUMAN with reason PRICE_VARIANCE", "Matching should be fast and accurate", "The AI should be smart about tolerances"],
      answer: 1,
      why: "It names the input, the action and an observable result, so it maps one-to-one to `test_price_variance_just_over_tolerance_routes_to_human`.",
    },
  ],
});

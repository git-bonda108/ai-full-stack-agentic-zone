/* Shared data: session plan, the 9-layer production stack, glossary. Edit freely. */

Zone.set("sessions", [
  {
    when: "Saturday 1", title: "How LLMs think", color: "sky", done: true,
    agenda: [["0:00", "Next-token prediction, \"I wrote to the zoo…\""], ["1:00", "Temperature, top-p, top-k"], ["2:00", "Tokens, prompts, roles"], ["3:00", "Hands-on prompting"]],
  },
  {
    when: "Saturday 2", title: "From a model to an agent", color: "sky", done: true,
    agenda: [["0:00", "Single model vs agent"], ["1:00", "OpenAI Agents SDK constructs (no code)"], ["2:30", "Tools, handoffs, guardrails, tracing"]],
  },
  {
    when: "Saturday 3", title: "Agents, context & Claude Code craft", color: "brand",
    agenda: [["0:00", "Recap + today", "orientation"], ["0:15", "ReAct: reason, plan, act, observe, verify", "agents"], ["0:55", "Multi-agent systems & orchestration", "multi-agent"], ["1:40", "Break"], ["1:50", "Context engineering", "context"], ["2:40", "CLAUDE.md, skills, subagents, hooks, MCP", "claude-code"]],
  },
  {
    when: "Saturday 4", title: "Use case, setup, plan & design", color: "amber",
    agenda: [["0:00", "Why AI apps fail + the 9 layers", "production-reality"], ["0:30", "Meet {{app.name}}", "usecase"], ["0:50", "Environment setup + starter kit", "setup"], ["1:50", "Break"], ["2:00", "Agile plan → Jira through MCP", "plan"], ["2:50", "Architecture, contracts, ADRs", "design"]],
  },
  {
    when: "Saturday 5", title: "Build: Sprint 1 & Sprint 2", color: "teal",
    agenda: [["0:00", "Sprint 1: ERP, MCP, DB, deterministic core", "sprint-1"], ["1:45", "Break"], ["1:55", "Sprint 2: agents, parallelism, guardrails", "sprint-2"]],
  },
  {
    when: "Saturday 6", title: "Build: Sprint 3, test & secure", color: "violet",
    agenda: [["0:00", "Sprint 3: UI, HITL, explainability", "sprint-3"], ["1:15", "Tests, evals & evidence", "test"], ["2:30", "Break"], ["2:40", "Security, guardrails, responsible AI", "secure"]],
  },
  {
    when: "Saturday 7", title: "Ship, observe & breakout", color: "coral",
    agenda: [["0:00", "Containers + Azure deploy", "deploy"], ["1:30", "Observe, monitor, operate", "observe"], ["2:30", "Break"], ["2:40", "Breakout: use-case workshop → pick the best", "workshop"], ["3:40", "Definition of Done check", "complete"]],
  },
]);

/* The 9-layer production stack. Rename layers here to match the podcast's wording. */
Zone.set("layers", [
  {
    n: 1, icon: "🖥️", color: "sky", name: "Experience", what: "UI, streaming, human approval, explanations", inApp: "frontend/",
    fails: ["Users can't see *why* the AI decided, so they don't trust it or they over-trust it", "No way to approve, override or correct", "Spinner for 20 s, no streaming or progress"],
    controls: ["Evidence-first UI: decision, reason codes, sources", "Approve/reject with a comment (HITL)", "Show progress per agent step"],
    where: ["`frontend/src/pages/CaseDetail.tsx`", "`POST /api/cases/{id}/decision`"],
  },
  {
    n: 2, icon: "🚪", color: "brand", name: "API & Gateway", what: "Contracts, auth, rate limits, idempotency", inApp: "backend/app/api/",
    fails: ["Retries create duplicate payments (no idempotency)", "Unauthenticated endpoints", "Schema drift breaks the frontend silently"],
    controls: ["OpenAPI contract first; Pydantic validation", "Entra ID auth (Easy Auth), CORS allow-list", "Duplicate-invoice check as a business idempotency key"],
    where: ["`backend/app/api/`", "`backend/app/schemas.py`"],
  },
  {
    n: 3, icon: "🎼", color: "violet", name: "Orchestration", what: "Workflow vs agent loop, parallelism, handoffs", inApp: "agents/pipeline.py",
    fails: ["Fully autonomous agent loops forever or takes a different path every run", "Sequential calls where parallel was possible: slow", "No timeouts or step limits"],
    controls: ["Hybrid: deterministic workflow with agentic islands", "`asyncio.gather` for independent agents; bounded concurrency", "max_turns, timeouts, fallbacks"],
    where: ["`backend/app/agents/pipeline.py`"],
  },
  {
    n: 4, icon: "🧠", color: "violet", name: "Agents & Reasoning", what: "Models, prompts, model tiers, structured output", inApp: "agents/*_agent.py",
    fails: ["Free-text output parsed with regex breaks", "Expensive model used for trivial steps", "Prompt changed in prod with no version or eval"],
    controls: ["Typed `output_type` (Pydantic)", "Model tiering: small model for extraction, larger only when needed", "Prompts in version control + eval gate"],
    where: ["`backend/app/agents/intake_agent.py`", "`backend/app/agents/model_provider.py`"],
  },
  {
    n: 5, icon: "🔌", color: "teal", name: "Tools & Integration", what: "MCP, function tools, ERP / Jira / DB connectors", inApp: "integrations/",
    fails: ["Tool returns 80 fields, model drowns (tool-output bloat)", "ERP timeout crashes the whole run", "Agent invents tool arguments"],
    controls: ["Trim at the tool wrapper + trim audit log", "Timeouts, retries with backoff, circuit breaker", "Typed tool schemas; validate arguments"],
    where: ["`backend/app/integrations/erp_client.py`", "`mcp_servers/erp_mcp.py`"],
  },
  {
    n: 6, icon: "🧩", color: "amber", name: "Context & Memory", what: "Context budget, fact blocks, RAG, session state", inApp: "CaseContext",
    fails: ["Context fills up; early constraints are forgotten", "Summaries drop IDs and amounts", "Everything dumped into the prompt"],
    controls: ["Context budget per call", "Extract-first persistent fact block", "Local run context (not sent to the model) for heavy data"],
    where: ["`CaseContext` in `backend/app/agents/tools.py`", "`CLAUDE.md` + PreCompact hook during development"],
  },
  {
    n: 7, icon: "🗄️", color: "green", name: "Data", what: "Systems of record, DB, lineage, data quality", inApp: "models.py",
    fails: ["Garbage in: bad master data, wrong decisions", "No audit trail of what the AI saw", "PII copied into logs and prompts"],
    controls: ["Schema + constraints; migrations", "Immutable `audit_events` table", "Data minimisation and masking"],
    where: ["`backend/app/models.py`", "`audit_events` table"],
  },
  {
    n: 8, icon: "🛡️", color: "coral", name: "Guardrails & Governance", what: "Safety, policy, injection, PII, approvals, RAI", inApp: "guardrails.py · policy.py",
    fails: ["Prompt injection in a document triggers an action", "LLM \"approves\" a payment", "No owner, no policy, Shadow AI"],
    controls: ["Input + output guardrails (tripwires)", "**LLM proposes, code disposes:** a deterministic policy engine", "Human approval for irreversible / high-value actions"],
    where: ["`backend/app/agents/guardrails.py`", "`backend/app/domain/policy.py`", "`docs/responsible-ai.md`"],
  },
  {
    n: 9, icon: "📈", color: "sky", name: "Observability, Evaluation & Ops", what: "Tracing, evals, cost, drift, CI/CD, runbooks", inApp: "observability.py · evals/",
    fails: ["\"It worked in the demo\": no evals, no regression gate", "Cost spike discovered on the invoice", "No traces, so nobody can explain an incident"],
    controls: ["Golden-set evals in CI", "OpenTelemetry traces + App Insights, token/cost metrics", "Alerts + runbook; cheap fallback mode"],
    where: ["`backend/app/observability.py`", "`evals/run_evals.py`", "`docs/runbook.md`"],
  },
]);

Zone.set("glossary", [
  ["Token", "The unit a model reads and writes, roughly 4 characters of English. Input and output both count against the context window and the bill."],
  ["Context window", "Everything the model can see in one call: system prompt, history, tool schemas, documents and its own output."],
  ["Temperature / top-p / top-k", "Sampling dials. Low temperature = predictable; top-k keeps the k likeliest tokens; top-p keeps the smallest set whose probability adds up to p."],
  ["Agent", "A model in a loop with instructions, tools and a goal. It decides the next action from what it observes."],
  ["ReAct", "Reason + Act: think, pick a tool, observe the result, repeat until done. We add **plan** and **verify**."],
  ["Workflow", "Steps fixed in code; the model fills in the blanks. Predictable, testable, cheap."],
  ["Pipeline", "A workflow where data flows one way through stages (extract → transform → load)."],
  ["Orchestrator", "The component that splits work, dispatches it to workers or sub-agents and assembles the results."],
  ["Sub-agent", "An agent with its own fresh context window, started for one focused task, that returns only a result."],
  ["Handoff", "Transferring the conversation to another agent, which then owns the reply (OpenAI Agents SDK `handoffs`)."],
  ["Agent as tool", "Calling another agent like a function; the caller keeps control (`agent.as_tool()`)."],
  ["Parallel processing", "Independent tasks run at the same time in one process (`asyncio.gather`)."],
  ["Distributed processing", "Work spread across machines or replicas, usually via a queue; scales out, needs idempotency."],
  ["MCP", "Model Context Protocol: an open standard for connecting AI apps (hosts) to tools, resources and prompts exposed by servers."],
  ["MCP server", "A process exposing tools/resources over stdio or HTTP, e.g. Jira or our ERP."],
  ["CLAUDE.md", "Project memory file Claude Code loads at session start: conventions, commands, architecture, rules."],
  ["Skill (SKILL.md)", "A folder with instructions (and optional scripts) Claude loads only when the task matches its description."],
  ["Hook", "A command Claude Code runs automatically at a lifecycle event (PreToolUse, PostToolUse, Stop…). Hooks are enforced; CLAUDE.md is only advice."],
  ["Plan mode", "Claude researches and proposes a plan without editing files. Shift+Tab or `/plan`."],
  ["/compact", "Summarises the conversation to free context. Facts can be lost; extract them first."],
  ["Persistent fact block", "A structured, always-injected list of facts (IDs, numbers, decisions) that survives summarisation."],
  ["Extract-first", "Pull facts out before summarising, so the summary can't lose them."],
  ["Tool-output trimming", "Cutting an API response down to the fields the agent needs, before it enters context."],
  ["Reference indirection", "Store a big payload elsewhere; give the agent an ID to fetch it if needed."],
  ["Lost in the middle", "Models attend less to the middle of a long context than to its start and end."],
  ["Prompt caching", "Reusing a stable prompt prefix's computation across requests: cheaper and faster."],
  ["Guardrail", "A check that runs around an agent (input or output) and can stop the run (tripwire)."],
  ["Prompt injection", "Instructions hidden in data (an invoice, a web page) that try to hijack the model."],
  ["HITL", "Human in the loop: a person approves or corrects before an irreversible action."],
  ["Three-way match", "AP control: invoice vs purchase order vs goods receipt must agree within tolerance."],
  ["Golden dataset", "A fixed set of inputs with known correct outputs, used for evals and regression gates."],
  ["Eval", "An automated measurement of AI behaviour quality: deterministic checks or LLM-as-judge."],
  ["LLM-as-judge", "Using a model with a rubric to grade another model's output. Use it for fuzzy qualities, not maths."],
  ["Test evidence", "Artifacts proving tests ran: JUnit XML, coverage report, eval report, screenshots."],
  ["ADR", "Architecture Decision Record: context, decision, alternatives, consequences, in one short file."],
  ["Virtual environment", "An isolated Python install per project (like per-project node_modules)."],
  ["Container", "Your app plus its runtime packaged as an image that runs the same everywhere."],
  ["Azure Container Apps", "Serverless containers on managed Kubernetes. Scale to zero, no cluster to run."],
  ["AKS", "Azure Kubernetes Service: full Kubernetes. Power and control, plus operational cost."],
  ["App registration", "An identity for an app in Microsoft Entra ID, used for sign-in and for GitHub Actions OIDC deploys."],
  ["OIDC federated credential", "Lets GitHub Actions log in to Azure with a short-lived token. No stored secret."],
  ["OpenTelemetry", "Vendor-neutral standard for traces, metrics and logs."],
  ["Application Insights", "Azure's APM: requests, dependencies, traces, failures, queried with KQL."],
  ["KQL", "Kusto Query Language, used to query Log Analytics / App Insights."],
  ["Drift", "Behaviour changes over time: new data, model updates, prompt edits."],
  ["Explainability (XAI)", "Being able to say why a decision was made: reason codes, evidence, trace."],
]);

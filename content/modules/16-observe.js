Zone.addModule({
  id: "observe", num: "16", order: 16, phase: "ship", stage: "Operate",
  icon: "📈", color: "sky", duration: "60 min",
  title: "Observe, monitor and operate", short: "Observe & operate",
  subtitle: "Logs, metrics, traces, plus the AI signals: tokens, cost, guardrail trips, decision drift",
  goals: ["Traces per agent step in App Insights", "KQL for golden signals + AI signals", "Alerts + an incident drill"],
  cards: [
    {
      type: "flips", title: "What to watch in an agentic app",
      lead: "The classic golden signals, plus the ones that only AI systems have.",
      items: [
        { icon: "🚦", front: "Traffic, errors, latency", sub: "golden signals", back: "Requests/min, 5xx rate, p95 per endpoint. From `requests` in App Insights." },
        { icon: "🧩", front: "Step latency", sub: "where time goes", back: "Spans {{app.stepSpans}}. Is the LLM or the {{app.sorShort}} the slow part?" },
        { icon: "🪙", front: "Tokens & cost", sub: "per {{app.unit}}", back: "`llm.input_tokens` / `llm.output_tokens` on the `{{app.workflowSpan}}` span → € per {{app.unit}}, per day." },
        { icon: "🛡️", front: "Guardrail trips", sub: "security signal", back: "Spikes in `PROMPT_INJECTION_SUSPECTED` from one {{app.actor}} = an attack or a false-positive bug." },
        { icon: "📊", front: "Decision mix drift", sub: "quality signal", back: "If {{app.autoLabel}} jump from 60% to 85% overnight, something changed: data, prompt, model or {{app.sorShort}}." },
        { icon: "🔁", front: "Fallbacks", sub: "resilience signal", back: "`llm.fallback` events show the provider failing and the offline path taking over." },
      ],
    },
    {
      type: "compare", title: "Free / low-cost tooling",
      cols: [
        { title: "Application Insights", icon: "📈", color: "sky", points: ["Azure-native APM over OpenTelemetry", "One call: `configure_azure_monitor()`", "KQL, dashboards, alerts", "Free ingestion allowance"], verdict: "Our production choice" },
        { title: "Arize Phoenix", icon: "🔥", color: "amber", points: ["Open-source LLM tracing, runs locally", "Shows every agent turn, tool call, token count", "`openinference-instrumentation-openai-agents`"], verdict: "Great for dev" },
        { title: "Langfuse", icon: "🧵", color: "violet", points: ["Open-source LLM observability + evals", "Self-host or free cloud tier", "Prompt versioning"] },
        { title: "Agents SDK tracing", icon: "🧭", color: "teal", points: ["Built in; traces to the OpenAI dashboard by default", "Disable with `set_tracing_disabled(True)` if data must stay in your tenant"] },
      ],
    },
    {
      type: "cmds", title: "Live logs and quick health checks",
      blocks: [
        { label: "Stream the API's stdout (JSON logs)", cmd: "az containerapp logs show -g {{az.rg}} -n {{az.api}} --follow --tail 50" },
        { label: "Replicas and revision status", cmd: "az containerapp replica list -g {{az.rg}} -n {{az.api}} -o table\naz containerapp show -g {{az.rg}} -n {{az.api}} --query \"{rev:properties.latestRevisionName, running:properties.runningStatus, fqdn:properties.configuration.ingress.fqdn}\" -o table" },
        { label: "Generate traffic for the dashboards", cmd: { bash: "for s in {{app.samples}}; do curl -s -X POST \"$API_URL{{app.samplesApi}}/$s{{app.sampleQuery}}\" > /dev/null; done; echo sent", ps: "{{app.samplesPs}} | ForEach-Object { Invoke-RestMethod -Method Post \"$API_URL{{app.samplesApi}}/$($_){{app.sampleQuery}}\" | Out-Null }; 'sent'" } },
      ],
    },
    {
      type: "cmds", title: "KQL: the queries you'll actually use",
      lead: "Run in **Portal → Application Insights → Logs**, or from the terminal with `az monitor app-insights query`. Telemetry takes 2–5 minutes to appear.",
      blocks: [
        { label: "Golden signals per endpoint (24h)", lang: "kql", cmd: "requests\n| where timestamp > ago(24h)\n| summarize calls = count(), failures = countif(success == false), p95_ms = percentile(duration, 95) by name\n| order by calls desc" },
        { label: "Decision mix over time (drift)", lang: "kql", cmd: "dependencies\n| where timestamp > ago(7d) and name == \"{{app.workflowSpan}}\"\n| extend decision = tostring(customDimensions[\"case.decision\"])\n| summarize count() by decision, bin(timestamp, 1h)\n| render timechart" },
        { label: "Which agent step is slow?", lang: "kql", cmd: "dependencies\n| where timestamp > ago(24h) and name startswith \"step.\"\n| summarize p50 = percentile(duration, 50), p95 = percentile(duration, 95), n = count() by name" },
        { label: "Tokens and estimated cost per day", lang: "kql", cmd: "dependencies\n| where timestamp > ago(30d) and name == \"{{app.workflowSpan}}\"\n| extend tin = toint(customDimensions[\"llm.input_tokens\"]), tout = toint(customDimensions[\"llm.output_tokens\"])\n| summarize input_tokens = sum(tin), output_tokens = sum(tout), {{app.units}} = count() by bin(timestamp, 1d)\n| extend est_usd = input_tokens * 0.40 / 1e6 + output_tokens * 1.60 / 1e6, usd_per_{{app.unit}} = est_usd / {{app.units}}" },
        { label: "From the terminal", cmd: "az monitor app-insights query -g {{az.rg}} --app {{az.appi}} --analytics-query \"requests | where timestamp > ago(1h) | summarize count() by resultCode\" -o table" },
      ],
    },
    {
      type: "cmds", title: "Alerts: be told before users tell you",
      blocks: [
        { label: "Email action group", cmd: "az monitor action-group create -g {{az.rg}} -n ag-{{app.short}}-oncall --short-name oncall \\\n  --action email oncall {{jira.email}}" },
        { label: "Alert on 5xx from the API (Container Apps metric)", cmd: "API_ID=$(az containerapp show -g {{az.rg}} -n {{az.api}} --query id -o tsv)\naz monitor metrics alert create -g {{az.rg}} -n {{app.short}}-api-5xx --scopes $API_ID \\\n  --condition \"total Requests > 5 where statusCodeCategory includes 5xx\" \\\n  --window-size 5m --evaluation-frequency 1m --action ag-{{app.short}}-oncall --severity 2" },
        { label: "Log alert: injection spike (scheduled query)", cmd: "APPI_ID=$(az monitor app-insights component show -g {{az.rg}} --app {{az.appi}} --query id -o tsv)\naz monitor scheduled-query create -g {{az.rg}} -n {{app.short}}-injection-spike --scopes $APPI_ID \\\n  --condition \"count 'Holds' > 3\" \\\n  --condition-query Holds=\"dependencies | where name == '{{app.workflowSpan}}' | where tostring(customDimensions['case.reason_codes']) has 'PROMPT_INJECTION_SUSPECTED'\" \\\n  --window-size 1h --evaluation-frequency 15m --action-groups ag-{{app.short}}-oncall --severity 2" },
      ],
    },
    {
      type: "lab", title: "Local LLM tracing with Phoenix (optional, free)", time: "10 min",
      steps: [
        { cmd: "pip install arize-phoenix openinference-instrumentation-openai-agents\nphoenix serve    # UI at http://localhost:6006" },
        { prompt: "Add an optional Phoenix tracer to backend/app/observability.py: when PHOENIX_COLLECTOR_ENDPOINT is set, call phoenix.otel.register(project_name='{{app.slug}}', auto_instrument=True) so every Agents SDK run, tool call and token count shows up in Phoenix. Keep it a no-op when the variable is not set, and don't add it to requirements.txt (document it in README instead)." },
        { text: "Run the API in an LLM mode, submit {{app.traceSample}}, and open Phoenix: you'll see the {{app.firstAgent}} turn, tool calls and token usage per span." },
      ],
    },
    {
      type: "lab", title: "Incident drill: the {{app.sorShort}} goes down", time: "12 min",
      lead: "Practise the loop: **detect → diagnose with AI → verify independently → act → learn**.",
      steps: [
        { text: "Break it on purpose (scale the {{app.sorShort}} to zero replicas and block it):", cmd: "az containerapp update -g {{az.rg}} -n {{az.erp}} --min-replicas 0 --max-replicas 0" },
        { text: "Detect: readiness fails, {{app.units}} error.", cmd: { bash: "curl -s $API_URL/readyz; echo\ncurl -s -o /dev/null -w '%{http_code}\\n' -X POST \"$API_URL{{app.samplesApi}}/{{app.firstSample}}{{app.sampleQuery}}\"", ps: "try { Invoke-RestMethod \"$API_URL/readyz\" } catch { $_.Exception.Message }" } },
        { text: "Diagnose with Claude, then **verify its claim yourself** before acting:", prompt: "Here is the output of /readyz and the last 50 API log lines (pasted below). Using docs/runbook.md, diagnose the incident: what is failing, what evidence supports it, which KQL query in the runbook confirms it, and the safest remediation. Don't run any az commands; list them for me.\n\n<paste output here>" },
        { text: "Recover:", cmd: "az containerapp update -g {{az.rg}} -n {{az.erp}} --min-replicas 0 --max-replicas 1" },
        { text: "Learn: turn it into backlog.", prompt: "Using the Atlassian MCP tools, create a Bug in {{jira.project}}: 'API returns 5xx when {{app.sorShort}} is unavailable'. Acceptance criteria: when the {{app.sorShort}} is down, POST {{app.submitApi}} returns 503 with a retry-after hint and no partial case is written; an alert fires within 5 minutes. Link it to the hardening epic." },
      ],
      checkpoint: "You detected it from telemetry (not from a user), the AI's diagnosis was checked against real evidence, and the fix went back into the backlog. That closes the loop from Operate back to Plan.",
    },
    { type: "file", title: "Reference: the operations runbook", fileRef: "reference-app/docs/runbook.md", lead: "ERP down, LLM provider down, injection spike and cost spike, each with KQL and actions." },
    {
      type: "checklist", title: "Day-2 operations checklist",
      groups: [
        { title: "Every day", items: ["Glance at decision mix + failures dashboard", "Review {{app.holdDecision}} cases older than 24h"] },
        { title: "Every release", items: ["Evals green in CI", "Canary 10% → watch p95 + 5xx for 30 min → 100%", "Record revision in `docs/deployments.md`"] },
        { title: "Every month", items: ["Cost per {{app.unit}} vs target", "Rotate secrets; review role assignments", "Re-run red-team suite"] },
        { title: "When the model changes", items: ["Full eval + judge run", "ADR updated", "Watch drift dashboard for a week"] },
      ],
    },
    {
      type: "quiz", title: "Checkpoint",
      q: "Auto-approvals jumped from 58% to 83% after Tuesday's release, while errors and latency look normal. First move?",
      options: ["Celebrate the efficiency gain", "Treat it as possible drift: compare the decision mix by revision, re-run evals on the new revision, check whether a policy or trimming change removed evidence", "Restart the API", "Lower the approval threshold"],
      answer: 1,
      why: "Quality regressions are silent: no error, no latency change. **Decision-mix drift** is the AI-specific signal. Tie it to a revision, reproduce with evals, roll back if needed.",
    },
  ],
});

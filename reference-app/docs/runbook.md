# Operations runbook — P2P Sentinel

Queries are KQL for the **Application Insights → Logs** blade (classic table
names). Our workflow steps are OpenTelemetry spans named `invoice.workflow`,
`step.extract`, `step.match`, `step.risk`, `step.resolve`; they appear in the
`dependencies` table with attributes in `customDimensions`.

## Golden signals dashboard

```kql
// Requests, failures and p95 latency per endpoint (last 24h)
requests
| where timestamp > ago(24h)
| summarize count(), failures = countif(success == false),
            p95_ms = percentile(duration, 95) by name
| order by count_ desc
```

```kql
// Decisions over time
dependencies
| where timestamp > ago(7d) and name == "invoice.workflow"
| extend decision = tostring(customDimensions["case.decision"])
| summarize count() by decision, bin(timestamp, 1h)
| render timechart
```

```kql
// Slowest workflow step
dependencies
| where timestamp > ago(24h) and name startswith "step."
| summarize p50 = percentile(duration, 50), p95 = percentile(duration, 95) by name
```

```kql
// LLM token usage and estimated cost per day (gpt-4.1-mini list prices, adjust)
dependencies
| where timestamp > ago(30d) and name == "invoice.workflow"
| extend tin = toint(customDimensions["llm.input_tokens"]), tout = toint(customDimensions["llm.output_tokens"])
| summarize input_tokens = sum(tin), output_tokens = sum(tout) by bin(timestamp, 1d)
| extend est_usd = input_tokens * 0.40 / 1e6 + output_tokens * 1.60 / 1e6
```

## Incident playbooks

### 1. ERP unavailable
- **Symptom:** `/readyz` returns `"erp": false`; 5xx on `/api/invoices`; failing `dependencies` to the ERP host.
- **Check:**
  ```kql
  dependencies | where timestamp > ago(1h) and type == "HTTP" and target has "erp"
  | summarize count(), failed = countif(success == false) by resultCode
  ```
- **Act:** `az containerapp revision list -n p2p-erp -g <rg> -o table`; restart the active revision or roll back. Invoices are not lost — clients retry the POST.
- **Prevent:** add retries with backoff in `ErpClient`, a circuit breaker, and an alert on `/readyz`.

### 2. LLM provider down or rate-limited
- **Symptom:** log events `llm.fallback`; audit events `fallback_offline`; latency drop (deterministic path is faster).
- **Check:**
  ```kql
  traces | where timestamp > ago(1h) and message == "llm.fallback"
  | summarize count() by tostring(customDimensions.step), tostring(customDimensions.error)
  ```
- **Act:** nothing urgent — decisions are deterministic, only explanation quality drops. To force offline mode: `az containerapp update -n p2p-api -g <rg> --set-env-vars LLM_PROVIDER=offline`.

### 3. Prompt-injection spike
- **Symptom:** many `PROMPT_INJECTION_SUSPECTED` HOLD cases from one vendor.
- **Check:**
  ```kql
  traces | where message == "case.processed"
  | where tostring(customDimensions.reason_codes) has "PROMPT_INJECTION_SUSPECTED"
  | summarize count() by bin(timestamp, 1h)
  ```
- **Act:** notify security; block the vendor in the ERP; review `risk.INJECTION_PATTERNS` for false positives.

### 4. Cost spike
- **Symptom:** token query above shows a jump; budget alert fires.
- **Likely causes:** model changed to a bigger tier, a loop (high `max_turns`), retries, bloated tool output (trim allowlist widened).
- **Act:** check `LLM_MODEL` env var on the active revision; compare `erp_tokens_saved_by_trimming` in case evidence; set an Azure budget alert:
  `az consumption budget create --budget-name p2p-monthly --amount 20 --time-grain Monthly --category Cost --start-date 2026-11-01 --end-date 2027-10-31`

### 5. Wrong decision reported by a user
1. Open the case in the UI → evidence table + policy rule + audit trail.
2. Reproduce locally: copy `raw_text` into `data/sample_invoices/`, add a row to `evals/golden_set.jsonl` with the expected outcome, run `python -m evals.run_evals`.
3. Fix the rule or engine, keep the new golden case forever (regression gate).

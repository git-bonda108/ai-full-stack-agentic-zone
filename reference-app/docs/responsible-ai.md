# Responsible AI — P2P Sentinel

Microsoft's six Responsible AI principles (also the lens most enterprise AI
review boards use), mapped to **concrete controls in this codebase**. Every
row is something a reviewer can open and verify.

| Principle | Risk in this use case | Control | Where |
|---|---|---|---|
| **Reliability & safety** | LLM approves a bad invoice | LLM never decides; ordered deterministic policy R1–R5 | `backend/app/domain/policy.py` |
| | Model provider down / slow | Every agent call falls back to the deterministic path | `backend/app/agents/pipeline.py` (`fallback_offline` audit events) |
| | Quality regresses after a prompt/model change | Golden-set eval gate (8/8 required) in CI | `evals/run_evals.py`, `scripts/run_quality_gates.sh` |
| **Privacy & security** | Prompt injection inside an invoice | Input guardrail (`run_in_parallel=False`) blocks before the model sees it; risk engine flags `PROMPT_INJECTION_SUSPECTED` → HOLD | `agents/guardrails.py`, `domain/risk.py` |
| | Bank-detail fraud | IBAN compared with ERP vendor master; mismatch → HOLD; verify via master-data contacts only | `domain/risk.py`, `explain.py` |
| | Sensitive data in model context / logs | ERP trim layer (allowlist); IBAN masked to last 4 for the model and in findings | `integrations/erp_client.py`, `agents/tools.py` |
| | Secrets leakage | `.env` git-ignored; Claude Code hooks block reading `.env`; Azure secrets in Container Apps secrets / Key Vault | `.gitignore`, `.claude/settings.json` |
| **Transparency** | "Why did the AI do that?" | Reason codes, named policy rule, line-level evidence table, plain-English explanation on every case | `explain.py`, UI case page |
| **Accountability** | Who approved what? | Append-only audit trail of every agent step and human decision; HITL required for ROUTE_TO_HUMAN and HOLD | `models.AuditEvent`, `case_service.apply_human_decision` |
| | AI-written code nobody reviewed | Claude Code PostToolUse hook writes an AI provenance ledger; PRs need human review | `.claude/hooks/`, PR template |
| **Fairness** | Vendors treated inconsistently | Same rules for every vendor; no model-based vendor scoring; tolerance/threshold are configuration | `config.py` |
| **Inclusiveness** | UI not usable by everyone | Semantic HTML, colour + text labels for decisions (not colour alone), keyboard-reachable actions | `frontend/src` |

## Human-in-the-loop design

| Decision | Who acts | Automation level |
|---|---|---|
| AUTO_APPROVE | Nobody (policy R5) | Full automation — only for clean matches under `APPROVAL_THRESHOLD` |
| ROUTE_TO_HUMAN | AP clerk / manager | AI gathers evidence and drafts; human decides |
| HOLD | Fraud / security reviewer | AI stops the payment; human verifies out-of-band |
| REJECT | System, vendor notified | Deterministic (duplicate, blocked vendor) |

## Model / system card (fill per deployment)

| Field | Value |
|---|---|
| Intended use | Triage of supplier invoices against PO and goods receipts |
| Out of scope | Approving payments without policy; vendor onboarding; tax decisions |
| Models | `LLM_PROVIDER` / `LLM_MODEL` (offline by default) |
| Evaluation | `docs/test-evidence/eval-report.md` |
| Known limitations | Training invoice format; real PDFs need OCR/document-intelligence; injection patterns are heuristic |
| Owner | AP product owner + platform team |

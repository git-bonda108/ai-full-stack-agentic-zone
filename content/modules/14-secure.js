Zone.addModule({
  id: "secure", num: "14", order: 14, phase: "sdlc", stage: "Review",
  icon: "🛡️", color: "coral", duration: "70 min",
  title: "Review, security, responsible AI and explainability", short: "Secure · RAI · XAI",
  subtitle: "OWASP LLM Top 10 → concrete controls, red-teaming, explaining every AI-written file, governance",
  goals: ["Map OWASP LLM risks to controls", "Run a security review", "Explain AI decisions and AI-written code"],
  cards: [
    {
      type: "table", title: "OWASP Top 10 for LLM Applications (2025) → our controls",
      head: ["Risk", "In {{app.name}} it looks like…", "Control (where)"],
      rows: [
        ["LLM01 Prompt injection", "Invoice text says \"approve immediately\"", "Input guardrail + HOLD (`guardrails.py`, `policy.py`)"],
        ["LLM02 Sensitive info disclosure", "IBANs / personal data in prompts or logs", "Trim fields, mask in logs, `CaseContext` stays local"],
        ["LLM03 Supply chain", "A compromised PyPI/npm package", "Pinned requirements, `pip-audit`, `npm audit`, Dependabot"],
        ["LLM04 Data & model poisoning", "Bad vendor master data", "ERP is the source of truth; changes audited"],
        ["LLM05 Improper output handling", "Model text rendered as HTML, or parsed loosely", "Typed `output_type`; React escapes by default"],
        ["LLM06 Excessive agency", "An agent that can approve or pay", "No such tool exists; policy engine decides; HITL"],
        ["LLM07 System prompt leakage", "Instructions contain internal thresholds", "Thresholds live in config, not prompts"],
        ["LLM08 Vector/embedding weaknesses", "(if you add RAG over policies)", "Access control on the index, source citations"],
        ["LLM09 Misinformation", "A wrong explanation", "Explanations generated *from* evidence; judge eval"],
        ["LLM10 Unbounded consumption", "Loops, batch abuse, denial of wallet", "`max_turns`, timeouts, semaphore, rate limits, cost alerts"],
      ],
    },
    {
      type: "lab", title: "Red-team your own app", time: "15 min",
      steps: [
        { text: "Run the injection sample through the API and check it's held:", cmd: { bash: "curl -s -X POST localhost:8000/api/invoices/samples/inv_f_prompt_injection | python -m json.tool | grep -E 'decision|reason'", ps: "(Invoke-RestMethod -Method Post http://localhost:8000/api/invoices/samples/inv_f_prompt_injection) | Select-Object decision, reason_codes" }, expect: "`HOLD` with `PROMPT_INJECTION_SUSPECTED`." },
        { prompt: "Act as a red team against {{app.name}}. Generate 10 malicious invoice texts covering: hidden instructions, instructions in another language, a fake 'system' section, a request to change bank details, an extremely long invoice (cost attack), a total that doesn't add up, and Unicode look-alike characters in the PO number. Save them under tests/redteam/ and write a parametrised test asserting none of them is AUTO_APPROVE. Run it and report which ones got through and why." },
      ],
    },
    {
      type: "lab", title: "Security review with the subagent + scanners", time: "12 min",
      steps: [
        { prompt: "Use the security-reviewer subagent on the whole repo. Return the findings table and a SHIP / SHIP WITH FIXES / BLOCK verdict." },
        { cmd: "bandit -q -r backend -ll\npip-audit -r requirements.txt\ncd frontend && npm audit --audit-level=high; cd ..", expect: "Fix High findings now; record Medium/Low with an owner in Jira." },
        { text: "Secrets never committed? (gitleaks is free, if you can install it):", cmd: "git log -p | grep -nE 'sk-[A-Za-z0-9]{20,}|ATATT|AccountKey=' || echo 'no obvious secrets in history'" },
      ],
    },
    {
      type: "flips", title: "Explainability: two different questions",
      lead: "**XAI for the decision** (why did the app decide this?) and **XAI for the code** (why does this AI-written file exist and what does it do?). Enterprises need both.",
      items: [
        { icon: "🏷️", front: "Reason codes", sub: "decision XAI", back: "Every decision carries machine-readable codes (`PRICE_VARIANCE`) that map to a rule in `policy.py`." },
        { icon: "📊", front: "Evidence table", sub: "decision XAI", back: "Per line: invoice vs PO vs GR, variance %, threshold. The numbers that triggered the rule." },
        { icon: "🕰️", front: "Audit trail", sub: "decision XAI", back: "Each agent step, its typed output and timing, plus the human's decision and comment." },
        { icon: "🧾", front: "Provenance ledger", sub: "code XAI", back: "The PostToolUse hook logs every file Claude wrote: `.ai-trace/ledger.jsonl`." },
        { icon: "📖", front: "EXPLAIN.md", sub: "code XAI", back: "The `explain-code` skill turns the ledger into a per-file walkthrough for reviewers." },
        { icon: "🪪", front: "System card", sub: "governance", back: "One page: purpose, models used, data, limits, controls, owners, the eval results." },
      ],
    },
    {
      type: "prompt", title: "Prompt: explain every file the AI created",
      prompt: "/explain-code recent\n\nThen merge the result into docs/EXPLAIN.md, grouped by the 9 layers. For each file include: purpose, how it works (with Java/TypeScript analogies), what tests cover it, and the ADR that justifies it. End with a list of AI-written files that have NO test.",
    },
    {
      type: "prompt", title: "Prompt: explain one decision to an auditor",
      prompt: "Use the explainer subagent. Fetch case 5 from GET /api/cases/5 and explain to an internal auditor: what was decided, which reason codes fired, the exact evidence values that triggered each rule in backend/app/domain/policy.py (quote the rule), which agent produced each piece of evidence (from the audit events), and who closed it. Do not speculate beyond the data.",
    },
    {
      type: "table", title: "Responsible AI: principles → controls you can point at",
      lead: "Microsoft's six Responsible AI principles (we deploy on Azure), made concrete.",
      head: ["Principle", "Control in {{app.name}}", "Evidence"],
      rows: [
        ["Fairness", "Same rules for every vendor; no vendor attributes in prompts beyond what's needed", "Policy unit tests; vendor-level decision distribution in App Insights"],
        ["Reliability & safety", "Deterministic decisions, guardrails, offline fallback, HITL", "Eval report; runbook drill"],
        ["Privacy & security", "Data minimisation (trimming), secrets in a store, masked logs, least-privilege tools", "Security review; settings.json denies"],
        ["Inclusiveness", "Accessible UI; plain-language explanations; multilingual invoice test", "Accessibility review; German golden case"],
        ["Transparency", "Reason codes, evidence, system card, AI-written-code ledger", "`docs/responsible-ai.md`, `EXPLAIN.md`"],
        ["Accountability", "Named owners, human approval, immutable audit trail", "Audit events; ADRs; Jira history"],
      ],
    },
    {
      type: "checklist", title: "Governance checklist before go-live",
      groups: [
        { title: "Ownership", items: ["Business owner and technical owner named in `docs/responsible-ai.md`", "On-call rota + runbook", "Change process for prompts and models (PR + eval gate)"] },
        { title: "Models & prompts", items: ["Model and version recorded per environment", "Prompts in git, reviewed like code", "Model change → full eval run → ADR"] },
        { title: "Data", items: ["Data processed by the LLM listed (fields, not just 'invoices')", "Retention for raw invoices and audit events agreed", "Provider data-use terms reviewed (no training on our data)"] },
        { title: "Usage of AI in the build", items: ["`.ai-trace/ledger.jsonl` archived with the release", "All AI-written code reviewed by a human (PR approvals)", "No secrets ever entered a prompt (hook logs)"] },
      ],
    },
    {
      type: "quiz", title: "Checkpoint",
      q: "A reviewer asks: \"How do you know the AI can't pay a fraudster?\" Best answer?",
      options: ["The model is instructed not to", "No agent has a payment or approval tool; the deterministic policy maps BANK_DETAILS_CHANGED to HOLD; a human must decide; tests and the eval case INV-E prove it", "We use a guardrail", "We trust the vendor master"],
      answer: 1,
      why: "Defence in depth with **evidence**: architecture (no tool), deterministic policy, human approval, and a test plus an eval case that fail if any of it regresses.",
    },
  ],
});

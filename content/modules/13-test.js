Zone.addModule({
  id: "test", num: "13", order: 13, phase: "sdlc", stage: "Test",
  icon: "🧪", color: "green", duration: "75 min",
  title: "Test rigorously: unit, integration, e2e, evals and evidence", short: "Test & evaluate",
  subtitle: "Deterministic checks where you can, LLM judges where you must, and evidence for everything",
  goals: ["Test pyramid for AI apps", "Golden-set evals as a gate", "A test-evidence pack"],
  cards: [
    {
      type: "table", title: "The test pyramid for an agentic app",
      head: ["Layer", "What it proves", "Tooling", "Runs"],
      rows: [
        ["**Unit**: deterministic core", "Matching, tolerance boundaries, policy order", "pytest + coverage", "every save (Stop hook) + CI"],
        ["**Unit**: guardrails & parsers", "Injection patterns, extraction, trimming", "pytest", "CI"],
        ["**Integration**", "API + DB + mock ERP + audit trail, all 8 samples", "pytest + FastAPI TestClient", "CI"],
        ["**Contract**", "API responses match the schema the UI expects", "OpenAPI schema + Pydantic / TS types", "CI"],
        ["**E2E**", "A user can submit, inspect and approve", "Playwright", "before release"],
        ["**Evals**", "Decisions + reason codes on the golden set; explanation quality", "`evals/run_evals.py` (+ LLM judge, optional)", "CI gate + nightly"],
        ["**Red team**", "Injection and abuse inputs are held", "eval cases + manual", "each release"],
      ],
    },
    {
      type: "compare", title: "Deterministic checks vs LLM-as-judge",
      cols: [
        { title: "Deterministic checks", icon: "📏", color: "teal", points: ["Exact: decision == expected, reason codes == expected", "Schema validation, regex, numeric tolerance", "Free, fast, reproducible", "**Use for anything with a right answer**"], verdict: "Our CI gate" },
        { title: "LLM-as-judge", icon: "⚖️", color: "violet", points: ["Fuzzy qualities: is the explanation clear, polite, grounded in the evidence?", "Needs a rubric, a fixed judge model and spot-checking by humans", "Costs tokens; can be biased", "**Use for language quality, never for maths**"], verdict: "Nightly, advisory" },
      ],
    },
    {
      type: "lab", title: "Raise and verify coverage with the test-engineer subagent", time: "15 min",
      steps: [
        { prompt: "Use the test-engineer subagent. Run pytest with coverage for backend/app and list every uncovered line in backend/app/domain and backend/app/agents/guardrails.py. Write the missing tests (boundaries first: exactly 2.00%, 2.01%, zero quantity, empty GR list, Decimal rounding). Then do a mutation check on two rules and report which test caught each mutation." },
        { cmd: "pytest -q --cov=backend/app --cov-report=term-missing --cov-report=html:docs/test-evidence/coverage-html", expect: "domain ≥ 90%. Open `docs/test-evidence/coverage-html/index.html` in the browser." },
      ],
      callouts: [{ kind: "trap", title: "Don't let the AI grade its own homework", text: "Generated tests can assert whatever the code currently does, bugs included. Review test **names** against acceptance criteria, and always do a mutation check." }],
    },
    {
      type: "lab", title: "Golden-set evals", time: "15 min",
      lead: "`evals/golden_set.jsonl` holds one line per scenario: input file, expected decision, expected reason codes. The runner scores exact matches and timings and writes a report.",
      steps: [
        { cmd: "python -m evals.run_evals", expect: "8/8 passed, with a per-case table, latency, and `docs/test-evidence/eval-report.md` + `.json` written." },
        { prompt: "Add two new golden cases to evals/golden_set.jsonl and {{app.samplesDir}}/: {{app.extraEvalCases}}" },
        { text: "Optional LLM judge for explanation quality:", prompt: "Add evals/judge.py: for each case, ask a judge model (LLM_MODEL) to score the explanation 1–5 on (a) mentions every reason code, (b) cites at least one number from the evidence, (c) no claim of approval unless AUTO_APPROVE. Use a fixed rubric prompt and temperature 0. Skip gracefully when LLM_PROVIDER=offline. Write the scores into the eval report." },
      ],
    },
    { type: "file", title: "Reference: the eval runner", fileRef: "reference-app/evals/run_evals.py" },
    {
      type: "lab", title: "End-to-end with Playwright (optional)", time: "10 min",
      steps: [
        { cmd: "cd frontend && npm install -D @playwright/test && npx playwright test", expect: "The spec submits a sample and checks the decision badge. (In the VM, Chromium may already be installed; if not, `npx playwright install chromium`.)" },
        { prompt: "Write frontend/e2e/hitl.spec.ts: submit {{app.holdSample}}, open the case, assert the {{app.holdDecision}} banner and {{app.holdReason}} chip, {{app.humanAction}} with a comment, and assert the timeline shows the human decision. Take a screenshot into docs/test-evidence/e2e-hold.png." },
      ],
    },
    {
      type: "table", title: "The test-evidence pack (what a reviewer or panel gets)",
      head: ["File in docs/test-evidence/", "Proves", "Produced by"],
      rows: [
        ["`junit.xml`", "Every test that ran, with pass/fail", "`pytest --junitxml`"],
        ["`coverage.xml` + `coverage-html/`", "Which lines are tested", "pytest-cov"],
        ["`eval-report.md` / `.json`", "Golden-set accuracy, latency, per case", "`python -m evals.run_evals`"],
        ["`e2e-*.png`", "The UI flow works", "Playwright"],
        ["`security.txt`", "bandit + pip-audit findings", "test-evidence skill"],
        ["`SUMMARY.md`", "One page: gates, SHA, date, residual risk", "test-evidence skill"],
      ],
    },
    {
      type: "prompt", title: "Prompt: produce the evidence pack",
      prompt: "/test-evidence",
      expect: "Claude runs lint → tests with junit + coverage → evals → bandit → pip-audit, then writes `docs/test-evidence/SUMMARY.md` with a residual-risk statement. It may only mark gates green that it actually ran.",
    },
    { type: "file", title: "CI: the same gates on every pull request", fileRef: ".github/workflows/reference-app-ci.yml", lead: "Evals are a **regression gate**: a prompt or model change that breaks a golden case fails the build." },
    {
      type: "quiz", title: "Checkpoint",
      q: "You switch LLM_MODEL to a cheaper model and the explanation judge score drops from 4.6 to 3.9, but all 8 decisions still pass. Ship?",
      options: ["No: any metric drop blocks", "Yes, if the decision gate passes and 3.9 is above the explanation threshold you agreed; record it in an ADR", "Yes, judges don't matter", "Revert to offline mode"],
      answer: 1,
      why: "Decisions are the hard gate (deterministic). Explanation quality is a **tracked trade-off** against cost. Agree a threshold, record the decision, and watch it in production.",
    },
  ],
});

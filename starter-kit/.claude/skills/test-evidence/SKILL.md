---
name: test-evidence
description: Run the full quality gate (lint, unit, integration, coverage, evals, dependency audit) and produce a test-evidence pack in docs/test-evidence. Use before a demo, a PR or a release.
allowed-tools: Read Bash(ruff *) Bash(pytest *) Bash(python -m evals.run_evals*) Bash(pip-audit*) Bash(bandit *) Write
---

# Produce test evidence

Run, in order, and stop at the first hard failure:

1. `ruff check . && ruff format --check .`
2. `pytest -q --junitxml=docs/test-evidence/junit.xml --cov=backend/app --cov-report=term --cov-report=xml:docs/test-evidence/coverage.xml`
3. `python -m evals.run_evals` → `docs/test-evidence/eval-report.md` / `.json`
4. `bandit -q -r backend -ll` (security lint, report only)
5. `pip-audit -r requirements.txt` (known CVEs, report only)

Then write `docs/test-evidence/SUMMARY.md`:

| Gate | Result | Evidence file |
|---|---|---|

Include: commit SHA (`git rev-parse --short HEAD`), date, tests passed/failed,
coverage % for `backend/app/domain`, eval score (n/8), open security findings,
and a one-paragraph **residual risk** statement. Never mark a gate green that you
did not run in this session.

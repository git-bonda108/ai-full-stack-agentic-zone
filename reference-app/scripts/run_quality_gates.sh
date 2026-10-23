#!/usr/bin/env bash
# Run every quality gate and write test evidence to docs/test-evidence/.
# Usage (from reference-app/, venv active):  bash scripts/run_quality_gates.sh
set -uo pipefail
cd "$(dirname "$0")/.."
EVIDENCE=docs/test-evidence
mkdir -p "$EVIDENCE"
status=0

echo "== 1/5 Lint (ruff check)"
ruff check . || status=1

echo "== 2/5 Format (ruff format --check)"
ruff format --check . || status=1

echo "== 3/5 Tests + coverage (pytest)"
python -m pytest \
  --junitxml="$EVIDENCE/junit.xml" \
  --cov=backend/app --cov-report=term --cov-report=xml:"$EVIDENCE/coverage.xml" \
  --cov-report=html:"$EVIDENCE/htmlcov" || status=1
python -m coverage report --include="backend/app/domain/*" --fail-under=90 || status=1

echo "== 4/5 AI evaluation (golden set)"
python -m evals.run_evals || status=1

echo "== 5/5 Security scans (non-fatal)"
pip-audit -r requirements.txt || echo "pip-audit reported issues (non-fatal) - review them"
bandit -q -r backend mock_erp mcp_servers -c pyproject.toml || echo "bandit reported issues (non-fatal)"

if [ "$status" -eq 0 ]; then echo "ALL QUALITY GATES PASSED"; else echo "QUALITY GATES FAILED"; fi
exit "$status"

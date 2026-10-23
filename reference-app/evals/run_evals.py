"""Golden-set evaluation harness.

    python -m evals.run_evals                 # offline (deterministic, free)
    LLM_PROVIDER=openai python -m evals.run_evals   # same golden set against a real model

Scores each golden case on: decision exact match, reason-code exact match,
explanation present, and latency. Writes evidence to docs/test-evidence/.
Exit code 1 if any case fails -> usable as a CI regression gate.
"""

import asyncio
import json
import os
import sys
import tempfile
import time
from datetime import UTC, datetime
from pathlib import Path

import httpx

from backend.app import case_service
from backend.app.config import Settings
from backend.app.db import create_tables, get_engine, init_engine, new_session
from backend.app.integrations.erp_client import ErpClient
from backend.app.integrations.jira_client import JiraClient
from mock_erp.main import app as erp_app

ROOT = Path(__file__).resolve().parents[1]
GOLDEN = ROOT / "evals" / "golden_set.jsonl"
SAMPLES = ROOT / "data" / "sample_invoices"
EVIDENCE = ROOT / "docs" / "test-evidence"


async def run() -> dict:
    tmp = Path(tempfile.mkdtemp(prefix="p2p-evals-"))
    settings = Settings(
        database_url=f"sqlite:///{tmp / 'evals.db'}",
        erp_base_url="http://erp.eval",
        jira_base_url="",  # never create real tickets from an eval run
    )
    os.chdir(tmp)  # dry-run outbox lands in the temp folder
    init_engine(settings.database_url)
    create_tables()

    cases = [json.loads(line) for line in GOLDEN.read_text().splitlines() if line.strip()]
    results = []
    for golden in cases:
        raw_text = (SAMPLES / f"{golden['sample']}.txt").read_text(encoding="utf-8")
        erp = ErpClient(settings.erp_base_url, transport=httpx.ASGITransport(app=erp_app))
        session = new_session()
        started = time.perf_counter()
        try:
            case = await case_service.process_invoice(
                session, settings, erp, JiraClient(settings), raw_text
            )
            latency_ms = round((time.perf_counter() - started) * 1000, 1)
            decision_ok = case.decision == golden["expected_decision"]
            codes_ok = case.reason_codes == golden["expected_reason_codes"]
            results.append(
                {
                    "id": golden["id"],
                    "sample": golden["sample"],
                    "expected_decision": golden["expected_decision"],
                    "actual_decision": case.decision,
                    "expected_reason_codes": golden["expected_reason_codes"],
                    "actual_reason_codes": case.reason_codes,
                    "decision_ok": decision_ok,
                    "reason_codes_ok": codes_ok,
                    "has_explanation": bool(case.explanation.strip()),
                    "latency_ms": latency_ms,
                    "tokens": case.evidence.get("tokens", {}),
                    "passed": decision_ok and codes_ok and bool(case.explanation.strip()),
                    "why": golden["why"],
                }
            )
        finally:
            session.close()
            await erp.aclose()

    get_engine().dispose()
    passed = sum(1 for r in results if r["passed"])
    return {
        "run_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model if settings.llm_provider != "offline" else "-",
        "total": len(results),
        "passed": passed,
        "pass_rate": round(100 * passed / len(results), 1) if results else 0.0,
        "avg_latency_ms": round(sum(r["latency_ms"] for r in results) / len(results), 1),
        "results": results,
    }


def write_reports(report: dict) -> None:
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    (EVIDENCE / "eval-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    lines = [
        "# Evaluation report - golden set",
        "",
        f"- Run at: {report['run_at']}",
        f"- LLM provider / model: {report['llm_provider']} / {report['llm_model']}",
        f"- **Result: {report['passed']}/{report['total']} passed ({report['pass_rate']}%)**",
        f"- Average latency: {report['avg_latency_ms']} ms",
        "",
        "| ID | Sample | Expected | Actual | Reason codes | Latency (ms) | Result |",
        "|---|---|---|---|---|---|---|",
    ]
    for r in report["results"]:
        lines.append(
            f"| {r['id']} | `{r['sample']}` | {r['expected_decision']} | {r['actual_decision']} "
            f"| {', '.join(r['actual_reason_codes'])} | {r['latency_ms']} "
            f"| {'PASS' if r['passed'] else 'FAIL'} |"
        )
    lines += ["", "Each case: decision exact match AND reason codes exact match AND explanation."]
    (EVIDENCE / "eval-report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    report = asyncio.run(run())
    write_reports(report)
    print(f"Golden set: {report['passed']}/{report['total']} passed ({report['pass_rate']}%)")
    for r in report["results"]:
        mark = "PASS" if r["passed"] else "FAIL"
        codes = ", ".join(r["actual_reason_codes"])
        print(f"  [{mark}] {r['id']} {r['sample']}: {r['actual_decision']} [{codes}]")
    return 0 if report["passed"] == report["total"] else 1


if __name__ == "__main__":
    sys.exit(main())

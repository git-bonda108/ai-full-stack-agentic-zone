"""Application service: run the pipeline, persist the case, audit, raise the ticket.

Keeps the API layer thin (like a Spring @Service behind a @RestController).
"""

import logging
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from backend.app.agents.context import CaseContext
from backend.app.agents.pipeline import PipelineResult, run_pipeline
from backend.app.config import Settings
from backend.app.integrations.erp_client import ErpClient
from backend.app.integrations.jira_client import JiraClient
from backend.app.models import AuditEvent, Case, Invoice, InvoiceLine
from backend.app.schemas import Decision, HumanDecision, MetricsSummary

logger = logging.getLogger("p2p.cases")


def invoice_exists(session: Session, invoice_number: str, vendor_id: str) -> bool:
    stmt = select(func.count(Invoice.id)).where(
        Invoice.invoice_number == invoice_number, Invoice.vendor_id == vendor_id
    )
    return (session.scalar(stmt) or 0) > 0


async def process_invoice(
    session: Session, settings: Settings, erp: ErpClient, jira: JiraClient, raw_text: str
) -> Case:
    ctx = CaseContext(
        settings=settings,
        erp=erp,
        raw_text=raw_text,
        is_duplicate=lambda number, vendor: invoice_exists(session, number, vendor),
    )
    result = await run_pipeline(ctx)
    case = _persist(session, ctx, result)

    if result.outcome.decision != Decision.AUTO_APPROVE:
        try:
            case.jira_key = await jira.create_issue(
                summary=result.resolution.ticket_summary,
                description=f"{result.resolution.explanation}\n\nCase id: {case.id}",
                labels=["p2p-sentinel", *[c.value for c in result.outcome.reason_codes]],
            )
            _audit(session, case, "Jira", "ticket_created", jira_key=case.jira_key)
        except Exception as exc:  # the case is still valid without a ticket
            logger.error("jira.failed", extra={"error": str(exc), "case_id": case.id})
            _audit(session, case, "Jira", "ticket_failed", error=type(exc).__name__)
    else:
        case.status = "CLOSED"
        case.closed_at = datetime.now(UTC)
        case.closed_by = "Policy Engine"

    session.commit()
    logger.info(
        "case.processed",
        extra={
            "case_id": case.id,
            "decision": case.decision,
            "reason_codes": case.reason_codes,
            "processing_ms": result.duration_ms,
        },
    )
    return load_case(session, case.id)


def _persist(session: Session, ctx: CaseContext, result: PipelineResult) -> Case:
    extracted = result.invoice
    invoice = Invoice(
        invoice_number=extracted.invoice_number,
        vendor_id=extracted.vendor_id,
        po_number=extracted.po_number,
        currency=extracted.currency,
        total=extracted.total,
        bank_account=extracted.bank_account,
        raw_text=ctx.raw_text,
        lines=[
            InvoiceLine(
                sku=line.sku,
                description=line.description,
                qty=line.qty,
                unit_price=line.unit_price,
            )
            for line in extracted.lines
        ],
    )
    evidence = dict(result.evidence)
    evidence["vendor_message_draft"] = result.resolution.vendor_message
    case = Case(
        invoice=invoice,
        decision=result.outcome.decision.value,
        reason_codes=[code.value for code in result.outcome.reason_codes],
        explanation=result.resolution.explanation,
        evidence=evidence,
        status="OPEN",
    )
    session.add(case)
    session.flush()  # assigns case.id
    for actor, action, payload in ctx.steps:
        _audit(session, case, actor, action, **payload)
    return case


def _audit(session: Session, case: Case, actor: str, action: str, **payload: object) -> None:
    """Append-only: audit events are added, never updated or deleted."""
    case.audit_events.append(AuditEvent(actor=actor, action=action, payload=payload))


def load_case(session: Session, case_id: int) -> Case | None:
    stmt = (
        select(Case)
        .where(Case.id == case_id)
        .options(selectinload(Case.invoice), selectinload(Case.audit_events))
    )
    return session.scalar(stmt)


def list_cases(session: Session, decision: str | None, status: str | None) -> list[Case]:
    stmt = select(Case).options(selectinload(Case.invoice)).order_by(Case.id.desc())
    if decision:
        stmt = stmt.where(Case.decision == decision)
    if status:
        stmt = stmt.where(Case.status == status)
    return list(session.scalars(stmt))


def apply_human_decision(session: Session, case: Case, body: HumanDecision) -> Case:
    """Human-in-the-loop: a person closes ROUTE_TO_HUMAN / HOLD cases."""
    if case.status == "CLOSED":
        raise ValueError("Case is already closed")
    case.status = "CLOSED"
    case.closed_at = datetime.now(UTC)
    case.closed_by = body.user
    _audit(session, case, f"user:{body.user}", f"human_{body.action}", comment=body.comment)
    session.commit()
    return load_case(session, case.id)


def metrics_summary(session: Session, settings: Settings) -> MetricsSummary:
    cases = list(session.scalars(select(Case)))
    by_decision: dict[str, int] = {}
    by_reason: dict[str, int] = {}
    total_ms = 0.0
    input_tokens = output_tokens = 0
    for case in cases:
        by_decision[case.decision] = by_decision.get(case.decision, 0) + 1
        for code in case.reason_codes:
            by_reason[code] = by_reason.get(code, 0) + 1
        total_ms += float(case.evidence.get("processing_ms", 0.0))
        tokens = case.evidence.get("tokens", {})
        input_tokens += int(tokens.get("input", 0))
        output_tokens += int(tokens.get("output", 0))
    total = len(cases)
    cost = (
        input_tokens * settings.llm_input_cost_per_mtok
        + output_tokens * settings.llm_output_cost_per_mtok
    ) / 1_000_000
    return MetricsSummary(
        total_cases=total,
        by_decision=by_decision,
        by_reason=by_reason,
        open_cases=sum(1 for case in cases if case.status == "OPEN"),
        auto_approved_pct=round(100 * by_decision.get("AUTO_APPROVE", 0) / total, 1)
        if total
        else 0.0,
        avg_processing_ms=round(total_ms / total, 1) if total else 0.0,
        est_llm_cost_usd=round(cost, 6),
    )

"""REST endpoints (SPEC section 10)."""

import asyncio
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app import case_service
from backend.app.api.deps import get_app_settings, get_erp, get_jira
from backend.app.config import Settings
from backend.app.db import get_session, new_session
from backend.app.integrations.erp_client import ErpClient
from backend.app.integrations.jira_client import JiraClient
from backend.app.schemas import (
    BatchSubmit,
    CaseOut,
    CaseSummary,
    HumanDecision,
    InvoiceSubmit,
    MetricsSummary,
)

SAMPLES_DIR = Path(__file__).resolve().parents[3] / "data" / "sample_invoices"

router = APIRouter(prefix="/api", tags=["p2p"])


@router.post("/invoices", response_model=CaseOut)
async def submit_invoice(
    body: InvoiceSubmit,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_app_settings),
    erp: ErpClient = Depends(get_erp),
    jira: JiraClient = Depends(get_jira),
) -> CaseOut:
    case = await case_service.process_invoice(session, settings, erp, jira, body.raw_text)
    return CaseOut.model_validate(case)


@router.post("/invoices/batch", response_model=list[CaseSummary])
async def submit_batch(
    body: BatchSubmit,
    request: Request,
    settings: Settings = Depends(get_app_settings),
    jira: JiraClient = Depends(get_jira),
) -> list[CaseSummary]:
    """Process many invoices concurrently, at most BATCH_CONCURRENCY at a time."""
    semaphore = asyncio.Semaphore(settings.batch_concurrency)

    async def one(raw_text: str) -> CaseSummary:
        async with semaphore:
            # Each concurrent task gets its own DB session and ERP client (no shared state)
            session = new_session()
            erp = ErpClient(settings.erp_base_url, transport=request.app.state.erp_transport)
            try:
                case = await case_service.process_invoice(session, settings, erp, jira, raw_text)
                return CaseSummary.model_validate(case)
            finally:
                session.close()
                await erp.aclose()

    return list(await asyncio.gather(*(one(text) for text in body.raw_texts)))


@router.get("/invoices/samples", response_model=list[str])
def list_samples() -> list[str]:
    return sorted(path.stem for path in SAMPLES_DIR.glob("*.txt"))


@router.post("/invoices/samples/{name}", response_model=CaseOut)
async def submit_sample(
    name: str,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_app_settings),
    erp: ErpClient = Depends(get_erp),
    jira: JiraClient = Depends(get_jira),
) -> CaseOut:
    if name not in list_samples():  # allowlist - no path traversal
        raise HTTPException(status_code=404, detail=f"Unknown sample '{name}'")
    raw_text = (SAMPLES_DIR / f"{name}.txt").read_text(encoding="utf-8")
    case = await case_service.process_invoice(session, settings, erp, jira, raw_text)
    return CaseOut.model_validate(case)


@router.get("/cases", response_model=list[CaseSummary])
def get_cases(
    decision: str | None = None,
    status: str | None = None,
    session: Session = Depends(get_session),
) -> list[CaseSummary]:
    return [
        CaseSummary.model_validate(c) for c in case_service.list_cases(session, decision, status)
    ]


@router.get("/cases/{case_id}", response_model=CaseOut)
def get_case(case_id: int, session: Session = Depends(get_session)) -> CaseOut:
    case = case_service.load_case(session, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseOut.model_validate(case)


@router.post("/cases/{case_id}/decision", response_model=CaseOut)
def post_decision(
    case_id: int, body: HumanDecision, session: Session = Depends(get_session)
) -> CaseOut:
    case = case_service.load_case(session, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    try:
        updated = case_service.apply_human_decision(session, case, body)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return CaseOut.model_validate(updated)


@router.get("/metrics/summary", response_model=MetricsSummary)
def get_metrics(
    session: Session = Depends(get_session), settings: Settings = Depends(get_app_settings)
) -> MetricsSummary:
    return case_service.metrics_summary(session, settings)

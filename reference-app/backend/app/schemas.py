"""Pydantic models: the typed contracts between agents, domain code and the API.

These are the "DTOs". Agents return them (`output_type=...`), the domain
engines consume them, and FastAPI serialises them to JSON.
"""

from datetime import datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ReasonCode(StrEnum):
    MATCHED = "MATCHED"
    PRICE_VARIANCE = "PRICE_VARIANCE"
    QTY_MISMATCH = "QTY_MISMATCH"
    NO_GOODS_RECEIPT = "NO_GOODS_RECEIPT"
    PO_NOT_FOUND = "PO_NOT_FOUND"
    DUPLICATE_INVOICE = "DUPLICATE_INVOICE"
    BANK_DETAILS_CHANGED = "BANK_DETAILS_CHANGED"
    VENDOR_BLOCKED = "VENDOR_BLOCKED"
    HIGH_VALUE = "HIGH_VALUE"
    PROMPT_INJECTION_SUSPECTED = "PROMPT_INJECTION_SUSPECTED"
    EXTRACTION_LOW_CONFIDENCE = "EXTRACTION_LOW_CONFIDENCE"


class Decision(StrEnum):
    AUTO_APPROVE = "AUTO_APPROVE"
    ROUTE_TO_HUMAN = "ROUTE_TO_HUMAN"
    HOLD = "HOLD"
    REJECT = "REJECT"


# --------------------------------------------------------------------------- invoice


class InvoiceLineItem(BaseModel):
    sku: str
    description: str = ""
    qty: float
    unit_price: float


class ExtractedInvoice(BaseModel):
    """Structured invoice produced by the Intake Agent (or the offline regex parser)."""

    invoice_number: str
    vendor_id: str
    vendor_name: str = ""
    po_number: str
    invoice_date: str = ""
    currency: str = "EUR"
    bank_account: str = ""
    lines: list[InvoiceLineItem] = Field(default_factory=list)
    total: float
    confidence: float = Field(1.0, ge=0.0, le=1.0, description="0..1 extraction confidence")


# --------------------------------------------------------------------------- ERP (trimmed)


class PurchaseOrderLine(BaseModel):
    sku: str
    description: str = ""
    qty: float
    unit_price: float


class PurchaseOrder(BaseModel):
    po_number: str
    vendor_id: str
    currency: str
    lines: list[PurchaseOrderLine]


class GoodsReceiptLine(BaseModel):
    sku: str
    qty_received: float


class GoodsReceipt(BaseModel):
    gr_number: str
    po_number: str
    lines: list[GoodsReceiptLine]


class Vendor(BaseModel):
    vendor_id: str
    name: str
    iban: str
    blocked: bool


# --------------------------------------------------------------------------- engine results


class LineComparison(BaseModel):
    """One row of the evidence table: invoice vs PO vs goods receipt."""

    sku: str
    invoice_qty: float
    invoice_unit_price: float
    po_qty: float | None = None
    po_unit_price: float | None = None
    received_qty: float | None = None
    price_variance_pct: float | None = None
    issues: list[ReasonCode] = Field(default_factory=list)


class MatchResult(BaseModel):
    po_found: bool
    goods_receipt_found: bool
    lines: list[LineComparison] = Field(default_factory=list)
    reason_codes: list[ReasonCode] = Field(default_factory=list)
    summary: str = ""


class RiskFinding(BaseModel):
    code: ReasonCode
    detail: str


class RiskReport(BaseModel):
    findings: list[RiskFinding] = Field(default_factory=list)

    @property
    def reason_codes(self) -> list[ReasonCode]:
        return [finding.code for finding in self.findings]


class PolicyOutcome(BaseModel):
    decision: Decision
    reason_codes: list[ReasonCode]
    rule: str = Field(description="Human-readable name of the policy rule that fired")


class ResolutionDraft(BaseModel):
    """What the Resolution Agent writes. It never decides - it explains."""

    explanation: str
    vendor_message: str = ""
    ticket_summary: str = ""


# --------------------------------------------------------------------------- API


class InvoiceSubmit(BaseModel):
    raw_text: str = Field(min_length=10, max_length=20000)


class BatchSubmit(BaseModel):
    raw_texts: list[str] = Field(min_length=1, max_length=50)


class HumanDecision(BaseModel):
    action: Literal["approve", "reject"]
    user: str = Field(min_length=1, max_length=128)
    comment: str = Field(default="", max_length=2000)


class AuditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor: str
    action: str
    payload: dict[str, Any]
    created_at: datetime


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_number: str
    vendor_id: str
    po_number: str
    currency: str
    total: float
    bank_account: str


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    decision: Decision
    reason_codes: list[ReasonCode]
    explanation: str
    evidence: dict[str, Any]
    status: str
    jira_key: str | None
    created_at: datetime
    closed_at: datetime | None
    closed_by: str | None
    invoice: InvoiceOut
    audit_events: list[AuditEventOut] = Field(default_factory=list)


class CaseSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    decision: Decision
    reason_codes: list[ReasonCode]
    status: str
    jira_key: str | None
    created_at: datetime
    invoice: InvoiceOut


class MetricsSummary(BaseModel):
    total_cases: int
    by_decision: dict[str, int]
    by_reason: dict[str, int]
    open_cases: int
    auto_approved_pct: float
    avg_processing_ms: float
    est_llm_cost_usd: float

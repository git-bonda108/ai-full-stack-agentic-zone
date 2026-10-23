"""Explainability: turn reason codes + evidence into plain-English explanations.

Used directly in offline mode, and as the factual skeleton the Resolution
Agent must stay faithful to in LLM mode.
"""

from backend.app.schemas import (
    Decision,
    ExtractedInvoice,
    MatchResult,
    PolicyOutcome,
    ReasonCode,
    ResolutionDraft,
    RiskReport,
)

REASON_TEXT: dict[ReasonCode, str] = {
    ReasonCode.MATCHED: "Invoice, purchase order and goods receipt agree.",
    ReasonCode.PRICE_VARIANCE: "A unit price differs from the purchase order beyond tolerance.",
    ReasonCode.QTY_MISMATCH: "Invoiced quantity exceeds what was received (or is not on the PO).",
    ReasonCode.NO_GOODS_RECEIPT: "No goods receipt has been posted for this purchase order.",
    ReasonCode.PO_NOT_FOUND: "The referenced purchase order does not exist in the ERP.",
    ReasonCode.DUPLICATE_INVOICE: "This invoice number was already processed for this vendor.",
    ReasonCode.BANK_DETAILS_CHANGED: "Bank details differ from the vendor master - fraud risk.",
    ReasonCode.VENDOR_BLOCKED: "The vendor is blocked for payment in the ERP.",
    ReasonCode.HIGH_VALUE: "The amount is above the auto-approval threshold.",
    ReasonCode.PROMPT_INJECTION_SUSPECTED: "The document contains instructions aimed at the AI.",
    ReasonCode.EXTRACTION_LOW_CONFIDENCE: "The invoice could not be read with enough confidence.",
}

NEXT_STEP: dict[Decision, str] = {
    Decision.AUTO_APPROVE: "Released for payment. No action needed.",
    Decision.ROUTE_TO_HUMAN: "An AP clerk must review the evidence and approve or reject.",
    Decision.HOLD: "Payment is on hold. Security / fraud team must verify with the vendor "
    "using contact details from the vendor master, never from the invoice.",
    Decision.REJECT: "Rejected. The vendor will be notified.",
}


def build_evidence(
    invoice: ExtractedInvoice, match: MatchResult, risk: RiskReport, outcome: PolicyOutcome
) -> dict:
    """The structured evidence stored on the case and shown in the UI."""
    return {
        "policy_rule": outcome.rule,
        "match_summary": match.summary,
        "line_comparison": [line.model_dump(mode="json") for line in match.lines],
        "risk_findings": [finding.model_dump(mode="json") for finding in risk.findings],
        "extraction_confidence": invoice.confidence,
    }


def describe_line_issues(line_comparison: list[dict]) -> str:
    """Quote the exact numbers behind each line-level exception."""
    parts: list[str] = []
    for line in line_comparison:
        issues = line.get("issues", [])
        if ReasonCode.PRICE_VARIANCE in issues:
            parts.append(
                f"{line['sku']}: invoiced {line['invoice_unit_price']:.2f} vs PO "
                f"{line['po_unit_price']:.2f} ({line['price_variance_pct']:+.2f}%)."
            )
        if ReasonCode.QTY_MISMATCH in issues:
            if line.get("po_qty") is None:
                parts.append(f"{line['sku']}: not on the purchase order.")
            else:
                parts.append(
                    f"{line['sku']}: invoiced qty {line['invoice_qty']:g}, "
                    f"received {line.get('received_qty') or 0:g}."
                )
    return " ".join(parts)


def template_resolution(
    invoice: ExtractedInvoice,
    outcome: PolicyOutcome,
    risk: RiskReport,
    line_comparison: list[dict] | None = None,
) -> ResolutionDraft:
    """Deterministic explanation + drafts (offline mode and LLM fallback)."""
    reasons = " ".join(REASON_TEXT[code] for code in outcome.reason_codes)
    details = " ".join(finding.detail for finding in risk.findings)
    line_details = describe_line_issues(line_comparison or [])
    if line_details:
        details = f"{line_details} {details}".strip()
    explanation = (
        f"Decision: {outcome.decision.value}. {reasons} {details} "
        f"Rule applied: {outcome.rule}. Next step: {NEXT_STEP[outcome.decision]}"
    ).replace("  ", " ")

    vendor_message = ""
    if outcome.decision in (Decision.REJECT, Decision.ROUTE_TO_HUMAN):
        vendor_message = (
            f"Dear {invoice.vendor_name or invoice.vendor_id}, regarding invoice "
            f"{invoice.invoice_number} (PO {invoice.po_number}): we could not process it "
            f"automatically. Reason: {reasons} Our AP team will contact you if anything is needed."
        )
    ticket_summary = (
        f"[{outcome.decision.value}] {invoice.invoice_number} / {invoice.po_number}: "
        + ", ".join(code.value for code in outcome.reason_codes)
    )
    return ResolutionDraft(
        explanation=explanation, vendor_message=vendor_message, ticket_summary=ticket_summary
    )

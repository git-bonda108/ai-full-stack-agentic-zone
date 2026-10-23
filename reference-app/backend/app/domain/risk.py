"""Deterministic risk checks: blocked vendor, bank-detail change, duplicates, injection.

Bank-detail changes on an invoice are one of the most common payment-fraud
vectors, so we compare against the vendor master in the ERP - never against
what the invoice text claims.
"""

import re

from backend.app.schemas import ExtractedInvoice, ReasonCode, RiskFinding, RiskReport, Vendor

# Phrases that try to steer an AI system. Invoices are untrusted input.
INJECTION_PATTERNS: list[re.Pattern[str]] = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
        r"disregard\s+(all\s+)?(previous|prior|your)\s+(instructions|rules)",
        r"you\s+are\s+now\s+",
        r"system\s*prompt",
        r"approve\s+this\s+invoice\s+(immediately|now|without)",
        r"do\s+not\s+(flag|check|verify)",
        r"act\s+as\s+(an?\s+)?(administrator|admin|approver)",
    ]
]


def normalise_iban(value: str) -> str:
    return re.sub(r"\s+", "", value or "").upper()


def detect_prompt_injection(text: str) -> list[str]:
    """Return the suspicious phrases found in untrusted text (empty list = clean)."""
    hits: list[str] = []
    for pattern in INJECTION_PATTERNS:
        match = pattern.search(text or "")
        if match:
            hits.append(match.group(0))
    return hits


def assess_risk(
    invoice: ExtractedInvoice,
    vendor: Vendor | None,
    is_duplicate: bool,
    raw_text: str = "",
) -> RiskReport:
    """Run all deterministic risk checks and return the findings."""
    findings: list[RiskFinding] = []

    if is_duplicate:
        findings.append(
            RiskFinding(
                code=ReasonCode.DUPLICATE_INVOICE,
                detail=(
                    f"Invoice {invoice.invoice_number} from {invoice.vendor_id} "
                    "has already been processed."
                ),
            )
        )

    if vendor is not None:
        if vendor.blocked:
            findings.append(
                RiskFinding(
                    code=ReasonCode.VENDOR_BLOCKED,
                    detail=f"Vendor {vendor.vendor_id} ({vendor.name}) is blocked for payment.",
                )
            )
        if invoice.bank_account and normalise_iban(invoice.bank_account) != normalise_iban(
            vendor.iban
        ):
            findings.append(
                RiskFinding(
                    code=ReasonCode.BANK_DETAILS_CHANGED,
                    detail=(
                        "Bank account on the invoice does not match the vendor master "
                        f"(invoice ...{normalise_iban(invoice.bank_account)[-4:]}, "
                        f"master ...{normalise_iban(vendor.iban)[-4:]})."
                    ),
                )
            )

    injection_hits = detect_prompt_injection(raw_text)
    if injection_hits:
        findings.append(
            RiskFinding(
                code=ReasonCode.PROMPT_INJECTION_SUSPECTED,
                detail="Invoice text contains instructions aimed at an AI system: "
                + "; ".join(f'"{hit}"' for hit in injection_hits),
            )
        )

    if invoice.confidence < 0.7:
        findings.append(
            RiskFinding(
                code=ReasonCode.EXTRACTION_LOW_CONFIDENCE,
                detail=f"Extraction confidence {invoice.confidence:.2f} is below 0.70.",
            )
        )

    return RiskReport(findings=findings)

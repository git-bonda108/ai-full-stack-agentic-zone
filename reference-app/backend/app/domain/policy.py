"""The decision policy. Deterministic, ordered, first match wins (SPEC section 6).

The LLM never sets the decision. It only explains the decision made here.
"""

from backend.app.schemas import Decision, PolicyOutcome, ReasonCode

REJECT_CODES = {ReasonCode.VENDOR_BLOCKED, ReasonCode.DUPLICATE_INVOICE}
HOLD_CODES = {ReasonCode.BANK_DETAILS_CHANGED, ReasonCode.PROMPT_INJECTION_SUSPECTED}
HUMAN_CODES = {
    ReasonCode.PO_NOT_FOUND,
    ReasonCode.NO_GOODS_RECEIPT,
    ReasonCode.PRICE_VARIANCE,
    ReasonCode.QTY_MISMATCH,
    ReasonCode.EXTRACTION_LOW_CONFIDENCE,
}


def decide(
    reason_codes: list[ReasonCode], invoice_total: float, approval_threshold: float
) -> PolicyOutcome:
    """Turn the collected reason codes into exactly one decision.

    The returned reason codes keep *every* exception found (most severe group
    first) so the human reviewer sees the full picture, not just the rule that fired.
    """
    codes = [code for code in dict.fromkeys(reason_codes) if code != ReasonCode.MATCHED]
    if invoice_total > approval_threshold:
        codes.append(ReasonCode.HIGH_VALUE)
    found = set(codes)
    ordered = _by_severity(codes)

    if found & REJECT_CODES:
        return PolicyOutcome(
            decision=Decision.REJECT,
            reason_codes=ordered,
            rule="R1: blocked vendor or duplicate invoice -> REJECT",
        )
    if found & HOLD_CODES:
        return PolicyOutcome(
            decision=Decision.HOLD,
            reason_codes=ordered,
            rule="R2: bank change or prompt injection -> HOLD for fraud/security review",
        )
    if found & HUMAN_CODES:
        return PolicyOutcome(
            decision=Decision.ROUTE_TO_HUMAN,
            reason_codes=ordered,
            rule="R3: matching exception -> ROUTE_TO_HUMAN",
        )
    if ReasonCode.HIGH_VALUE in found:
        return PolicyOutcome(
            decision=Decision.ROUTE_TO_HUMAN,
            reason_codes=[ReasonCode.HIGH_VALUE],
            rule=f"R4: total above approval threshold {approval_threshold:,.2f} -> ROUTE_TO_HUMAN",
        )
    return PolicyOutcome(
        decision=Decision.AUTO_APPROVE,
        reason_codes=[ReasonCode.MATCHED],
        rule="R5: clean three-way match within threshold -> AUTO_APPROVE",
    )


def _by_severity(codes: list[ReasonCode]) -> list[ReasonCode]:
    """Sort codes: reject group, then hold group, then human group, then HIGH_VALUE."""

    def rank(code: ReasonCode) -> int:
        if code in REJECT_CODES:
            return 0
        if code in HOLD_CODES:
            return 1
        if code in HUMAN_CODES:
            return 2
        return 3

    return sorted(codes, key=rank)

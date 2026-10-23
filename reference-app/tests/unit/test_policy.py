import pytest

from backend.app.domain.policy import decide
from backend.app.schemas import Decision
from backend.app.schemas import ReasonCode as R

THRESHOLD = 10_000


@pytest.mark.parametrize(
    ("codes", "total", "expected_decision", "expected_codes"),
    [
        ([R.MATCHED], 100, Decision.AUTO_APPROVE, [R.MATCHED]),
        ([R.MATCHED], 13_800, Decision.ROUTE_TO_HUMAN, [R.HIGH_VALUE]),
        ([R.PRICE_VARIANCE], 100, Decision.ROUTE_TO_HUMAN, [R.PRICE_VARIANCE]),
        ([R.QTY_MISMATCH], 100, Decision.ROUTE_TO_HUMAN, [R.QTY_MISMATCH]),
        ([R.MATCHED, R.BANK_DETAILS_CHANGED], 100, Decision.HOLD, [R.BANK_DETAILS_CHANGED]),
        ([R.PROMPT_INJECTION_SUSPECTED], 100, Decision.HOLD, [R.PROMPT_INJECTION_SUSPECTED]),
        ([R.MATCHED, R.DUPLICATE_INVOICE], 100, Decision.REJECT, [R.DUPLICATE_INVOICE]),
        ([R.VENDOR_BLOCKED], 100, Decision.REJECT, [R.VENDOR_BLOCKED]),
        # Severity ordering: reject beats hold beats human review
        (
            [R.PRICE_VARIANCE, R.BANK_DETAILS_CHANGED, R.VENDOR_BLOCKED],
            100,
            Decision.REJECT,
            [R.VENDOR_BLOCKED, R.BANK_DETAILS_CHANGED, R.PRICE_VARIANCE],
        ),
        ([R.PRICE_VARIANCE], 20_000, Decision.ROUTE_TO_HUMAN, [R.PRICE_VARIANCE, R.HIGH_VALUE]),
    ],
)
def test_decision_table(codes, total, expected_decision, expected_codes):
    outcome = decide(codes, invoice_total=total, approval_threshold=THRESHOLD)
    assert outcome.decision == expected_decision
    assert outcome.reason_codes == expected_codes
    assert outcome.rule  # every decision names the rule that fired


def test_threshold_is_exclusive():
    assert decide([R.MATCHED], 10_000, THRESHOLD).decision == Decision.AUTO_APPROVE
    assert decide([R.MATCHED], 10_000.01, THRESHOLD).decision == Decision.ROUTE_TO_HUMAN

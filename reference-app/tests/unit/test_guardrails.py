from backend.app.agents.guardrails import claims_unauthorised_approval


def test_approval_claim_blocked_when_not_auto_approved():
    assert claims_unauthorised_approval("The invoice has been approved.", "HOLD")
    assert claims_unauthorised_approval("It was released for payment", "ROUTE_TO_HUMAN")


def test_approval_claim_allowed_for_auto_approve():
    assert not claims_unauthorised_approval("The invoice has been approved.", "AUTO_APPROVE")


def test_neutral_text_passes():
    assert not claims_unauthorised_approval("An AP clerk must review the evidence.", "HOLD")

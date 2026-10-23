"""End-to-end through the HTTP API with the mock ERP in-process (offline LLM mode)."""

import pytest

from tests.conftest import sample

# Order matters: inv_d is a duplicate of inv_a, so inv_a must be processed first.
EXPECTED = [
    ("inv_a_clean", "AUTO_APPROVE", ["MATCHED"]),
    ("inv_b_price_variance", "ROUTE_TO_HUMAN", ["PRICE_VARIANCE"]),
    ("inv_c_qty_mismatch", "ROUTE_TO_HUMAN", ["QTY_MISMATCH"]),
    ("inv_d_duplicate", "REJECT", ["DUPLICATE_INVOICE"]),
    ("inv_e_bank_change", "HOLD", ["BANK_DETAILS_CHANGED"]),
    ("inv_f_prompt_injection", "HOLD", ["PROMPT_INJECTION_SUSPECTED"]),
    ("inv_g_blocked_vendor", "REJECT", ["VENDOR_BLOCKED"]),
    ("inv_h_high_value", "ROUTE_TO_HUMAN", ["HIGH_VALUE"]),
]


def test_health_and_ready(client):
    assert client.get("/healthz").json() == {"status": "ok"}
    ready = client.get("/readyz").json()
    assert ready["database"] is True and ready["erp"] is True


def test_all_samples_in_order(client):
    for name, decision, codes in EXPECTED:
        response = client.post("/api/invoices", json={"raw_text": sample(name)})
        assert response.status_code == 200, response.text
        case = response.json()
        assert case["decision"] == decision, name
        assert case["reason_codes"] == codes, name
        assert case["explanation"]
        assert case["audit_events"], "every case has an audit trail"
        if decision == "AUTO_APPROVE":
            assert case["status"] == "CLOSED" and case["jira_key"] is None
        else:
            assert case["status"] == "OPEN"
            assert case["jira_key"].startswith("DRYRUN-")

    cases = client.get("/api/cases").json()
    assert len(cases) == len(EXPECTED)
    metrics = client.get("/api/metrics/summary").json()
    assert metrics["total_cases"] == 8
    assert metrics["by_decision"]["HOLD"] == 2
    assert metrics["auto_approved_pct"] == 12.5


def test_evidence_table_for_price_variance(client):
    case = client.post("/api/invoices/samples/inv_b_price_variance").json()
    gloves = next(line for line in case["evidence"]["line_comparison"] if line["sku"] == "GLV-01")
    assert gloves["po_unit_price"] == 4.50
    assert gloves["invoice_unit_price"] == 4.80
    assert gloves["price_variance_pct"] == 6.67
    assert case["evidence"]["tokens"]["erp_tokens_saved_by_trimming"] > 0


def test_injection_text_never_reaches_explanation_as_instruction(client):
    case = client.post("/api/invoices/samples/inv_f_prompt_injection").json()
    assert case["decision"] == "HOLD"
    assert "approved" not in case["explanation"].lower().replace("auto_approve", "")


def test_human_in_the_loop_decision(client):
    case = client.post("/api/invoices/samples/inv_h_high_value").json()
    response = client.post(
        f"/api/cases/{case['id']}/decision",
        json={"action": "approve", "user": "daniel", "comment": "Budget confirmed"},
    )
    assert response.status_code == 200
    closed = response.json()
    assert closed["status"] == "CLOSED" and closed["closed_by"] == "daniel"
    assert closed["audit_events"][-1]["action"] == "human_approve"
    # A closed case cannot be decided twice
    again = client.post(f"/api/cases/{case['id']}/decision", json={"action": "reject", "user": "x"})
    assert again.status_code == 409


def test_batch_processes_concurrently(client):
    names = ["inv_b_price_variance", "inv_c_qty_mismatch", "inv_g_blocked_vendor"]
    response = client.post("/api/invoices/batch", json={"raw_texts": [sample(n) for n in names]})
    assert response.status_code == 200
    assert [c["decision"] for c in response.json()] == [
        "ROUTE_TO_HUMAN",
        "ROUTE_TO_HUMAN",
        "REJECT",
    ]


@pytest.mark.parametrize("path", ["/api/cases/999", "/api/invoices/samples/../../etc/passwd"])
def test_not_found(client, path):
    method = client.get if path.startswith("/api/cases") else client.post
    assert method(path).status_code == 404


def test_validation_rejects_tiny_payload(client):
    assert client.post("/api/invoices", json={"raw_text": "x"}).status_code == 422


def test_samples_listing(client):
    assert "inv_a_clean" in client.get("/api/invoices/samples").json()

from backend.app.agents.intake_agent import parse_invoice_text
from tests.conftest import sample


def test_parse_clean_invoice():
    invoice = parse_invoice_text(sample("inv_a_clean"))
    assert invoice.invoice_number == "INV-A-001"
    assert invoice.vendor_id == "V-100"
    assert invoice.po_number == "PO-1001"
    assert invoice.bank_account == "DE89370400440532013000"
    assert invoice.total == 1550.00
    assert [(line.sku, line.qty, line.unit_price) for line in invoice.lines] == [
        ("GLV-01", 100, 4.50),
        ("HLM-02", 50, 22.00),
    ]
    assert invoice.confidence == 1.0


def test_parse_high_value_total():
    assert parse_invoice_text(sample("inv_h_high_value")).total == 13800.00


def test_lines_not_adding_up_lowers_confidence():
    text = sample("inv_a_clean").replace("Total: 1550.00", "Total: 9999.00")
    assert parse_invoice_text(text).confidence == 0.8


def test_garbage_has_low_confidence():
    invoice = parse_invoice_text("hello, please pay us some money. thanks")
    assert invoice.confidence < 0.7

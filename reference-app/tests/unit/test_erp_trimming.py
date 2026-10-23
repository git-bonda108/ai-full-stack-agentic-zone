import httpx

from backend.app.integrations.erp_client import ErpClient, approx_tokens, trim
from mock_erp.main import app as erp_app


def test_trim_keeps_only_allowlist():
    kept, dropped = trim({"a": 1, "b": 2, "c": 3}, ["a", "c", "missing"])
    assert kept == {"a": 1, "c": 3}
    assert dropped == ["b"]


def test_approx_tokens():
    assert approx_tokens({"k": "x" * 400}) > 90


async def test_purchase_order_is_trimmed_and_audited():
    client = ErpClient("http://erp.test", transport=httpx.ASGITransport(app=erp_app))
    po = await client.get_purchase_order("PO-1001")
    await client.aclose()
    assert po is not None
    assert [line.sku for line in po.lines] == ["GLV-01", "HLM-02"]
    record = client.audit_log.records[0]
    assert record.entity == "PurchaseOrder"
    assert "__metadata" in record.dropped
    assert record.tokens_after < record.tokens_before / 3  # big saving
    assert client.audit_log.tokens_saved > 0


async def test_vendor_and_receipts_and_not_found():
    client = ErpClient("http://erp.test", transport=httpx.ASGITransport(app=erp_app))
    vendor = await client.get_vendor("V-300")
    receipts = await client.get_goods_receipts("PO-1002")
    missing = await client.get_purchase_order("PO-9999")
    none_received = await client.get_goods_receipts("PO-9999")
    await client.aclose()
    assert vendor is not None and vendor.blocked is True
    assert receipts[0].lines[0].qty_received == 8
    assert missing is None
    assert none_received == []

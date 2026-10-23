from backend.app.domain.matching import price_variance_pct, three_way_match
from backend.app.schemas import (
    ExtractedInvoice,
    GoodsReceipt,
    GoodsReceiptLine,
    InvoiceLineItem,
    PurchaseOrder,
    PurchaseOrderLine,
    ReasonCode,
)

PO = PurchaseOrder(
    po_number="PO-1",
    vendor_id="V-1",
    currency="EUR",
    lines=[
        PurchaseOrderLine(sku="A", qty=10, unit_price=10.0),
        PurchaseOrderLine(sku="B", qty=5, unit_price=100.0),
    ],
)
GR = [
    GoodsReceipt(
        gr_number="GR-1",
        po_number="PO-1",
        lines=[
            GoodsReceiptLine(sku="A", qty_received=10),
            GoodsReceiptLine(sku="B", qty_received=5),
        ],
    )
]


def invoice(*lines: tuple[str, float, float]) -> ExtractedInvoice:
    items = [InvoiceLineItem(sku=s, qty=q, unit_price=p) for s, q, p in lines]
    return ExtractedInvoice(
        invoice_number="I-1",
        vendor_id="V-1",
        po_number="PO-1",
        lines=items,
        total=sum(q * p for _, q, p in lines),
    )


def test_price_variance_pct():
    assert price_variance_pct(4.80, 4.50) == 6.67
    assert price_variance_pct(10, 10) == 0.0
    assert price_variance_pct(0, 0) == 0.0
    assert price_variance_pct(5, 0) == 100.0


def test_clean_match():
    result = three_way_match(invoice(("A", 10, 10.0), ("B", 5, 100.0)), PO, GR)
    assert result.reason_codes == [ReasonCode.MATCHED]
    assert result.po_found and result.goods_receipt_found


def test_price_within_tolerance_is_matched():
    result = three_way_match(invoice(("A", 10, 10.15)), PO, GR, price_tolerance_pct=2.0)
    assert result.reason_codes == [ReasonCode.MATCHED]


def test_price_variance_beyond_tolerance():
    result = three_way_match(invoice(("A", 10, 10.50)), PO, GR, price_tolerance_pct=2.0)
    assert result.reason_codes == [ReasonCode.PRICE_VARIANCE]
    assert result.lines[0].price_variance_pct == 5.0


def test_quantity_above_received():
    result = three_way_match(invoice(("A", 12, 10.0)), PO, GR)
    assert ReasonCode.QTY_MISMATCH in result.reason_codes


def test_sku_not_on_po_is_qty_mismatch():
    result = three_way_match(invoice(("Z", 1, 1.0)), PO, GR)
    assert result.reason_codes == [ReasonCode.QTY_MISMATCH]


def test_po_not_found():
    result = three_way_match(invoice(("A", 1, 10.0)), None, [])
    assert result.reason_codes == [ReasonCode.PO_NOT_FOUND]
    assert not result.po_found


def test_no_goods_receipt():
    result = three_way_match(invoice(("A", 10, 10.0)), PO, [])
    assert result.reason_codes == [ReasonCode.NO_GOODS_RECEIPT]


def test_multiple_receipts_are_summed():
    receipts = [
        GoodsReceipt(
            gr_number="G1", po_number="PO-1", lines=[GoodsReceiptLine(sku="A", qty_received=4)]
        ),
        GoodsReceipt(
            gr_number="G2", po_number="PO-1", lines=[GoodsReceiptLine(sku="A", qty_received=6)]
        ),
    ]
    result = three_way_match(invoice(("A", 10, 10.0)), PO, receipts)
    assert result.reason_codes == [ReasonCode.MATCHED]
    assert result.lines[0].received_qty == 10

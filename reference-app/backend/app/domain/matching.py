"""Deterministic three-way match: invoice vs purchase order vs goods receipt.

No LLM here. This is plain, unit-tested business logic - the source of truth.
"""

from backend.app.schemas import (
    ExtractedInvoice,
    GoodsReceipt,
    LineComparison,
    MatchResult,
    PurchaseOrder,
    ReasonCode,
)


def price_variance_pct(invoice_price: float, po_price: float) -> float:
    """Percentage difference of the invoiced unit price vs the PO unit price."""
    if po_price == 0:
        return 0.0 if invoice_price == 0 else 100.0
    return round((invoice_price - po_price) / po_price * 100, 2)


def received_quantities(receipts: list[GoodsReceipt]) -> dict[str, float]:
    """Sum the received quantity per SKU across all goods receipts of a PO."""
    totals: dict[str, float] = {}
    for receipt in receipts:
        for line in receipt.lines:
            totals[line.sku] = totals.get(line.sku, 0.0) + line.qty_received
    return totals


def three_way_match(
    invoice: ExtractedInvoice,
    purchase_order: PurchaseOrder | None,
    receipts: list[GoodsReceipt],
    price_tolerance_pct: float = 2.0,
) -> MatchResult:
    """Compare every invoice line with the PO line and the received quantity.

    Rules:
    - PO missing                          -> PO_NOT_FOUND
    - no goods receipt at all             -> NO_GOODS_RECEIPT
    - |price variance| > tolerance        -> PRICE_VARIANCE
    - invoiced qty > received qty, or SKU not on the PO -> QTY_MISMATCH
    """
    if purchase_order is None:
        return MatchResult(
            po_found=False,
            goods_receipt_found=bool(receipts),
            reason_codes=[ReasonCode.PO_NOT_FOUND],
            summary=f"Purchase order {invoice.po_number} was not found in the ERP.",
        )

    po_lines = {line.sku: line for line in purchase_order.lines}
    received = received_quantities(receipts)
    comparisons: list[LineComparison] = []
    codes: list[ReasonCode] = []

    if not receipts:
        codes.append(ReasonCode.NO_GOODS_RECEIPT)

    for line in invoice.lines:
        po_line = po_lines.get(line.sku)
        comparison = LineComparison(
            sku=line.sku,
            invoice_qty=line.qty,
            invoice_unit_price=line.unit_price,
            received_qty=received.get(line.sku) if receipts else None,
        )
        if po_line is None:
            comparison.issues.append(ReasonCode.QTY_MISMATCH)
        else:
            comparison.po_qty = po_line.qty
            comparison.po_unit_price = po_line.unit_price
            variance = price_variance_pct(line.unit_price, po_line.unit_price)
            comparison.price_variance_pct = variance
            if abs(variance) > price_tolerance_pct:
                comparison.issues.append(ReasonCode.PRICE_VARIANCE)
            if receipts and line.qty > received.get(line.sku, 0.0):
                comparison.issues.append(ReasonCode.QTY_MISMATCH)
        comparisons.append(comparison)
        for issue in comparison.issues:
            if issue not in codes:
                codes.append(issue)

    if not codes:
        codes = [ReasonCode.MATCHED]
        summary = "All invoice lines match the purchase order and the goods received."
    else:
        summary = "Exceptions found: " + ", ".join(code.value for code in codes)

    return MatchResult(
        po_found=True,
        goods_receipt_found=bool(receipts),
        lines=comparisons,
        reason_codes=codes,
        summary=summary,
    )

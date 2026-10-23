"""Function tools the agents can call.

Each tool:
  1. reads shared state from `RunContextWrapper[CaseContext]`,
  2. calls the ERP / DB through the trimmed client,
  3. stores the typed result on the context (source of truth for the engines),
  4. returns a SMALL JSON string to the model (only the fields it needs).
"""

import json

from agents import RunContextWrapper, function_tool

from backend.app.agents.context import CaseContext


@function_tool
async def get_purchase_order(ctx: RunContextWrapper[CaseContext], po_number: str) -> str:
    """Look up a purchase order in the ERP.

    Args:
        po_number: The purchase order number, e.g. PO-1001.
    """
    case = ctx.context
    case.purchase_order = await case.erp.get_purchase_order(po_number)
    case.log("Match Agent", "tool.get_purchase_order", po_number=po_number)
    if case.purchase_order is None:
        return json.dumps({"found": False, "po_number": po_number})
    return case.purchase_order.model_dump_json()


@function_tool
async def get_goods_receipts(ctx: RunContextWrapper[CaseContext], po_number: str) -> str:
    """List the goods receipts posted against a purchase order.

    Args:
        po_number: The purchase order number, e.g. PO-1001.
    """
    case = ctx.context
    case.goods_receipts = await case.erp.get_goods_receipts(po_number)
    case.log("Match Agent", "tool.get_goods_receipts", po_number=po_number)
    return json.dumps([receipt.model_dump() for receipt in case.goods_receipts])


@function_tool
async def get_vendor(ctx: RunContextWrapper[CaseContext], vendor_id: str) -> str:
    """Read the vendor master record (name, IBAN on file, blocked flag).

    Args:
        vendor_id: The vendor id, e.g. V-100.
    """
    case = ctx.context
    case.vendor = await case.erp.get_vendor(vendor_id)
    case.log("Risk Agent", "tool.get_vendor", vendor_id=vendor_id)
    if case.vendor is None:
        return json.dumps({"found": False, "vendor_id": vendor_id})
    # Mask the IBAN for the model - it only needs to know whether it matches.
    data = case.vendor.model_dump()
    data["iban"] = "****" + data["iban"][-4:]
    return json.dumps(data)


@function_tool
def find_duplicate_invoice(
    ctx: RunContextWrapper[CaseContext], invoice_number: str, vendor_id: str
) -> str:
    """Check whether this vendor's invoice number was already processed.

    Args:
        invoice_number: The supplier's invoice number.
        vendor_id: The vendor id.
    """
    case = ctx.context
    case.duplicate = case.is_duplicate(invoice_number, vendor_id)
    case.log("Risk Agent", "tool.find_duplicate_invoice", duplicate=case.duplicate)
    return json.dumps({"duplicate": case.duplicate})

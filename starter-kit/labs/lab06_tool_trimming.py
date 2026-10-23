"""Lab 06 - Tool-output bloat: filter at the wrapper, keep a trim audit log.

Run: python labs/lab06_tool_trimming.py
"""

import json

raw_po = {
    "__metadata": {
        "uri": "https://erp.example/odata/PurchaseOrders('PO-1001')",
        "type": "API_PO.A_PurchaseOrder",
        "etag": 'W/"2026"',
    },
    "PurchaseOrder": "PO-1001",
    "CompanyCode": "1010",
    "PurchaseOrderType": "NB",
    "PurchasingOrganization": "1010",
    "PurchasingGroup": "001",
    "Supplier": "V-100",
    "SupplierName": "Acme Industrial Supplies",
    "DocumentCurrency": "EUR",
    "PaymentTerms": "0001",
    "CashDiscount1Days": "14",
    "CashDiscount1Percent": "2.000",
    "IncotermsClassification": "FCA",
    "IncotermsLocation1": "Hamburg",
    "CreatedByUser": "PURCH_01",
    "CreationDate": "/Date(1759276800000)/",
    "LastChangeDateTime": "20261001093011.1234560",
    "PurchaseOrderDate": "/Date(1759276800000)/",
    "Language": "EN",
    "ReleaseIsNotCompleted": False,
    "PurchasingCompletenessStatus": False,
    "ValidityStartDate": None,
    "ValidityEndDate": None,
    "to_PurchaseOrderItem": {
        "results": [
            {
                "PurchaseOrderItem": "10",
                "Material": "GLV-01",
                "PurchaseOrderItemText": "Safety gloves",
                "Plant": "1010",
                "StorageLocation": "0001",
                "OrderQuantity": "100",
                "PurchaseOrderQuantityUnit": "PC",
                "NetPriceAmount": "4.50",
                "NetPriceQuantity": "1",
                "TaxCode": "V1",
                "AccountAssignmentCategory": "K",
                "IsCompletelyDelivered": True,
                "IsFinallyInvoiced": False,
                "GoodsReceiptIsExpected": True,
                "InvoiceIsExpected": True,
            },
            {
                "PurchaseOrderItem": "20",
                "Material": "HLM-02",
                "PurchaseOrderItemText": "Safety helmet",
                "Plant": "1010",
                "StorageLocation": "0001",
                "OrderQuantity": "50",
                "PurchaseOrderQuantityUnit": "PC",
                "NetPriceAmount": "22.00",
                "NetPriceQuantity": "1",
                "TaxCode": "V1",
                "AccountAssignmentCategory": "K",
                "IsCompletelyDelivered": True,
                "IsFinallyInvoiced": False,
                "GoodsReceiptIsExpected": True,
                "InvoiceIsExpected": True,
            },
        ]
    },
}

KEEP_HEADER = {
    "PurchaseOrder": "po_number",
    "Supplier": "vendor_id",
    "DocumentCurrency": "currency",
}
KEEP_ITEM = {"Material": "sku", "OrderQuantity": "qty", "NetPriceAmount": "unit_price"}


def trim(po: dict, audit: list[str]) -> dict:
    """Field-level filtering: a fixed allow-list, applied BEFORE the data enters the model's context."""
    out = {new: po[old] for old, new in KEEP_HEADER.items()}
    audit += [k for k in po if k not in KEEP_HEADER and k != "to_PurchaseOrderItem"]
    out["lines"] = []
    for item in po["to_PurchaseOrderItem"]["results"]:
        out["lines"].append(
            {
                new: (float(item[old]) if old != "Material" else item[old])
                for old, new in KEEP_ITEM.items()
            }
        )
        audit += [f"item.{k}" for k in item if k not in KEEP_ITEM]
    return out


audit_log: list[str] = []
trimmed = trim(raw_po, audit_log)
raw_txt, trim_txt = json.dumps(raw_po), json.dumps(trimmed)
print("TRIMMED (what the agent sees):\n", json.dumps(trimmed, indent=2))
print(
    f"\nraw ≈ {len(raw_txt) // 4} tokens  ->  trimmed ≈ {len(trim_txt) // 4} tokens "
    f"({100 - len(trim_txt) * 100 // len(raw_txt)}% less)"
)
print(
    f"Trim audit log: dropped {len(set(audit_log))} distinct fields, e.g. {sorted(set(audit_log))[:6]}"
)
print("\nIn a 5-call workflow the untrimmed version stacks 5 layers of noise in context.")

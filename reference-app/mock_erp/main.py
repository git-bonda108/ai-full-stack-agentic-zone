"""Mock ERP: a tiny SAP-OData-style API with deliberately verbose payloads.

Real ERPs (SAP S/4HANA, Oracle, Dynamics 365) return dozens of fields per
entity. Our agents need about five. That gap is the "tool-output bloat"
problem from the context-engineering module, and erp_client.py trims it.

Run:  uvicorn mock_erp.main:app --reload --port 8001
"""

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query

DATA_DIR = Path(__file__).parent / "data"


def _load(name: str) -> list[dict[str, Any]]:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


VENDORS = {row["Supplier"]: row for row in _load("vendors.json")}
PURCHASE_ORDERS = {row["PurchaseOrder"]: row for row in _load("purchase_orders.json")}
GOODS_RECEIPTS = _load("goods_receipts.json")

app = FastAPI(title="Mock ERP (SAP-OData style)", version="1.0.0")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "service": "mock-erp"}


# OData addresses a single entity as Entity('key'), e.g. /odata/Vendors('V-100')
@app.get("/odata/Vendors('{vendor_id}')")
def get_vendor(vendor_id: str) -> dict[str, Any]:
    vendor = VENDORS.get(vendor_id)
    if vendor is None:
        raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")
    return {"d": vendor}


@app.get("/odata/PurchaseOrders('{po_number}')")
def get_purchase_order(po_number: str) -> dict[str, Any]:
    purchase_order = PURCHASE_ORDERS.get(po_number)
    if purchase_order is None:
        raise HTTPException(status_code=404, detail=f"Purchase order {po_number} not found")
    return {"d": purchase_order}


@app.get("/odata/GoodsReceipts")
def list_goods_receipts(po: str = Query(..., description="Purchase order number")) -> dict:
    results = [row for row in GOODS_RECEIPTS if row["PurchaseOrder"] == po]
    return {"d": {"results": results, "__count": str(len(results))}}

"""ERP client with a *trim layer*.

The mock ERP returns ~40 fields per entity. The agents need about five.
Every response is trimmed with a field-level allowlist BEFORE it can reach
any model context, and every dropped field is written to a trim audit log
so over-trimming is debuggable (see the context-engineering module).
"""

import json
import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

from backend.app.schemas import GoodsReceipt, GoodsReceiptLine, PurchaseOrder, Vendor

logger = logging.getLogger("p2p.erp")

# Allowlists: the ONLY raw ERP fields that may enter the agent context.
VENDOR_FIELDS = ["Supplier", "SupplierName", "IBAN", "PaymentIsBlocked"]
PO_FIELDS = ["PurchaseOrder", "Supplier", "DocumentCurrency", "to_PurchaseOrderItem"]
PO_ITEM_FIELDS = ["Material", "PurchaseOrderItemText", "OrderQuantity", "NetPriceAmount"]
GR_FIELDS = ["MaterialDocument", "PurchaseOrder", "to_MaterialDocumentItem"]
GR_ITEM_FIELDS = ["Material", "QuantityInEntryUnit"]


def approx_tokens(payload: Any) -> int:
    """Rough token estimate: ~4 characters per token for English/JSON."""
    return max(1, len(json.dumps(payload, default=str)) // 4)


@dataclass
class TrimRecord:
    entity: str
    key: str
    kept: list[str]
    dropped: list[str]
    tokens_before: int
    tokens_after: int


@dataclass
class TrimAuditLog:
    """In-memory record of what the trim layer discarded (also logged as JSON)."""

    records: list[TrimRecord] = field(default_factory=list)

    def add(self, record: TrimRecord) -> None:
        self.records.append(record)
        logger.info(
            "erp.trim",
            extra={
                "entity": record.entity,
                "key": record.key,
                "dropped_fields": len(record.dropped),
                "tokens_before": record.tokens_before,
                "tokens_after": record.tokens_after,
            },
        )

    @property
    def tokens_saved(self) -> int:
        return sum(r.tokens_before - r.tokens_after for r in self.records)


def trim(raw: dict[str, Any], allowlist: list[str]) -> tuple[dict[str, Any], list[str]]:
    """Keep only allowlisted keys. Returns (trimmed, dropped_keys)."""
    kept = {key: raw[key] for key in allowlist if key in raw}
    dropped = [key for key in raw if key not in allowlist]
    return kept, dropped


class ErpClient:
    """Typed, trimmed access to the ERP. Pass `transport` in tests to run in-process."""

    def __init__(
        self,
        base_url: str,
        transport: httpx.AsyncBaseTransport | None = None,
        timeout_s: float = 10.0,
        audit_log: TrimAuditLog | None = None,
    ) -> None:
        self._client = httpx.AsyncClient(base_url=base_url, transport=transport, timeout=timeout_s)
        self.audit_log = audit_log or TrimAuditLog()

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str, params: dict[str, str] | None = None) -> dict[str, Any] | None:
        response = await self._client.get(path, params=params)
        if response.status_code == 404:
            return None
        response.raise_for_status()
        return response.json()["d"]

    def _record(self, entity: str, key: str, raw: Any, trimmed: Any, dropped: list[str]) -> None:
        self.audit_log.add(
            TrimRecord(
                entity=entity,
                key=key,
                kept=list(trimmed.keys()) if isinstance(trimmed, dict) else [],
                dropped=dropped,
                tokens_before=approx_tokens(raw),
                tokens_after=approx_tokens(trimmed),
            )
        )

    async def get_vendor(self, vendor_id: str) -> Vendor | None:
        raw = await self._get(f"/odata/Vendors('{vendor_id}')")
        if raw is None:
            return None
        trimmed, dropped = trim(raw, VENDOR_FIELDS)
        self._record("Vendor", vendor_id, raw, trimmed, dropped)
        return Vendor(
            vendor_id=trimmed["Supplier"],
            name=trimmed["SupplierName"],
            iban=trimmed["IBAN"],
            blocked=bool(trimmed["PaymentIsBlocked"]),
        )

    async def get_purchase_order(self, po_number: str) -> PurchaseOrder | None:
        raw = await self._get(f"/odata/PurchaseOrders('{po_number}')")
        if raw is None:
            return None
        trimmed, dropped = trim(raw, PO_FIELDS)
        items = []
        for item in trimmed["to_PurchaseOrderItem"]["results"]:
            kept_item, dropped_item = trim(item, PO_ITEM_FIELDS)
            dropped.extend(f"item.{key}" for key in dropped_item if f"item.{key}" not in dropped)
            items.append(kept_item)
        trimmed["to_PurchaseOrderItem"] = items
        self._record("PurchaseOrder", po_number, raw, trimmed, dropped)
        return PurchaseOrder(
            po_number=trimmed["PurchaseOrder"],
            vendor_id=trimmed["Supplier"],
            currency=trimmed["DocumentCurrency"],
            lines=[
                {
                    "sku": item["Material"],
                    "description": item["PurchaseOrderItemText"],
                    "qty": float(item["OrderQuantity"]),
                    "unit_price": float(item["NetPriceAmount"]),
                }
                for item in items
            ],
        )

    async def get_goods_receipts(self, po_number: str) -> list[GoodsReceipt]:
        raw = await self._get("/odata/GoodsReceipts", params={"po": po_number})
        if raw is None:
            return []
        receipts: list[GoodsReceipt] = []
        for row in raw["results"]:
            trimmed, dropped = trim(row, GR_FIELDS)
            items = []
            for item in trimmed["to_MaterialDocumentItem"]["results"]:
                kept_item, dropped_item = trim(item, GR_ITEM_FIELDS)
                dropped.extend(f"item.{k}" for k in dropped_item if f"item.{k}" not in dropped)
                items.append(kept_item)
            trimmed["to_MaterialDocumentItem"] = items
            self._record("GoodsReceipt", trimmed["MaterialDocument"], row, trimmed, dropped)
            receipts.append(
                GoodsReceipt(
                    gr_number=trimmed["MaterialDocument"],
                    po_number=trimmed["PurchaseOrder"],
                    lines=[
                        GoodsReceiptLine(
                            sku=item["Material"], qty_received=float(item["QuantityInEntryUnit"])
                        )
                        for item in items
                    ],
                )
            )
        return receipts

    async def ping(self) -> bool:
        try:
            response = await self._client.get("/healthz")
            return response.status_code == 200
        except httpx.HTTPError:
            return False

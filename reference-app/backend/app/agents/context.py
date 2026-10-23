"""CaseContext: the shared, *local* state of one invoice run.

It is passed to `Runner.run(..., context=ctx)` and reaches tools as
`RunContextWrapper[CaseContext]`. It is NOT sent to the model - only what a
tool chooses to return enters the model's context window.
"""

from collections.abc import Callable
from dataclasses import dataclass, field

from backend.app.config import Settings
from backend.app.integrations.erp_client import ErpClient
from backend.app.schemas import (
    ExtractedInvoice,
    GoodsReceipt,
    PolicyOutcome,
    PurchaseOrder,
    Vendor,
)


@dataclass
class TokenUsage:
    input_tokens: int = 0
    output_tokens: int = 0

    def add(self, input_tokens: int, output_tokens: int) -> None:
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens


@dataclass
class CaseContext:
    settings: Settings
    erp: ErpClient
    raw_text: str
    # Callable(invoice_number, vendor_id) -> bool, injected by the API layer (DB lookup)
    is_duplicate: Callable[[str, str], bool]
    invoice: ExtractedInvoice | None = None
    purchase_order: PurchaseOrder | None = None
    goods_receipts: list[GoodsReceipt] = field(default_factory=list)
    vendor: Vendor | None = None
    duplicate: bool = False
    # Set by the deterministic policy before the Resolution Agent runs
    outcome: PolicyOutcome | None = None
    # Every step appends (actor, action, payload) - persisted as AuditEvents
    steps: list[tuple[str, str, dict]] = field(default_factory=list)
    usage: TokenUsage = field(default_factory=TokenUsage)

    def log(self, actor: str, action: str, **payload: object) -> None:
        self.steps.append((actor, action, dict(payload)))

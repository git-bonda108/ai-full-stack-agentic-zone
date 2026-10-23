"""Lab 01 - Tokens: the same facts cost different amounts in different formats.

Run: python labs/lab01_tokens.py
Uses tiktoken if installed (pip install tiktoken), otherwise the ~4 chars/token rule.
"""

import json

try:
    import tiktoken

    _enc = tiktoken.get_encoding("o200k_base")

    def count(text: str) -> int:
        return len(_enc.encode(text))

    METHOD = "tiktoken o200k_base"
except ImportError:

    def count(text: str) -> int:
        # ~4 ASCII characters per token; non-Latin scripts cost roughly a token per character or more.
        ascii_chars = sum(1 for ch in text if ord(ch) < 128)
        return max(1, round(ascii_chars / 4) + (len(text) - ascii_chars))

    METHOD = (
        "estimate: ASCII chars / 4 + 1 per non-ASCII char (pip install tiktoken for exact counts)"
    )

invoice = {
    "invoice_number": "INV-A-001",
    "vendor_id": "V-100",
    "po_number": "PO-1001",
    "currency": "EUR",
    "lines": [
        {"sku": "GLV-01", "description": "Safety gloves", "qty": 100, "unit_price": 4.50},
        {"sku": "HLM-02", "description": "Safety helmet", "qty": 50, "unit_price": 22.00},
    ],
    "total": 1550.00,
}

formats = {
    "Pretty JSON": json.dumps(invoice, indent=2),
    "Compact JSON": json.dumps(invoice, separators=(",", ":")),
    "Key: value lines": "\n".join(
        [f"{k}: {v}" for k, v in invoice.items() if k != "lines"]
        + [
            f"- {ln['sku']} {ln['description']} x{ln['qty']} @ {ln['unit_price']}"
            for ln in invoice["lines"]
        ]
    ),
    "English prose": (
        "Invoice INV-A-001 from vendor V-100 against purchase order PO-1001, in euros: "
        "100 safety gloves (GLV-01) at 4.50 and 50 safety helmets (HLM-02) at 22.00, total 1550.00."
    ),
    "Hindi prose": "विक्रेता V-100 का चालान INV-A-001, खरीद आदेश PO-1001: 100 सुरक्षा दस्ताने 4.50 पर, 50 हेलमेट 22.00 पर, कुल 1550.00 यूरो।",
}

print(f"Token counting method: {METHOD}\n")
print(f"{'Format':<18}{'chars':>7}{'tokens':>8}")
for name, text in formats.items():
    print(f"{name:<18}{len(text):>7}{count(text):>8}")

daily = 5000
pretty, compact = count(formats["Pretty JSON"]), count(formats["Compact JSON"])
print(
    f"\nAt {daily:,} invoices/day, compact JSON saves {(pretty - compact) * daily:,} input tokens/day."
)
print("Takeaway: format is a cost and context-budget decision, not just style.")

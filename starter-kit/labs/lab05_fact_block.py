"""Lab 05 - Why summaries lose facts, and the extract-first fix.

Run: python labs/lab05_fact_block.py
"""

import re

turns = [
    "User: The approval threshold is 10000 EUR, agreed with Daniel from AP.",
    "Assistant: Noted. I'll route anything above that to a human.",
    "User: Use Jira project AP. The tolerance story is AP-12.",
    "User: Vendor V-300 Globex is blocked; reject its invoices.",
    "User: Actually change the price tolerance from 2% to 1.5%.",
]


def naive_summary(history: list[str]) -> str:
    # What a summariser tends to produce: fluent, but specifics are gone.
    return (
        "We discussed approval rules, a Jira project, a blocked vendor and adjusted the tolerance."
    )


FACT_PATTERNS = {
    "approval_threshold": r"threshold is (\d+)",
    "jira_project": r"Jira project (\w+)",
    "stories": r"\b([A-Z]{2,}-\d+)\b",
    "blocked_vendors": r"Vendor (V-\d+)[^;]*blocked",
    "price_tolerance_pct": r"tolerance from [\d.]+% to ([\d.]+)%",
}


def extract_facts(turn: str, block: dict, log: list[str]) -> None:
    for key, pattern in FACT_PATTERNS.items():
        for value in re.findall(pattern, turn):
            if key in ("stories", "blocked_vendors"):
                block.setdefault(key, [])
                if value not in block[key]:
                    block[key].append(value)  # append-only
            else:
                if key in block and block[key] != value:
                    log.append(f"{key}: {block[key]} -> {value}")  # replace-on-conflict, logged
                block[key] = value


block: dict = {"price_tolerance_pct": "2.0"}
conflicts: list[str] = []
for t in turns:
    extract_facts(t, block, conflicts)  # 1) extract first

summary = naive_summary(turns)  # 2) then summarise

print("SUMMARY ONLY (what the model would see after /compact):\n ", summary)
print("\nPERSISTENT FACT BLOCK (injected as a system block every request):")
for k, v in block.items():
    print(f"  {k}: {v}")
print("\nCONFLICT LOG:", conflicts)
print(
    "\nQ: What is the approval threshold?  Summary-only answer: unknown.  With block:",
    block["approval_threshold"],
)
print("Remember: the block is useless unless the prompt tells the model to consult it.")

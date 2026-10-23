"""PreCompact hook: extract-first. Pull hard facts from the transcript before it is summarised.

Summaries drop identifiers and numbers. This hook scans the transcript for
IDs (Jira keys, POs, invoices, vendors, ADRs) and appends them to the
persistent fact block in docs/session-facts.md, which SessionStart re-injects
after compaction.
"""

import json
import re
from pathlib import Path

from _common import emit, now, project_dir, read_event

PATTERNS = {
    "Jira keys": r"\b[A-Z][A-Z0-9]{1,9}-\d{1,5}\b",
    "Purchase orders": r"\bPO-\d{4}\b",
    "Invoices": r"\bINV-[A-Z]-\d{3}\b",
    "Vendors": r"\bV-\d{3}\b",
    "ADRs": r"\bADR-\d{4}\b",
}


def transcript_text(path: str, limit: int = 2_000_000) -> str:
    p = Path(path) if path else None
    if not p or not p.exists():
        return ""
    chunks = []
    with open(p, encoding="utf-8", errors="ignore") as f:
        for line in f:
            try:
                msg = json.loads(line).get("message", {})
            except json.JSONDecodeError:
                continue
            content = msg.get("content")
            if isinstance(content, str):
                chunks.append(content)
            elif isinstance(content, list):
                chunks.extend(part.get("text", "") for part in content if isinstance(part, dict))
    return "\n".join(chunks)[-limit:]


def main() -> None:
    event = read_event()
    text = transcript_text(event.get("transcript_path", ""))
    found = {}
    for label, pattern in PATTERNS.items():
        values = sorted(set(re.findall(pattern, text)))
        if label == "Jira keys":
            values = [
                v for v in values if not v.startswith(("PO-", "INV-", "V-", "ADR-", "GR-", "UTF-"))
            ]
        if values:
            found[label] = values[:40]

    facts = project_dir(event) / "docs" / "session-facts.md"
    if found and facts.exists():
        lines = [f"\n### {now()} ({event.get('trigger', 'auto')} compact)"]
        lines += [f"- {label}: {', '.join(values)}" for label, values in found.items()]
        with open(facts, "a", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
    emit(
        {
            "systemMessage": f"PreCompact: saved {sum(len(v) for v in found.values())} identifiers to docs/session-facts.md"
        }
    )


if __name__ == "__main__":
    main()

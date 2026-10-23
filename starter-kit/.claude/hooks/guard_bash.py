"""PreToolUse hook (Bash): deny destructive or secret-leaking shell commands, ask on risky ones."""

import re

from _common import emit, ledger, read_event

DENY = [
    (
        r"\brm\s+-[a-zA-Z]*r[a-zA-Z]*f?\s+(/|~|\*|\.\s*$|\.\.)",
        "Recursive delete of a root, home or parent path",
    ),
    (r"\bgit\s+push\b.*(--force|-f\b)", "Force push rewrites shared history"),
    (r"\bgit\s+push\b.*\b(main|master)\b", "Push to main/master - open a PR instead"),
    (r"\bgit\s+reset\s+--hard\b", "Hard reset discards work"),
    (r"(?i)\bdrop\s+(table|database)\b", "Dropping tables/databases"),
    (
        r"\b(cat|less|more|head|tail|type)\b[^|;&]*\.env\b(?!\.example)",
        "Reading .env would leak secrets into the context window",
    ),
    (r"\b(printenv|env)\s*$", "Dumping all environment variables leaks secrets"),
    (r"curl[^|]*\|\s*(sudo\s+)?(ba|z)?sh\b", "Piping a download straight into a shell"),
    (r"\baz\s+group\s+delete\b", "Deleting a resource group - run it yourself in a terminal"),
]

ASK = [
    (r"\baz\s+\S+.*\s(delete|purge)\b", "Deletes an Azure resource"),
    (r"\bdocker\s+(system|image|volume)\s+prune\b", "Prunes Docker data"),
    (r"\bpip\s+install\b(?!.*-r\s)", "Installs a package that is not in requirements files"),
]


def main() -> None:
    event = read_event()
    command = (event.get("tool_input") or {}).get("command", "")
    for pattern, reason in DENY:
        if re.search(pattern, command):
            ledger(
                event,
                {
                    "event": "PreToolUse",
                    "tool": "Bash",
                    "decision": "deny",
                    "command": command[:200],
                    "reason": reason,
                },
            )
            emit(
                {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": f"Blocked by project hook: {reason}. Suggest a safer alternative.",
                    }
                }
            )
    for pattern, reason in ASK:
        if re.search(pattern, command):
            emit(
                {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "ask",
                        "permissionDecisionReason": f"Project hook: {reason}. Confirm you want this.",
                    }
                }
            )
    emit({})


if __name__ == "__main__":
    main()

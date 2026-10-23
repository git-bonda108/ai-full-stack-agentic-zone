"""PostToolUse hook (Edit|Write): auto-format Python and record AI provenance.

Every file Claude writes is logged to .ai-trace/ledger.jsonl, which is the
raw material for explaining "which files did the AI create, and why".
"""

import shutil
import subprocess

from _common import ledger, read_event


def main() -> None:
    event = read_event()
    tool_input = event.get("tool_input") or {}
    file_path = tool_input.get("file_path", "")
    formatted = False
    if file_path.endswith(".py") and shutil.which("ruff"):
        subprocess.run(["ruff", "format", "--quiet", file_path], capture_output=True, timeout=30)
        subprocess.run(
            ["ruff", "check", "--fix", "--quiet", file_path], capture_output=True, timeout=30
        )
        formatted = True
    ledger(
        event,
        {
            "event": "PostToolUse",
            "tool": event.get("tool_name"),
            "file": file_path,
            "formatted": formatted,
        },
    )


if __name__ == "__main__":
    main()

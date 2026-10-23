"""SessionStart hook: inject branch, venv status and the persistent fact block as context.

Fires on startup, resume, /clear and after /compact, so the fact block is
re-injected even after the conversation history was summarised.
"""

import os
import subprocess

from _common import emit, project_dir, read_event


def git(*args: str) -> str:
    try:
        out = subprocess.run(["git", *args], capture_output=True, text=True, timeout=5)
        return out.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        return ""


def main() -> None:
    event = read_event()
    root = project_dir(event)
    branch = git("rev-parse", "--abbrev-ref", "HEAD") or "(not a git repo yet)"
    changed = len([line for line in git("status", "--porcelain").splitlines() if line.strip()])
    venv = os.environ.get("VIRTUAL_ENV")
    facts_file = root / "docs" / "session-facts.md"
    facts = (
        facts_file.read_text(encoding="utf-8")[:4000]
        if facts_file.exists()
        else "(no docs/session-facts.md yet)"
    )

    context = (
        f"Session source: {event.get('source', 'startup')}\n"
        f"Git branch: {branch} ({changed} changed files)\n"
        f"Python venv: {'active: ' + venv if venv else 'NOT active - remind the user to activate .venv before running Python'}\n\n"
        "Persistent fact block (authoritative - consult before answering, keep it updated):\n"
        f"{facts}"
    )
    emit({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": context}})


if __name__ == "__main__":
    main()

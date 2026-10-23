"""Shared helpers for the Claude Code hooks in this folder (stdlib only)."""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


def read_event() -> dict:
    """Claude Code sends the hook event as one JSON object on stdin."""
    try:
        return json.load(sys.stdin)
    except json.JSONDecodeError:
        return {}


def project_dir(event: dict) -> Path:
    """Project root: $CLAUDE_PROJECT_DIR, falling back to the event's cwd."""
    return Path(os.environ.get("CLAUDE_PROJECT_DIR") or event.get("cwd") or ".").resolve()


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def ledger(event: dict, record: dict) -> None:
    """Append one line to the AI provenance ledger (.ai-trace/ledger.jsonl)."""
    trace = project_dir(event) / ".ai-trace"
    trace.mkdir(exist_ok=True)
    line = {"ts": now(), "session": event.get("session_id", "")[:8], **record}
    with open(trace / "ledger.jsonl", "a", encoding="utf-8") as f:
        f.write(json.dumps(line) + "\n")


def emit(payload: dict) -> None:
    """Print a JSON decision for Claude Code and exit 0."""
    print(json.dumps(payload))
    sys.exit(0)

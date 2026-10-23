"""PreToolUse hook (Edit|Write): protect secrets, generated evidence and the human-owned spec."""

from pathlib import PurePosixPath

from _common import emit, ledger, read_event

DENY_NAMES = {".env", ".env.local", ".env.production"}
DENY_SUFFIXES = {".pem", ".key", ".pfx", ".db", ".sqlite"}
DENY_PARTS = {".git", ".venv", "node_modules"}
ASK_PATHS = {"docs/SPEC.md", "CLAUDE.md", ".claude/settings.json"}


def main() -> None:
    event = read_event()
    raw = (event.get("tool_input") or {}).get("file_path", "")
    path = PurePosixPath(raw.replace("\\", "/"))
    rel = str(path)
    root = event.get("cwd", "").replace("\\", "/").rstrip("/") + "/"
    if rel.startswith(root):
        rel = rel[len(root) :]

    reason = None
    if path.name in DENY_NAMES:
        reason = "secret files are never edited by the AI; edit .env.example instead"
    elif path.suffix in DENY_SUFFIXES:
        reason = f"{path.suffix} files are keys or databases, not source"
    elif DENY_PARTS & set(path.parts):
        reason = "tooling folders are managed by git/pip/npm, not edited by hand"
    if reason:
        ledger(
            event,
            {
                "event": "PreToolUse",
                "tool": event.get("tool_name"),
                "decision": "deny",
                "file": rel,
            },
        )
        emit(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"Blocked by project hook: {reason}.",
                }
            }
        )
    if rel in ASK_PATHS:
        emit(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "ask",
                    "permissionDecisionReason": f"{rel} is owned by the humans on the team. Approve this change?",
                }
            }
        )
    emit({})


if __name__ == "__main__":
    main()

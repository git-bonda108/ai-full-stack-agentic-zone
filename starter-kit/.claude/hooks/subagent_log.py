"""SubagentStart / SubagentStop hook: log sub-agent lifecycle to see orchestration happen."""

from _common import ledger, read_event


def main() -> None:
    event = read_event()
    ledger(
        event,
        {
            "event": event.get("hook_event_name"),
            "agent_type": event.get("agent_type"),
            "agent_id": (event.get("agent_id") or "")[:8],
            "summary": (event.get("last_assistant_message") or "")[:160],
        },
    )


if __name__ == "__main__":
    main()

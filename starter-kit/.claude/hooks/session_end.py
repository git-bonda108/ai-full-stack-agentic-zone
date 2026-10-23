"""SessionEnd hook: write a one-line session record for traceability."""

from _common import ledger, read_event


def main() -> None:
    event = read_event()
    ledger(event, {"event": "SessionEnd", "reason": event.get("reason")})


if __name__ == "__main__":
    main()

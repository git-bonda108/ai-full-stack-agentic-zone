"""UserPromptSubmit hook: block prompts that contain secrets before they reach the model."""

import re

from _common import emit, ledger, read_event

SECRET_PATTERNS = {
    "OpenAI-style API key": r"\bsk-[A-Za-z0-9_\-]{20,}",
    "Anthropic API key": r"\bsk-ant-[A-Za-z0-9_\-]{20,}",
    "AWS access key": r"\bAKIA[0-9A-Z]{16}\b",
    "Atlassian API token": r"\bATATT[A-Za-z0-9_\-=]{20,}",
    "GitHub token": r"\bgh[pousr]_[A-Za-z0-9]{30,}",
    "Private key": r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
    "Password assignment": r"(?i)\bpassword\s*[:=]\s*\S{6,}",
    "Connection string with key": r"(?i)(AccountKey|InstrumentationKey|SharedAccessKey)=[A-Za-z0-9+/=\-]{16,}",
}


def main() -> None:
    event = read_event()
    prompt = event.get("prompt", "")
    hits = [name for name, pattern in SECRET_PATTERNS.items() if re.search(pattern, prompt)]
    if hits:
        ledger(event, {"event": "UserPromptSubmit", "blocked": True, "reason": hits})
        emit(
            {
                "decision": "block",
                "reason": (
                    f"Blocked: your prompt looks like it contains a secret ({', '.join(hits)}). "
                    "Put secrets in .env or a secret store and refer to them by name, e.g. JIRA_API_TOKEN."
                ),
            }
        )
    emit({})


if __name__ == "__main__":
    main()

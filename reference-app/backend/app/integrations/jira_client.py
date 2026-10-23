"""Jira Cloud integration (REST API v3).

With JIRA_BASE_URL / JIRA_EMAIL / JIRA_API_TOKEN set, a real issue is created.
Without them we run in *dry-run* mode: the exact request body is written to
var/outbox/<key>.json so you can inspect it (and nothing leaves your machine).
"""

import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx

from backend.app.config import Settings

logger = logging.getLogger("p2p.jira")
OUTBOX_DIR = Path("var/outbox")


def to_adf(text: str) -> dict[str, Any]:
    """Jira v3 descriptions use Atlassian Document Format (ADF), not plain text."""
    paragraphs = [p for p in text.split("\n") if p.strip()]
    return {
        "type": "doc",
        "version": 1,
        "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": paragraph}]}
            for paragraph in paragraphs
        ],
    }


def build_issue_payload(
    project_key: str, summary: str, description: str, labels: list[str]
) -> dict[str, Any]:
    return {
        "fields": {
            "project": {"key": project_key},
            "issuetype": {"name": "Task"},
            "summary": summary[:250],
            "description": to_adf(description),
            "labels": [label.replace(" ", "-") for label in labels],
        }
    }


class JiraClient:
    def __init__(self, settings: Settings, transport: httpx.AsyncBaseTransport | None = None):
        self.settings = settings
        self._transport = transport

    async def create_issue(self, summary: str, description: str, labels: list[str]) -> str:
        """Create an issue and return its key (e.g. AP-42, or DRYRUN-... in dry-run mode)."""
        payload = build_issue_payload(self.settings.jira_project_key, summary, description, labels)
        if not self.settings.jira_enabled:
            return self._write_outbox(payload)

        async with httpx.AsyncClient(
            base_url=self.settings.jira_base_url,
            auth=(self.settings.jira_email, self.settings.jira_api_token),
            transport=self._transport,
            timeout=15.0,
        ) as client:
            response = await client.post("/rest/api/3/issue", json=payload)
            response.raise_for_status()
            key = response.json()["key"]
            logger.info("jira.issue_created", extra={"jira_key": key})
            return key

    def _write_outbox(self, payload: dict[str, Any]) -> str:
        OUTBOX_DIR.mkdir(parents=True, exist_ok=True)
        key = "DRYRUN-" + datetime.now(UTC).strftime("%Y%m%d%H%M%S%f")
        (OUTBOX_DIR / f"{key}.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
        logger.info("jira.dry_run", extra={"jira_key": key})
        return key

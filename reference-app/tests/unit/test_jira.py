import json

import httpx

from backend.app.config import Settings
from backend.app.integrations.jira_client import JiraClient, build_issue_payload, to_adf


def test_adf_paragraphs():
    doc = to_adf("line one\n\nline two")
    assert doc["type"] == "doc" and len(doc["content"]) == 2


def test_payload_shape():
    payload = build_issue_payload("AP", "summary", "desc", ["a b"])
    assert payload["fields"]["project"]["key"] == "AP"
    assert payload["fields"]["labels"] == ["a-b"]


async def test_dry_run_writes_outbox(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    key = await JiraClient(Settings(_env_file=None)).create_issue("s", "d", ["x"])
    assert key.startswith("DRYRUN-")
    written = json.loads((tmp_path / "var/outbox" / f"{key}.json").read_text())
    assert written["fields"]["summary"] == "s"


async def test_real_call_uses_rest_v3():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["path"] = request.url.path
        seen["auth"] = request.headers.get("authorization", "")
        return httpx.Response(201, json={"key": "AP-42"})

    settings = Settings(
        _env_file=None,
        jira_base_url="https://example.atlassian.net",
        jira_email="me@example.com",
        jira_api_token="token",
    )
    key = await JiraClient(settings, transport=httpx.MockTransport(handler)).create_issue(
        "s", "d", []
    )
    assert key == "AP-42"
    assert seen["path"] == "/rest/api/3/issue"
    assert seen["auth"].startswith("Basic ")

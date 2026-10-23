"""Shared test fixtures.

The mock ERP runs IN-PROCESS: httpx.ASGITransport routes the API's HTTP
calls straight into the mock_erp FastAPI app - no ports, no network.
"""

from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app.config import Settings
from backend.app.main import create_app
from mock_erp.main import app as erp_app

SAMPLES = Path(__file__).resolve().parents[1] / "data" / "sample_invoices"


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        _env_file=None,
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        erp_base_url="http://erp.test",
        llm_provider="offline",
        jira_base_url="",
    )


@pytest.fixture
def erp_transport() -> httpx.ASGITransport:
    return httpx.ASGITransport(app=erp_app)


@pytest.fixture
def client(settings: Settings, erp_transport, tmp_path, monkeypatch) -> TestClient:
    monkeypatch.chdir(tmp_path)  # dry-run Jira outbox goes to tmp_path/var/outbox
    app = create_app(settings=settings, erp_transport=erp_transport)
    with TestClient(app) as test_client:
        yield test_client


def sample(name: str) -> str:
    return (SAMPLES / f"{name}.txt").read_text(encoding="utf-8")

"""FastAPI dependencies (the Python equivalent of constructor injection)."""

from collections.abc import AsyncIterator

from fastapi import Request

from backend.app.config import Settings
from backend.app.integrations.erp_client import ErpClient
from backend.app.integrations.jira_client import JiraClient


def get_app_settings(request: Request) -> Settings:
    return request.app.state.settings


async def get_erp(request: Request) -> AsyncIterator[ErpClient]:
    """A fresh ERP client (and trim audit log) per request."""
    settings: Settings = request.app.state.settings
    client = ErpClient(settings.erp_base_url, transport=request.app.state.erp_transport)
    try:
        yield client
    finally:
        await client.aclose()


def get_jira(request: Request) -> JiraClient:
    return JiraClient(request.app.state.settings, transport=request.app.state.jira_transport)

"""LLM-mode wiring checks that need NO network and NO real API key.

We build every agent with a dummy key and assert the construction is right
(tools, guardrails, structured outputs). We also prove the pipeline degrades
gracefully to the deterministic path when the model call fails.
"""

import httpx

from backend.app.agents.context import CaseContext
from backend.app.agents.intake_agent import build_intake_agent
from backend.app.agents.match_agent import build_match_agent
from backend.app.agents.model_provider import get_model
from backend.app.agents.pipeline import build_llm_orchestrator, run_pipeline
from backend.app.agents.resolution_agent import build_resolution_agent
from backend.app.agents.risk_agent import build_risk_agent
from backend.app.config import Settings
from backend.app.integrations.erp_client import ErpClient
from backend.app.schemas import Decision, ExtractedInvoice, ResolutionDraft
from mock_erp.main import app as erp_app
from tests.conftest import sample


def test_agents_construct_with_expected_wiring():
    model = "gpt-4.1-mini"
    intake = build_intake_agent(model)
    assert intake.output_type is ExtractedInvoice
    assert intake.input_guardrails[0].name == "prompt_injection_tripwire"
    assert {t.name for t in build_match_agent(model).tools} == {
        "get_purchase_order",
        "get_goods_receipts",
    }
    assert {t.name for t in build_risk_agent(model).tools} == {
        "get_vendor",
        "find_duplicate_invoice",
    }
    resolution = build_resolution_agent(model)
    assert resolution.output_type is ResolutionDraft
    assert resolution.output_guardrails[0].name == "no_unauthorised_approval"
    orchestrator = build_llm_orchestrator(model)
    assert {t.name for t in orchestrator.tools} == {"match_specialist", "risk_specialist"}


def test_model_provider_variants():
    assert get_model(Settings(_env_file=None, llm_provider="offline")) is None
    assert (
        get_model(Settings(_env_file=None, llm_provider="openai", openai_api_key="sk-dummy"))
        == "gpt-4.1-mini"
    )
    azure = get_model(
        Settings(
            _env_file=None,
            llm_provider="azure",
            azure_openai_api_key="dummy",
            azure_openai_endpoint="https://example.openai.azure.com",
            azure_openai_deployment="gpt-4o-mini",
        )
    )
    assert azure is not None and azure.model == "gpt-4o-mini"


async def test_provider_failure_falls_back_to_deterministic(monkeypatch):
    """Simulate the LLM provider being down: every Runner.run raises."""

    async def boom(*args, **kwargs):
        raise ConnectionError("provider unavailable")

    monkeypatch.setattr("backend.app.agents.pipeline.Runner.run", boom)
    settings = Settings(_env_file=None, llm_provider="openai", openai_api_key="sk-dummy")
    erp = ErpClient("http://erp.test", transport=httpx.ASGITransport(app=erp_app))
    ctx = CaseContext(
        settings=settings,
        erp=erp,
        raw_text=sample("inv_b_price_variance"),
        is_duplicate=lambda *_: False,
    )
    result = await run_pipeline(ctx)
    await erp.aclose()
    assert result.outcome.decision == Decision.ROUTE_TO_HUMAN
    assert any(action == "fallback_offline" for _, action, _ in ctx.steps)

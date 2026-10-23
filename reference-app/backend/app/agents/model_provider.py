"""Pick the LLM behind every agent from configuration (LLM_PROVIDER).

offline   -> no model; the pipeline uses deterministic stand-ins (default)
openai    -> OpenAI Responses API, model = LLM_MODEL (e.g. gpt-4.1-mini)
azure     -> Azure OpenAI deployment via Chat Completions
anthropic -> Claude through LiteLLM, model = LLM_MODEL (e.g. litellm/anthropic/claude-haiku-5-5)
"""

from agents import Model, OpenAIChatCompletionsModel, set_default_openai_key, set_tracing_disabled
from openai import AsyncAzureOpenAI

from backend.app.config import Settings


def get_model(settings: Settings) -> str | Model | None:
    """Return the model object/name to pass as `Agent(model=...)`, or None for offline."""
    provider = settings.llm_provider

    if provider == "offline":
        return None

    if provider == "openai":
        if settings.openai_api_key:
            set_default_openai_key(settings.openai_api_key)
        return settings.llm_model

    # The SDK's built-in tracing exporter targets the OpenAI platform; turn it off for
    # other providers (we export our own OpenTelemetry traces to Application Insights).
    set_tracing_disabled(True)

    if provider == "azure":
        client = AsyncAzureOpenAI(
            api_key=settings.azure_openai_api_key,
            api_version=settings.azure_openai_api_version,
            azure_endpoint=settings.azure_openai_endpoint,
        )
        return OpenAIChatCompletionsModel(
            model=settings.azure_openai_deployment, openai_client=client
        )

    if provider == "anthropic":
        # Optional extra: pip install "openai-agents[litellm]"
        from agents.extensions.models.litellm_model import LitellmModel

        model_name = settings.llm_model.removeprefix("litellm/")
        return LitellmModel(model=model_name, api_key=settings.anthropic_api_key or None)

    raise ValueError(f"Unknown LLM_PROVIDER: {provider}")

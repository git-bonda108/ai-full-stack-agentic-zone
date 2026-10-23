"""Typed application settings, loaded from environment variables and `.env`.

Think of this as Spring's `application.properties` + `@ConfigurationProperties`:
every setting has a type and a default, and is overridden by an env var of the
same name (case-insensitive), e.g. `LLM_PROVIDER=openai`.
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

LlmProvider = Literal["offline", "openai", "azure", "anthropic"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "local"
    database_url: str = "sqlite:///./var/p2p_sentinel.db"
    erp_base_url: str = "http://localhost:8001"

    # LLM configuration. "offline" = deterministic stand-ins, zero cost, used by tests and evals.
    llm_provider: LlmProvider = "offline"
    llm_model: str = "gpt-4.1-mini"
    openai_api_key: str = ""
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = ""
    azure_openai_api_version: str = "2024-10-21"
    azure_openai_deployment: str = ""
    anthropic_api_key: str = ""
    # USD per 1M tokens, used only for the cost estimate on the dashboard
    llm_input_cost_per_mtok: float = 0.40
    llm_output_cost_per_mtok: float = 1.60

    # Business rules
    approval_threshold: float = 10000.0
    price_tolerance_pct: float = 2.0

    # Jira (leave blank to use the dry-run outbox in var/outbox/)
    jira_base_url: str = ""
    jira_email: str = ""
    jira_api_token: str = ""
    jira_project_key: str = "AP"

    # Observability
    applicationinsights_connection_string: str = ""

    # Comma-separated list of allowed browser origins
    cors_origins: str = "http://localhost:5173,http://localhost:8080"

    # How many invoices the batch endpoint processes at the same time
    batch_concurrency: int = 4

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def jira_enabled(self) -> bool:
        return bool(self.jira_base_url and self.jira_email and self.jira_api_token)


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (a singleton, like a Spring bean)."""
    return Settings()

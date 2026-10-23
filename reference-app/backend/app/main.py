"""FastAPI application factory.

Run locally:  uvicorn backend.app.main:app --reload --port 8000
Open docs:    http://localhost:8000/docs   (OpenAPI / Swagger UI, generated for free)
"""

from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from backend.app.api.routes import router
from backend.app.config import Settings, get_settings
from backend.app.db import create_tables, get_engine, init_engine
from backend.app.integrations.erp_client import ErpClient
from backend.app.observability import configure_logging, configure_tracing


def create_app(
    settings: Settings | None = None,
    erp_transport: httpx.AsyncBaseTransport | None = None,
    jira_transport: httpx.AsyncBaseTransport | None = None,
) -> FastAPI:
    """Build the app. Tests pass in-process transports for the ERP and Jira."""
    settings = settings or get_settings()
    configure_logging()

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        init_engine(settings.database_url)
        create_tables()
        yield
        get_engine().dispose()  # close pooled DB connections on shutdown

    app = FastAPI(
        title="P2P Sentinel API",
        version="0.1.0",
        description="Agentic invoice exception resolver",
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.erp_transport = erp_transport
    app.state.jira_transport = jira_transport

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )
    app.include_router(router)
    configure_tracing(settings, app)

    @app.get("/healthz", tags=["ops"])
    def healthz() -> dict[str, str]:
        """Liveness: the process is up."""
        return {"status": "ok"}

    @app.get("/readyz", tags=["ops"])
    async def readyz() -> dict[str, object]:
        """Readiness: dependencies (database, ERP) are reachable."""
        db_ok = True
        try:
            with get_engine().connect() as connection:
                connection.execute(text("SELECT 1"))
        except Exception:
            db_ok = False
        erp = ErpClient(settings.erp_base_url, transport=erp_transport)
        erp_ok = await erp.ping()
        await erp.aclose()
        return {
            "status": "ready" if db_ok and erp_ok else "degraded",
            "database": db_ok,
            "erp": erp_ok,
            "llm_provider": settings.llm_provider,
        }

    return app


app = create_app()

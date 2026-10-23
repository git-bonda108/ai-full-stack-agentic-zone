---
paths:
  - "backend/**/*.py"
  - "mock_erp/**/*.py"
  - "mcp_servers/**/*.py"
---
- Python 3.11+, type hints on every function, Pydantic v2 models at boundaries.
- Use `httpx.AsyncClient` with a timeout (never `requests` without one).
- Log with the module logger (`logging.getLogger(__name__)`), never `print`.
- No business rules in routers or agents; put them in `backend/app/domain/`.

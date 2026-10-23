---
name: fastapi-endpoint
description: Add or change a FastAPI endpoint in backend/app/api with Pydantic schemas, a service call and tests. Use when the user asks for a new API route, request/response model or endpoint change.
argument-hint: "[METHOD /path] [what it does]"
allowed-tools: Read Grep Glob Edit Write Bash(pytest *) Bash(ruff *)
---

# Add a FastAPI endpoint

Endpoint to build: $ARGUMENTS

1. Read `docs/SPEC.md` §10 (API) and the existing routers in `backend/app/api/`.
2. Define request/response models in `backend/app/schemas.py` (Pydantic v2,
   `model_config = ConfigDict(from_attributes=True)` for ORM output).
3. Keep the router thin: validate, call a function in `backend/app/` (service or
   pipeline), map errors to `HTTPException` with a clear `detail`.
   - 404 for unknown ids, 409 for conflicts (e.g. case already closed), 422 is automatic.
4. Use the `get_db` dependency for sessions; never create engines in a router.
5. Write tests in `tests/integration/test_<router>.py` with FastAPI `TestClient`:
   happy path, one validation error, one not-found.
6. Run `ruff check . --fix && ruff format .` then `pytest -q tests/integration` and show the output.

Checklist before you finish:
- [ ] Response model declared on the route (`response_model=`)
- [ ] No business rules in the router (they live in `backend/app/domain/`)
- [ ] OpenAPI docs at `/docs` show the new route with an example

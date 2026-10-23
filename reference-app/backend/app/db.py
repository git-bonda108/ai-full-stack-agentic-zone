"""Database engine and session factory (SQLAlchemy 2.x).

SQLite by default (zero setup); set DATABASE_URL to a PostgreSQL URL in Azure:
    postgresql+psycopg://user:password@host:5432/p2p?sslmode=require
"""

from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from backend.app.config import get_settings


class Base(DeclarativeBase):
    """Base class for all ORM entities (like a JPA @MappedSuperclass)."""


_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def _make_engine(url: str) -> Engine:
    if url.startswith("sqlite"):
        # Make sure the folder for the SQLite file exists (e.g. ./var/)
        db_path = url.split("///", 1)[-1]
        if db_path and db_path != ":memory:":
            Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(url, pool_pre_ping=True)


def init_engine(url: str | None = None) -> Engine:
    """(Re)create the engine. Tests call this with a temporary database URL."""
    global _engine, _session_factory
    _engine = _make_engine(url or get_settings().database_url)
    _session_factory = sessionmaker(bind=_engine, expire_on_commit=False)
    return _engine


def get_engine() -> Engine:
    return _engine if _engine is not None else init_engine()


def create_tables() -> None:
    from backend.app import models  # noqa: F401  (import registers the tables)

    Base.metadata.create_all(get_engine())


def new_session() -> Session:
    if _session_factory is None:
        init_engine()
    if _session_factory is None:
        raise RuntimeError("database engine could not be initialised")
    return _session_factory()


def get_session() -> Iterator[Session]:
    """FastAPI dependency: one session per request, always closed."""
    session = new_session()
    try:
        yield session
    finally:
        session.close()

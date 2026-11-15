"""Engine, session per request and table creation."""

from collections.abc import Iterator

from fastapi import Request
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    """Base of all the models."""


def create_db_engine(url: str) -> Engine:
    # FastAPI runs sync endpoints and dependencies in a thread pool.
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, connect_args=connect_args)


def create_session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, expire_on_commit=False)


def init_db(engine: Engine) -> None:
    """Create the tables that do not exist yet."""
    from app import models  # noqa: F401  (registers the models in `Base.metadata`)

    Base.metadata.create_all(engine)


def get_db(request: Request) -> Iterator[Session]:
    """One session per request, from the factory of the running app."""
    with request.app.state.session_factory() as session:
        yield session

"""FastAPI app: routers, error format, CORS and table creation at startup."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_cors_origins, get_database_url
from app.db import create_db_engine, create_session_factory, init_db
from app.errors import register_error_handlers
from app.routers import customers, simulations


def create_app(
    database_url: str | None = None, cors_origins: list[str] | None = None
) -> FastAPI:
    """Build the app. Without arguments, the configuration comes from the environment."""
    engine = create_db_engine(database_url or get_database_url())

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        init_db(engine)
        yield
        engine.dispose()

    app = FastAPI(title="SaaS-O-Matic", lifespan=lifespan)
    app.state.session_factory = create_session_factory(engine)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins or get_cors_origins(),
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_error_handlers(app)
    app.include_router(customers.router)
    app.include_router(simulations.router)
    return app


app = create_app()

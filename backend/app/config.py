"""Configuration read from environment variables (never from the code)."""

import os

DEFAULT_DATABASE_URL = "sqlite:///./saas_o_matic.db"
# Vite serves the frontend here during development.
DEFAULT_CORS_ORIGINS = "http://localhost:5173"


def get_database_url() -> str:
    return os.environ.get("DATABASE_URL") or DEFAULT_DATABASE_URL


def get_cors_origins() -> list[str]:
    """Allowed origins from `CORS_ORIGINS`, separated by commas."""
    raw = os.environ.get("CORS_ORIGINS") or DEFAULT_CORS_ORIGINS
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

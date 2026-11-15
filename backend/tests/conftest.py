"""Fixtures: a TestClient on its own temporary SQLite database for every test."""

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def db_url(tmp_path: Path) -> str:
    return f"sqlite:///{tmp_path / 'test.db'}"


@pytest.fixture
def client(db_url: str) -> Iterator[TestClient]:
    # `with` runs the startup that creates the tables.
    with TestClient(create_app(db_url)) as test_client:
        yield test_client

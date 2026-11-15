"""Fixtures: a TestClient on its own temporary SQLite database for every test."""

from collections.abc import Iterator
from datetime import UTC, datetime
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


class FakeClock:
    """Controls `app.clock.utc_now` (spec 002, CA30)."""

    def __init__(self) -> None:
        self.now = datetime(2026, 11, 15, 10, 0, 0, tzinfo=UTC)

    def set(self, moment: datetime) -> None:
        self.now = moment


@pytest.fixture
def fake_clock(monkeypatch: pytest.MonkeyPatch) -> FakeClock:
    clock = FakeClock()
    monkeypatch.setattr("app.clock.utc_now", lambda: clock.now)
    return clock

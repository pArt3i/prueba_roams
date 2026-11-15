"""The only place that reads the time, so tests can control it (spec 002, CA30).

A test replaces `app.clock.utc_now` with `monkeypatch.setattr`.
"""

from datetime import UTC, datetime


def utc_now() -> datetime:
    """Current time, timezone-aware, in UTC."""
    return datetime.now(UTC)


def to_storage(moment: datetime) -> datetime:
    """UTC time as stored in the database: naive (SQLite has no time zones), whole seconds.

    A naive input is taken as UTC. Whole seconds, so what is stored is what the API
    shows and the order by `created_at` matches what the client sees (R10, R16).
    """
    if moment.tzinfo is not None:
        moment = moment.astimezone(UTC)
    return moment.replace(tzinfo=None, microsecond=0)


def to_iso(stored: datetime) -> str:
    """ISO 8601 in UTC with `Z` (R16): `2026-11-15T10:00:00Z`."""
    return stored.strftime("%Y-%m-%dT%H:%M:%SZ")

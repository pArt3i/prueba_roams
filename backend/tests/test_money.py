"""Cents to text (spec 002, R16) and the clock helpers."""

from datetime import UTC, datetime, timedelta, timezone

import pytest

from app.clock import to_iso, to_storage
from app.services.money import format_cents


@pytest.mark.parametrize(
    ("cents", "text"),
    [
        (0, "0.00"),
        (1, "0.01"),
        (9, "0.09"),
        (10, "0.10"),
        (100, "1.00"),
        (47000, "470.00"),
        (9870, "98.70"),
        (5017000, "50170.00"),
    ],
)
def test_format_cents(cents: int, text: str) -> None:
    assert format_cents(cents) == text


@pytest.mark.parametrize("cents", [-1, True, 1.5, "10", None])
def test_format_cents_rechaza_valores_no_validos(cents: object) -> None:
    with pytest.raises(ValueError):
        format_cents(cents)  # type: ignore[arg-type]


def test_to_storage_pasa_a_utc_sin_zona_y_sin_microsegundos() -> None:
    moment = datetime(
        2026, 11, 15, 12, 0, 5, 999999, tzinfo=timezone(timedelta(hours=2))
    )
    assert to_storage(moment) == datetime(2026, 11, 15, 10, 0, 5)
    assert to_storage(moment).tzinfo is None


def test_to_storage_toma_una_hora_sin_zona_como_utc() -> None:
    assert to_storage(datetime(2026, 11, 15, 10, 0, 0)) == datetime(2026, 11, 15, 10, 0)


def test_to_iso_termina_en_z() -> None:
    assert to_iso(to_storage(datetime(2026, 1, 2, 3, 4, 5, tzinfo=UTC))) == (
        "2026-01-02T03:04:05Z"
    )

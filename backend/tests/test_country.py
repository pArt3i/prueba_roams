"""Country code normalization (spec 001 R1, spec 002 R4)."""

import pytest

from app.services.country import normalize_country
from tests.constants import DOTLESS_I, LONG_S


@pytest.mark.parametrize(
    ("raw", "expected"), [("es", "ES"), ("ES", "ES"), ("Pt", "PT"), ("", "")]
)
def test_ascii_is_upper_cased(raw: str, expected: str) -> None:
    assert normalize_country(raw) == expected


@pytest.mark.parametrize("raw", [f"e{LONG_S}", f"{DOTLESS_I}t", f"E{LONG_S}"])
def test_non_ascii_is_never_converted_to_a_country_code(raw: str) -> None:
    # raw.upper() would be "ES" or "IT": the guard must run before upper().
    assert raw.upper().isascii()
    assert normalize_country(raw) == raw
    assert normalize_country(raw) not in {"ES", "IT"}

from decimal import Decimal

import pytest

from app.services.pricing import (
    UnknownCountryError,
    calculate_price,
    subtotal_cents,
    vat_cents,
)
from tests.constants import DOTLESS_I, LONG_S

# Worked examples of the skill reglas-negocio (users, subtotal in cents).
SUBTOTAL_ROWS = [
    (1, 1000),
    (10, 10000),
    (11, 10800),
    (50, 42000),
    (51, 42500),
    (60, 47000),
    (100, 67000),
]

# VAT table of the skill (users, country, rate, subtotal, VAT, total in cents).
VAT_ROWS = [
    (60, "ES", "0.21", 47000, 9870, 56870),
    (11, "DE", "0.19", 10800, 2052, 12852),
    (10, "PT", "0.23", 10000, 2300, 12300),
]

# The five countries of iva.md with 10 users (subtotal 100.00 EUR).
COUNTRY_ROWS = [("ES", "0.21", 2100), ("PT", "0.23", 2300), ("FR", "0.20", 2000),
                ("DE", "0.19", 1900), ("IT", "0.22", 2200)]  # fmt: skip


@pytest.mark.parametrize(("users", "expected"), SUBTOTAL_ROWS)
def test_ca1_subtotal_de_ejemplos_resueltos(users: int, expected: int) -> None:
    result = calculate_price(users, "ES")
    assert result.subtotal_cents == expected


@pytest.mark.parametrize(
    ("users", "country", "rate", "subtotal", "vat", "total"), VAT_ROWS
)
def test_ca2_iva_y_total_de_la_tabla(
    users: int, country: str, rate: str, subtotal: int, vat: int, total: int
) -> None:
    result = calculate_price(users, country)
    assert result.vat_rate == rate
    assert (result.subtotal_cents, result.vat_cents, result.total_cents) == (
        subtotal,
        vat,
        total,
    )


@pytest.mark.parametrize(("country", "rate", "vat"), COUNTRY_ROWS)
def test_ca3_tipo_de_cada_pais_de_iva_md(country: str, rate: str, vat: int) -> None:
    result = calculate_price(10, country)
    assert result.vat_rate == rate
    assert result.vat_cents == vat
    assert result.total_cents == result.subtotal_cents + result.vat_cents


def test_ca5_diez_mil_usuarios_dan_50170() -> None:
    # 100 + 320 + 49750 euros
    result = calculate_price(10000, "ES")
    assert result.subtotal_cents == 5017000
    assert Decimal(result.subtotal_cents) / 100 == Decimal("50170.00")


@pytest.mark.parametrize(
    ("subtotal", "rate", "expected"),
    [
        (
            50,
            Decimal("0.21"),
            11,
        ),  # 10.5 cents: HALF_UP gives 11 (HALF_EVEN would give 10)
        (10, Decimal("0.25"), 3),  # 2.5 -> 3 (HALF_EVEN would give 2)
        (30, Decimal("0.25"), 8),  # 7.5 -> 8
        (7, Decimal("0.21"), 1),  # 1.47 -> 1 (below half: rounds down)
        (9, Decimal("0.21"), 2),  # 1.89 -> 2 (above half: rounds up)
        (0, Decimal("0.21"), 0),
    ],
)
def test_ca35_redondeo_half_up_forzado(
    subtotal: int, rate: Decimal, expected: int
) -> None:
    assert vat_cents(subtotal, rate) == expected


def test_el_tipo_se_devuelve_como_texto_y_los_importes_como_enteros() -> None:
    result = calculate_price(60, "ES")
    assert isinstance(result.vat_rate, str)
    assert all(
        type(v) is int
        for v in (result.subtotal_cents, result.vat_cents, result.total_cents)
    )


def test_pais_sin_distinguir_mayusculas() -> None:
    assert calculate_price(60, "es") == calculate_price(60, "ES")


@pytest.mark.parametrize(
    "country",
    ["XX", "", "E", "ESP", f"{DOTLESS_I}t", f"e{LONG_S}", f"E{LONG_S}", " ES"],
)
def test_pais_desconocido_lanza_error(country: str) -> None:
    # The non-ASCII ones would become IT or ES with upper(): they must be rejected.
    with pytest.raises(UnknownCountryError):
        calculate_price(10, country)


@pytest.mark.parametrize("users", [0, -1, True, 1.5, "10", None])
def test_usuarios_invalidos_lanzan_error(users: object) -> None:
    with pytest.raises(ValueError):
        subtotal_cents(users)  # type: ignore[arg-type]

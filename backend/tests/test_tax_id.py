"""Spanish tax identifier and normalization (spec 001, R2 and R3)."""

import pytest

from app.services.tax_id import (
    InvalidTaxIdError,
    TaxIdEmptyError,
    is_valid_spanish_tax_id,
    normalize_and_validate_tax_id,
    normalize_tax_id,
    strip_separators,
)
from tests import messages
from tests.casos_md import CASOS_MD
from tests.constants import (
    DOTLESS_I,
    FI_LIGATURE,
    IDEOGRAPHIC_SPACE,
    LONG_S,
    NBSP,
    SHARP_S,
)


@pytest.mark.parametrize(
    ("tax_id", "valid", "expected"), CASOS_MD, ids=[ascii(c[0]) for c in CASOS_MD]
)
def test_ca4_ca59_fila_de_casos_md(
    tax_id: str, valid: bool, expected: str | None
) -> None:
    if valid:
        assert normalize_and_validate_tax_id(tax_id, "ES") == expected
    else:
        with pytest.raises((InvalidTaxIdError, TaxIdEmptyError)):
            normalize_and_validate_tax_id(tax_id, "ES")


def test_ca4_las_filas_con_caracteres_especiales_usan_el_caracter_real() -> None:
    nbsp_row = CASOS_MD[4][0]
    assert NBSP in nbsp_row
    assert " " not in nbsp_row
    assert len(nbsp_row) == 10
    dotless_row = CASOS_MD[23][0]
    assert dotless_row[-1] == DOTLESS_I
    assert not dotless_row.isascii()


def test_ca2_normaliza_puntos_guion_y_minuscula() -> None:
    assert normalize_and_validate_tax_id("12.345.678-z", "ES") == "12345678Z"


@pytest.mark.parametrize(
    "raw",
    [
        f"1234{NBSP}5678Z",
        f"1234{IDEOGRAPHIC_SPACE}5678Z",
        "1234\t5678Z\n",
        " 1234 5678z ",
        "1234\r\n5678Z",
    ],
)
def test_ca49_ca57_cualquier_espacio_en_blanco_es_separador_en_es(raw: str) -> None:
    assert normalize_and_validate_tax_id(raw, "ES") == "12345678Z"


@pytest.mark.parametrize(
    "raw", ["", " ", NBSP, "\t\n", "---", ". - .", f"{NBSP}\t{IDEOGRAPHIC_SPACE}"]
)
@pytest.mark.parametrize("country", ["ES", "PT"])
def test_vacio_o_solo_separadores_es_obligatorio(raw: str, country: str) -> None:
    with pytest.raises(TaxIdEmptyError, match="obligatorio"):
        normalize_and_validate_tax_id(raw, country)


def test_es_salto_de_linea_final_es_separador() -> None:
    assert normalize_and_validate_tax_id("12345678Z\n", "ES") == "12345678Z"


@pytest.mark.parametrize("raw", ["12345678Z\x00", "12345678ZZ"])
def test_es_rechaza_caracteres_de_mas(raw: str) -> None:
    with pytest.raises(InvalidTaxIdError):
        normalize_and_validate_tax_id(raw, "ES")


@pytest.mark.parametrize("raw", [f"P1111111{DOTLESS_I}", f"{LONG_S}1111111I"])
def test_ca59_es_rechaza_no_ascii_antes_de_mayusculas(raw: str) -> None:
    # Only the isascii() guard rejects these: with upper() first, P1111111I and
    # S1111111I are valid CIFs. Without the guard this test must fail.
    assert is_valid_spanish_tax_id(raw.upper())
    with pytest.raises(InvalidTaxIdError) as error:
        normalize_and_validate_tax_id(raw, "ES")
    assert str(error.value) == messages.TAX_ID_INVALID
    assert not is_valid_spanish_tax_id(raw)


@pytest.mark.parametrize(
    "raw",
    [
        f"B1234567{DOTLESS_I}",
        f"P2812345{DOTLESS_I}",
        f"{SHARP_S}2345678Z",
        f"1234567{FI_LIGATURE}",
    ],
)
def test_es_rechaza_otros_no_ascii(raw: str) -> None:
    with pytest.raises(InvalidTaxIdError):
        normalize_and_validate_tax_id(raw, "ES")


def test_ca59_la_version_ascii_si_es_valida() -> None:
    assert normalize_and_validate_tax_id("P1111111I", "ES") == "P1111111I"
    assert normalize_and_validate_tax_id("S1111111I", "ES") == "S1111111I"


@pytest.mark.parametrize(
    "raw", ["Y1234567X", "y1234567x", "Y-1234567-X", "Y 1234567 X"]
)
def test_nie_en_varios_formatos(raw: str) -> None:
    assert normalize_and_validate_tax_id(raw, "ES") == "Y1234567X"


@pytest.mark.parametrize("raw", ["Z1234567L", "X1234567R", "Y1234567L", "K1234567L"])
def test_nie_con_letra_o_prefijo_incorrecto(raw: str) -> None:
    with pytest.raises(InvalidTaxIdError):
        normalize_and_validate_tax_id(raw, "ES")


def test_es_el_pais_se_compara_sin_distinguir_mayusculas() -> None:
    assert normalize_and_validate_tax_id("12345678z", "es") == "12345678Z"


def test_pais_no_ascii_que_pasaria_a_es_no_se_trata_como_es() -> None:
    # "e" + U+017F upper-cases to "ES": it must be treated as a non-ES country.
    country = f"e{LONG_S}"
    assert country.upper() == "ES"
    # An invalid DNI (right letter is Z) is a valid generic identifier.
    assert normalize_and_validate_tax_id("12345678A", country) == "12345678A"
    with pytest.raises(InvalidTaxIdError):
        normalize_and_validate_tax_id("12345678A", "ES")


def test_mensajes_en_espanol() -> None:
    with pytest.raises(InvalidTaxIdError) as invalid:
        normalize_and_validate_tax_id("12345678A", "ES")
    assert str(invalid.value) == messages.TAX_ID_INVALID
    with pytest.raises(TaxIdEmptyError) as empty:
        normalize_and_validate_tax_id("", "ES")
    assert str(empty.value) == messages.TAX_ID_REQUIRED


def test_ca51_mismo_identificador_normalizado_con_distinto_formato() -> None:
    assert normalize_tax_id(f"1234{NBSP}5678z") == normalize_tax_id("12.345.678-Z")


def test_strip_separators_no_pasa_a_mayusculas() -> None:
    assert strip_separators(f"a-b.c{NBSP}d") == "abcd"
    assert strip_separators(f"stra{SHARP_S}e") == f"stra{SHARP_S}e"


def test_normalize_conserva_otros_caracteres() -> None:
    assert normalize_tax_id("ab/12") == "AB/12"

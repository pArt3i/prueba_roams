"""Tax identifier of non-ES countries (spec 001, R4)."""

import pytest

from app.services.tax_id import (
    InvalidTaxIdError,
    TaxIdEmptyError,
    normalize_and_validate_tax_id,
)
from tests.constants import (
    ARABIC_DIGITS,
    DOTLESS_I,
    E_ACUTE_LOWER,
    E_ACUTE_UPPER,
    FI_LIGATURE,
    LONG_S,
    N_TILDE_LOWER,
    N_TILDE_UPPER,
    NBSP,
    SHARP_S,
)


@pytest.mark.parametrize("raw", ["ABCDE", "AB123", "A" * 20, "1" * 20, "ab123"])
def test_ca9_no_es_acepta_5_a_20_alfanumericos(raw: str) -> None:
    assert normalize_and_validate_tax_id(raw, "PT") == raw.upper()


@pytest.mark.parametrize(
    "raw", ["ABCD", "A" * 21, "AB/123", "AB_123", "AB#12", "AB+123"]
)
def test_ca29_no_es_rechaza_longitud_y_simbolos(raw: str) -> None:
    with pytest.raises(InvalidTaxIdError):
        normalize_and_validate_tax_id(raw, "PT")


def test_no_es_longitud_se_cuenta_tras_quitar_separadores() -> None:
    assert normalize_and_validate_tax_id("A-B.C D E", "FR") == "ABCDE"
    with pytest.raises(InvalidTaxIdError):
        normalize_and_validate_tax_id("A-B.C D", "FR")


@pytest.mark.parametrize(
    "raw",
    [
        f"{N_TILDE_UPPER}AB123",
        f"{N_TILDE_LOWER}ab123",
        f"{E_ACUTE_UPPER}AB123",
        f"AB12{E_ACUTE_LOWER}",
    ],
)
def test_ca40_no_es_rechaza_no_ascii(raw: str) -> None:
    with pytest.raises(InvalidTaxIdError):
        normalize_and_validate_tax_id(raw, "PT")


@pytest.mark.parametrize(
    "raw",
    [
        f"stra{SHARP_S}e1",
        f"{DOTLESS_I}stanbul1",
        f"{FI_LIGATURE}nanz1",
        f"{SHARP_S}ABCD",
        f"ABCD{LONG_S}",
    ],
)
def test_ca46_no_es_rechaza_caracteres_que_cambian_al_pasar_a_mayusculas(
    raw: str,
) -> None:
    # In upper case they would be STRASSE1, ISTANBUL1, FINANZ1...: valid ASCII.
    assert raw.upper().isascii()
    with pytest.raises(InvalidTaxIdError):
        normalize_and_validate_tax_id(raw, "PT")


def test_ca47_nbsp_entre_ascii_es_separador_en_no_es() -> None:
    assert normalize_and_validate_tax_id(f"AB{NBSP}123", "PT") == "AB123"


def test_ca50_nbsp_junto_a_no_ascii_sigue_siendo_invalido() -> None:
    with pytest.raises(InvalidTaxIdError):
        normalize_and_validate_tax_id(f"{SHARP_S}{NBSP}AB123", "PT")


def test_ca50_solo_nbsp_es_obligatorio() -> None:
    with pytest.raises(TaxIdEmptyError, match="obligatorio"):
        normalize_and_validate_tax_id(NBSP, "PT")


def test_ca10_no_es_vacio() -> None:
    with pytest.raises(TaxIdEmptyError):
        normalize_and_validate_tax_id("", "DE")


def test_no_es_rechaza_digitos_unicode() -> None:
    with pytest.raises(InvalidTaxIdError):
        normalize_and_validate_tax_id(f"AB{ARABIC_DIGITS}", "PT")


def test_no_es_se_guarda_en_mayusculas() -> None:
    assert normalize_and_validate_tax_id("ab-123.x", "PT") == "AB123X"


def test_pais_no_ascii_que_pasaria_a_es_se_trata_como_no_es() -> None:
    # "e" + U+017F upper-cases to "ES"; as a non-ES country, 12345678A is valid.
    country = f"e{LONG_S}"
    assert normalize_and_validate_tax_id("12345678A", country) == "12345678A"

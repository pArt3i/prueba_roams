"""POST /customers: identificador fiscal y duplicados (spec 001, CA7, CA27 a CA29,
CA40, CA46, CA47, CA49 a CA51, CA57, CA59)."""

import pytest
from fastapi.testclient import TestClient

from tests import messages
from tests.constants import (
    DOTLESS_I,
    FI_LIGATURE,
    IDEOGRAPHIC_SPACE,
    N_TILDE_LOWER,
    N_TILDE_UPPER,
    NBSP,
    NEWLINE,
    SHARP_S,
    TAB,
)
from tests.helpers import count, expect_created, expect_error, post


def test_ca7_duplicado_exacto_y_con_otro_formato(client: TestClient) -> None:
    expect_created(post(client, tax_id="12345678Z"))
    for tax_id in ("12345678Z", "12.345.678-z", " 12345678z "):
        expect_error(post(client, tax_id=tax_id), 409, messages.TAX_ID_DUPLICATE)
    assert count(client) == 1


def test_ca27_el_409_solo_lleva_detail(client: TestClient) -> None:
    expect_created(post(client))
    response = post(client, name="Otro", email="otro@acme.com")
    assert response.status_code == 409
    assert response.json() == {
        "detail": "Ya existe un cliente con ese identificador fiscal."
    }


def test_ca28_la_unicidad_no_mira_el_pais(client: TestClient) -> None:
    expect_created(post(client, country="ES", tax_id="12345678Z"))
    expect_error(
        post(client, country="PT", tax_id="12345678Z"), 409, messages.TAX_ID_DUPLICATE
    )
    # Tambien entre dos paises que no son ES.
    expect_created(post(client, country="PT", tax_id="AB12345"))
    expect_error(
        post(client, country="FR", tax_id="ab-12345"), 409, messages.TAX_ID_DUPLICATE
    )
    assert count(client) == 2


def test_solo_el_tax_id_genera_409(client: TestClient) -> None:
    expect_created(post(client, tax_id="12345678Z"))
    expect_created(post(client, tax_id="00000000T"))  # mismo nombre y email


def test_r6_primero_422_y_despues_409(client: TestClient) -> None:
    expect_created(post(client, tax_id="12345678Z"))
    expect_error(
        post(client, tax_id="12345678Z", plan="gold"), 422, messages.PLAN_INVALID
    )


@pytest.mark.parametrize("tax_id", ["AB123", "A" * 20])
def test_ca9_ca29_limites_validos_para_no_es(client: TestClient, tax_id: str) -> None:
    expect_created(post(client, country="PT", tax_id=tax_id))


@pytest.mark.parametrize("tax_id", ["ABCD", "A" * 21, "AB/123", "AB_123", "AB+123"])
def test_ca29_no_es_con_4_o_21_caracteres_o_con_simbolos(
    client: TestClient, tax_id: str
) -> None:
    expect_error(
        post(client, country="PT", tax_id=tax_id), 422, messages.TAX_ID_INVALID
    )
    assert count(client) == 0


@pytest.mark.parametrize("tax_id", [f"{N_TILDE_UPPER}AB123", f"{N_TILDE_LOWER}ab123"])
def test_ca40_no_es_con_enye_es_invalido(client: TestClient, tax_id: str) -> None:
    expect_error(
        post(client, country="PT", tax_id=tax_id), 422, messages.TAX_ID_INVALID
    )
    assert count(client) == 0


@pytest.mark.parametrize(
    "tax_id",
    [f"stra{SHARP_S}e1", f"{DOTLESS_I}stanbul1", f"{FI_LIGATURE}nanz1"],
    ids=["sharp_s", "dotless_i", "fi_ligature"],
)
def test_ca46_no_ascii_que_en_mayusculas_seria_valido(
    client: TestClient, tax_id: str
) -> None:
    assert tax_id.upper().isascii()  # en mayusculas serian STRASSE1, ISTANBUL1, FINANZ1
    expect_error(
        post(client, country="PT", tax_id=tax_id), 422, messages.TAX_ID_INVALID
    )
    assert count(client) == 0


def test_ca47_u00a0_entre_ascii_es_separador_en_no_es(client: TestClient) -> None:
    body = expect_created(post(client, country="PT", tax_id=f"AB{NBSP}123"))
    assert body["tax_id"] == "AB123"


@pytest.mark.parametrize("space", [NBSP, IDEOGRAPHIC_SPACE, TAB, NEWLINE, " "])
def test_ca49_ca57_cualquier_espacio_en_blanco_entre_cifras_en_es(
    client: TestClient, space: str
) -> None:
    body = expect_created(post(client, tax_id=f"1234{space}5678Z"))
    assert body["tax_id"] == "12345678Z"


def test_ca57_tabulador_y_salto_de_linea_al_final(client: TestClient) -> None:
    body = expect_created(post(client, tax_id=f"1234{TAB}5678Z{NEWLINE}"))
    assert body["tax_id"] == "12345678Z"


@pytest.mark.parametrize(
    "tax_id",
    [NBSP, f"{TAB}{NEWLINE}{TAB}", f" {TAB}{NEWLINE}", ".-. -", IDEOGRAPHIC_SPACE],
)
def test_ca50_ca57_solo_separadores_es_obligatorio(
    client: TestClient, tax_id: str
) -> None:
    for country in ("ES", "PT"):
        expect_error(
            post(client, country=country, tax_id=tax_id), 422, messages.TAX_ID_REQUIRED
        )
    assert count(client) == 0


def test_ca50_u00a0_junto_a_un_no_ascii_es_invalido(client: TestClient) -> None:
    tax_id = f"{SHARP_S}{NBSP}AB123"
    expect_error(
        post(client, country="PT", tax_id=tax_id), 422, messages.TAX_ID_INVALID
    )
    assert count(client) == 0


def test_ca51_duplicado_con_u00a0_y_minuscula(client: TestClient) -> None:
    expect_created(post(client, tax_id="12345678Z"))
    expect_error(
        post(client, tax_id=f"1234{NBSP}5678z"), 409, messages.TAX_ID_DUPLICATE
    )
    assert count(client) == 1


def test_ca59_cif_con_i_sin_punto_se_rechaza_y_el_ascii_vale(
    client: TestClient,
) -> None:
    tax_id = f"P1111111{DOTLESS_I}"
    assert tax_id.upper() == "P1111111I"
    expect_error(
        post(client, country="ES", tax_id=tax_id), 422, messages.TAX_ID_INVALID
    )
    assert count(client) == 0
    assert (
        expect_created(post(client, country="ES", tax_id="P1111111I"))["tax_id"]
        == "P1111111I"
    )

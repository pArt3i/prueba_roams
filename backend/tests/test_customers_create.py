"""POST /customers: alta y validacion basica (spec 001, CA1 a CA10, CA23)."""

import pytest
from fastapi.testclient import TestClient

from tests import messages
from tests.casos_md import CASOS_MD
from tests.constants import ARABIC_DIGITS, DOTLESS_I, NBSP
from tests.helpers import count, expect_created, expect_error, post, without

# Cada fila de validacion-nif/casos.md (tests/casos_md.py): (identificador, es valido).
CASOS_FILAS = [(tax_id, valid) for tax_id, valid, _ in CASOS_MD]


def test_ca1_alta_correcta_devuelve_201_con_id_y_tax_id(client: TestClient) -> None:
    body = expect_created(post(client, tax_id="12345678Z"))
    assert body == {
        "id": body["id"],
        "name": "Acme S.L.",
        "tax_id": "12345678Z",
        "email": "ventas@acme.com",
        "country": "ES",
        "plan": "starter",
    }
    assert isinstance(body["id"], int)


def test_ca2_normaliza_el_identificador_al_guardar_y_devolver(
    client: TestClient,
) -> None:
    body = expect_created(post(client, tax_id="12.345.678-z"))
    assert body["tax_id"] == "12345678Z"
    assert client.get(f"/customers/{body['id']}").json()["tax_id"] == "12345678Z"


def test_ca3_rechaza_nif_invalido_y_no_crea_fila(client: TestClient) -> None:
    expect_error(post(client, tax_id="12345678A"), 422, messages.TAX_ID_INVALID)
    assert count(client) == 0


@pytest.mark.parametrize(
    ("tax_id", "valid"),
    CASOS_FILAS,
    ids=[f"fila{i:02d}" for i in range(len(CASOS_FILAS))],
)
def test_ca4_fila_de_casos_md(client: TestClient, tax_id: str, valid: bool) -> None:
    response = post(client, country="ES", tax_id=tax_id)
    if valid:
        assert response.status_code == 201, response.text
        assert count(client) == 1
    else:
        expected = messages.TAX_ID_REQUIRED if tax_id == "" else messages.TAX_ID_INVALID
        expect_error(response, 422, expected)
        assert count(client) == 0


def test_ca4_las_filas_con_caracteres_especiales_son_los_reales() -> None:
    assert any(NBSP in t for t, _ in CASOS_FILAS)
    assert any(DOTLESS_I in t for t, _ in CASOS_FILAS)
    assert any(c in t for t, _ in CASOS_FILAS for c in ARABIC_DIGITS)


def test_ca5_tax_id_vacio_en_es_es_obligatorio(client: TestClient) -> None:
    expect_error(post(client, tax_id=""), 422, messages.TAX_ID_REQUIRED)
    assert count(client) == 0


def test_ca6_pais_fuera_de_la_tabla(client: TestClient) -> None:
    expect_error(post(client, country="XX"), 422, messages.COUNTRY_UNSUPPORTED)
    assert count(client) == 0


def test_ca8_nombre_vacio_o_ausente(client: TestClient) -> None:
    expect_error(post(client, name=""), 422, messages.NAME_REQUIRED)
    response = client.post("/customers", json=without(name=None))
    expect_error(response, 422, messages.NAME_REQUIRED)
    assert count(client) == 0


@pytest.mark.parametrize("tax_id", ["AB123", "A" * 20, "ab-12.3 45", "12345678Z"])
def test_ca9_no_es_con_identificador_de_5_a_20_alfanumericos(
    client: TestClient, tax_id: str
) -> None:
    body = expect_created(post(client, country="PT", tax_id=tax_id))
    assert (
        body["tax_id"]
        == tax_id.replace("-", "").replace(".", "").replace(" ", "").upper()
    )


@pytest.mark.parametrize("tax_id", ["", "-.- ", "   "])
def test_ca10_no_es_con_identificador_vacio(client: TestClient, tax_id: str) -> None:
    expect_error(
        post(client, country="PT", tax_id=tax_id), 422, messages.TAX_ID_REQUIRED
    )
    assert count(client) == 0


def test_ca23_pais_en_minusculas_se_guarda_en_mayusculas(client: TestClient) -> None:
    body = expect_created(post(client, country="es"))
    assert body["country"] == "ES"

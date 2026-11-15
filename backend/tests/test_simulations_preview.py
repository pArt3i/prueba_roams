"""POST /simulations/preview (spec 002, CA1 a CA12, CA25, CA37 y parte de CA26/CA36)."""

import json
from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests import messages
from tests.helpers import expect_error
from tests.sim_helpers import ABSENT, AMOUNT_KEYS, PREVIEW_KEYS, preview, stored_rows

# Skill reglas-negocio, "Ejemplos resueltos" (users, subtotal).
SUBTOTALS = [
    (1, "10.00"),
    (10, "100.00"),
    (11, "108.00"),
    (50, "420.00"),
    (51, "425.00"),
    (60, "470.00"),
    (100, "670.00"),
]
# Skill reglas-negocio, tabla de IVA (users, country, rate, subtotal, vat, total).
VAT_TABLE = [
    (60, "ES", "0.21", "470.00", "98.70", "568.70"),
    (11, "DE", "0.19", "108.00", "20.52", "128.52"),
    (10, "PT", "0.23", "100.00", "23.00", "123.00"),
]
COUNTRIES = [
    ("ES", "0.21", "21.00"),
    ("PT", "0.23", "23.00"),
    ("FR", "0.20", "20.00"),
    ("DE", "0.19", "19.00"),
    ("IT", "0.22", "22.00"),
]
BAD_USERS = [0, -1, 1.5, "abc", True, None, ABSENT]


@pytest.mark.parametrize(("users", "subtotal"), SUBTOTALS)
def test_ca1_subtotal_de_ejemplos_resueltos(
    client: TestClient, users: int, subtotal: str
) -> None:
    response = preview(client, users=users)
    assert response.status_code == 200
    assert response.json()["subtotal"] == subtotal


@pytest.mark.parametrize(
    ("users", "country", "rate", "subtotal", "vat", "total"), VAT_TABLE
)
def test_ca2_iva_y_total_de_la_tabla(
    client: TestClient,
    users: int,
    country: str,
    rate: str,
    subtotal: str,
    vat: str,
    total: str,
) -> None:
    body = preview(client, users=users, country=country).json()
    assert (body["vat_rate"], body["subtotal"], body["vat"], body["total"]) == (
        rate,
        subtotal,
        vat,
        total,
    )


@pytest.mark.parametrize(("country", "rate", "vat"), COUNTRIES)
def test_ca3_tipo_de_cada_pais_con_diez_usuarios(
    client: TestClient, country: str, rate: str, vat: str
) -> None:
    body = preview(client, users=10, country=country).json()
    assert body["vat_rate"] == rate
    assert body["subtotal"] == "100.00"
    assert body["vat"] == vat
    assert body["total"] == f"{100 + int(vat[:2])}.00"


def test_ca4_forma_exacta_de_la_respuesta(client: TestClient) -> None:
    response = preview(client)
    assert response.status_code == 200
    assert response.json() == {
        "users": 60,
        "country": "ES",
        "currency": "EUR",
        "vat_rate": "0.21",
        "subtotal": "470.00",
        "vat": "98.70",
        "total": "568.70",
    }
    body = response.json()
    assert set(body) == PREVIEW_KEYS
    assert type(body["users"]) is int
    assert all(isinstance(body[key], str) for key in AMOUNT_KEYS)


def test_ca5_diez_mil_usuarios_es_valido(client: TestClient) -> None:
    response = preview(client, users=10000)
    assert response.status_code == 200
    assert response.json()["subtotal"] == "50170.00"


def test_ca5_diez_mil_uno_da_422(client: TestClient) -> None:
    expect_error(preview(client, users=10001), 422, messages.USERS_INVALID)


@pytest.mark.parametrize("users", BAD_USERS, ids=repr)
def test_ca6_usuarios_invalidos(client: TestClient, users: Any) -> None:
    expect_error(preview(client, users=users), 422, messages.USERS_INVALID)


def test_ca7_usuarios_como_cadena(client: TestClient) -> None:
    expect_error(preview(client, users="10"), 422, messages.USERS_INVALID)


@pytest.mark.parametrize("raw", ["10.0", "1e1", "1E1", "1.0e1"])
def test_ca8_usuarios_decimales_aunque_valgan_un_entero(
    client: TestClient, raw: str
) -> None:
    content = f'{{"users": {raw}, "country": "ES"}}'
    response = client.post("/simulations/preview", content=content)
    expect_error(response, 422, messages.USERS_INVALID)


def test_ca8_usuarios_10_0_enviado_como_json(client: TestClient) -> None:
    expect_error(preview(client, users=10.0), 422, messages.USERS_INVALID)


def test_ca9_pais_fuera_de_la_tabla(client: TestClient) -> None:
    expect_error(preview(client, country="XX"), 422, messages.COUNTRY_UNSUPPORTED)


@pytest.mark.parametrize("country", ["", None, ABSENT, 5, ["ES"]], ids=repr)
def test_ca9_pais_ausente_vacio_o_nulo(client: TestClient, country: Any) -> None:
    expect_error(preview(client, country=country), 422, messages.COUNTRY_REQUIRED)


def test_ca10_pais_en_minusculas(client: TestClient) -> None:
    response = preview(client, country="es")
    assert response.status_code == 200
    assert response.json() == preview(client, country="ES").json()
    assert response.json()["country"] == "ES"
    assert response.json()["total"] == "568.70"


def test_ca11_preview_no_escribe_en_la_base_de_datos(
    client: TestClient, db_url: str
) -> None:
    assert preview(client).status_code == 200
    assert preview(client, country="XX").status_code == 422
    assert stored_rows(db_url) == []


def test_ca12_campos_desconocidos_se_ignoran(client: TestClient) -> None:
    plain = preview(client)
    extra = preview(client, storage_gb=5, plan="gold", total="1.00", foo=1, id=9)
    assert extra.status_code == 200
    assert extra.json() == plain.json()
    assert not {"storage_gb", "plan", "id", "foo"} & set(extra.json())
    assert extra.json()["total"] == "568.70"


def test_ca36_ningun_importe_es_un_numero_json(client: TestClient) -> None:
    text = preview(client).text

    def reject_float(value: str) -> None:
        raise AssertionError(f"float in the JSON: {value}")

    parsed = json.loads(text, parse_float=reject_float)
    assert all(isinstance(parsed[key], str) for key in AMOUNT_KEYS)
    assert '"subtotal":"470.00"' in text.replace(" ", "")

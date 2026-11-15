"""POST /simulations, validacion y errores (spec 002, CA7, CA8, CA18 a CA22, CA24 a CA26, CA36)."""

import json
from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests import messages
from tests.helpers import expect_error
from tests.sim_helpers import (
    ABSENT,
    AMOUNT_KEYS,
    history,
    new_customer,
    simulate,
    stored_rows,
)

BAD_VALUES = [-1, 1.5, "5", 5.0, True, None]
FIELDS = [
    ("storage_gb", 1_000_000, messages.STORAGE_INVALID),
    ("api_calls", 1_000_000_000, messages.API_CALLS_INVALID),
]


@pytest.mark.parametrize(("field", "maximum", "message"), FIELDS)
def test_ca18_maximo_mas_uno_da_422(
    client: TestClient, db_url: str, field: str, maximum: int, message: str
) -> None:
    new_customer(client)
    expect_error(simulate(client, **{field: maximum + 1}), 422, message)
    assert stored_rows(db_url) == []


@pytest.mark.parametrize(("field", "maximum", "message"), FIELDS)
def test_ca19_campo_ausente(
    client: TestClient, db_url: str, field: str, maximum: int, message: str
) -> None:
    new_customer(client)
    expect_error(simulate(client, **{field: ABSENT}), 422, message)
    assert stored_rows(db_url) == []


@pytest.mark.parametrize("value", BAD_VALUES, ids=repr)
@pytest.mark.parametrize(("field", "maximum", "message"), FIELDS)
def test_ca20_valores_no_validos(
    client: TestClient, db_url: str, field: str, maximum: int, message: str, value: Any
) -> None:
    new_customer(client)
    expect_error(simulate(client, **{field: value}), 422, message)
    assert stored_rows(db_url) == []


@pytest.mark.parametrize("value", ["10", 10.0])
def test_ca7_ca8_usuarios_cadena_o_decimal(
    client: TestClient, db_url: str, value: Any
) -> None:
    new_customer(client)
    expect_error(simulate(client, users=value), 422, messages.USERS_INVALID)
    assert stored_rows(db_url) == []


def test_ca8_usuarios_1e1_en_bruto(client: TestClient, db_url: str) -> None:
    new_customer(client)
    content = '{"customer_id": 1, "users": 1e1, "storage_gb": 0, "api_calls": 0}'
    response = client.post("/simulations", content=content)
    expect_error(response, 422, messages.USERS_INVALID)
    assert stored_rows(db_url) == []


@pytest.mark.parametrize("users", [0, -1, 10001, "abc", True, None, ABSENT], ids=repr)
def test_users_invalido_en_post(client: TestClient, users: Any) -> None:
    new_customer(client)
    expect_error(simulate(client, users=users), 422, messages.USERS_INVALID)


@pytest.mark.parametrize("users", [1, 10000])
def test_users_en_las_cotas_es_valido(client: TestClient, users: int) -> None:
    new_customer(client)
    assert simulate(client, users=users).status_code == 201


@pytest.mark.parametrize("value", ["1", 1.0, True, None, "abc", ABSENT, [1]], ids=repr)
def test_ca21_customer_id_no_valido(
    client: TestClient, db_url: str, value: Any
) -> None:
    new_customer(client)
    expect_error(simulate(client, customer_id=value), 422, messages.ID_INVALID)
    assert stored_rows(db_url) == []


@pytest.mark.parametrize(
    "customer_id", [2, 999, 0, -1, 2**63 - 1, 2**63, 10**30, -(10**30)]
)
def test_ca22_customer_id_inexistente(
    client: TestClient, db_url: str, customer_id: int
) -> None:
    new_customer(client)
    expect_error(simulate(client, customer_id=customer_id), 404, messages.NOT_FOUND)
    assert stored_rows(db_url) == []


def test_ca24_gana_el_422_de_users_sobre_el_404(client: TestClient) -> None:
    response = simulate(client, customer_id=999, users=0)
    expect_error(response, 422, messages.USERS_INVALID)


def test_ca24_un_error_por_respuesta_en_orden(client: TestClient, db_url: str) -> None:
    new_customer(client)
    bad = {"users": 0, "storage_gb": -1, "api_calls": -1}
    expect_error(simulate(client, **bad), 422, messages.USERS_INVALID)
    bad["users"] = 5
    expect_error(simulate(client, **bad), 422, messages.STORAGE_INVALID)
    bad["storage_gb"] = 5
    expect_error(simulate(client, **bad), 422, messages.API_CALLS_INVALID)
    bad["api_calls"] = 5
    assert simulate(client, **bad).status_code == 201
    assert len(stored_rows(db_url)) == 1


def test_ca24_customer_id_no_valido_gana_a_todo(client: TestClient) -> None:
    response = simulate(client, customer_id="x", users=0, storage_gb=-1)
    expect_error(response, 422, messages.ID_INVALID)


@pytest.mark.parametrize("raw", [b"", b'{"users":', b"[]", b'"x"', b"123", b"null"])
def test_ca25_cuerpo_no_valido(client: TestClient, db_url: str, raw: bytes) -> None:
    new_customer(client)
    response = client.post("/simulations", content=raw)
    expect_error(response, 422, messages.BODY_INVALID)
    assert stored_rows(db_url) == []


def test_ca26_todos_los_errores_son_detail_string(client: TestClient) -> None:
    new_customer(client)
    responses = [
        simulate(client, users=0),
        simulate(client, customer_id=99),
        simulate(client, customer_id="x"),
        client.post("/simulations", content=b"[]"),
        client.get("/customers/x/simulations"),
        client.get("/customers/99/simulations"),
    ]
    for response in responses:
        assert response.status_code in (404, 422)
        data = response.json()
        assert list(data) == ["detail"]
        assert isinstance(data["detail"], str)
        assert data["detail"]


def test_ca36_ningun_importe_es_un_numero_json(client: TestClient) -> None:
    new_customer(client)

    def reject_float(value: str) -> None:
        raise AssertionError(f"float in the JSON: {value}")

    for response in (simulate(client), history(client)):
        parsed = json.loads(response.text, parse_float=reject_float)
        for item in parsed if isinstance(parsed, list) else [parsed]:
            assert all(isinstance(item[key], str) for key in AMOUNT_KEYS)

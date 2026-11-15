"""GET /customers/{id} y GET /customers sin filtro (spec 001, CA12, CA14, CA15, CA26,
CA38, CA39, CA58, CA62, R8)."""

import pytest
from fastapi.testclient import TestClient

from tests import messages
from tests.helpers import create_many, expect_created, expect_error, post


def names(client: TestClient, url: str = "/customers") -> list[str]:
    return [c["name"] for c in client.get(url).json()]


def test_ca12_sin_q_devuelve_todos(client: TestClient) -> None:
    create_many(client, ("Alfa", "AB111"), ("Beta", "AB222"), ("Gamma", "AB333"))
    response = client.get("/customers")
    assert response.status_code == 200
    assert names(client) == ["Alfa", "Beta", "Gamma"]
    assert names(client, "/customers?q=") == ["Alfa", "Beta", "Gamma"]
    assert names(client, "/customers?q=%20%20") == ["Alfa", "Beta", "Gamma"]


def test_lista_vacia_sin_clientes(client: TestClient) -> None:
    response = client.get("/customers")
    assert (response.status_code, response.json()) == (200, [])


def test_ca14_un_cliente_existente(client: TestClient) -> None:
    created = expect_created(post(client))
    response = client.get(f"/customers/{created['id']}")
    assert response.status_code == 200
    assert response.json() == created


def test_ca15_id_inexistente(client: TestClient) -> None:
    expect_error(client.get("/customers/999"), 404, messages.NOT_FOUND)


@pytest.mark.parametrize(
    "raw_id",
    [
        "0",
        "-1",
        "-99",
        "999",
        "9223372036854775807",  # 2^63 - 1
        "9223372036854775808",  # 2^63
        "-9223372036854775809",
        "99999999999999999999999",
    ],
)
def test_ca62_id_entero_pero_inexistente_es_404(
    client: TestClient, raw_id: str
) -> None:
    expect_created(post(client))
    expect_error(client.get(f"/customers/{raw_id}"), 404, messages.NOT_FOUND)


@pytest.mark.parametrize("raw_id", ["abc", "1.5", "1.0", "+1", "1_0", "0x1", "%201"])
def test_ca62_id_no_entero_es_422_con_detail_string(
    client: TestClient, raw_id: str
) -> None:
    expect_created(post(client))
    expect_error(client.get(f"/customers/{raw_id}"), 422, messages.ID_INVALID)


def test_ca62_id_con_digitos_no_ascii_es_422(client: TestClient) -> None:
    expect_error(client.get("/customers/%D9%A1"), 422, messages.ID_INVALID)


def test_ca26_orden_alfabetico_sin_distinguir_mayusculas_y_empate_por_id(
    client: TestClient,
) -> None:
    create_many(client, ("beta", "AB111"), ("Alfa", "AB222"), ("alfa", "AB333"))
    assert names(client) == ["Alfa", "alfa", "beta"]


def test_ca38_orden_sin_tildes(client: TestClient) -> None:
    create_many(client, ("Zoe", "AB111"), ("Álvaro", "AB222"), ("Alberto", "AB333"))
    assert names(client) == ["Alberto", "Álvaro", "Zoe"]


def test_ca39_jose_con_y_sin_tilde_empatan_y_salen_por_id(client: TestClient) -> None:
    create_many(client, ("José", "AB111"), ("Jose", "AB222"))
    assert names(client) == ["José", "Jose"]


def test_ca58_espacios_seguidos_cuentan_como_uno_al_ordenar(
    client: TestClient,
) -> None:
    create_many(
        client,
        ("Ana  Ruiz", "AB111"),
        ("Ana Ruiz", "AB222"),
        ("Álex", "AB333"),
    )
    assert names(client) == ["Álex", "Ana  Ruiz", "Ana Ruiz"]


def test_nombres_que_solo_difieren_en_mayusculas_tildes_o_espacios(
    client: TestClient,
) -> None:
    create_many(
        client,
        ("ana", "AB111"),
        ("Ana", "AB222"),
        ("Aná", "AB333"),
        ("Ana ", "AB444"),
    )
    ids = [c["id"] for c in client.get("/customers").json()]
    assert ids == sorted(ids)
    # El nombre devuelto no cambia: "Ana " llega recortado por R9, el resto intacto.
    assert names(client) == ["ana", "Ana", "Aná", "Ana"]

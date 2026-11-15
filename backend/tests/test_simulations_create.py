"""POST /simulations, caminos felices (spec 002, CA13 a CA17 y CA23)."""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.helpers import expect_created
from tests.sim_helpers import (
    AMOUNT_KEYS,
    SIMULATION_KEYS,
    history,
    new_customer,
    preview,
    simulate,
)


def test_ca13_alta_valida_con_respuesta_exacta(client: TestClient) -> None:
    new_customer(client)
    created = expect_created(simulate(client))
    assert set(created) == SIMULATION_KEYS
    assert "plan" not in created
    assert (created["id"], created["customer_id"]) == (1, 1)
    assert (created["users"], created["storage_gb"], created["api_calls"]) == (
        60,
        100,
        5000,
    )
    assert (created["country"], created["currency"]) == ("ES", "EUR")
    expected = preview(client, users=60, country="ES").json()
    for key in AMOUNT_KEYS:
        assert created[key] == expected[key]
    assert (created["subtotal"], created["vat"], created["total"]) == (
        "470.00",
        "98.70",
        "568.70",
    )
    assert history(client).json() == [created]


def test_ca13_los_ids_los_asigna_el_servidor(client: TestClient) -> None:
    new_customer(client)
    first = expect_created(simulate(client))
    second = expect_created(simulate(client))
    assert second["id"] == first["id"] + 1


@pytest.mark.parametrize("country", ["DE", "XX", "", None, 5])
def test_ca14_el_pais_sale_del_cliente(client: TestClient, country: Any) -> None:
    new_customer(client, "ES")
    created = expect_created(simulate(client, country=country))
    assert created["country"] == "ES"
    assert created["vat_rate"] == "0.21"
    assert created["vat"] == "98.70"


def test_ca14_cliente_de_otro_pais_usa_su_iva(client: TestClient) -> None:
    new_customer(client, "DE", "AB111")
    created = expect_created(simulate(client, users=11, country="ES"))
    assert (created["country"], created["vat_rate"]) == ("DE", "0.19")
    assert created["vat"] == "20.52"


def test_ca15_storage_y_api_calls_no_cambian_el_precio(client: TestClient) -> None:
    new_customer(client)
    first = expect_created(simulate(client, storage_gb=1, api_calls=2))
    second = expect_created(simulate(client, storage_gb=900, api_calls=800000))
    for key in ("subtotal", "vat", "total"):
        assert first[key] == second[key]
    assert (first["storage_gb"], first["api_calls"]) == (1, 2)
    assert (second["storage_gb"], second["api_calls"]) == (900, 800000)


def test_ca16_storage_y_api_calls_cero(client: TestClient) -> None:
    new_customer(client)
    created = expect_created(simulate(client, storage_gb=0, api_calls=0))
    assert (created["storage_gb"], created["api_calls"]) == (0, 0)


def test_ca17_maximos_validos(client: TestClient) -> None:
    new_customer(client)
    created = expect_created(simulate(client, storage_gb=1000000, api_calls=1000000000))
    assert (created["storage_gb"], created["api_calls"]) == (1000000, 1000000000)
    assert history(client).json()[0]["api_calls"] == 1000000000


def test_ca23_importes_e_id_del_cliente_se_ignoran(client: TestClient) -> None:
    new_customer(client)
    created = expect_created(
        simulate(client, total="1.00", id=99, plan="gold", subtotal="1.00", vat=0)
    )
    assert created["total"] == "568.70"
    assert created["id"] != 99
    assert "plan" not in created
    assert set(created) == SIMULATION_KEYS

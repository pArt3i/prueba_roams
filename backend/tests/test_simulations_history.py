"""GET /customers/{id}/simulations y lo guardado (spec 002, CA27 a CA34, R11, R15)."""

from datetime import UTC, datetime, timedelta, timezone
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from app.services import pricing
from tests import messages
from tests.conftest import FakeClock
from tests.helpers import expect_created, expect_error
from tests.sim_helpers import history, new_customer, simulate, stored_rows

T0 = datetime(2026, 11, 15, 10, 0, 0, tzinfo=UTC)


def test_ca27_solo_las_simulaciones_del_cliente(client: TestClient) -> None:
    first = new_customer(client, "ES", "12345678Z")
    second = new_customer(client, "PT", "AB111")
    a = expect_created(simulate(client, customer_id=first))
    b = expect_created(simulate(client, customer_id=second))
    c = expect_created(simulate(client, customer_id=first, users=5))
    assert history(client, first).json() == [c, a]
    assert history(client, second).json() == [b]


def test_ca28_cliente_sin_simulaciones(client: TestClient) -> None:
    customer = new_customer(client)
    response = history(client, customer)
    assert (response.status_code, response.json()) == (200, [])


@pytest.mark.parametrize("raw_id", ["999", "0", "-1", "9223372036854775808", "9" * 30])
def test_ca29_cliente_inexistente(client: TestClient, raw_id: str) -> None:
    new_customer(client)
    response = client.get(f"/customers/{raw_id}/simulations")
    expect_error(response, 404, messages.NOT_FOUND)


@pytest.mark.parametrize("raw_id", ["abc", "1.5", "1.0", "+1", "1_0", "%D9%A1"])
def test_ca29_id_no_entero(client: TestClient, raw_id: str) -> None:
    new_customer(client)
    response = client.get(f"/customers/{raw_id}/simulations")
    expect_error(response, 422, messages.ID_INVALID)


def test_ca30a_created_at_distintos_sale_primero_la_mas_reciente(
    client: TestClient, fake_clock: FakeClock
) -> None:
    customer = new_customer(client)
    fake_clock.set(T0 + timedelta(hours=1))
    later = expect_created(simulate(client, customer_id=customer))
    # Created second but with an earlier time: the order is by time, not by id.
    fake_clock.set(T0)
    earlier = expect_created(simulate(client, customer_id=customer))
    assert earlier["id"] > later["id"]
    assert [s["id"] for s in history(client, customer).json()] == [
        later["id"],
        earlier["id"],
    ]


def test_ca30a_en_orden_cronologico_sale_la_ultima_primero(
    client: TestClient, fake_clock: FakeClock
) -> None:
    customer = new_customer(client)
    first = expect_created(simulate(client, customer_id=customer))
    fake_clock.set(T0 + timedelta(seconds=1))
    second = expect_created(simulate(client, customer_id=customer))
    assert [s["id"] for s in history(client, customer).json()] == [
        second["id"],
        first["id"],
    ]


def test_ca30b_mismo_created_at_sale_primero_el_id_mayor(
    client: TestClient, fake_clock: FakeClock
) -> None:
    customer = new_customer(client)
    ids = [
        expect_created(simulate(client, customer_id=customer))["id"] for _ in range(3)
    ]
    assert fake_clock.now == T0
    assert [s["id"] for s in history(client, customer).json()] == ids[::-1]


def test_ca31_el_historial_devuelve_lo_mismo_que_el_post(client: TestClient) -> None:
    new_customer(client)
    created = expect_created(simulate(client, users=11, storage_gb=3, api_calls=4))
    listed = history(client).json()
    assert listed == [created]
    assert listed[0].keys() == created.keys()


def test_ca32_un_cambio_del_iva_no_altera_el_historial(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    new_customer(client, "ES")
    original = expect_created(simulate(client))
    monkeypatch.setitem(pricing.VAT_RATES, "ES", Decimal("0.10"))
    old = history(client).json()
    assert old == [original]
    assert (old[0]["vat_rate"], old[0]["vat"], old[0]["total"]) == (
        "0.21",
        "98.70",
        "568.70",
    )
    new = expect_created(simulate(client))
    assert (new["vat_rate"], new["subtotal"], new["vat"], new["total"]) == (
        "0.10",
        "470.00",
        "47.00",
        "517.00",
    )
    assert history(client).json() == [new, original]


def test_ca33_la_fila_guarda_centimos_enteros_y_el_tipo_como_texto(
    client: TestClient, db_url: str
) -> None:
    new_customer(client)
    expect_created(simulate(client, users=60, storage_gb=7, api_calls=8))
    (row,) = stored_rows(db_url)
    assert (row.subtotal_cents, row.vat_cents, row.total_cents) == (47000, 9870, 56870)
    assert all(
        type(v) is int for v in (row.subtotal_cents, row.vat_cents, row.total_cents)
    )
    assert row.vat_rate == "0.21"
    assert isinstance(row.vat_rate, str)
    assert (row.customer_id, row.users, row.storage_gb, row.api_calls) == (1, 60, 7, 8)
    assert row.country == "ES"


def test_ca34_created_at_es_iso_8601_utc_con_z(
    client: TestClient, fake_clock: FakeClock
) -> None:
    new_customer(client)
    fake_clock.set(datetime(2026, 11, 15, 10, 0, 0, tzinfo=UTC))
    created = expect_created(simulate(client))["created_at"]
    assert created == "2026-11-15T10:00:00Z"
    assert history(client).json()[0]["created_at"] == created
    parsed = datetime.fromisoformat(created)
    assert parsed.utcoffset() == timedelta(0)
    assert parsed == fake_clock.now


def test_ca34_una_hora_con_otra_zona_se_guarda_y_devuelve_en_utc(
    client: TestClient, fake_clock: FakeClock
) -> None:
    new_customer(client)
    fake_clock.set(
        datetime(2026, 11, 15, 12, 0, 0, 999999, tzinfo=timezone(timedelta(hours=2)))
    )
    assert expect_created(simulate(client))["created_at"] == "2026-11-15T10:00:00Z"


def test_ca34_con_el_reloj_real_created_at_termina_en_z(client: TestClient) -> None:
    new_customer(client)
    created = expect_created(simulate(client))["created_at"]
    assert created.endswith("Z")
    now = datetime.now(UTC)
    assert abs(datetime.fromisoformat(created) - now) < timedelta(minutes=1)


def test_r11_no_hay_endpoints_para_modificar_ni_borrar(client: TestClient) -> None:
    new_customer(client)
    created = expect_created(simulate(client))
    url = f"/simulations/{created['id']}"
    for method in ("put", "patch", "delete", "get"):
        assert getattr(client, method)(url).status_code in (404, 405)
    for method in ("put", "patch", "delete"):
        assert getattr(client, method)("/simulations").status_code == 405
        assert getattr(client, method)("/customers/1/simulations").status_code == 405
    assert history(client).json() == [created]

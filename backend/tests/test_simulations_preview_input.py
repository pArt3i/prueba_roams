"""POST /simulations/preview, cuerpo y pais (spec 002, CA25, CA37 y orden de R17)."""

import pytest
from fastapi.testclient import TestClient

from tests import messages
from tests.constants import DOTLESS_I, LONG_S
from tests.helpers import expect_error
from tests.sim_helpers import ABSENT, preview


@pytest.mark.parametrize(
    "raw", [b"", b'{"users":', b"[]", b'"x"', b"123", b"null", b"{"]
)
def test_ca25_cuerpo_no_valido(client: TestClient, raw: bytes) -> None:
    response = client.post("/simulations/preview", content=raw)
    expect_error(response, 422, messages.BODY_INVALID)


def test_ca25_cuerpo_ausente_sin_content_type(client: TestClient) -> None:
    expect_error(client.post("/simulations/preview"), 422, messages.BODY_INVALID)


def test_orden_de_validacion_usuarios_antes_que_pais(client: TestClient) -> None:
    expect_error(preview(client, users=0, country="XX"), 422, messages.USERS_INVALID)
    expect_error(
        preview(client, users=ABSENT, country=ABSENT), 422, messages.USERS_INVALID
    )


@pytest.mark.parametrize(
    "country", [f"e{LONG_S}", f"E{LONG_S}", f"{DOTLESS_I}t", f"{DOTLESS_I}T"]
)
def test_ca37_pais_con_caracteres_no_ascii(client: TestClient, country: str) -> None:
    response = preview(client, users=10, country=country)
    expect_error(response, 422, messages.COUNTRY_UNSUPPORTED)


def test_ca37_pais_ascii_en_minusculas(client: TestClient) -> None:
    response = preview(client, users=10, country="es")
    assert response.status_code == 200
    assert response.json()["country"] == "ES"

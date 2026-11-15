"""POST /customers: formato de errores y orden de validacion (spec 001, CA30, CA33 a
CA36, CA41, CA42), mas el formato de errores en el resto de la API (R13)."""

import pytest
from fastapi.testclient import TestClient

from tests import messages
from tests.helpers import count, expect_created, expect_error, payload, post, without

HEADERS = {"Content-Type": "application/json"}


def test_ca30_detail_es_un_string_en_espanol(client: TestClient) -> None:
    response = client.post("/customers", json=without(name=None))
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)
    assert set(response.json()) == {"detail"}


def test_ca33_solo_el_primer_error_y_en_el_orden_de_r15(client: TestClient) -> None:
    body = payload(name="", email="malo", country="XX", plan="gold", tax_id="")
    steps = [
        ("name", "Acme S.L.", messages.NAME_REQUIRED),
        ("email", "ventas@acme.com", messages.EMAIL_INVALID),
        ("country", "ES", messages.COUNTRY_UNSUPPORTED),
        ("plan", "starter", messages.PLAN_INVALID),
        ("tax_id", "12345678Z", messages.TAX_ID_REQUIRED),
    ]
    for field, fixed, message in steps:
        expect_error(client.post("/customers", json=body), 422, message)
        body[field] = fixed
    assert client.post("/customers", json=body).status_code == 201
    assert count(client) == 1


def test_ca34_pais_invalido_y_tax_id_vacio(client: TestClient) -> None:
    expect_error(
        post(client, country="XX", tax_id=""), 422, messages.COUNTRY_UNSUPPORTED
    )


def test_el_tax_id_no_se_evalua_si_falta_el_pais(client: TestClient) -> None:
    expect_error(post(client, country="", tax_id=""), 422, messages.COUNTRY_REQUIRED)
    expect_error(
        client.post("/customers", json=without(country=None) | {"tax_id": "!"}),
        422,
        messages.COUNTRY_REQUIRED,
    )


@pytest.mark.parametrize("country", ["", None])
def test_ca35_pais_ausente_o_vacio(client: TestClient, country: str | None) -> None:
    body = without(country=None) if country is None else payload(country="")
    expect_error(client.post("/customers", json=body), 422, messages.COUNTRY_REQUIRED)
    assert count(client) == 0


@pytest.mark.parametrize("plan", ["", None])
def test_ca36_plan_ausente_o_vacio(client: TestClient, plan: str | None) -> None:
    body = without(plan=None) if plan is None else payload(plan="")
    expect_error(client.post("/customers", json=body), 422, messages.PLAN_REQUIRED)
    assert count(client) == 0


@pytest.mark.parametrize(
    "raw",
    [b'{"name":', b"", b"{", b"not json", b'{"a": 1,}', b"\xff\xfe\x00"],
    ids=["cortado", "vacio", "llave", "texto", "coma-final", "bytes-invalidos"],
)
def test_ca41_cuerpo_que_no_es_json_valido(client: TestClient, raw: bytes) -> None:
    response = client.post("/customers", content=raw, headers=HEADERS)
    expect_error(response, 422, messages.BODY_INVALID)
    assert count(client) == 0


def test_ca41_cuerpo_ausente(client: TestClient) -> None:
    expect_error(client.post("/customers"), 422, messages.BODY_INVALID)
    assert count(client) == 0


def test_ca41_texto_con_sustitutos_sueltos_no_se_puede_guardar(
    client: TestClient,
) -> None:
    raw = b'{"name": "\\ud800", "email": "a@acme.com"}'
    expect_error(
        client.post("/customers", content=raw, headers=HEADERS),
        422,
        messages.BODY_INVALID,
    )


@pytest.mark.parametrize("raw", ["[]", '"texto"', "123", "null", "true", "[{}]"])
def test_ca42_json_valido_que_no_es_un_objeto(client: TestClient, raw: str) -> None:
    response = client.post("/customers", content=raw, headers=HEADERS)
    expect_error(response, 422, messages.BODY_INVALID)
    assert count(client) == 0


def test_r16_se_comprueba_antes_que_los_campos(client: TestClient) -> None:
    response = client.post("/customers", content="[]", headers=HEADERS)
    assert response.json() == {"detail": messages.BODY_INVALID}


def test_el_cuerpo_se_lee_aunque_no_lleve_content_type(client: TestClient) -> None:
    raw = b'{"name":"Acme","email":"a@acme.com","country":"ES",'
    raw += b'"plan":"starter","tax_id":"12345678Z"}'
    response = client.post("/customers", content=raw)
    expect_created(response)


def test_r13_ruta_inexistente_y_metodo_no_permitido_tambien_usan_detail(
    client: TestClient,
) -> None:
    response = client.get("/nada")
    assert response.status_code == 404
    assert isinstance(response.json()["detail"], str)
    response = client.delete("/customers")
    assert response.status_code == 405
    assert isinstance(response.json()["detail"], str)
    assert "allow" in response.headers

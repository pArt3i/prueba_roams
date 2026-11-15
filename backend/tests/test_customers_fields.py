"""POST /customers: campos name, email, country y plan (spec 001, CA17 a CA22, CA32,
CA43 a CA45, CA48, CA60, CA61)."""

import pytest
from fastapi.testclient import TestClient

from tests import messages
from tests.constants import DOTLESS_I, LONG_S, NBSP, TAB
from tests.helpers import count, expect_created, expect_error, payload, post, without

REQUIRED = {
    "name": messages.NAME_REQUIRED,
    "email": messages.EMAIL_REQUIRED,
    "country": messages.COUNTRY_REQUIRED,
    "plan": messages.PLAN_REQUIRED,
    "tax_id": messages.TAX_ID_REQUIRED,
}
WRONG_TYPE = {
    "name": 123,
    "email": 123,
    "country": 34,
    "plan": ["starter"],
    "tax_id": 12345678,
}


def email_of_length(length: int) -> str:
    """A valid address of exactly `length` characters (labels of at most 63)."""
    first = length - 197  # 64 + "@" + first + 3 labels' dots and 63 + 63 + ".com"
    email = "a" * 64 + "@" + "b" * first + "." + "c" * 63 + "." + "d" * 63 + ".com"
    assert len(email) == length
    return email


@pytest.mark.parametrize("field", ["email", None])
def test_ca17_email_ausente_o_vacio(client: TestClient, field: str | None) -> None:
    body = without(email=None) if field is None else payload(email="")
    expect_error(client.post("/customers", json=body), 422, messages.EMAIL_REQUIRED)
    assert count(client) == 0


@pytest.mark.parametrize("email", ["sin-arroba", "a@", "@acme.com", "a b@acme.com"])
def test_ca18_email_con_formato_invalido(client: TestClient, email: str) -> None:
    expect_error(post(client, email=email), 422, messages.EMAIL_INVALID)


def test_ca18_el_formato_nombre_direccion_no_vale(client: TestClient) -> None:
    expect_error(post(client, email="Ana <ana@acme.com>"), 422, messages.EMAIL_INVALID)


def test_ca19_email_se_recorta_y_pasa_a_minusculas(client: TestClient) -> None:
    body = expect_created(post(client, email="  Ventas@Acme.COM "))
    assert body["email"] == "ventas@acme.com"


def test_email_no_es_unico(client: TestClient) -> None:
    expect_created(post(client, tax_id="12345678Z"))
    expect_created(post(client, tax_id="00000000T"))


def test_ca20_plan_fuera_de_los_tres_valores(client: TestClient) -> None:
    for plan in ("gold", "Starter", "STARTER", " starter"):
        expect_error(post(client, plan=plan), 422, messages.PLAN_INVALID)
    assert count(client) == 0


@pytest.mark.parametrize("plan", ["starter", "business", "enterprise"])
def test_ca21_cada_plan_valido(client: TestClient, plan: str) -> None:
    assert expect_created(post(client, plan=plan))["plan"] == plan


def test_ca22_nombre_de_120_caracteres_si_y_121_no(client: TestClient) -> None:
    expect_created(post(client, name="n" * 120))
    expect_error(
        post(client, name="n" * 121, tax_id="00000000T"), 422, messages.NAME_TOO_LONG
    )
    assert count(client) == 1


def test_r9_nombre_se_guarda_recortado_y_solo_espacios_es_vacio(
    client: TestClient,
) -> None:
    assert expect_created(post(client, name="  Acme  "))["name"] == "Acme"
    expect_error(post(client, name="   "), 422, messages.NAME_REQUIRED)
    # 120 caracteres tras recortar vale aunque el original tenga mas.
    expect_created(post(client, name=" " + "n" * 120 + " ", tax_id="00000000T"))


def test_ca32_email_de_254_si_y_de_255_no(client: TestClient) -> None:
    expect_created(post(client, email=email_of_length(254)))
    expect_error(
        post(client, email=email_of_length(255), tax_id="00000000T"),
        422,
        messages.EMAIL_INVALID,
    )
    assert count(client) == 1


@pytest.mark.parametrize("field", list(REQUIRED))
def test_ca43_campo_null_es_obligatorio(client: TestClient, field: str) -> None:
    response = post(client, **{field: None})
    expect_error(response, 422, REQUIRED[field])
    assert count(client) == 0


@pytest.mark.parametrize("field", list(WRONG_TYPE))
def test_ca44_campo_de_tipo_incorrecto_es_obligatorio(
    client: TestClient, field: str
) -> None:
    response = post(client, **{field: WRONG_TYPE[field]})
    expect_error(response, 422, REQUIRED[field])
    assert count(client) == 0


def test_ca45_el_orden_de_r15_se_mantiene_con_null_y_tipos_incorrectos(
    client: TestClient,
) -> None:
    expect_error(
        post(client, country="XX", tax_id=None), 422, messages.COUNTRY_UNSUPPORTED
    )
    expect_error(post(client, name=123, plan="gold"), 422, messages.NAME_REQUIRED)


def test_ca48_campos_desconocidos_se_ignoran(client: TestClient) -> None:
    body = expect_created(post(client, foo="x", id=99))
    assert body["id"] != 99
    assert "foo" not in body
    assert set(body) == {"id", "name", "tax_id", "email", "country", "plan"}


@pytest.mark.parametrize("country", [f"e{LONG_S}", f"{DOTLESS_I}t", f"E{LONG_S}"])
def test_ca60_pais_con_no_ascii_no_se_convierte_en_codigo(
    client: TestClient, country: str
) -> None:
    assert country.upper() in {"ES", "IT"}
    expect_error(post(client, country=country), 422, messages.COUNTRY_UNSUPPORTED)
    assert count(client) == 0
    assert expect_created(post(client, country="es"))["country"] == "ES"


@pytest.mark.parametrize("country", [" ES ", "ES ", " es", "   ", f"{NBSP}ES"])
def test_ca61_country_no_se_recorta(client: TestClient, country: str) -> None:
    expect_error(post(client, country=country), 422, messages.COUNTRY_UNSUPPORTED)
    assert count(client) == 0
    assert expect_created(post(client))["country"] == "ES"


@pytest.mark.parametrize("plan", [" starter ", "starter ", " business", "   ", TAB])
def test_ca61_plan_no_se_recorta(client: TestClient, plan: str) -> None:
    expect_error(post(client, plan=plan), 422, messages.PLAN_INVALID)
    assert count(client) == 0
    assert expect_created(post(client))["plan"] == "starter"


@pytest.mark.parametrize("country", ["ES", "pt", "Fr", "de", "IT"])
def test_r1_todos_los_paises_de_la_tabla(client: TestClient, country: str) -> None:
    body = expect_created(post(client, country=country, tax_id="12345678Z"))
    assert body["country"] == country.upper()

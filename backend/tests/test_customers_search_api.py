"""GET /customers?q= (spec 001, CA11, CA13, CA16, CA24, CA25, CA31, CA37, CA52 a
CA57)."""

from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from tests.constants import N_TILDE_LOWER, NBSP, SHARP_S, TAB
from tests.helpers import create_many, post


def search(client: TestClient, q: str) -> list[str]:
    response = client.get("/customers", params={"q": q})
    assert response.status_code == 200
    return [c["name"] for c in response.json()]


def test_ca11_un_texto_que_coincide_con_uno(client: TestClient) -> None:
    create_many(client, ("Alfa", "AB111"), ("Beta", "AB222"), ("Gamma", "AB333"))
    assert search(client, "bet") == ["Beta"]


def test_ca11_busqueda_por_identificador_parcial(client: TestClient) -> None:
    create_many(client, ("Alfa", "AB111"), ("Beta", "CD222"), ("Gamma", "EF333"))
    assert search(client, "cd2") == ["Beta"]


def test_ca13_sin_coincidencias_es_200_con_lista_vacia(client: TestClient) -> None:
    create_many(client, ("Alfa", "AB111"))
    response = client.get("/customers?q=zzz")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.parametrize("q", ["%", "_", "%25", "A%", "_lfa"])
def test_ca16_comodines_son_texto_literal(client: TestClient, q: str) -> None:
    create_many(client, ("Alfa", "AB111"), ("Beta", "AB222"))
    assert search(client, q) == []


def test_ca16_un_nombre_con_porcentaje_se_encuentra_por_su_texto(
    client: TestClient,
) -> None:
    create_many(client, ("100% Alfa", "AB111"), ("Beta_2", "AB222"), ("Gamma", "AB333"))
    assert search(client, "%") == ["100% Alfa"]
    assert search(client, "_") == ["Beta_2"]


def test_ca24_busqueda_por_identificador_con_otro_formato(client: TestClient) -> None:
    post(client, name="Acme S.L.", tax_id="12345678Z")
    assert search(client, "12.345.678-z") == ["Acme S.L."]


def test_ca25_parcial_sin_mayusculas_y_con_q_recortado(client: TestClient) -> None:
    create_many(client, ("Acme Soluciones S.L.", "AB111"), ("Otro", "AB222"))
    assert search(client, "  ACME sol ") == ["Acme Soluciones S.L."]


def test_ca31_q_solo_con_separadores_busca_solo_por_nombre(client: TestClient) -> None:
    create_many(client, ("Alfa", "12345678Z"), ("Beta---1", "AB222"))
    assert search(client, "---") == ["Beta---1"]
    assert search(client, ".-.") == []


def test_ca37_busqueda_sin_tildes_ni_mayusculas(client: TestClient) -> None:
    create_many(client, ("José Pérez", "AB111"), ("Núñez S.L.", "AB222"))
    assert search(client, "jose") == ["José Pérez"]
    assert search(client, "nu") == ["Núñez S.L."]
    assert search(client, "JOSÉ") == ["José Pérez"]


def test_ca37_q_sin_tilde_encuentra_nombre_sin_tilde(client: TestClient) -> None:
    create_many(client, ("Jose Pérez", "CD456"), ("Beta", "EF789"))
    assert search(client, "JOSÉ") == ["Jose Pérez"]


def test_ca52_q_con_u00a0_entre_cifras(client: TestClient) -> None:
    create_many(client, ("Alfa", "12345678Z"), ("Beta", "AB222"))
    assert search(client, f"1234{NBSP}5678z") == ["Alfa"]


def test_ca53_q_sharp_s_busca_solo_por_nombre(client: TestClient) -> None:
    create_many(client, ("Beta", "SS123"), ("Strasse GmbH", "XY789"))
    assert search(client, SHARP_S) == ["Strasse GmbH"]


def test_ca54_q_enye_no_busca_por_identificador(client: TestClient) -> None:
    create_many(client, ("Núñez S.L.", "ABC123"), ("Beta", "N12345"))
    assert search(client, N_TILDE_LOWER) == ["Núñez S.L."]


def test_ca55_espacios_seguidos_del_nombre_cuentan_como_uno(
    client: TestClient,
) -> None:
    create_many(client, ("Acme   Soluciones S.L.", "AB111"))
    response = client.get("/customers", params={"q": "acme soluciones"})
    assert [c["name"] for c in response.json()] == ["Acme   Soluciones S.L."]


@pytest.mark.parametrize(
    "q", ["acme   sol", f"acme{NBSP}sol", f"acme{TAB}sol"], ids=["3esp", "nbsp", "tab"]
)
def test_ca56_espacios_en_blanco_seguidos_en_q(client: TestClient, q: str) -> None:
    create_many(client, ("Acme Soluciones S.L.", "AB111"), ("Otro", "AB222"))
    assert search(client, q) == ["Acme Soluciones S.L."]


def test_ca57_q_con_tabulador_entre_cifras(client: TestClient) -> None:
    create_many(client, ("Alfa", "12345678Z"), ("Beta", "AB222"))
    assert search(client, f"1234{TAB}5678z") == ["Alfa"]


def test_q_en_la_url_con_caracteres_codificados(client: TestClient) -> None:
    create_many(client, ("José", "AB111"), ("Beta", "AB222"))
    response = client.get("/customers?q=" + quote("josé"))
    assert [c["name"] for c in response.json()] == ["José"]


def test_la_busqueda_respeta_el_orden_de_r12(client: TestClient) -> None:
    create_many(client, ("beta a", "AB111"), ("Alfa a", "AB222"), ("alfa A", "AB333"))
    assert search(client, "a") == ["Alfa a", "alfa A", "beta a"]

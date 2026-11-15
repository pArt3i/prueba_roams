"""Base de datos, configuracion y CORS (ADR 008, convenciones-backend)."""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import inspect, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import DEFAULT_DATABASE_URL, get_cors_origins, get_database_url
from app.db import create_db_engine, init_db
from app.main import create_app
from app.models import Customer
from app.repositories import customers as repository
from tests import messages
from tests.helpers import count, expect_created, expect_error, post


def test_las_tablas_se_crean_al_arrancar(db_url: str) -> None:
    with TestClient(create_app(db_url)) as client:
        assert client.get("/customers").json() == []
    assert "customers" in inspect(create_db_engine(db_url)).get_table_names()


def test_cada_test_tiene_su_propia_base_de_datos(client: TestClient) -> None:
    assert count(client) == 0
    expect_created(post(client))


def test_los_datos_persisten_entre_arranques(db_url: str) -> None:
    with TestClient(create_app(db_url)) as first:
        created = expect_created(post(first))
    with TestClient(create_app(db_url)) as second:
        assert second.get(f"/customers/{created['id']}").json() == created


def test_init_db_se_puede_repetir(db_url: str) -> None:
    engine = create_db_engine(db_url)
    init_db(engine)
    init_db(engine)
    engine.dispose()


def test_la_base_de_datos_tiene_unique_en_tax_id(db_url: str) -> None:
    """ADR 008: la restriccion existe aunque el servicio no compruebe nada."""
    engine = create_db_engine(db_url)
    init_db(engine)
    with Session(engine) as db:
        for _ in range(2):
            db.add(
                Customer(
                    name="A",
                    tax_id="12345678Z",
                    email="a@acme.com",
                    country="ES",
                    plan="starter",
                )
            )
        with pytest.raises(IntegrityError):
            db.commit()
    engine.dispose()


def test_carrera_entre_dos_altas_la_restriccion_unique_da_409(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    expect_created(post(client))
    # Simula que la comprobacion previa no vio al otro cliente (carrera).
    monkeypatch.setattr(repository, "_tax_id_exists", lambda db, tax_id: False)
    expect_error(post(client, name="Otro"), 409, messages.TAX_ID_DUPLICATE)
    monkeypatch.undo()
    assert count(client) == 1


def test_tras_el_409_de_la_carrera_la_sesion_sigue_siendo_util(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    expect_created(post(client, tax_id="12345678Z"))
    monkeypatch.setattr(repository, "_tax_id_exists", lambda db, tax_id: False)
    expect_error(post(client, tax_id="12345678Z"), 409, messages.TAX_ID_DUPLICATE)
    expect_created(post(client, tax_id="00000000T"))
    assert count(client) == 2


def test_las_peticiones_fallidas_no_dejan_filas(
    client: TestClient, db_url: str
) -> None:
    expect_created(post(client))
    post(client, plan="gold")
    post(client, tax_id="12345678Z")
    client.post("/customers", content=b"[]")
    engine = create_db_engine(db_url)
    with Session(engine) as db:
        assert len(db.scalars(select(Customer)).all()) == 1
    engine.dispose()


def test_los_ids_los_asigna_el_servidor_en_orden(client: TestClient) -> None:
    first = expect_created(post(client, tax_id="12345678Z"))
    second = expect_created(post(client, tax_id="00000000T", id=first["id"]))
    assert second["id"] == first["id"] + 1


def test_database_url_sale_del_entorno(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    assert get_database_url() == DEFAULT_DATABASE_URL == "sqlite:///./saas_o_matic.db"
    monkeypatch.setenv("DATABASE_URL", "sqlite:///otra.db")
    assert get_database_url() == "sqlite:///otra.db"


def test_create_app_usa_database_url_del_entorno(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'env.db'}")
    with TestClient(create_app()) as client:
        expect_created(post(client))
    assert (tmp_path / "env.db").exists()


def test_cors_por_defecto_es_el_origen_de_vite(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    assert get_cors_origins() == ["http://localhost:5173"]
    monkeypatch.setenv("CORS_ORIGINS", "http://a.acme.com, http://b.acme.com,")
    assert get_cors_origins() == ["http://a.acme.com", "http://b.acme.com"]


def test_cors_permite_el_origen_del_frontend(client: TestClient) -> None:
    origin = "http://localhost:5173"
    response = client.options(
        "/customers",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    get = client.get("/customers", headers={"Origin": origin})
    assert get.headers["access-control-allow-origin"] == origin


def test_cors_no_permite_otros_origenes(client: TestClient) -> None:
    response = client.get("/customers", headers={"Origin": "http://evil.acme.com"})
    assert "access-control-allow-origin" not in response.headers


def test_cors_se_configura_sin_tocar_el_codigo(db_url: str) -> None:
    app = create_app(db_url, cors_origins=["http://otro.acme.com"])
    with TestClient(app) as client:
        response = client.get("/customers", headers={"Origin": "http://otro.acme.com"})
        assert response.headers["access-control-allow-origin"] == "http://otro.acme.com"

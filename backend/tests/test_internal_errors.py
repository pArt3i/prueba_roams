"""Unhandled errors answer a generic 500 in the common format (spec 001, R13, CA63)."""

from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import create_app
from app.repositories import customers as repository
from tests.helpers import count, expect_created, expect_error, post

INTERNAL_ERROR = "Error interno del servidor."


@pytest.fixture
def quiet_client(db_url: str) -> Iterator[TestClient]:
    """Like `client`, but a server error becomes a response instead of a raise."""
    with TestClient(create_app(db_url), raise_server_exceptions=False) as test_client:
        yield test_client


def _fail_with_secret(*_: Any, **__: Any) -> None:
    raise RuntimeError("secret-password at /srv/app/private.py")


def test_ca63_un_error_no_controlado_devuelve_500_con_detail_en_espanol(
    quiet_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(repository, "list_customers", _fail_with_secret)
    response = quiet_client.get("/customers")
    expect_error(response, 500, INTERNAL_ERROR)
    assert response.headers["content-type"].startswith("application/json")


def test_el_500_no_filtra_trazas_ni_datos(
    quiet_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(repository, "list_customers", _fail_with_secret)
    text = quiet_client.get("/customers").text
    for leak in ("secret", "RuntimeError", "Traceback", "private.py"):
        assert leak not in text


def test_ca63_404_de_ruta_y_405_con_detail_en_espanol(
    quiet_client: TestClient,
) -> None:
    not_found = quiet_client.get("/nada")
    assert not_found.status_code == 404
    assert not_found.json() == {"detail": "Recurso no encontrado."}
    not_allowed = quiet_client.delete("/customers")
    assert not_allowed.status_code == 405
    assert not_allowed.json() == {"detail": "Método no permitido."}
    assert "allow" in not_allowed.headers


def test_un_integrity_error_que_no_es_el_unique_de_tax_id_da_500(
    quiet_client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A NOT NULL violation (here, a missing name) must not look like a duplicate."""
    add = Session.add

    def add_without_name(
        self: Session, instance: Any, *args: Any, **kwargs: Any
    ) -> None:
        instance.name = None
        add(self, instance, *args, **kwargs)

    monkeypatch.setattr(Session, "add", add_without_name)
    response = post(quiet_client)
    expect_error(response, 500, INTERNAL_ERROR)
    assert "NOT NULL" not in response.text
    monkeypatch.undo()
    assert count(quiet_client) == 0
    expect_created(post(quiet_client))

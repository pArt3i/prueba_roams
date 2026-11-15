"""Helpers shared by the simulation tests (spec 002)."""

from typing import Any

from fastapi.testclient import TestClient
from httpx import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import create_db_engine
from app.models import Simulation
from tests.helpers import expect_created, post

ABSENT = object()  # a field that is left out of the body
AMOUNT_KEYS = ("vat_rate", "subtotal", "vat", "total")
PREVIEW_KEYS = {"users", "country", "currency", "vat_rate", "subtotal", "vat", "total"}
SIMULATION_KEYS = PREVIEW_KEYS | {
    "id",
    "customer_id",
    "storage_gb",
    "api_calls",
    "created_at",
}


def body(**overrides: Any) -> dict[str, Any]:
    """A valid body for `POST /simulations` for customer 1; ABSENT removes a field."""
    data: dict[str, Any] = {
        "customer_id": 1,
        "users": 60,
        "storage_gb": 100,
        "api_calls": 5000,
    }
    data.update(overrides)
    return {k: v for k, v in data.items() if v is not ABSENT}


def preview_body(**overrides: Any) -> dict[str, Any]:
    data: dict[str, Any] = {"users": 60, "country": "ES"}
    data.update(overrides)
    return {k: v for k, v in data.items() if v is not ABSENT}


def new_customer(
    client: TestClient, country: str = "ES", tax_id: str = "12345678Z"
) -> int:
    """Create a customer (generic tax id for non-ES countries) and return its id."""
    created = expect_created(post(client, country=country, tax_id=tax_id))
    return int(created["id"])


def simulate(client: TestClient, **overrides: Any) -> Response:
    return client.post("/simulations", json=body(**overrides))


def preview(client: TestClient, **overrides: Any) -> Response:
    return client.post("/simulations/preview", json=preview_body(**overrides))


def history(client: TestClient, customer_id: int = 1) -> Response:
    return client.get(f"/customers/{customer_id}/simulations")


def stored_rows(db_url: str) -> list[Simulation]:
    """The rows of `simulations`, read straight from the database."""
    engine = create_db_engine(db_url)
    with Session(engine) as db:
        rows = list(db.scalars(select(Simulation).order_by(Simulation.id)))
    engine.dispose()
    return rows

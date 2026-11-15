"""Helpers shared by the customer tests. Emails always use the `acme.com` domain."""

from typing import Any

from fastapi.testclient import TestClient
from httpx import Response


def payload(**overrides: Any) -> dict[str, Any]:
    """A valid body for `POST /customers`; a value in `overrides` replaces the default."""
    body: dict[str, Any] = {
        "name": "Acme S.L.",
        "email": "ventas@acme.com",
        "country": "ES",
        "plan": "starter",
        "tax_id": "12345678Z",
    }
    body.update(overrides)
    return body


def post(client: TestClient, **overrides: Any) -> Response:
    return client.post("/customers", json=payload(**overrides))


def without(**removed: Any) -> dict[str, Any]:
    """A valid body without the fields named (the values are ignored)."""
    body = payload()
    for key in removed:
        del body[key]
    return body


def count(client: TestClient) -> int:
    """Number of customers stored."""
    return len(client.get("/customers").json())


def expect_error(response: Response, status: int, message: str) -> None:
    """Status, a `{"detail": <string>}` body and nothing else."""
    assert response.status_code == status
    assert response.json() == {"detail": message}


def expect_created(response: Response) -> dict[str, Any]:
    assert response.status_code == 201, response.text
    body: dict[str, Any] = response.json()
    return body


def create_many(client: TestClient, *items: tuple[str, str]) -> list[dict[str, Any]]:
    """Create customers (name, tax_id) with country PT, in order."""
    return [
        expect_created(post(client, name=name, tax_id=tax_id, country="PT"))
        for name, tax_id in items
    ]

"""Validation of the bodies of `POST /simulations/preview` and `POST /simulations`.

Pure logic (spec 002, R3 to R5, R12 to R14, R17). The body is already a JSON object
(`customer_input.parse_body`, R18). Only the first error is raised, in the order of
R17; unknown fields are ignored.
"""

from collections.abc import Mapping
from dataclasses import dataclass

from app.services.customer_input import ID_INVALID, CustomerInputError, parse_country

USERS_MIN, USERS_MAX = 1, 10_000
STORAGE_MIN, STORAGE_MAX = 0, 1_000_000
API_CALLS_MIN, API_CALLS_MAX = 0, 1_000_000_000

USERS_INVALID = "El número de usuarios debe ser un entero entre 1 y 10000."
STORAGE_INVALID = "El almacenamiento debe ser un entero entre 0 y 1000000."
API_CALLS_INVALID = "Las llamadas a la API deben ser un entero entre 0 y 1000000000."


@dataclass(frozen=True)
class PreviewInput:
    users: int
    country: str


@dataclass(frozen=True)
class SimulationInput:
    customer_id: int
    users: int
    storage_gb: int
    api_calls: int


def _strict_int(payload: Mapping[str, object], key: str) -> int | None:
    """The field only if it is a JSON integer (R12).

    Strings, floats (`10.0`, `1e1`), booleans and `null` count as not valid.
    `type(...) is int` leaves out `bool`, which is a subclass of `int`.
    """
    value = payload.get(key)
    return value if type(value) is int else None


def _bounded(
    payload: Mapping[str, object], key: str, low: int, high: int, message: str
) -> int:
    value = _strict_int(payload, key)
    if value is None or not low <= value <= high:
        raise CustomerInputError(message)
    return value


def _users(payload: Mapping[str, object]) -> int:
    return _bounded(payload, "users", USERS_MIN, USERS_MAX, USERS_INVALID)


def parse_preview(payload: Mapping[str, object]) -> PreviewInput:
    """Order of R17 for `preview`: `users`, then `country`."""
    users = _users(payload)
    return PreviewInput(users, parse_country(payload))


def parse_simulation(payload: Mapping[str, object]) -> SimulationInput:
    """Order of R17: `customer_id`, `users`, `storage_gb`, `api_calls`.

    `customer_id` is only checked to be an integer here: whether it exists (404)
    is decided afterwards. A `country` in the body is not read at all (R13).
    """
    customer_id = _strict_int(payload, "customer_id")
    if customer_id is None:
        raise CustomerInputError(ID_INVALID)
    users = _users(payload)
    storage = _bounded(payload, "storage_gb", STORAGE_MIN, STORAGE_MAX, STORAGE_INVALID)
    api_calls = _bounded(
        payload, "api_calls", API_CALLS_MIN, API_CALLS_MAX, API_CALLS_INVALID
    )
    return SimulationInput(customer_id, users, storage, api_calls)

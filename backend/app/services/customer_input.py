"""Validation of the body of `POST /customers` (spec 001, R1, R9 to R11, R15 to R17).

Pure logic, no FastAPI, no database. Only the first error is raised, in the order
`name`, `email`, `country`, `plan`, `tax_id` (R15).
"""

import json
import re
from collections.abc import Mapping
from dataclasses import dataclass

from pydantic import EmailStr, TypeAdapter, ValidationError

from app.services.country import normalize_country
from app.services.pricing import VAT_RATES
from app.services.tax_id import TaxIdError, normalize_and_validate_tax_id

NAME_MAX = 120
EMAIL_MAX = 254
PLANS = ("starter", "business", "enterprise")

BODY_INVALID = "Cuerpo de la petición no válido."
NAME_REQUIRED = "El nombre es obligatorio."
NAME_TOO_LONG = "El nombre no puede superar 120 caracteres."
EMAIL_REQUIRED = "El email es obligatorio."
EMAIL_INVALID = "El email no es válido."
COUNTRY_REQUIRED = "El país es obligatorio."
COUNTRY_UNSUPPORTED = "País no admitido."
PLAN_REQUIRED = "El plan es obligatorio."
PLAN_INVALID = "Plan no válido. Valores admitidos: starter, business, enterprise."
TAX_ID_REQUIRED = "El identificador fiscal es obligatorio."
ID_INVALID = "Identificador de cliente no válido."

_EMAIL = TypeAdapter(EmailStr)
_ID = re.compile(r"-?[0-9]+")


class CustomerInputError(ValueError):
    """Invalid input; the message is ready to show to the user (422)."""


@dataclass(frozen=True)
class CustomerData:
    """Validated and normalized data of a new customer."""

    name: str
    email: str
    country: str
    plan: str
    tax_id: str


def parse_body(raw: bytes) -> Mapping[str, object]:
    """The body as a JSON object, or `CustomerInputError` (R16)."""
    try:
        payload = json.loads(raw)
        # Text that cannot be encoded (lone surrogates) could not be stored.
        json.dumps(payload, ensure_ascii=False).encode("utf-8")
    except (ValueError, RecursionError) as exc:
        raise CustomerInputError(BODY_INVALID) from exc
    if not isinstance(payload, dict):
        raise CustomerInputError(BODY_INVALID)
    return payload


def parse_customer_id(raw: str) -> int:
    """`id` of the path: an integer in ASCII digits, with an optional minus sign."""
    if not _ID.fullmatch(raw):
        raise CustomerInputError(ID_INVALID)
    return int(raw)


def _text(payload: Mapping[str, object], key: str) -> str | None:
    """The field if it is a string; `null`, absent or another type count as absent."""
    value = payload.get(key)
    return value if isinstance(value, str) else None


def _name(payload: Mapping[str, object]) -> str:
    name = (_text(payload, "name") or "").strip()
    if not name:
        raise CustomerInputError(NAME_REQUIRED)
    if len(name) > NAME_MAX:
        raise CustomerInputError(NAME_TOO_LONG)
    return name


def _email(payload: Mapping[str, object]) -> str:
    email = (_text(payload, "email") or "").strip().lower()
    if not email:
        raise CustomerInputError(EMAIL_REQUIRED)
    # `EmailStr` also accepts "Name <a@b.com>" and returns only the address.
    if len(email) > EMAIL_MAX or "<" in email or ">" in email:
        raise CustomerInputError(EMAIL_INVALID)
    try:
        return _EMAIL.validate_python(email).lower()
    except ValidationError as exc:
        raise CustomerInputError(EMAIL_INVALID) from exc


def parse_country(payload: Mapping[str, object]) -> str:
    """The country code in upper case, or `CustomerInputError` (spec 001 R1, spec 002 R4)."""
    raw = _text(payload, "country")
    if not raw:
        raise CustomerInputError(COUNTRY_REQUIRED)
    code = normalize_country(raw)
    if code not in VAT_RATES:
        raise CustomerInputError(COUNTRY_UNSUPPORTED)
    return code


def _plan(payload: Mapping[str, object]) -> str:
    plan = _text(payload, "plan")
    if not plan:
        raise CustomerInputError(PLAN_REQUIRED)
    if plan not in PLANS:
        raise CustomerInputError(PLAN_INVALID)
    return plan


def _tax_id(payload: Mapping[str, object], country: str) -> str:
    raw = _text(payload, "tax_id")
    if raw is None:
        raise CustomerInputError(TAX_ID_REQUIRED)
    try:
        return normalize_and_validate_tax_id(raw, country)
    except TaxIdError as exc:
        raise CustomerInputError(str(exc)) from exc


def validate_customer(payload: Mapping[str, object]) -> CustomerData:
    """Validate in the order of R15; unknown fields are ignored (R17)."""
    name = _name(payload)
    email = _email(payload)
    country = parse_country(payload)
    plan = _plan(payload)
    tax_id = _tax_id(payload, country)
    return CustomerData(name, email, country, plan, tax_id)

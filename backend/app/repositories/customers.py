"""Database access for customers. No business rules: those live in `services/`."""

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Customer
from app.services.customer_input import CustomerData

DUPLICATE_MESSAGE = "Ya existe un cliente con ese identificador fiscal."
# SQLite integers are 64 bits: a larger id cannot exist (and would raise an error).
_MAX_ID = 2**63 - 1


class DuplicateTaxIdError(Exception):
    """A customer with the same normalized tax id already exists (409)."""

    def __init__(self) -> None:
        super().__init__(DUPLICATE_MESSAGE)


def _tax_id_exists(db: Session, tax_id: str) -> bool:
    return db.scalar(select(Customer.id).where(Customer.tax_id == tax_id)) is not None


def _is_tax_id_unique_violation(exc: IntegrityError) -> bool:
    """True only for the UNIQUE constraint of `customers.tax_id` (SQLite wording)."""
    column = f"{Customer.__tablename__}.{Customer.tax_id.key}"
    return f"UNIQUE constraint failed: {column}" in str(exc.orig)


def create_customer(db: Session, data: CustomerData) -> Customer:
    """Insert a customer; a duplicate `tax_id` creates nothing (ADR 008).

    The query gives the normal case; the `UNIQUE` constraint covers two requests
    that race between the query and the insert.
    """
    if _tax_id_exists(db, data.tax_id):
        raise DuplicateTaxIdError()
    customer = Customer(
        name=data.name,
        email=data.email,
        country=data.country,
        plan=data.plan,
        tax_id=data.tax_id,
    )
    db.add(customer)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if _is_tax_id_unique_violation(exc):
            raise DuplicateTaxIdError() from exc
        raise  # any other constraint is a bug: it ends as an internal error (500)
    return customer


def get_customer(db: Session, customer_id: int) -> Customer | None:
    if not 1 <= customer_id <= _MAX_ID:
        return None
    return db.get(Customer, customer_id)


def list_customers(db: Session) -> list[Customer]:
    return list(db.scalars(select(Customer)))

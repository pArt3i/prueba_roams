"""Customer endpoints (spec 001). Thin: validate, call a service, return a schema."""

from fastapi import APIRouter, HTTPException

from app.models import Customer
from app.repositories import customers as repository
from app.routers.deps import Body, Db
from app.schemas.customer import CustomerOut
from app.services.customer_input import (
    CustomerInputError,
    parse_body,
    parse_customer_id,
    validate_customer,
)
from app.services.customer_search import search_customers

NOT_FOUND_MESSAGE = "Cliente no encontrado."

router = APIRouter(prefix="/customers", tags=["customers"])


@router.post("", response_model=CustomerOut, status_code=201)
def create_customer(body: Body, db: Db) -> Customer:
    try:
        data = validate_customer(parse_body(body))
        return repository.create_customer(db, data)
    except CustomerInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except repository.DuplicateTaxIdError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get("", response_model=list[CustomerOut])
def list_customers(db: Db, q: str | None = None) -> list[Customer]:
    return search_customers(repository.list_customers(db), q)


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: str, db: Db) -> Customer:
    try:
        parsed_id = parse_customer_id(customer_id)
    except CustomerInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    customer = repository.get_customer(db, parsed_id)
    if customer is None:
        raise HTTPException(status_code=404, detail=NOT_FOUND_MESSAGE)
    return customer

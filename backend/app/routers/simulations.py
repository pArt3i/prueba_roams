"""Simulation endpoints (spec 002). Thin: validate, call a service, return a schema."""

from fastapi import APIRouter, HTTPException

from app import clock
from app.repositories import customers as customers_repository
from app.repositories import simulations as repository
from app.routers.deps import Body, Db
from app.schemas.simulation import (
    PreviewOut,
    SimulationOut,
    preview_out,
    simulation_out,
)
from app.services.customer_input import (
    CustomerInputError,
    parse_body,
    parse_customer_id,
)
from app.services.pricing import calculate_price
from app.services.simulation_input import parse_preview, parse_simulation

NOT_FOUND_MESSAGE = "Cliente no encontrado."

router = APIRouter(tags=["simulations"])


@router.post("/simulations/preview", response_model=PreviewOut)
def preview(body: Body) -> PreviewOut:
    try:
        data = parse_preview(parse_body(body))
    except CustomerInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return preview_out(
        data.users, data.country, calculate_price(data.users, data.country)
    )


@router.post("/simulations", response_model=SimulationOut, status_code=201)
def create_simulation(body: Body, db: Db) -> SimulationOut:
    try:
        data = parse_simulation(parse_body(body))
    except CustomerInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    customer = customers_repository.get_customer(db, data.customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail=NOT_FOUND_MESSAGE)
    price = calculate_price(
        data.users, customer.country
    )  # the country is the customer's (R13)
    return simulation_out(
        repository.create_simulation(db, customer, data, price, clock.utc_now())
    )


@router.get("/customers/{customer_id}/simulations", response_model=list[SimulationOut])
def list_simulations(customer_id: str, db: Db) -> list[SimulationOut]:
    try:
        parsed_id = parse_customer_id(customer_id)
    except CustomerInputError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if customers_repository.get_customer(db, parsed_id) is None:
        raise HTTPException(status_code=404, detail=NOT_FOUND_MESSAGE)
    return [simulation_out(s) for s in repository.list_by_customer(db, parsed_id)]

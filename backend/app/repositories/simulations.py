"""Database access for simulations. No business rules: those live in `services/`."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.clock import to_storage
from app.models import Customer, Simulation
from app.services.pricing import PriceBreakdown
from app.services.simulation_input import SimulationInput


def create_simulation(
    db: Session,
    customer: Customer,
    data: SimulationInput,
    price: PriceBreakdown,
    now: datetime,
) -> Simulation:
    """Insert one simulation with the price of this moment (snapshot, R15)."""
    simulation = Simulation(
        customer_id=customer.id,
        users=data.users,
        storage_gb=data.storage_gb,
        api_calls=data.api_calls,
        country=customer.country,
        vat_rate=price.vat_rate,
        subtotal_cents=price.subtotal_cents,
        vat_cents=price.vat_cents,
        total_cents=price.total_cents,
        created_at=to_storage(now),
    )
    db.add(simulation)
    db.commit()
    return simulation


def list_by_customer(db: Session, customer_id: int) -> list[Simulation]:
    """Most recent first; on equal `created_at`, the highest `id` first (R10)."""
    query = (
        select(Simulation)
        .where(Simulation.customer_id == customer_id)
        .order_by(Simulation.created_at.desc(), Simulation.id.desc())
    )
    return list(db.scalars(query))

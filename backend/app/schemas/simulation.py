"""Response schemas of the simulation endpoints (spec 002, Salidas and R16).

Amounts and the VAT rate are always text, never a JSON number.
"""

from pydantic import BaseModel

from app.clock import to_iso
from app.models import Simulation
from app.services.money import format_cents
from app.services.pricing import PriceBreakdown

CURRENCY = "EUR"


class PreviewOut(BaseModel):
    users: int
    country: str
    currency: str
    vat_rate: str
    subtotal: str
    vat: str
    total: str


class SimulationOut(PreviewOut):
    id: int
    customer_id: int
    storage_gb: int
    api_calls: int
    created_at: str


def preview_out(users: int, country: str, price: PriceBreakdown) -> PreviewOut:
    return PreviewOut(
        users=users,
        country=country,
        currency=CURRENCY,
        vat_rate=price.vat_rate,
        subtotal=format_cents(price.subtotal_cents),
        vat=format_cents(price.vat_cents),
        total=format_cents(price.total_cents),
    )


def simulation_out(simulation: Simulation) -> SimulationOut:
    """Built from what is stored: nothing is recalculated (R15)."""
    return SimulationOut(
        id=simulation.id,
        customer_id=simulation.customer_id,
        users=simulation.users,
        storage_gb=simulation.storage_gb,
        api_calls=simulation.api_calls,
        country=simulation.country,
        currency=CURRENCY,
        vat_rate=simulation.vat_rate,
        subtotal=format_cents(simulation.subtotal_cents),
        vat=format_cents(simulation.vat_cents),
        total=format_cents(simulation.total_cents),
        created_at=to_iso(simulation.created_at),
    )

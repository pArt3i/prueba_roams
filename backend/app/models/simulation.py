"""Simulation model (spec 002, R15, R16): a snapshot of the price when it was made."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Simulation(Base):
    __tablename__ = "simulations"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    users: Mapped[int] = mapped_column(Integer)
    storage_gb: Mapped[int] = mapped_column(Integer)
    api_calls: Mapped[int] = mapped_column(Integer)
    # Snapshot at creation: the history never recalculates (R15).
    country: Mapped[str] = mapped_column(String(2))
    vat_rate: Mapped[str] = mapped_column(String)  # decimal text, e.g. "0.21"
    # Amounts in EUR as integer cents (R16).
    subtotal_cents: Mapped[int] = mapped_column(Integer)
    vat_cents: Mapped[int] = mapped_column(Integer)
    total_cents: Mapped[int] = mapped_column(Integer)
    # Naive UTC (see `app.clock.to_storage`).
    created_at: Mapped[datetime] = mapped_column(DateTime)

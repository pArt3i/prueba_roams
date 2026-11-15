"""Customer model (spec 001)."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    # Normalized value; unique across countries (ADR 008).
    tax_id: Mapped[str] = mapped_column(String, unique=True)
    email: Mapped[str] = mapped_column(String(254))
    country: Mapped[str] = mapped_column(String(2))
    plan: Mapped[str] = mapped_column(String(10))

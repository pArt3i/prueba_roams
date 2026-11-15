"""Pure monthly price calculation (spec 002, R1 and R2). No FastAPI, no database."""

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

from app.services.country import normalize_country

# General VAT rates (skill reglas-negocio, iva.md). Built from strings to avoid float.
VAT_RATES: dict[str, Decimal] = {
    "ES": Decimal("0.21"),
    "PT": Decimal("0.23"),
    "FR": Decimal("0.20"),
    "DE": Decimal("0.19"),
    "IT": Decimal("0.22"),
}

# (upper user limit of the tier, price per user in cents).
# The last tier has no limit. Each user pays the price of their own tier.
TIERS: tuple[tuple[int | None, int], ...] = ((10, 1000), (50, 800), (None, 500))


class UnknownCountryError(ValueError):
    """The country is not in the VAT table."""


@dataclass(frozen=True)
class PriceBreakdown:
    """Result: the rate as decimal text and the amounts as integer cents."""

    vat_rate: str
    subtotal_cents: int
    vat_cents: int
    total_cents: int


def subtotal_cents(users: int) -> int:
    """Subtotal without VAT in cents, with cumulative tiers."""
    if isinstance(users, bool) or not isinstance(users, int) or users < 1:
        raise ValueError("users must be an integer greater than or equal to 1")
    total = 0
    lower = 0
    for upper, price_cents in TIERS:
        top = users if upper is None else min(users, upper)
        total += max(0, top - lower) * price_cents
        if upper is not None:
            lower = upper
    return total


def vat_cents(subtotal: int, rate: Decimal) -> int:
    """VAT in cents: subtotal x rate, rounded to an integer with ROUND_HALF_UP."""
    return int((Decimal(subtotal) * rate).quantize(Decimal(1), rounding=ROUND_HALF_UP))


def calculate_price(users: int, country: str) -> PriceBreakdown:
    """Monthly price for `users` users in `country` (case-insensitive).

    Does not enforce the 10 000 users cap (spec 002 R3): the schema does.
    """
    rate = VAT_RATES.get(normalize_country(country))
    if rate is None:
        raise UnknownCountryError(country)
    subtotal = subtotal_cents(users)
    vat = vat_cents(subtotal, rate)
    return PriceBreakdown(str(rate), subtotal, vat, subtotal + vat)

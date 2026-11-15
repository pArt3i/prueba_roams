"""Integer cents to API text (spec 002, R16). Pure, no float."""


def format_cents(cents: int) -> str:
    """`47000` -> `"470.00"`. Amounts are never negative."""
    if isinstance(cents, bool) or not isinstance(cents, int) or cents < 0:
        raise ValueError("cents must be an integer greater than or equal to 0")
    euros, rest = divmod(cents, 100)
    return f"{euros}.{rest:02d}"

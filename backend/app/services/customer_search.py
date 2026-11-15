"""Customer search and ordering (spec 001, R7, R12, R14).

Pure logic, no FastAPI, no database. It works in Python on the customers already
read (not with SQL `LIKE`), so `%` and `_` are plain text and there is nothing to
escape. The folding below is used only to compare: stored names never change.
"""

import unicodedata
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Protocol, TypeVar

from app.services.tax_id import strip_separators


class Searchable(Protocol):
    """What the search needs from a customer (the ORM model fits)."""

    id: int
    name: str
    tax_id: str


T = TypeVar("T", bound=Searchable)


@dataclass(frozen=True)
class SearchQuery:
    """`q` ready to compare. `tax_id_text` is None when `q` is not searched as id."""

    name_text: str
    tax_id_text: str | None


def fold_text(value: str) -> str:
    """Comparison key for names: no case, no diacritics, one space per whitespace run.

    Whitespace is anything `str.split()` treats as such (U+0020, U+00A0, tab...).
    NFD, `casefold` (so `ß` compares as `ss`) and removal of combining marks; no
    `upper()`. `casefold` can output text that is not decomposed, so NFD runs again.
    """
    collapsed = " ".join(value.split())
    folded = unicodedata.normalize("NFD", collapsed).casefold()
    decomposed = unicodedata.normalize("NFD", folded)
    return "".join(c for c in decomposed if unicodedata.category(c) != "Mn")


def parse_query(q: str | None) -> SearchQuery | None:
    """Return None when `q` is absent or blank (every customer matches)."""
    if q is None:
        return None
    text = q.strip()
    if not text:
        return None
    without_separators = strip_separators(text)
    # Only an ASCII `q` (checked before upper()) is also searched as tax id.
    is_tax_id_text = bool(without_separators) and without_separators.isascii()
    tax_id_text = without_separators.upper() if is_tax_id_text else None
    return SearchQuery(name_text=fold_text(text), tax_id_text=tax_id_text)


def matches(customer: Searchable, query: SearchQuery) -> bool:
    if query.name_text and query.name_text in fold_text(customer.name):
        return True
    return query.tax_id_text is not None and query.tax_id_text in customer.tax_id


def sort_customers(customers: Iterable[T]) -> list[T]:
    """By folded name and, on a tie, by ascending id (R12)."""
    return sorted(customers, key=lambda c: (fold_text(c.name), c.id))


def search_customers(customers: Iterable[T], q: str | None) -> list[T]:
    """Customers whose name or tax id contains `q`, in the order of R12."""
    query = parse_query(q)
    if query is None:
        return sort_customers(customers)
    return sort_customers(c for c in customers if matches(c, query))

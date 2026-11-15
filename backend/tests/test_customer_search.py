"""Pure search and ordering of customers (spec 001, R7, R12, R14)."""

from dataclasses import dataclass

import pytest

from app.services.customer_search import (
    fold_text,
    parse_query,
    search_customers,
    sort_customers,
)
from tests.constants import (
    N_TILDE_LOWER,
    NBSP,
    SHARP_S,
    TAB,
)


@dataclass
class Row:
    id: int
    name: str
    tax_id: str = "ZZ99999"


def names(rows: list[Row]) -> list[str]:
    return [r.name for r in rows]


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("José", "jose"),
        ("JOSÉ", "jose"),
        ("Núñez", "nunez"),
        ("Álvaro", "alvaro"),
        (f"Acme{NBSP}  Sol", "acme sol"),
        (f"Acme{TAB}Sol", "acme sol"),
        ("  Ana ", "ana"),
        (f"Stra{SHARP_S}e", "strasse"),
        ("é", "e"),  # decomposed input (e + combining acute)
        ("İ", "i"),  # capital I with dot: casefold alone would leave a mark
    ],
)
def test_fold_text(raw: str, expected: str) -> None:
    assert fold_text(raw) == expected


def test_fold_text_does_not_use_upper_case() -> None:
    # The dotless i has no mark: it stays a different letter from "i".
    assert fold_text("ı") == "ı"


@pytest.mark.parametrize("q", [None, "", "   ", f" {NBSP}{TAB} "])
def test_blank_query_means_everybody(q: str | None) -> None:
    assert parse_query(q) is None
    rows = [Row(2, "Beta"), Row(1, "Alfa")]
    assert names(search_customers(rows, q)) == ["Alfa", "Beta"]


def test_q_is_stripped_and_folded_for_names() -> None:
    query = parse_query("  ACME   sol ")
    assert query is not None
    assert query.name_text == "acme sol"


def test_q_is_normalized_as_tax_id_only_when_ascii() -> None:
    ascii_q = parse_query("12.345.678-z")
    assert ascii_q is not None
    assert ascii_q.tax_id_text == "12345678Z"
    for q in (SHARP_S, N_TILDE_LOWER, "café"):
        query = parse_query(q)
        assert query is not None
        assert query.tax_id_text is None


def test_q_made_only_of_separators_is_searched_by_name_only() -> None:
    query = parse_query("---")
    assert query is not None
    assert query.tax_id_text is None
    assert query.name_text == "---"
    assert search_customers([Row(1, "Alfa", "12345678Z")], "---") == []


def test_search_by_name_ignores_case_marks_and_extra_spaces() -> None:
    rows = [Row(1, "José Pérez"), Row(2, "Núñez S.L."), Row(3, "X")]
    assert names(search_customers(rows, "jose")) == ["José Pérez"]
    assert names(search_customers(rows, "nu")) == ["Núñez S.L."]
    assert names(search_customers(rows, "NUÑ")) == ["Núñez S.L."]
    assert names(search_customers([Row(1, "Jose")], "JOSÉ")) == ["Jose"]


def test_search_collapses_whitespace_in_q_and_in_name() -> None:
    rows = [Row(1, "Acme   Soluciones S.L.")]
    assert search_customers(rows, "acme soluciones") == rows
    assert search_customers(rows, "acme    sol") == rows
    assert search_customers(rows, f"acme{NBSP}sol") == rows
    assert search_customers(rows, f"acme{TAB}sol") == rows


def test_search_by_tax_id_uses_the_stored_normalization() -> None:
    rows = [Row(1, "Alfa", "12345678Z"), Row(2, "Beta", "SS123")]
    assert names(search_customers(rows, "12.345.678-z")) == ["Alfa"]
    assert names(search_customers(rows, f"1234{NBSP}5678z")) == ["Alfa"]
    assert names(search_customers(rows, "5678")) == ["Alfa"]


def test_non_ascii_q_is_not_searched_by_tax_id() -> None:
    rows = [Row(1, "Beta", "SS123"), Row(2, "Strasse GmbH", "XY789")]
    assert names(search_customers(rows, SHARP_S)) == ["Strasse GmbH"]
    rows = [Row(1, "Beta", "N12345"), Row(2, "Núñez", "ABC123")]
    assert names(search_customers(rows, N_TILDE_LOWER)) == ["Núñez"]


@pytest.mark.parametrize("q", ["%", "_", "%a", "a_"])
def test_wildcards_are_literal_text(q: str) -> None:
    rows = [Row(1, "Alfa"), Row(2, "Beta")]
    assert search_customers(rows, q) == []
    assert names(search_customers([Row(1, "100% Alfa")], "%")) == ["100% Alfa"]


def test_q_that_folds_to_nothing_matches_no_name() -> None:
    assert search_customers([Row(1, "Alfa")], "́") == []


def test_sort_ignores_case_marks_and_extra_spaces_then_uses_id() -> None:
    rows = [Row(1, "Zoe"), Row(2, "Álvaro"), Row(3, "Alberto")]
    assert names(sort_customers(rows)) == ["Alberto", "Álvaro", "Zoe"]
    rows = [Row(1, "beta"), Row(2, "Alfa"), Row(3, "alfa")]
    assert [r.id for r in sort_customers(rows)] == [2, 3, 1]
    rows = [Row(1, "José"), Row(2, "Jose")]
    assert [r.id for r in sort_customers(rows)] == [1, 2]
    rows = [Row(1, "Ana  Ruiz"), Row(2, "Ana Ruiz"), Row(3, "Álex")]
    assert [r.id for r in sort_customers(rows)] == [3, 1, 2]


def test_ties_are_ordered_by_ascending_id_whatever_the_input_order() -> None:
    rows = [Row(3, "ana"), Row(1, "Ana"), Row(4, "Aná"), Row(2, "Ana ")]
    assert [r.id for r in sort_customers(rows)] == [1, 2, 3, 4]

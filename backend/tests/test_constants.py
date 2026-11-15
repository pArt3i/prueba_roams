"""The test constants are the characters they claim to be."""

import unicodedata

import pytest

from tests import constants


@pytest.mark.parametrize(
    ("value", "name"),
    [
        (constants.NBSP, "NO-BREAK SPACE"),
        (constants.IDEOGRAPHIC_SPACE, "IDEOGRAPHIC SPACE"),
        (constants.SHARP_S, "LATIN SMALL LETTER SHARP S"),
        (constants.DOTLESS_I, "LATIN SMALL LETTER DOTLESS I"),
        (constants.FI_LIGATURE, "LATIN SMALL LIGATURE FI"),
        (constants.LONG_S, "LATIN SMALL LETTER LONG S"),
        (constants.N_TILDE_UPPER, "LATIN CAPITAL LETTER N WITH TILDE"),
        (constants.N_TILDE_LOWER, "LATIN SMALL LETTER N WITH TILDE"),
        (constants.E_ACUTE_UPPER, "LATIN CAPITAL LETTER E WITH ACUTE"),
        (constants.E_ACUTE_LOWER, "LATIN SMALL LETTER E WITH ACUTE"),
    ],
)
def test_single_characters_have_the_expected_name(value: str, name: str) -> None:
    assert len(value) == 1
    assert unicodedata.name(value) == name


def test_arabic_digits_are_eight_non_ascii_digits() -> None:
    assert len(constants.ARABIC_DIGITS) == 8
    assert not constants.ARABIC_DIGITS.isascii()
    assert all(c.isdigit() for c in constants.ARABIC_DIGITS)
    assert [unicodedata.digit(c) for c in constants.ARABIC_DIGITS] == list(range(1, 9))


def test_upper_case_of_the_tricky_characters_is_ascii() -> None:
    assert constants.SHARP_S.upper() == "SS"
    assert constants.DOTLESS_I.upper() == "I"
    assert constants.FI_LIGATURE.upper() == "FI"
    assert constants.LONG_S.upper() == "S"

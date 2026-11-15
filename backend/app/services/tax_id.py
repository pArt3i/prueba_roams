"""Normalization and validation of tax identifiers (spec 001, R2 to R4).

Pure logic, no FastAPI, no database. Algorithms are in the skill `validacion-nif`.
"""

import re

from app.services.country import normalize_country

DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE"
CIF_CONTROL_LETTERS = "JABCDEFGHI"
_NIE_PREFIX = {"X": "0", "Y": "1", "Z": "2"}
# CIF types by the control character they accept.
_CIF_DIGIT_ONLY = "ABEH"
_CIF_LETTER_ONLY = "NPQRSW"

# Patterns use [0-9] (not \d) and fullmatch (not $, which allows a trailing newline).
_DNI = re.compile(r"[0-9]{8}[A-Z]")
_NIE = re.compile(r"[XYZ][0-9]{7}[A-Z]")
_CIF = re.compile(r"[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]")
_GENERIC = re.compile(r"[A-Z0-9]{5,20}")

EMPTY_MESSAGE = "El identificador fiscal es obligatorio."
INVALID_MESSAGE = "Identificador fiscal no válido."


class TaxIdError(ValueError):
    """Tax identifier error; the message is ready to show to the user."""


class TaxIdEmptyError(TaxIdError):
    """The tax identifier is empty after removing separators."""

    def __init__(self) -> None:
        super().__init__(EMPTY_MESSAGE)


class InvalidTaxIdError(TaxIdError):
    """The tax identifier does not have a valid format or check character."""

    def __init__(self) -> None:
        super().__init__(INVALID_MESSAGE)


def strip_separators(raw: str) -> str:
    """Remove hyphens, dots and any Unicode whitespace (`str.isspace()`); no upper case."""
    return "".join(c for c in raw if not c.isspace() and c not in ".-")


def normalize_tax_id(raw: str) -> str:
    """Stored and compared value: no separators, upper case."""
    return strip_separators(raw).upper()


def _dni_letter(number: int) -> str:
    return DNI_LETTERS[number % 23]


def is_valid_dni(value: str) -> bool:
    return bool(_DNI.fullmatch(value)) and value[8] == _dni_letter(int(value[:8]))


def is_valid_nie(value: str) -> bool:
    if not _NIE.fullmatch(value):
        return False
    number = int(_NIE_PREFIX[value[0]] + value[1:8])
    return value[8] == _dni_letter(number)


def _double_digit_sum(digit: int) -> int:
    return sum(divmod(digit * 2, 10))


def is_valid_cif(value: str) -> bool:
    if not _CIF.fullmatch(value):
        return False
    digits = [int(c) for c in value[1:8]]
    even_sum = digits[1] + digits[3] + digits[5]
    odd_sum = sum(_double_digit_sum(d) for d in digits[0::2])
    control_digit = (10 - (even_sum + odd_sum) % 10) % 10
    control = value[8]
    as_digit = str(control_digit)
    as_letter = CIF_CONTROL_LETTERS[control_digit]
    kind = value[0]
    if kind in _CIF_DIGIT_ONLY:
        return control == as_digit
    if kind in _CIF_LETTER_ONLY:
        return control == as_letter
    return control in (as_digit, as_letter)


def is_valid_spanish_tax_id(stripped: str) -> bool:
    """Valid DNI, NIE or CIF. Takes the value WITHOUT upper-casing it first.

    A value with any non-ASCII character is never valid. This is checked before
    `upper()` so that U+0131 (dotless i) does not become the `I` of a CIF control.
    """
    if not stripped.isascii():
        return False
    normalized = stripped.upper()
    return (
        is_valid_dni(normalized) or is_valid_nie(normalized) or is_valid_cif(normalized)
    )


def is_valid_generic_tax_id(stripped: str) -> bool:
    """Format for non-ES countries (R4). Takes the value WITHOUT upper-casing it first.

    Any non-ASCII character is invalid and is checked before `upper()`, so that
    U+00DF (sharp s), U+0131 (dotless i) or U+FB01 (fi ligature) do not turn into
    ASCII (`SS`, `I`, `FI`).
    """
    if not stripped.isascii():
        return False
    return bool(_GENERIC.fullmatch(stripped.upper()))


def normalize_and_validate_tax_id(raw: str, country: str) -> str:
    """Return the normalized tax identifier or raise `TaxIdError`.

    `country` is already validated by the caller; only ES is told apart from the rest.
    """
    stripped = strip_separators(raw)
    if not stripped:
        raise TaxIdEmptyError()
    if normalize_country(country) == "ES":
        valid = is_valid_spanish_tax_id(stripped)
    else:
        valid = is_valid_generic_tax_id(stripped)
    if not valid:
        raise InvalidTaxIdError()
    return stripped.upper()

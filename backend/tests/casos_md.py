"""The rows of validacion-nif/casos.md, defined once for every test that uses them.

Special characters are built with `chr()` (see tests/constants.py), never written.
"""

from tests.constants import ARABIC_DIGITS, DOTLESS_I, NBSP

# One row per case, in the same order as the file:
# (identifier, valid, expected normalized value or None when invalid).
CASOS_MD: list[tuple[str, bool, str | None]] = [
    ("12345678Z", True, "12345678Z"),
    ("00000000T", True, "00000000T"),
    ("12345678z", True, "12345678Z"),
    ("12.345.678-Z", True, "12345678Z"),
    (f"1234{NBSP}5678Z", True, "12345678Z"),
    ("X1234567L", True, "X1234567L"),
    ("Y1234567X", True, "Y1234567X"),
    ("Z1234567R", True, "Z1234567R"),
    ("A58818501", True, "A58818501"),
    ("B12345674", True, "B12345674"),
    ("P2812345C", True, "P2812345C"),
    ("C12345674", True, "C12345674"),
    ("C1234567D", True, "C1234567D"),
    ("12345678A", False, None),
    ("1234567Z", False, None),
    ("123456789", False, None),
    ("X1234567A", False, None),
    ("B12345675", False, None),
    ("B1234567D", False, None),
    ("P28123453", False, None),
    ("I12345674", False, None),
    ("ABCDEFGHI", False, None),
    (f"{ARABIC_DIGITS}Z", False, None),
    (f"P1111111{DOTLESS_I}", False, None),
    ("", False, None),
]

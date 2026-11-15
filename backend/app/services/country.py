"""Single place where a country code is normalized (spec 001 R1, spec 002 R4)."""


def normalize_country(raw: str) -> str:
    """Return the country code in upper case, ignoring the case of the input.

    Only an ASCII value is converted. A value with any non-ASCII character is
    returned unchanged, so it can never equal an ASCII code: `str.upper()` would
    turn U+017F (long s) in "e" + U+017F into "ES", and U+0131 (dotless i) in
    "it" into "IT".
    """
    return raw.upper() if raw.isascii() else raw

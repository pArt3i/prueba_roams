"""Special characters used by the tests, defined once and built with `chr()`.

Never write these characters as literals in a test: most of them are invisible or
look like an ASCII letter, and an editor or formatter could silently replace them.
"""

# Whitespace that is not U+0020 (both are separators for `str.isspace()`).
NBSP = chr(0x00A0)  # no-break space
IDEOGRAPHIC_SPACE = chr(0x3000)

# Characters whose `str.upper()` is ASCII (or looks like it).
SHARP_S = chr(0x00DF)  # upper() -> "SS"
DOTLESS_I = chr(0x0131)  # upper() -> "I"
FI_LIGATURE = chr(0xFB01)  # upper() -> "FI"
LONG_S = chr(0x017F)  # upper() -> "S"

# Arabic-Indic digits 1 to 8 (U+0661 to U+0668): `\d` matches them, `[0-9]` does not.
ARABIC_DIGITS = "".join(chr(0x0661 + i) for i in range(8))

# Latin-1 letters that are not ASCII and whose upper/lower case is not ASCII either.
N_TILDE_UPPER = chr(0x00D1)
N_TILDE_LOWER = chr(0x00F1)
E_ACUTE_UPPER = chr(0x00C9)
E_ACUTE_LOWER = chr(0x00E9)

# Control whitespace that `str.isspace()` also treats as a separator.
TAB = chr(0x0009)
NEWLINE = chr(0x000A)

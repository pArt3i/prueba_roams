"""Expected user-facing messages (spec 001, Errores): the only copy for all tests.

The accented letters are written as literals, in UTF-8. The text is checked against
the spec, not against the application, so a change in the app must not change it.
"""

BODY_INVALID = "Cuerpo de la petición no válido."
NAME_REQUIRED = "El nombre es obligatorio."
NAME_TOO_LONG = "El nombre no puede superar 120 caracteres."
EMAIL_REQUIRED = "El email es obligatorio."
EMAIL_INVALID = "El email no es válido."
COUNTRY_REQUIRED = "El país es obligatorio."
COUNTRY_UNSUPPORTED = "País no admitido."
PLAN_REQUIRED = "El plan es obligatorio."
PLAN_INVALID = "Plan no válido. Valores admitidos: starter, business, enterprise."
TAX_ID_REQUIRED = "El identificador fiscal es obligatorio."
TAX_ID_INVALID = "Identificador fiscal no válido."
TAX_ID_DUPLICATE = "Ya existe un cliente con ese identificador fiscal."
NOT_FOUND = "Cliente no encontrado."
ID_INVALID = "Identificador de cliente no válido."

# Spec 002 (Errores)
USERS_INVALID = "El número de usuarios debe ser un entero entre 1 y 10000."
STORAGE_INVALID = "El almacenamiento debe ser un entero entre 0 y 1000000."
API_CALLS_INVALID = "Las llamadas a la API deben ser un entero entre 0 y 1000000000."

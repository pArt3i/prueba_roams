---
name: convenciones-backend
description: Convenciones del backend de SaaS-O-Matic (estructura de FastAPI, SQLAlchemy 2, errores HTTP, dinero y tests con pytest). Úsala siempre que escribas o revises código Python en backend/.
---
# Convenciones del backend

## Estructura

- `app/main.py`: crea la app, registra los routers y la configuración CORS.
- `app/db.py`: motor, sesión por petición (dependencia `get_db`) y creación de tablas.
- `app/models/`: modelos SQLAlchemy.
- `app/schemas/`: modelos Pydantic de entrada y salida.
- `app/routers/`: un router por recurso (clientes, simulaciones, cálculo).
- `app/repositories/`: acceso a la base de datos; `services/` no lo toca.
- `app/services/`: lógica de negocio pura (precios, validación de NIF). Sin FastAPI ni base de datos, para poder probarla sola.
- `tests/`: un archivo de test por servicio o router, con fixtures en `conftest.py`.

## Reglas

- Routers finos: validan la entrada, llaman a un servicio y devuelven un schema. Sin lógica de negocio.
- SQLAlchemy 2.x: `Mapped`, `mapped_column` y `select()`.
- Importes: `Decimal` en el cálculo. En base de datos, céntimos como entero (`*_cents`), porque SQLite no soporta `Decimal` y `Numeric` acabaría guardándose como `float`.
- Errores con `HTTPException` y mensaje claro: 422 validación, 404 no encontrado, 409 duplicado.
- Usa `response_model` en todos los endpoints.
- La ruta de la base de datos sale de la variable `DATABASE_URL`, con un valor por defecto `sqlite:///./saas_o_matic.db`.
- CORS: permite `http://localhost:5173`, que es donde sirve Vite.
- Tipos en todas las funciones. Ruff sin avisos. Máximo 200 líneas por archivo.

## Tests

- pytest con `TestClient` y una base de datos SQLite temporal por test.
- Cada regla de `reglas-negocio` y cada caso de `validacion-nif/casos.md` tienen su test.
- Nombra los tests de aceptación con el criterio de la spec, por ejemplo `test_ca3_rechaza_nif_invalido`.

# 000 · Estructura del proyecto y esquema de la base de datos
Estado: Referencia (descripción del código, no una decisión)
Fecha: 2026-11-15

Documento descriptivo, sacado del código en `backend/app/models/`, `backend/app/db.py` y las carpetas de `backend/` y `frontend/`. Las decisiones que lo explican están en los [ADR](.) 001, 004, 005 y 008. Si el código cambia, gana el código.

## Base de datos

SQLite, archivo `backend/saas_o_matic.db` por defecto (variable `DATABASE_URL`, ver `app/config.py`). Las tablas se crean con `Base.metadata.create_all` al arrancar la app (`init_db`, en el `lifespan` de `app/main.py`). No hay migraciones: ni Alembic ni otra herramienta en `requirements.txt`.

Todas las columnas son `NOT NULL` (ninguna se declara opcional en los modelos).

### Tabla `customers` (`app/models/customer.py`)

| Columna | Tipo | Restricciones | Notas |
| --- | --- | --- | --- |
| `id` | entero | clave primaria | |
| `name` | `VARCHAR(120)` | | Recortado de espacios; máximo 120 caracteres |
| `tax_id` | `VARCHAR` | `UNIQUE` | Valor normalizado, único entre todos los países ([ADR 008](008-duplicados-409.md)) |
| `email` | `VARCHAR(254)` | | En minúsculas |
| `country` | `VARCHAR(2)` | | Código en mayúsculas |
| `plan` | `VARCHAR(10)` | | `starter`, `business` o `enterprise` ([ADR 005](005-planes-informativos.md)) |

### Tabla `simulations` (`app/models/simulation.py`)

Cada fila es una instantánea del precio en el momento de guardar: el historial no se recalcula.

| Columna | Tipo | Restricciones | Notas |
| --- | --- | --- | --- |
| `id` | entero | clave primaria | |
| `customer_id` | entero | clave foránea a `customers.id`, con índice | |
| `users` | entero | | |
| `storage_gb` | entero | | Informativo, no cambia el precio ([ADR 004](004-almacenamiento-y-llamadas-api.md)) |
| `api_calls` | entero | | Informativo, no cambia el precio (ADR 004) |
| `country` | `VARCHAR(2)` | | Copia del país del cliente al simular |
| `vat_rate` | `VARCHAR` | | Texto decimal, por ejemplo `"0.21"` |
| `subtotal_cents` | entero | | EUR, en céntimos |
| `vat_cents` | entero | | EUR, en céntimos |
| `total_cents` | entero | | EUR, en céntimos |
| `created_at` | `DATETIME` | | UTC sin zona horaria, en segundos enteros (`app/clock.py`, `to_storage`) |

### Relación y garantías

- Un cliente tiene muchas simulaciones (`simulations.customer_id` → `customers.id`). Los modelos no declaran `relationship()`: el historial se consulta por `customer_id` en `app/repositories/simulations.py`, ordenado por `created_at` y `id` descendentes.
- La unicidad de `tax_id` la garantiza la restricción `UNIQUE`; el repositorio comprueba antes de insertar y traduce el `IntegrityError` a 409.
- El código no ejecuta `PRAGMA foreign_keys`, por lo que SQLite no aplica la clave foránea por defecto.
- No hay restricciones `CHECK` ni listas cerradas en la base de datos. Los valores de `plan` y `country`, el formato del identificador fiscal y la longitud del nombre y del email se validan en `app/services/customer_input.py`.
- Los importes se guardan como enteros en céntimos de EUR; la conversión a USD o GBP solo se hace en el frontend para mostrar.

## Organización de carpetas

Raíz: `backend/`, `frontend/`, `ai-workspace/` (documentación del proceso), `.claude/` (agentes, skills, hooks y ajustes de Claude Code) y `CLAUDE.md`.

### `backend/`

| Ruta | Contenido |
| --- | --- |
| `app/main.py` | `create_app`: routers, CORS, manejadores de error y creación de tablas al arrancar |
| `app/config.py`, `app/db.py` | Configuración por variables de entorno; motor, sesión por petición y `init_db` |
| `app/errors.py`, `app/clock.py` | Formato de error `{"detail": "..."}` en español; único lugar que lee la hora |
| `app/routers/` | Endpoints finos (`customers.py`, `simulations.py`) y dependencias comunes (`deps.py`) |
| `app/services/` | Lógica de negocio sin FastAPI ni base de datos: `pricing.py`, `money.py`, `tax_id.py`, `country.py`, `customer_input.py`, `simulation_input.py`, `customer_search.py` |
| `app/repositories/` | Acceso a la base de datos (`customers.py`, `simulations.py`) |
| `app/models/` | Modelos SQLAlchemy `Customer` y `Simulation` |
| `app/schemas/` | Esquemas de respuesta de la API |
| `tests/` | Tests de pytest por funcionalidad, más ayudantes (`conftest.py`, `helpers.py`, `sim_helpers.py`, `constants.py`, `messages.py`, `casos_md.py`) |
| `requirements.txt`, `pytest.ini` | Dependencias y configuración de pytest |

### `frontend/`

Vue 3 con Vite y TypeScript, sin router ni Pinia (`src/main.ts` monta `App.vue`).

| Ruta | Contenido |
| --- | --- |
| `src/views/` | `CustomersView.vue` (lista, buscador y alta) y `CustomerDetailView.vue` (ficha, simulador e historial) |
| `src/components/` | Componentes Vue: tarjetas, formulario, simulador, desglose de precio, historial y estados de carga, error y vacío |
| `src/composables/` | Estado y lógica reutilizable: clientes, alta, precio, guardado, historial, tipos de cambio y divisa mostrada |
| `src/services/` | Llamadas a la API del backend y a `open.er-api.com`, y tratamiento de errores de la API |
| `src/utils/` | Formato y conversión de divisa |
| `src/types/`, `src/constants/` | Tipos TypeScript y constantes |
| `src/assets/` | Estilos (`main.css`) |
| `src/__tests__/`, `**/__tests__/` | Tests de Vitest junto al código que prueban, más ayudantes de montaje |
| `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `eslint.config.ts`, `.oxlintrc.json` | Configuración de build, tests, tipos y lint |

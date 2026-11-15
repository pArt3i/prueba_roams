# SaaS-O-Matic

Simulador interno de suscripciones SaaS para comerciales. Permite dar de alta clientes, simular el precio mensual de su suscripción y consultar el historial de simulaciones.

- Alta y búsqueda de clientes (por nombre o identificador fiscal).
- Simulador de precio mensual con tramos acumulativos por usuario e IVA según el país del cliente.
- Visualización de importes en EUR, USD y GBP.
- Historial de simulaciones por cliente.

## Stack

Versiones mínimas según el [ADR 001](ai-workspace/02-arquitectura/001-stack.md).

| Parte | Tecnología | Versión mínima |
| --- | --- | --- |
| Backend | Python | 3.12 o superior (probado con 3.13.8) |
| | FastAPI | 0.162.7 |
| | SQLAlchemy + SQLite | 2.1.8 |
| | Pydantic | 2.14.3 |
| | email-validator | 2.4.0 |
| Frontend | Vue 3 + TypeScript | 3.5.42 |
| | Vite | 8.2.2 |
| | Node | `^22.18.0 \|\| >=24.12.0` |

Tests y calidad: pytest y ruff en el backend; Vitest, vue-tsc, oxlint y ESLint en el frontend.

## Estructura

| Carpeta | Contenido |
| --- | --- |
| `backend/` | API en Python (FastAPI) y sus tests |
| `frontend/` | Aplicación Vue 3 (Vite, TypeScript) |
| `ai-workspace/` | Specs, ADR, auditorías y bitácora del proceso con IA |
| `.claude/` | Agentes, skills, hooks y configuración de Claude Code |
| `CLAUDE.md` | Reglas del proyecto para la IA |

`backend/app/`:

| Carpeta | Contenido |
| --- | --- |
| `routers/` | Endpoints, finos: validan, llaman a un servicio y devuelven un esquema |
| `services/` | Lógica de negocio: precio, dinero, país, validación de NIF/NIE/CIF, búsqueda |
| `repositories/` | Acceso a la base de datos |
| `models/` | Modelos SQLAlchemy |
| `schemas/` | Esquemas de entrada y salida de la API |

`frontend/src/`:

| Carpeta | Contenido |
| --- | --- |
| `views/` | Pantallas: lista de clientes y detalle con simulador |
| `components/` | Componentes Vue |
| `composables/` | Estado y lógica reutilizable (búsqueda, precio, divisas, historial) |
| `services/` | Llamadas a la API del backend y a la API de tipos de cambio |
| `utils/` | Formato y conversión de divisa |
| `types/`, `constants/` | Tipos TypeScript y constantes |

## Puesta en marcha (Windows)

Requisitos:

- Python 3.12 o superior; se recomienda Python 3.13 (probado con 3.13.8).
- Node en la versión de `engines` de `frontend/package.json` (`^22.18.0 || >=24.12.0`); se recomienda Node 22.22 o superior (con 22.20 funciona, pero npm muestra avisos `EBADENGINE`).

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app
```

Escucha en <http://127.0.0.1:8000> (valores por defecto de uvicorn). Hay que arrancarlo desde `backend/`.

La base de datos SQLite es `backend/saas_o_matic.db` (ruta relativa a la carpeta desde la que se arranca). Las tablas se crean solas al arrancar y el archivo no se versiona. Se puede cambiar con la variable `DATABASE_URL`; los orígenes CORS permitidos, con `CORS_ORIGINS` (por defecto `http://localhost:5173`, separados por comas).

### Frontend

```powershell
cd frontend
npm install
copy .env.example .env
npm run dev
```

`.env` contiene `VITE_API_URL=http://localhost:8000`. Vite sirve la aplicación en <http://localhost:5173>.

En PowerShell, si la política de ejecución bloquea los scripts, usa `npm.cmd` en lugar de `npm` (por ejemplo `npm.cmd install`).

## Tests y lint

El entorno virtual no se activa: se llama directamente.

Backend:

```powershell
cd backend
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m ruff format .
.venv/Scripts/python -m ruff check .
```

Frontend:

```powershell
cd frontend
npm run test:unit -- --run
npm run type-check
npm run lint
```

`npm run lint` aplica correcciones automáticas (`--fix`). Antes de un commit, la skill `/verify` pasa todo lo anterior más el build del frontend.

## API

Documentación interactiva de FastAPI en `/docs` (<http://127.0.0.1:8000/docs>).

- `POST /customers`: da de alta un cliente (422 si los datos no son válidos, 409 si el identificador fiscal ya existe).
- `GET /customers?q=`: lista los clientes, filtrados por nombre o identificador fiscal si se indica `q`.
- `GET /customers/{id}`: devuelve un cliente (404 si no existe).
- `POST /simulations/preview`: calcula el precio para un número de usuarios y un país, sin guardar nada.
- `POST /simulations`: calcula el precio con el país del cliente y guarda la simulación.
- `GET /customers/{id}/simulations`: historial del cliente, de más reciente a más antiguo.

## Reglas de negocio

La fuente única es la skill [`reglas-negocio`](.claude/skills/reglas-negocio/SKILL.md); aquí solo el resumen.

- Precio por usuario y mes con tramos acumulativos (1–10, 11–50, 51 o más): cada usuario paga el precio de su tramo.
- IVA del país del cliente (ES, PT, FR, DE, IT), tabla en [`iva.md`](.claude/skills/reglas-negocio/iva.md) y [ADR 003](ai-workspace/02-arquitectura/003-iva-por-pais.md).
- El precio lo calcula solo el backend, con `Decimal` ([ADR 002](ai-workspace/02-arquitectura/002-calculo-precio-backend.md)); la simulación guarda el tipo y los importes del momento.
- Almacenamiento, llamadas a la API y plan se guardan pero no cambian el precio ([ADR 004](ai-workspace/02-arquitectura/004-almacenamiento-y-llamadas-api.md), [ADR 005](ai-workspace/02-arquitectura/005-planes-informativos.md)).
- Todo se guarda en EUR; el frontend convierte a USD o GBP solo para mostrar ([ADR 007](ai-workspace/02-arquitectura/007-divisas.md)). El NIF, NIE y CIF se validan en el alta ([ADR 006](ai-workspace/02-arquitectura/006-validacion-identificador-fiscal.md)).

## Cómo se ha construido con IA

El proyecto se ha desarrollado con Claude Code siguiendo un flujo **spec → implementación → auditoría**:

1. El arquitecto redacta una spec en `ai-workspace/01-specs/`, que Pablo aprueba antes de escribir código.
2. Los agentes `backend-dev` y `frontend-dev` implementan, y `qa-tester` escribe y ejecuta los tests.
3. El `auditor`, independiente de quien implementó, compara el código con la spec; su informe se guarda en `ai-workspace/03-proceso/auditorias/`.

Evidencias en [`ai-workspace/`](ai-workspace/README.md): [specs](ai-workspace/01-specs), [ADR](ai-workspace/02-arquitectura), [auditorías](ai-workspace/03-proceso/auditorias) y [bitácora](ai-workspace/03-proceso/bitacora.md). Las reglas dadas a la IA están en [`CLAUDE.md`](CLAUDE.md).

## Limitaciones conocidas

- IVA: solo el tipo general; sin tipos reducidos, exenciones ni inversión del sujeto pasivo.
- Solo cinco países: ES, PT, FR, DE e IT.
- Sin autenticación.
- Sin paginación en la lista de clientes ni en el historial.
- SQLite: pensado para un equipo pequeño; con varios escritores concurrentes habría que pasar a otra base de datos ([ADR 001](ai-workspace/02-arquitectura/001-stack.md)).
- Tipos de cambio de [open.er-api.com](https://open.er-api.com) (`GET /v6/latest/EUR`), pedidos desde el navegador. Si falla o tarda más de 5 segundos, se muestra en EUR con un aviso. Atribución obligatoria: [Rates By Exchange Rate API](https://www.exchangerate-api.com).

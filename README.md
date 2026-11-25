# SaaS-O-Matic

Herramienta para que un equipo comercial dé de alta clientes, simule el precio mensual de una suscripción SaaS y guarde el historial. Es mi solución a la prueba técnica «SaaS-O-Matic»: backend en Python, frontend en Vue y, aparte del código, la carpeta [`ai-workspace/`](ai-workspace/README.md), donde se ve cómo lo planifiqué y cómo revisé lo que escribía la IA.

Qué hace:

- Alta y búsqueda de clientes, por nombre o identificador fiscal.
- Simulador de precio mensual con tramos acumulativos por usuario e IVA según el país del cliente.
- Importes en EUR, USD y GBP.
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
| | Node | ^22.18.0 \|\| >=24.12.0 |

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
- Node en la versión de `engines` de `frontend/package.json` (`^22.18.0 || >=24.12.0`); se recomienda Node 22.22 o superior (con 22.20 funciona, pero npm muestra avisos EBADENGINE).

### Backend

```
cd backend
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app
```

Escucha en http://127.0.0.1:8000 (valores por defecto de uvicorn). Hay que arrancarlo desde `backend/`.

La base de datos SQLite es `backend/saas_o_matic.db` (ruta relativa a la carpeta desde la que se arranca). Las tablas se crean solas al arrancar y el archivo no se versiona. Se puede cambiar con la variable `DATABASE_URL`; los orígenes CORS permitidos, con `CORS_ORIGINS` (por defecto `http://localhost:5173`, separados por comas).

### Frontend

```
cd frontend
npm install
copy .env.example .env
npm run dev
```

`.env` contiene `VITE_API_URL=http://localhost:8000`. Vite sirve la aplicación en http://localhost:5173.

En PowerShell, si la política de ejecución bloquea los scripts, usa `npm.cmd` en lugar de `npm` (por ejemplo `npm.cmd install`).

## Tests y lint

El entorno virtual no se activa: se llama directamente.

Backend:

```
cd backend
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m ruff format .
.venv/Scripts/python -m ruff check .
```

Frontend:

```
cd frontend
npm run test:unit -- --run
npm run type-check
npm run lint
```

`npm run lint` aplica correcciones automáticas (`--fix`). Antes de un commit, la skill [`/verify`](.claude/skills/verify/SKILL.md) pasa todo lo anterior más el build del frontend.

## API

Documentación interactiva de FastAPI en `/docs` (http://127.0.0.1:8000/docs).

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

## Cómo lo he construido con IA

No le pedí a la IA «hazme la app». Antes de escribir una línea de código redactamos las specs: qué hace cada cosa, qué errores devuelve y qué casos límite hay. Yo las leía, cambiaba lo que no me convencía y solo entonces las aprobaba.

Después trabajé con cinco agentes de Claude Code con papeles distintos: arquitecto, backend-dev, frontend-dev, qa-tester y auditor. La regla que más me importó es que quien programa no revisa su propio trabajo: de eso se encarga el auditor, que compara el código con la spec. El flujo de cada funcionalidad fue siempre el mismo: spec, implementación, auditoría.

**Qué hice yo:** definir el problema y las reglas de negocio, decidir, aprobar las specs, corregir a la IA cuando se equivocaba y hacer todos los commits.

**Qué hizo la IA:** proponer specs y decisiones de arquitectura, escribir el código y los tests, y auditarlos.

Algunas cosas que tuve que corregir por el camino:

- El arquitecto comprimió una spec a 200 líneas porque aplicó mal mi regla (el límite era solo para código). Lo detecté y quedó aclarado en `CLAUDE.md`.
- Al reescribir la spec 001 borró una nota mía y tuve que hacérsela restaurar.
- La primera auditoría de la lógica de precios y NIF pidió cambios, y hubo que repetirla.
- Un error mío: un buscar y reemplazar de VS Code tocó también las plantillas de dos skills. Lo vi en `git diff` y lo deshice.

Las pruebas actuales son 555 en el backend y 248 en el frontend. Todo el proceso, con las auditorías incluidas, está en [`ai-workspace/`](ai-workspace/README.md), y las reglas que le di a la IA, en [`CLAUDE.md`](CLAUDE.md).

## Limitaciones conocidas

Lo que sé que no está resuelto:

- IVA: solo el tipo general; sin tipos reducidos, exenciones ni inversión del sujeto pasivo.
- Solo cinco países: ES, PT, FR, DE e IT.
- Sin autenticación.
- Sin paginación en la lista de clientes ni en el historial.
- SQLite: pensado para un equipo pequeño; con varios escritores concurrentes habría que pasar a otra base de datos ([ADR 001](ai-workspace/02-arquitectura/001-stack.md)).

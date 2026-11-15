# SaaS-O-Matic

Simulador interno de suscripciones SaaS para comerciales: alta de clientes, simulación del precio mensual (tramos, IVA, divisas) e historial. Backend en `backend/` (Python, FastAPI, SQLAlchemy, SQLite). Frontend en `frontend/` (Vue 3, Vite, TypeScript). El proceso se documenta en `ai-workspace/`.

## Forma de trabajar
- No escribas código de la aplicación sin una spec con `Estado: Aprobada` en `ai-workspace/01-specs/`. Si no existe, para y avisa a Pablo.
- Si la spec no cubre un caso, pregunta. No inventes reglas de negocio.
- Precios, IVA, planes y divisas: skill `reglas-negocio`. NIF, NIE y CIF: skill `validacion-nif`. No dupliques esas reglas en otros archivos.
- Reparto: `arquitecto` (specs y ADRs), `backend-dev` y `frontend-dev` (implementan), `qa-tester` (tests), `auditor` (revisa). Quien implementa no se audita a sí mismo.
- El informe del auditor se guarda tal cual en `ai-workspace/03-proceso/auditorias/NNN-tema.md`. Los informes con CAMBIOS NECESARIOS no se borran.
- Pablo hace los commits: no ejecutes `git commit` ni `git push`.
- No edites `.env`, archivos `.db` ni `.claude/settings.json` sin que Pablo lo pida.

## Calidad
- Máximo 200 líneas por archivo de código (no aplica a specs ni ADR); si crece, divídelo por responsabilidad.
- Dinero con `Decimal` en Python, nunca `float`. El precio lo calcula solo el backend. El frontend solo convierte la divisa para mostrarlo.
- Todo endpoint y toda regla de negocio llevan test, con sus casos límite.
- Código y nombres en inglés; textos de interfaz y mensajes de error visibles para el usuario en español.
- No añadas dependencias nuevas sin avisar a Pablo.

## Comandos
En Windows el entorno virtual no se activa: se llama directamente.
- Backend, tests: `cd backend && .venv/Scripts/python -m pytest -q`
- Backend, formato y lint: `cd backend && .venv/Scripts/python -m ruff format . && .venv/Scripts/python -m ruff check .`
- Frontend, tests (una pasada, sin modo watch): `cd frontend && npm run test:unit -- --run`
- Frontend, tipos y lint: `cd frontend && npm run type-check && npm run lint`
- Antes de un commit: `/verify`
- No arranques servidores (uvicorn, `npm run dev`) en primer plano durante una tarea: bloquean la sesión. Pídele a Pablo que lo haga.

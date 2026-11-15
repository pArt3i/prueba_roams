---
name: verify
description: Comprueba el proyecto antes de un commit. Pasa formato, lint, tipos y tests del backend (ruff y pytest) y del frontend (type-check, lint, vitest y build). Úsala antes de cada commit o cuando Pablo escriba /verify.
---
# Verificación de SaaS-O-Matic

Mira `git status --short`. Si no hay cambios en `backend/`, omite el bloque de backend. Lo mismo con `frontend/`.
Ejecuta los pasos en orden. Si uno falla, no sigas: resume el error y propón el arreglo.

## Backend

1. `cd backend && .venv/Scripts/python -m ruff format --check .`
2. `cd backend && .venv/Scripts/python -m ruff check .`
3. `cd backend && .venv/Scripts/python -m pytest -q`

## Frontend

1. `cd frontend && npm run type-check`
2. `cd frontend && npm run lint`
3. `cd frontend && npm run test:unit -- --run`
4. `cd frontend && npm run build`, solo antes de entregar o si cambió la configuración.

## Informe

Termina con tres líneas: qué pasó, qué falló y qué falta. No arranques servidores y no des nada por bueno con un paso en rojo.

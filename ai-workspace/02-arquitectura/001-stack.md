# ADR 001 · Stack tecnológico
Estado: Aceptada
Fecha: 2026-11-15

## Contexto
SaaS-O-Matic es un simulador interno de suscripciones para comerciales: alta de clientes, simulación del precio mensual e historial. Es una herramienta pequeña, de un solo equipo, sin requisitos de alta disponibilidad ni de muchos usuarios concurrentes. El stack ya figura en `CLAUDE.md`; este ADR lo deja registrado y razonado.

## Opciones consideradas
1. **FastAPI + SQLAlchemy + SQLite en el backend; Vue 3 + Vite + TypeScript en el frontend (el de `CLAUDE.md`).**
   - Pros: validación y documentación automáticas de la API con Pydantic; tipado en ambos lados; SQLite no requiere servidor y encaja con un entorno de desarrollo en Windows; Vite da arranque y pruebas rápidos.
   - Contras: SQLite no tiene tipo `Decimal` (obliga a guardar céntimos como entero, ver `convenciones-backend`); no sirve tal cual para muchos escritores concurrentes.
2. **Mismo stack con PostgreSQL en lugar de SQLite.**
   - Pros: tipo `NUMERIC` real, concurrencia y restricciones más sólidas.
   - Contras: exige instalar y mantener un servidor de base de datos para una herramienta interna pequeña.
3. **Django (backend y plantillas) en lugar de FastAPI + Vue.**
   - Pros: una sola pieza, panel de administración incluido.
   - Contras: se aparta del enunciado y de `CLAUDE.md`; el frontend con slider reactivo y estados de carga encaja peor.

## Decisión
Decidido: opción 1. Es el stack ya fijado en `CLAUDE.md`, es el más simple de arrancar y no hay requisitos que justifiquen PostgreSQL. Lo que `CLAUDE.md` y las skills `convenciones-*` ya dicen (estructura de carpetas, pytest, ruff, Vitest, sin router ni Pinia, sin dependencias nuevas sin avisar) no se repite aquí.

Dependencia adicional, **autorizada por mí**: `email-validator`, que Pydantic exige para el tipo `EmailStr` (validación del email del cliente, [spec 001](../01-specs/001-clientes.md), R10). Es la aprobación que pide `CLAUDE.md` para añadir dependencias; cualquier otra sigue necesitando aviso previo. Está instalada y fijada en `backend/requirements.txt` con la versión de la tabla, igual que `dnspython`, que es dependencia de `email-validator` y no se usa directamente.

Versiones mínimas, por decisión mía: las instaladas hoy, tomadas de `backend/requirements.txt` y `frontend/package.json`, salvo Python, que se fija como indica la tabla.

| Pieza | Versión mínima | Fuente |
| --- | --- | --- |
| Python | 3.12 o superior, probado con 3.13.8 | Decisión mía (no figura en `requirements.txt`) |
| FastAPI | 0.162.7 | `requirements.txt` |
| SQLAlchemy | 2.1.8 | `requirements.txt` |
| Pydantic | 2.14.3 | `requirements.txt` |
| email-validator | 2.4.0 | `requirements.txt` (instalada al implementar la spec 001) |
| dnspython | 2.9.2 | `requirements.txt` (dependencia de `email-validator`) |
| Node | `^22.18.0 \|\| >=24.12.0` | `engines` de `package.json` |
| Vue | 3.5.42 | `package.json` (`^3.5.42`) |
| Vite | 8.2.2 | `package.json` (`^8.2.2`) |

## Consecuencias
- Mejora: arranque rápido, un solo archivo de base de datos, contratos de API tipados.
- Se complica: el dinero se guarda en céntimos enteros (`*_cents`) y hay que convertir al entrar y salir de la base de datos.
- `email-validator` es una dependencia más que instalar y mantener. Puede rechazar dominios reservados o de uso especial (p. ej. terminados en `.test` o `.local`), así que los tests de email deben usar dominios con forma real, como `acme.com`.
- Python: el código no debe usar nada posterior a 3.12, pero los tests solo se ejecutan con 3.13.8; la compatibilidad con 3.12 se asume, no se comprueba.
- Si la herramienta crece a varios usuarios escribiendo a la vez, habrá que reabrir la opción 2 (el uso de SQLAlchemy y `DATABASE_URL` facilita el cambio).

## Preguntas abiertas
- Ninguna. La versión de `email-validator` (2.4.0) y la de `dnspython` (2.9.2) quedan fijadas en la tabla, con las que se instalaron al implementar la spec 001.

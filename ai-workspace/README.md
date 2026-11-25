# ai-workspace

Aquí está lo que más importa de esta prueba: cómo planifiqué, qué decidí y cómo controlé lo que escribía la IA. Para ejecutar el proyecto, mira el [README principal](../README.md).

Si tienes cinco minutos, te recomiendo este orden:

1. La [spec 001](01-specs/001-clientes.md) y su sección «Mis cambios»: lo que corregí antes de aprobarla.
2. La [auditoría 001](03-proceso/auditorias/001-logica-pura-precio-nif.md), la que pidió cambios.
3. La [bitácora](03-proceso/bitacora.md), con lo que pedí, lo que propuso la IA y lo que corregí.

## 1. Planificación y specs

Una spec por funcionalidad. Ninguna se programó sin estar aprobada (`Estado: Aprobada`), y cada una tiene una sección «Mis cambios» donde anoto lo que corregí antes de aprobar.

| Spec | Qué cubre |
| --- | --- |
| [001 · Clientes](01-specs/001-clientes.md) | API de clientes: alta con validación de NIF/NIE/CIF y duplicados (409), búsqueda y consulta |
| [002 · Precio y simulaciones](01-specs/002-precio-y-simulaciones.md) | Cálculo del precio mensual en el backend (tramos, IVA), guardado de simulaciones e historial |
| [003 · Frontend de clientes](01-specs/003-frontend-clientes.md) | Dashboard con tarjetas, buscador con espera, contador y formulario de alta |
| [004 · Frontend de detalle y simulador](01-specs/004-frontend-detalle-simulador.md) | Ficha del cliente, slider de usuarios, divisas EUR/USD/GBP, guardado e historial |

## 2. Arquitectura y directrices a la IA

Las decisiones están en ADR, todas aceptadas.

| Documento | Tema |
| --- | --- |
| [000 · Estructura y base de datos](02-arquitectura/000-estructura-y-bd.md) | Esquema de `customers` y `simulations` y organización de carpetas (referencia, no decisión) |
| [001 · Stack](02-arquitectura/001-stack.md) | FastAPI, SQLAlchemy y SQLite; Vue 3 y Vite |
| [002 · Cálculo en el backend](02-arquitectura/002-calculo-precio-backend.md) | El precio se calcula solo en el backend, con un endpoint de vista previa |
| [003 · IVA por país](02-arquitectura/003-iva-por-pais.md) | Tabla fija de tipos de IVA y simplificaciones |
| [004 · Almacenamiento y llamadas API](02-arquitectura/004-almacenamiento-y-llamadas-api.md) | Se guardan en la simulación y no afectan al precio |
| [005 · Planes informativos](02-arquitectura/005-planes-informativos.md) | El plan es un atributo informativo del cliente |
| [006 · Identificador fiscal](02-arquitectura/006-validacion-identificador-fiscal.md) | Cuándo se valida NIF/NIE/CIF y qué se exige a otros países |
| [007 · Divisas](02-arquitectura/007-divisas.md) | El frontend convierte con open.er-api.com y cae a EUR si falla |
| [008 · Duplicados](02-arquitectura/008-duplicados-409.md) | Comprobación en el servicio más restricción `UNIQUE`; respuesta 409 |

Lo que le dije a la IA y cómo la configuré:

- [CLAUDE.md](../CLAUDE.md): reglas del proyecto (specs aprobadas antes de programar, reparto de roles, calidad y comandos).
- [Subagentes](../.claude/agents): [arquitecto](../.claude/agents/arquitecto.md), [backend-dev](../.claude/agents/backend-dev.md), [frontend-dev](../.claude/agents/frontend-dev.md), [qa-tester](../.claude/agents/qa-tester.md) y [auditor](../.claude/agents/auditor.md).
- [Skills](../.claude/skills): reglas de negocio ([reglas-negocio](../.claude/skills/reglas-negocio/SKILL.md)), [validacion-nif](../.claude/skills/validacion-nif/SKILL.md), convenciones ([backend](../.claude/skills/convenciones-backend/SKILL.md) y [frontend](../.claude/skills/convenciones-frontend/SKILL.md)) y plantillas y flujos ([spec-writer](../.claude/skills/spec-writer/SKILL.md), [adr](../.claude/skills/adr/SKILL.md), [bitacora-ia](../.claude/skills/bitacora-ia/SKILL.md), [verify](../.claude/skills/verify/SKILL.md)).
- Hooks, registrados en [settings.json](../.claude/settings.json):

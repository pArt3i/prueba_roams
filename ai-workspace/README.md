# ai-workspace

Evidencias de cómo se ha construido SaaS-O-Matic con ayuda de IA: planificación, decisiones, directrices dadas a la IA y proceso.

| Carpeta | Contenido |
| --- | --- |
| `01-specs/` | Una spec por funcionalidad, con su estado y los cambios que hizo Pablo antes de aprobarla |
| `02-arquitectura/` | Decisiones de arquitectura (ADR) numeradas |
| `03-proceso/bitacora.md` | Una entrada por funcionalidad: qué se pidió, qué propuso la IA, qué se corrigió y por qué |
| `03-proceso/auditorias/` | Informes del auditor, incluidos los que pidieron cambios |
| `03-proceso/prompts/` | Prompts que marcaron una diferencia |

## Directrices dadas a la IA

- [CLAUDE.md](../CLAUDE.md): reglas generales del proyecto
- [Skills](../.claude/skills): reglas de negocio, validación de NIF, convenciones y plantillas
- [Subagentes](../.claude/agents): arquitecto, backend-dev, frontend-dev, qa-tester y auditor
- [Hooks y configuración](../.claude/settings.json): formateo automático y protección de archivos sensibles

---
name: spec-writer
description: Redacta una spec de funcionalidad de SaaS-O-Matic en ai-workspace/01-specs con la plantilla del proyecto. Úsala cuando Pablo pida una spec nueva con /spec-writer seguido del tema.
---
# Redactar una spec

El tema es lo que Pablo escribió después del nombre de la skill.

1. Lee `CLAUDE.md`, la skill `reglas-negocio` y lo que ya haya en `ai-workspace/01-specs` y `02-arquitectura`, para no contradecirlo.
2. Elige el siguiente número libre y crea `ai-workspace/01-specs/NNN-tema-en-minusculas.md` (001, 002...).
3. Rellena la plantilla de abajo. Cada regla de negocio lleva un identificador (R1, R2...) y cada criterio de aceptación (CA1, CA2...) debe poder convertirse en un test.
4. No inventes reglas de negocio. Lo que falte va a «Preguntas abiertas» y se lo preguntas a Pablo.
5. Deja `Estado: Borrador`. Solo Pablo la pasa a `Aprobada`.
6. Termina con un resumen de tres líneas y la lista de preguntas abiertas.

## Plantilla

```markdown
# NNN · Título
Estado: Borrador
Fecha: AAAA-MM-DD
Objetivo: una frase.

## Contexto y alcance
Qué entra y qué no.

## Entradas
| Campo | Tipo | Obligatorio | Reglas |
| --- | --- | --- | --- |

## Salidas
Respuesta correcta, con un ejemplo en JSON.

## Reglas de negocio
- R1: ...

## Errores
| Situación | Código HTTP | Mensaje |
| --- | --- | --- |

## Casos límite
- ...

## Criterios de aceptación
- [ ] CA1: dado ..., cuando ..., entonces ...

## Preguntas abiertas
- ...

## Mis cambios
(vacío al crear. El autor anota aquí lo que corrige antes de aprobar.)
```
